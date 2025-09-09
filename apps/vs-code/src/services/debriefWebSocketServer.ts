import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { PlotJsonEditorProvider } from '../providers/editors/plotJsonEditor';
import { validateFeatureCollectionComprehensive, validateFeatureByType, classifyFeature } from '@debrief/shared-types/validators/typescript';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';
import { ViewportState } from '@debrief/shared-types/derived/typescript/viewportstate';
import { GlobalController } from '../core/globalController';
import { EditorIdManager } from '../core/editorIdManager';

interface GeoJSONFeature {
    type: 'Feature';
    id?: string | number;
    geometry: {
        type: string;
        coordinates: unknown;
    };
    properties: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
    bbox?: number[];
}

interface CommandParams {
    message?: string;
    filename?: string;
    featureCollection?: GeoJSONFeatureCollection;
    ids?: (string | number)[];
    features?: GeoJSONFeature[];
    timeState?: TimeState;
    viewportState?: ViewportState;
    [key: string]: unknown;
}

interface DebriefMessage {
    command: string;
    params?: CommandParams;
}

interface DebriefResponse {
    result?: unknown;
    error?: {
        message: string;
        code: number | string;
        available_plots?: Array<{filename: string, title: string}>;
    };
}

export class DebriefWebSocketServer {
    private server: WebSocket.WebSocketServer | null = null;
    private httpServer: http.Server | null = null;
    private readonly port = 60123;
    private clients: Set<WebSocket> = new Set();
    private cachedFilename: string | null = null;
    private healthCheckInterval: NodeJS.Timeout | null = null;

    constructor() {}

