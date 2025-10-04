import * as vscode from 'vscode';
import express from 'express';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { PlotJsonEditorProvider } from '../providers/editors/plotJsonEditor';
import { validateFeatureCollectionComprehensive, validateFeatureByType, classifyFeature, TimeState, ViewportState } from '@debrief/shared-types';
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
    private app: express.Express | null = null;
    private httpServer: http.Server | null = null;
    private readonly port = 60123;
    private cachedFilename: string | null = null;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private httpConnections: Set<http.IncomingMessage['socket']> = new Set(); // Track all HTTP connections for proper cleanup

    constructor() {}

    async start(): Promise<void> {
        // Don't start if already running
        if (this.isRunning()) {
            console.log('HTTP server is already running, skipping start');
            return;
        }

        // If there's a leftover server from incomplete shutdown, clean it up first
        if (this.httpServer || this.app) {
            console.warn('Found leftover server instances, cleaning up before restart...');
            await this.stop();
        }

        try {
            // Create Express app
            this.app = express();

            // Configure JSON body parser with increased limit for large feature collections
            this.app.use(express.json({ limit: '50mb' }));

            // Create single POST endpoint at root path accepting JSON requests
            this.app.post('/', async (req: express.Request, res: express.Response) => {
                try {
                    console.log('Received HTTP request:', req.body);

                    // Validate message structure
                    const message = req.body as DebriefMessage;
                    if (!message.command) {
                        res.status(400).json({
                            error: {
                                message: 'Request must include a "command" field',
                                code: 400
                            }
                        });
                        return;
                    }

                    // Handle the command using existing handlers
                    const response = await this.handleCommand(message);

                    // Return JSON response
                    if (response.error) {
                        // Set appropriate status code for errors
                        const statusCode = typeof response.error.code === 'number' ? response.error.code : 500;
                        res.status(statusCode).json(response);
                    } else {
                        res.json(response);
                    }
                } catch (error) {
                    console.error('Error handling HTTP request:', error);
                    res.status(500).json({
                        error: {
                            message: error instanceof Error ? error.message : 'Unknown error',
                            code: 500
                        }
                    });
                }
            });

            // Create HTTP server from Express app
            this.httpServer = http.createServer(this.app);

            // Handle port conflicts - but try to recover
            this.httpServer.on('error', async (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${this.port} is already in use - attempting recovery...`);

                    // Try to force cleanup and restart once
                    try {
                        await this.stop();
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for port release

                        // Don't show error to user on first attempt - try to recover
                        console.log('Retrying HTTP server start after cleanup...');
                        // Note: We can't call start() recursively, so log and let it fail
                        vscode.window.showErrorMessage(
                            `HTTP server port ${this.port} is already in use. Please restart VS Code if this persists.`
                        );
                    } catch (cleanupError) {
                        console.error('Failed to cleanup and restart:', cleanupError);
                        vscode.window.showErrorMessage(
                            `HTTP server port ${this.port} is already in use. Please close other applications using this port.`
                        );
                    }
                }
                throw error;
            });

            // Track all connections for proper cleanup
            this.httpServer.on('connection', (conn) => {
                this.httpConnections.add(conn);
                conn.on('close', () => {
                    this.httpConnections.delete(conn);
                });
            });

            await new Promise<void>((resolve, reject) => {
                // Bind to localhost only for security - Python scripts run on same machine
                // If Docker/remote access is needed, users can use port forwarding
                this.httpServer!.listen(this.port, 'localhost', () => {
                    console.log(`HTTP server listening on port ${this.port} (localhost only)`);
                    resolve();
                });
                this.httpServer!.on('error', reject);
            });

            console.log(`Debrief HTTP server started on http://localhost:${this.port}`);
            vscode.window.showInformationMessage(`Debrief HTTP bridge started on port ${this.port}`);

            // Start health check logging every 30 seconds
            this.healthCheckInterval = setInterval(() => {
                const isAppRunning = this.app !== null;
                const isHttpServerListening = this.httpServer && this.httpServer.listening;
                console.log(`HTTP Health Check - App running: ${isAppRunning}, HTTP listening: ${isHttpServerListening}`);
            }, 30000);

        } catch (error) {
            console.error('Failed to start HTTP server:', error);
            vscode.window.showErrorMessage(`Failed to start HTTP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    async stop(): Promise<void> {
        console.log('Stopping Debrief HTTP server...');

        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Clear Express app
        this.app = null;

        // Force-close all HTTP connections to release the port immediately
        this.httpConnections.forEach((conn) => {
            try {
                conn.destroy();
            } catch (error) {
                console.warn('Error destroying HTTP connection:', error);
            }
        });
        this.httpConnections.clear();

        // Close HTTP server with proper error handling
        if (this.httpServer) {
            await new Promise<void>((resolve) => {
                let resolved = false;

                const doResolve = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                };

                // Set a timeout in case close hangs
                const timeout = setTimeout(() => {
                    console.log('HTTP server close timed out after 2 seconds, forcing shutdown');
                    doResolve();
                }, 2000);

                this.httpServer!.close((error) => {
                    clearTimeout(timeout);
                    if (error) {
                        console.error('Error closing HTTP server:', error);
                    } else {
                        console.log('HTTP server closed, port released');
                    }
                    doResolve();
                });

                // Unref the server so it doesn't keep Node.js alive
                this.httpServer!.unref();
            });

            // Give the OS a moment to actually release the port
            await new Promise(resolve => setTimeout(resolve, 100));

            this.httpServer = null;
        }

        console.log('Debrief HTTP server stopped completely');
    }

    isRunning(): boolean {
        return this.app !== null && this.httpServer !== null;
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
            if (!timeState.current || !timeState.start || !timeState.end) {
                return {
                    error: {
                        message: 'Invalid TimeState: must have "current", "start", and "end" properties (all strings)',
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