    async start(): Promise<void> {
        try {
            // Create HTTP server first to handle port conflicts
            this.httpServer = http.createServer();
            
            // Handle port conflicts
            this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${this.port} is already in use`);
                    vscode.window.showErrorMessage(
                        `WebSocket server port ${this.port} is already in use. Please close other applications using this port.`
                    );
                }
                throw error;
            });
            
            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.port, 'localhost', () => {
                    console.log(`HTTP server listening on port ${this.port}`);
                    resolve();
                });
                this.httpServer!.on('error', reject);
            });

            // Create WebSocket server
            this.server = new WebSocket.WebSocketServer({ 
                server: this.httpServer,
                path: '/'
            });

            this.server.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
                console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
                this.clients.add(ws);

                // Set up message handling
                ws.on('message', async (data: Buffer) => {
                    try {
                        const message = data.toString();
                        console.log('Received message:', message);
                        
                        // Try to parse as JSON
                        let response: DebriefResponse;
                        
                        try {
                            const parsedMessage: DebriefMessage = JSON.parse(message);
                            response = await this.handleCommand(parsedMessage);
                        } catch {
                            // If not valid JSON, treat as raw message (for backward compatibility)
                            response = { result: `Echo: ${message}` };
                        }
                        
                        ws.send(JSON.stringify(response));
                    } catch (error) {
                        console.error('Error handling message:', error);
                        const errorResponse: DebriefResponse = {
                            error: {
                                message: error instanceof Error ? error.message : 'Unknown error',
                                code: 500
                            }
                        };
                        ws.send(JSON.stringify(errorResponse));
                    }
                });

                ws.on('close', (code, reason) => {
                    console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason}. Remaining clients: ${this.clients.size - 1}`);
                    this.clients.delete(ws);
                    // Clear cached filename when client disconnects
                    this.cachedFilename = null;
                });

                ws.on('error', (error) => {
                    console.error('WebSocket client error:', error);
                    this.clients.delete(ws);
                    // Clear cached filename when client disconnects with error
                    this.cachedFilename = null;
                });

                // Send welcome message
                ws.send(JSON.stringify({ result: 'Connected to Debrief WebSocket Bridge' }));
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                vscode.window.showErrorMessage(`WebSocket server error: ${error.message}`);
                
                // Attempt to restart the server after a brief delay
                setTimeout(() => {
                    console.log('Attempting to restart WebSocket server...');
                    this.stop().then(() => {
                        return this.start();
                    }).catch((restartError) => {
                        console.error('Failed to restart WebSocket server:', restartError);
                    });
                }, 2000);
            });

            console.log(`Debrief WebSocket server started on ws://localhost:${this.port}`);
            vscode.window.showInformationMessage(`Debrief WebSocket bridge started on port ${this.port}`);
            
            // Start health check logging every 30 seconds
            this.healthCheckInterval = setInterval(() => {
                const isServerRunning = this.server !== null;
                const isHttpServerListening = this.httpServer && this.httpServer.listening;
                console.log(`WebSocket Health Check - Server running: ${isServerRunning}, HTTP listening: ${isHttpServerListening}, Active clients: ${this.clients.size}`);
            }, 30000);

        } catch (error) {
            console.error('Failed to start WebSocket server:', error);
            vscode.window.showErrorMessage(`Failed to start WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    async stop(): Promise<void> {
        console.log('Stopping Debrief WebSocket server...');
        
        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Close all client connections
        this.clients.forEach(ws => {
            if (ws.readyState === 1) { // WebSocket.OPEN
                ws.close();
            }
        });
        this.clients.clear();

        // Close WebSocket server
        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server!.close(() => {
                    console.log('WebSocket server closed');
                    resolve();
                });
            });
            this.server = null;
        }

        // Close HTTP server
        if (this.httpServer) {
            await new Promise<void>((resolve) => {
                this.httpServer!.close(() => {
                    console.log('HTTP server closed');
                    resolve();
                });
            });
            this.httpServer = null;
        }

        console.log('Debrief WebSocket server stopped');
    }

    isRunning(): boolean {
        return this.server !== null && this.httpServer !== null;
    }

    private async handleCommand(message: DebriefMessage): Promise<DebriefResponse> {
        console.log(`Handling command: ${message.command}`);

        try {
            switch (message.command) {
                case 'notify':
                    return await this.handleNotifyCommand(message.params || {});
                
                case 'get_feature_collection':
                    return await this.handleGetFeatureCollectionCommand(message.params || {});
                
                case 'set_feature_collection':
                    return await this.handleSetFeatureCollectionCommand(message.params || {});
                
                case 'get_selected_features':
                    return await this.handleGetSelectedFeaturesCommand(message.params || {});
                
                case 'set_selected_features':
                    return await this.handleSetSelectedFeaturesCommand(message.params || {});
                
                case 'update_features':
                    return await this.handleUpdateFeaturesCommand(message.params || {});
                
                case 'add_features':
                    return await this.handleAddFeaturesCommand(message.params || {});
                
                case 'delete_features':
                    return await this.handleDeleteFeaturesCommand(message.params || {});
                
                case 'zoom_to_selection':
                    return await this.handleZoomToSelectionCommand(message.params || {});
                
                case 'list_open_plots':
                    return await this.handleListOpenPlotsCommand();

                case 'get_time':
                    return await this.handleGetTimeCommand(message.params || {});
                
                case 'set_time':
                    return await this.handleSetTimeCommand(message.params || {});
                
                case 'get_viewport':
                    return await this.handleGetViewportCommand(message.params || {});
                
                case 'set_viewport':
                    return await this.handleSetViewportCommand(message.params || {});
                    
                default:
                    return {
                        error: {
                            message: `Unknown command: ${message.command}`,
                            code: 400
                        }
                    };
            }
        } catch (error) {
            console.error(`Error handling command ${message.command}:`, error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Command execution failed',
                    code: 500
                }
            };
        }
    }

    private async handleNotifyCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || typeof params.message !== 'string') {
            return {
                error: {
                    message: 'notify command requires a "message" parameter of type string',
                    code: 400
                }
            };
        }

        try {
            // Display VS Code notification
            vscode.window.showInformationMessage(params.message);
            
            console.log(`Displayed notification: "${params.message}"`);
            
            return { result: null };
        } catch (error) {
            console.error('Error displaying notification:', error);
            return {
                error: {
                    message: 'Failed to display notification',
                    code: 500
                }
            };
        }
    }

    private async handleGetFeatureCollectionCommand(params: CommandParams): Promise<DebriefResponse> {
        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            const featureCollection = this.parseGeoJsonDocument(document);
            return { result: featureCollection };
        } catch (error) {
            console.error('Error getting feature collection:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to get feature collection',
                    code: 500
                }
            };
        }
    }

    private async handleSetFeatureCollectionCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !params.featureCollection || typeof params.featureCollection !== 'object') {
            return {
                error: {
                    message: 'set_feature_collection command requires "featureCollection" (object) parameter',
                    code: 400
                }
            };
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            // Validate the feature collection structure using shared-types validators
            const validation = this.isValidFeatureCollection(params.featureCollection);
            if (!validation.isValid) {
                const errorMsg = validation.errors ? validation.errors.join('; ') : 'Invalid FeatureCollection data structure';
                return {
                    error: {
                        message: `Invalid FeatureCollection: ${errorMsg}`,
                        code: 400
                    }
                };
            }
            
            // Log successful validation with feature counts
            if (validation.featureCounts) {
                const counts = validation.featureCounts;
                console.log(`WebSocket: Valid FeatureCollection received - ${counts.total} features (${counts.tracks} tracks, ${counts.points} points, ${counts.annotations} annotations)`);
            }

            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            await this.updateDocument(document, params.featureCollection as GeoJSONFeatureCollection);
            return { result: null };
        } catch (error) {
            console.error('Error setting feature collection:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to set feature collection',
                    code: 500
                }
            };
        }
    }

    private async handleGetSelectedFeaturesCommand(params: CommandParams): Promise<DebriefResponse> {
        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Get selection from PlotJsonEditorProvider
            const selectedFeatureIds = PlotJsonEditorProvider.getSelectedFeatures(document.fileName);
            
            // Convert IDs to actual feature objects
            const featureCollection = this.parseGeoJsonDocument(document);
            if (!featureCollection) {
                return {
                    error: {
                        message: 'Failed to parse feature collection from document',
                        code: 500
                    }
                };
            }
            
            const selectedFeatures = featureCollection.features.filter((feature: GeoJSONFeature) =>
                feature.id && selectedFeatureIds.includes(String(feature.id))
            );

            return { result: selectedFeatures };
        } catch (error) {
            console.error('Error getting selected features:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to get selected features',
                    code: 500
                }
            };
        }
    }

    private async handleSetSelectedFeaturesCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !Array.isArray(params.ids)) {
            return {
                error: {
                    message: 'set_selected_features command requires "ids" (array) parameter',
                    code: 400
                }
            };
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Update selection state in PlotJsonEditorProvider (convert to string array)
            const stringIds = params.ids.map(id => String(id));
            PlotJsonEditorProvider.setSelectedFeatures(document.fileName, stringIds);
            
            return { result: null };
        } catch (error) {
            console.error('Error setting selected features:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to set selected features',
                    code: 500
                }
            };
        }
    }

    private async handleUpdateFeaturesCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !Array.isArray(params.features)) {
            return {
                error: {
                    message: 'update_features command requires "features" (array) parameter',
                    code: 400
                }
            };
        }

        // Validate each feature using shared-types validators
        for (let i = 0; i < params.features.length; i++) {
            const feature = params.features[i];
            if (!validateFeatureByType(feature)) {
                const featureType = classifyFeature(feature);
                return {
                    error: {
                        message: `Invalid feature at index ${i}: Feature classified as '${featureType}' but failed validation`,
                        code: 400
                    }
                };
            }
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            const featureCollection = this.parseGeoJsonDocument(document);
            if (!featureCollection) {
                return {
                    error: {
                        message: 'Failed to parse feature collection from document',
                        code: 500
                    }
                };
            }
            
            // Update features by ID
            for (const updatedFeature of params.features) {
                if (!updatedFeature.id) {
                    console.warn(`Feature is missing ID: ${JSON.stringify(updatedFeature)}`);
                    continue; // Skip features without ID
                }
                
                const index = featureCollection.features.findIndex((f: GeoJSONFeature) => 
                    String(f.id) === String(updatedFeature.id)
                );
                
                if (index >= 0) {
                    featureCollection.features[index] = updatedFeature;
                } else {
                  console.warn(`Feature with ID ${updatedFeature.id} not found for update`);
                }
            }

            await this.updateDocument(document, featureCollection);
            
            // Refresh webview to update visual selection indicators after feature updates
            this.refreshWebviewSelection(document.fileName);
            
            return { result: null };
        } catch (error) {
            console.error('Error updating features:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to update features',
                    code: 500
                }
            };
        }
    }

    private async handleAddFeaturesCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !Array.isArray(params.features)) {
            return {
                error: {
                    message: 'add_features command requires "features" (array) parameter',
                    code: 400
                }
            };
        }

        // Validate each feature using shared-types validators
        for (let i = 0; i < params.features.length; i++) {
            const feature = params.features[i];
            if (!validateFeatureByType(feature)) {
                const featureType = classifyFeature(feature);
                return {
                    error: {
                        message: `Invalid feature at index ${i}: Feature classified as '${featureType}' but failed validation`,
                        code: 400
                    }
                };
            }
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            const featureCollection = this.parseGeoJsonDocument(document);
            if (!featureCollection) {
                return {
                    error: {
                        message: 'Failed to parse feature collection from document',
                        code: 500
                    }
                };
            }
            
            // Add features with auto-generated IDs
            for (const feature of params.features) {
                // Generate ID if not present
                if (!feature.id) {
                    feature.id = this.generateFeatureId();
                }
                
                featureCollection.features.push(feature);
            }

            await this.updateDocument(document, featureCollection);
            
            // Refresh webview to update visual display after adding features
            this.refreshWebviewSelection(document.fileName);
            
            return { result: null };
        } catch (error) {
            console.error('Error adding features:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to add features',
                    code: 500
                }
            };
        }
    }

    private async handleDeleteFeaturesCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !Array.isArray(params.ids)) {
            return {
                error: {
                    message: 'delete_features command requires "ids" (array) parameter',
                    code: 400
                }
            };
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            const featureCollection = this.parseGeoJsonDocument(document);
            if (!featureCollection) {
                return {
                    error: {
                        message: 'Failed to parse feature collection from document',
                        code: 500
                    }
                };
            }
            
            // Delete features by ID (convert ids to strings for comparison)
            const stringIds = params.ids.map(id => String(id));
            featureCollection.features = featureCollection.features.filter((feature: GeoJSONFeature) =>
                !feature.id || !stringIds.includes(String(feature.id))
            );

            await this.updateDocument(document, featureCollection);
            
            // Refresh webview to update visual display after deleting features
            this.refreshWebviewSelection(document.fileName);
            
            return { result: null };
        } catch (error) {
            console.error('Error deleting features:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to delete features',
                    code: 500
                }
            };
        }
    }

    private async handleZoomToSelectionCommand(params: CommandParams): Promise<DebriefResponse> {
        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }

        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Send zoom message to webview
            PlotJsonEditorProvider.sendMessageToActiveWebview({
                type: 'zoomToSelection'
            });

            return { result: null };
        } catch (error) {
            console.error('Error zooming to selection:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to zoom to selection',
                    code: 500
                }
            };
        }
    }

    // Helper methods

    private async findOpenDocument(filename: string): Promise<vscode.TextDocument | null> {
        // First check if it's just a filename and look in workspace
        if (!path.isAbsolute(filename)) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const fullPath = path.join(workspaceFolders[0].uri.fsPath, filename);
                
                // Check if file exists
                try {
                    await fs.promises.access(fullPath);
                    // Try to open the document
                    const uri = vscode.Uri.file(fullPath);
                    return await vscode.workspace.openTextDocument(uri);
                } catch {
                    // File doesn't exist or can't be opened
                }
            }
        }

        // Check if already open in editor
        const openDocs = vscode.workspace.textDocuments;
        for (const doc of openDocs) {
            if (doc.fileName.endsWith(filename) || doc.fileName === filename) {
                return doc;
            }
        }

        return null;
    }

    private parseGeoJsonDocument(document: vscode.TextDocument): GeoJSONFeatureCollection | null {
        const text = document.getText();
        if (text.trim().length === 0) {
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        try {
            const parsed = JSON.parse(text);
            const validation = this.isValidFeatureCollection(parsed);
            if (!validation.isValid) {
                const errorMsg = validation.errors ? validation.errors.join('; ') : 'Invalid FeatureCollection structure';
                throw new Error(`Document does not contain a valid Debrief FeatureCollection: ${errorMsg}`);
            }
            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse GeoJSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
        }
    }

    private isValidFeatureCollection(data: unknown): { isValid: boolean; errors?: string[]; featureCounts?: { tracks: number; points: number; annotations: number; unknown: number; total: number } } {
        // Use comprehensive validation from shared-types
        const validation = validateFeatureCollectionComprehensive(data);
        return {
            isValid: validation.isValid,
            errors: validation.errors,
            featureCounts: validation.featureCounts
        };
    }

    private async updateDocument(document: vscode.TextDocument, data: GeoJSONFeatureCollection): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(data, null, 2)
        );

        await vscode.workspace.applyEdit(edit);
    }

    private generateFeatureId(): string {
        return 'feature_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    private refreshWebviewSelection(filename: string): void {
        // Get current selection state
        const selectedFeatureIds = PlotJsonEditorProvider.getSelectedFeatures(filename);
        
        if (selectedFeatureIds.length > 0) {
            // Re-apply selection to refresh visual indicators with updated feature positions
            PlotJsonEditorProvider.setSelectedFeatures(filename, selectedFeatureIds);
        }
        
        // Also send a general refresh message to update the map display
        PlotJsonEditorProvider.sendMessageToActiveWebview({
            type: 'refreshSelection'
        });
    }

    private async handleListOpenPlotsCommand(): Promise<DebriefResponse> {
        try {
            const openPlots = this.getOpenPlotFiles();
            return { result: openPlots };
        } catch (error) {
            console.error('Error listing open plots:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to list open plots',
                    code: 500
                }
            };
        }
    }

    private getOpenPlotFiles(): Array<{filename: string, title: string}> {
        const openDocs = vscode.workspace.textDocuments;
        const plotFiles: Array<{filename: string, title: string}> = [];
        
        for (const doc of openDocs) {
            if (doc.fileName.endsWith('.plot.json')) {
                const filename = path.basename(doc.fileName);
                const title = filename.replace('.plot.json', '');
                plotFiles.push({ filename, title });
            }
        }
        
        return plotFiles;
    }

    private async resolveFilename(providedFilename?: string): Promise<DebriefResponse> {
        if (providedFilename) {
            // Filename provided, cache it for future use and use it directly
            this.cachedFilename = providedFilename;
            return { result: providedFilename };
        }
        
        // No filename provided, check cached filename first
        if (this.cachedFilename) {
            // Verify cached filename is still open
            const openPlots = this.getOpenPlotFiles();
            const cachedStillOpen = openPlots.some(plot => plot.filename === this.cachedFilename);
            
            if (cachedStillOpen) {
                return { result: this.cachedFilename };
            } else {
                // Cached file is no longer open, clear cache
                this.cachedFilename = null;
            }
        }
        
        // No cached filename or cache invalid, check open plots
        const openPlots = this.getOpenPlotFiles();
        
        if (openPlots.length === 0) {
            return {
                error: {
                    message: 'No plot files are currently open',
                    code: 404
                }
            };
        }
        
        if (openPlots.length === 1) {
            // Exactly one plot open, use it
            return { result: openPlots[0].filename };
        }
        
        // Multiple plots open, return special error with available options
        return {
            error: {
                message: 'Multiple plot files are open. Please specify which file to use, or use list_open_plots to see available options.',
                code: 'MULTIPLE_PLOTS',
                available_plots: openPlots
            }
        };
    }

    private async handleGetTimeCommand(params: CommandParams): Promise<DebriefResponse> {
        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }
        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Get editorId for this document
            const globalController = GlobalController.getInstance();
            const editorIds = globalController.getEditorIds();
            let editorId: string | undefined;
            
            for (const id of editorIds) {
                const doc = EditorIdManager.getDocument(id);
                if (doc && doc.fileName === document.fileName) {
                    editorId = id;
                    break;
                }
            }
            
            if (!editorId) {
                return {
                    error: {
                        message: `Editor not found for file: ${filename}`,
                        code: 404
                    }
                };
            }

            const timeState = globalController.getStateSlice(editorId, 'timeState');
            return { result: timeState || null };
        } catch (error) {
            console.error('Error getting time state:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to get time state',
                    code: 500
                }
            };
        }
    }

    private async handleSetTimeCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !params.timeState || typeof params.timeState !== 'object') {
            return {
                error: {
                    message: 'set_time command requires "timeState" (object) parameter',
                    code: 400
                }
            };
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }
        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Validate the time state structure
            const timeState = params.timeState as TimeState;
            if (!timeState.current || !timeState.range || !Array.isArray(timeState.range) || timeState.range.length !== 2) {
                return {
                    error: {
                        message: 'Invalid TimeState: must have "current" (string) and "range" (array with 2 elements)',
                        code: 400
                    }
                };
            }

            // Get editorId for this document
            const globalController = GlobalController.getInstance();
            const editorIds = globalController.getEditorIds();
            let editorId: string | undefined;
            
            for (const id of editorIds) {
                const doc = EditorIdManager.getDocument(id);
                if (doc && doc.fileName === document.fileName) {
                    editorId = id;
                    break;
                }
            }
            
            if (!editorId) {
                return {
                    error: {
                        message: `Editor not found for file: ${filename}`,
                        code: 404
                    }
                };
            }

            // Update the time state
            globalController.updateState(editorId, 'timeState', timeState);
            
            return { result: 'Time state updated successfully' };
        } catch (error) {
            console.error('Error setting time state:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to set time state',
                    code: 500
                }
            };
        }
    }

    private async handleGetViewportCommand(params: CommandParams): Promise<DebriefResponse> {
        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }
        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Get editorId for this document
            const globalController = GlobalController.getInstance();
            const editorIds = globalController.getEditorIds();
            let editorId: string | undefined;
            
            for (const id of editorIds) {
                const doc = EditorIdManager.getDocument(id);
                if (doc && doc.fileName === document.fileName) {
                    editorId = id;
                    break;
                }
            }
            
            if (!editorId) {
                return {
                    error: {
                        message: `Editor not found for file: ${filename}`,
                        code: 404
                    }
                };
            }

            const viewportState = globalController.getStateSlice(editorId, 'viewportState');
            return { result: viewportState || null };
        } catch (error) {
            console.error('Error getting viewport state:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to get viewport state',
                    code: 500
                }
            };
        }
    }

    private async handleSetViewportCommand(params: CommandParams): Promise<DebriefResponse> {
        if (!params || !params.viewportState || typeof params.viewportState !== 'object') {
            return {
                error: {
                    message: 'set_viewport command requires "viewportState" (object) parameter',
                    code: 400
                }
            };
        }

        // Resolve filename (optional parameter)
        const resolution = await this.resolveFilename(params?.filename);
        if (resolution.error) {
            return resolution;
        }
        try {
            const filename = resolution.result;
            if (typeof filename !== 'string') {
                return {
                    error: {
                        message: 'Invalid filename resolved',
                        code: 500
                    }
                };
            }
            
            const document = await this.findOpenDocument(filename);
            if (!document) {
                return {
                    error: {
                        message: `File not found or not open: ${filename}`,
                        code: 404
                    }
                };
            }

            // Validate the viewport state structure
            const viewportState = params.viewportState as ViewportState;
            if (!viewportState.bounds || !Array.isArray(viewportState.bounds) || viewportState.bounds.length !== 4) {
                return {
                    error: {
                        message: 'Invalid ViewportState: must have "bounds" (array with 4 elements)',
                        code: 400
                    }
                };
            }

            // Get editorId for this document
            const globalController = GlobalController.getInstance();
            const editorIds = globalController.getEditorIds();
            let editorId: string | undefined;
            
            for (const id of editorIds) {
                const doc = EditorIdManager.getDocument(id);
                if (doc && doc.fileName === document.fileName) {
                    editorId = id;
                    break;
                }
            }
            
            if (!editorId) {
                return {
                    error: {
                        message: `Editor not found for file: ${filename}`,
                        code: 404
                    }
                };
            }

            // Update the viewport state
            globalController.updateState(editorId, 'viewportState', viewportState);
            
            return { result: 'Viewport state updated successfully' };
        } catch (error) {
            console.error('Error setting viewport state:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Failed to set viewport state',
                    code: 500
                }
            };
        }
    }
}