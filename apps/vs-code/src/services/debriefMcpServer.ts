import * as vscode from 'vscode';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { PlotJsonEditorProvider } from '../providers/editors/plotJsonEditor';
import {
    validateFeatureCollectionComprehensive,
    validateFeatureByType,
    classifyFeature,
    TimeState,
    ViewportState
} from '@debrief/shared-types';
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

export class DebriefMcpServer {
    private server: FastMCP;
    private readonly port = 60123;
    private cachedFilename: string | null = null;

    constructor() {
        this.server = new FastMCP({
            name: 'Debrief VS Code Extension',
            version: '1.0.0',
            health: {
                enabled: true,
                path: '/health',
                message: 'healthy',
                status: 200
            }
        });

        this.setupResources();
        this.setupTools();
    }

    private setupResources(): void {
        // Resource: Feature Collection
        this.server.addResourceTemplate({
            uriTemplate: 'plot://{filename}/features',
            name: 'Plot Feature Collection',
            description: 'GeoJSON FeatureCollection for a plot file',
            mimeType: 'application/json',
            arguments: [{
                name: 'filename',
                description: 'Plot filename (.plot.json)',
                required: true
            }],
            load: async ({ filename }) => {
                const resolution = await this.resolveFilenameForResource(filename as string);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${filename}`);
                }

                const featureCollection = this.parseGeoJsonDocument(document);
                return {
                    text: JSON.stringify(featureCollection, null, 2)
                };
            }
        });

        // Resource: Selection State
        this.server.addResourceTemplate({
            uriTemplate: 'plot://{filename}/selection',
            name: 'Plot Selection State',
            description: 'Currently selected feature IDs',
            mimeType: 'application/json',
            arguments: [{
                name: 'filename',
                description: 'Plot filename (.plot.json)',
                required: true
            }],
            load: async ({ filename }) => {
                const resolution = await this.resolveFilenameForResource(filename as string);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${filename}`);
                }

                const selectedFeatureIds = PlotJsonEditorProvider.getSelectedFeatures(document.fileName);
                return {
                    text: JSON.stringify({ selectedIds: selectedFeatureIds }, null, 2)
                };
            }
        });

        // Resource: Time State
        this.server.addResourceTemplate({
            uriTemplate: 'plot://{filename}/time',
            name: 'Plot Time State',
            description: 'Current time state (start, current, end)',
            mimeType: 'application/json',
            arguments: [{
                name: 'filename',
                description: 'Plot filename (.plot.json)',
                required: true
            }],
            load: async ({ filename }) => {
                const resolution = await this.resolveFilenameForResource(filename as string);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${filename}`);
                }

                const editorId = this.getEditorIdForDocument(document);
                if (!editorId) {
                    throw new Error(`Editor not found for file: ${filename}`);
                }

                const globalController = GlobalController.getInstance();
                const timeState = globalController.getStateSlice(editorId, 'timeState');

                return {
                    text: JSON.stringify(timeState || null, null, 2)
                };
            }
        });

        // Resource: Viewport State
        this.server.addResourceTemplate({
            uriTemplate: 'plot://{filename}/viewport',
            name: 'Plot Viewport State',
            description: 'Current map viewport bounds',
            mimeType: 'application/json',
            arguments: [{
                name: 'filename',
                description: 'Plot filename (.plot.json)',
                required: true
            }],
            load: async ({ filename }) => {
                const resolution = await this.resolveFilenameForResource(filename as string);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${filename}`);
                }

                const editorId = this.getEditorIdForDocument(document);
                if (!editorId) {
                    throw new Error(`Editor not found for file: ${filename}`);
                }

                const globalController = GlobalController.getInstance();
                const viewportState = globalController.getStateSlice(editorId, 'viewportState');

                return {
                    text: JSON.stringify(viewportState || null, null, 2)
                };
            }
        });

        // Resource: List of Open Plots
        this.server.addResource({
            uri: 'plots://list',
            name: 'Open Plot Files',
            description: 'List of all currently open .plot.json files',
            mimeType: 'application/json',
            load: async () => {
                const openPlots = this.getOpenPlotFiles();
                return {
                    text: JSON.stringify(openPlots, null, 2)
                };
            }
        });
    }

    private setupTools(): void {
        // Tool: Add Features
        this.server.addTool({
            name: 'debrief_add_features',
            description: 'Add new features to a plot',
            parameters: z.object({
                filename: z.string().optional(),
                features: z.array(z.any()).describe('Array of GeoJSON features to add')
            }),
            execute: async (args) => {
                // Validate each feature
                for (let i = 0; i < args.features.length; i++) {
                    const feature = args.features[i];
                    if (!validateFeatureByType(feature)) {
                        const featureType = classifyFeature(feature);
                        throw new Error(`Invalid feature at index ${i}: Feature classified as '${featureType}' but failed validation`);
                    }
                }

                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                const featureCollection = this.parseGeoJsonDocument(document);

                // Add features with auto-generated IDs
                for (const feature of args.features) {
                    if (!feature.id) {
                        feature.id = this.generateFeatureId();
                    }
                    featureCollection.features.push(feature);
                }

                await this.updateDocument(document, featureCollection);
                this.refreshWebviewSelection(document.fileName);

                return 'Features added successfully';
            }
        });

        // Tool: Update Features
        this.server.addTool({
            name: 'debrief_update_features',
            description: 'Update existing features by ID',
            parameters: z.object({
                filename: z.string().optional(),
                features: z.array(z.any()).describe('Array of GeoJSON features with IDs to update')
            }),
            execute: async (args) => {
                // Validate each feature
                for (let i = 0; i < args.features.length; i++) {
                    const feature = args.features[i];
                    if (!validateFeatureByType(feature)) {
                        const featureType = classifyFeature(feature);
                        throw new Error(`Invalid feature at index ${i}: Feature classified as '${featureType}' but failed validation`);
                    }
                }

                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                const featureCollection = this.parseGeoJsonDocument(document);

                // Update features by ID
                for (const updatedFeature of args.features) {
                    if (!updatedFeature.id) {
                        console.warn(`Feature is missing ID: ${JSON.stringify(updatedFeature)}`);
                        continue;
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
                this.refreshWebviewSelection(document.fileName);

                return 'Features updated successfully';
            }
        });

        // Tool: Delete Features
        this.server.addTool({
            name: 'debrief_delete_features',
            description: 'Delete features by ID array',
            parameters: z.object({
                filename: z.string().optional(),
                ids: z.array(z.union([z.string(), z.number()])).describe('Array of feature IDs to delete')
            }),
            execute: async (args) => {
                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                const featureCollection = this.parseGeoJsonDocument(document);

                // Delete features by ID
                const stringIds = args.ids.map(id => String(id));
                featureCollection.features = featureCollection.features.filter((feature: GeoJSONFeature) =>
                    !feature.id || !stringIds.includes(String(feature.id))
                );

                await this.updateDocument(document, featureCollection);
                this.refreshWebviewSelection(document.fileName);

                return `Deleted ${args.ids.length} feature(s)`;
            }
        });

        // Tool: Set Features
        this.server.addTool({
            name: 'debrief_set_features',
            description: 'Replace entire feature collection',
            parameters: z.object({
                filename: z.string().optional(),
                featureCollection: z.any().describe('Complete GeoJSON FeatureCollection')
            }),
            execute: async (args) => {
                // Validate the feature collection
                const validation = this.isValidFeatureCollection(args.featureCollection);
                if (!validation.isValid) {
                    const errorMsg = validation.errors ? validation.errors.join('; ') : 'Invalid FeatureCollection data structure';
                    throw new Error(`Invalid FeatureCollection: ${errorMsg}`);
                }

                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                await this.updateDocument(document, args.featureCollection as GeoJSONFeatureCollection);

                return 'Feature collection set successfully';
            }
        });

        // Tool: Set Selection
        this.server.addTool({
            name: 'debrief_set_selection',
            description: 'Set selected feature IDs',
            parameters: z.object({
                filename: z.string().optional(),
                selectedIds: z.array(z.union([z.string(), z.number()])).describe('Array of feature IDs to select')
            }),
            execute: async (args) => {
                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                // Update selection state
                const stringIds = args.selectedIds.map(id => String(id));
                PlotJsonEditorProvider.setSelectedFeatures(document.fileName, stringIds);

                return 'Selection updated successfully';
            }
        });

        // Tool: Zoom to Selection
        this.server.addTool({
            name: 'debrief_zoom_to_selection',
            description: 'Zoom map viewport to fit selected features',
            parameters: z.object({
                filename: z.string().optional()
            }),
            execute: async (args) => {
                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                // Send zoom message to webview
                PlotJsonEditorProvider.sendMessageToActiveWebview({
                    type: 'zoomToSelection'
                });

                return 'Zoomed to selection';
            }
        });

        // Tool: Set Time
        this.server.addTool({
            name: 'debrief_set_time',
            description: 'Set time state (start, current, end)',
            parameters: z.object({
                filename: z.string().optional(),
                timeState: z.object({
                    start: z.string(),
                    current: z.string(),
                    end: z.string()
                }).describe('Time state with start, current, and end timestamps')
            }),
            execute: async (args) => {
                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                const editorId = this.getEditorIdForDocument(document);
                if (!editorId) {
                    throw new Error(`Editor not found for file: ${resolution.result}`);
                }

                const globalController = GlobalController.getInstance();
                globalController.updateState(editorId, 'timeState', args.timeState as TimeState);

                return 'Time state updated successfully';
            }
        });

        // Tool: Set Viewport
        this.server.addTool({
            name: 'debrief_set_viewport',
            description: 'Set map viewport bounds',
            parameters: z.object({
                filename: z.string().optional(),
                viewportState: z.object({
                    bounds: z.array(z.number()).length(4).describe('Bounds array [minLat, minLon, maxLat, maxLon]')
                }).describe('Viewport state with bounds')
            }),
            execute: async (args) => {
                const resolution = await this.resolveFilename(args.filename);
                if (resolution.error) {
                    throw new Error(resolution.error.message);
                }

                const document = await this.findOpenDocument(resolution.result as string);
                if (!document) {
                    throw new Error(`File not found or not open: ${resolution.result}`);
                }

                const editorId = this.getEditorIdForDocument(document);
                if (!editorId) {
                    throw new Error(`Editor not found for file: ${resolution.result}`);
                }

                const globalController = GlobalController.getInstance();
                globalController.updateState(editorId, 'viewportState', args.viewportState as ViewportState);

                return 'Viewport state updated successfully';
            }
        });

        // Tool: Notify
        this.server.addTool({
            name: 'debrief_notify',
            description: 'Display a notification to the user',
            parameters: z.object({
                message: z.string().describe('Message to display'),
                level: z.enum(['info', 'warning', 'error']).optional().default('info').describe('Notification level')
            }),
            execute: async (args) => {
                switch (args.level) {
                    case 'warning':
                        vscode.window.showWarningMessage(args.message);
                        break;
                    case 'error':
                        vscode.window.showErrorMessage(args.message);
                        break;
                    default:
                        vscode.window.showInformationMessage(args.message);
                }

                console.warn(`Displayed ${args.level} notification: "${args.message}"`);
                return 'Notification displayed';
            }
        });
    }

    async start(): Promise<void> {
        console.warn('Starting Debrief MCP server...');

        await this.server.start({
            transportType: 'httpStream',
            httpStream: {
                port: this.port,
                endpoint: '/mcp'
            }
        });

        console.warn(`Debrief MCP server started on http://localhost:${this.port}/mcp`);
    }

    async stop(): Promise<void> {
        console.warn('Stopping Debrief MCP server...');
        // FastMCP handles cleanup internally
        // Note: FastMCP v3 doesn't expose a stop method, server lifecycle is managed by the framework
        console.warn('Debrief MCP server stopped');
    }

    isRunning(): boolean {
        // FastMCP doesn't expose a running state check
        // We rely on start() being called successfully
        return true;
    }

    // Helper Methods

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

    private parseGeoJsonDocument(document: vscode.TextDocument): GeoJSONFeatureCollection {
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

    private isValidFeatureCollection(data: unknown): {
        isValid: boolean;
        errors?: string[];
        featureCounts?: { tracks: number; points: number; annotations: number; unknown: number; total: number }
    } {
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
        const selectedFeatureIds = PlotJsonEditorProvider.getSelectedFeatures(filename);

        if (selectedFeatureIds.length > 0) {
            PlotJsonEditorProvider.setSelectedFeatures(filename, selectedFeatureIds);
        }

        PlotJsonEditorProvider.sendMessageToActiveWebview({
            type: 'refreshSelection'
        });
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

    private async resolveFilename(providedFilename?: string): Promise<{result?: string, error?: {message: string, code: number | string}}> {
        if (providedFilename) {
            this.cachedFilename = providedFilename;
            return { result: providedFilename };
        }

        // Check cached filename
        if (this.cachedFilename) {
            const openPlots = this.getOpenPlotFiles();
            const cachedStillOpen = openPlots.some(plot => plot.filename === this.cachedFilename);

            if (cachedStillOpen) {
                return { result: this.cachedFilename };
            } else {
                this.cachedFilename = null;
            }
        }

        // Check open plots
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
            return { result: openPlots[0].filename };
        }

        // Multiple plots open
        return {
            error: {
                message: `Multiple plot files are open: ${openPlots.map(p => p.filename).join(', ')}. Please specify which file to use.`,
                code: 'MULTIPLE_PLOTS'
            }
        };
    }

    private async resolveFilenameForResource(providedFilename: string): Promise<{result?: string, error?: {message: string}}> {
        if (providedFilename) {
            return { result: providedFilename };
        }

        const openPlots = this.getOpenPlotFiles();

        if (openPlots.length === 0) {
            return {
                error: {
                    message: 'No plot files are currently open'
                }
            };
        }

        if (openPlots.length === 1) {
            return { result: openPlots[0].filename };
        }

        return {
            error: {
                message: `Multiple plot files are open: ${openPlots.map(p => p.filename).join(', ')}. Please specify filename in URI.`
            }
        };
    }

    private getEditorIdForDocument(document: vscode.TextDocument): string | undefined {
        const globalController = GlobalController.getInstance();
        const editorIds = globalController.getEditorIds();

        for (const id of editorIds) {
            const doc = EditorIdManager.getDocument(id);
            if (doc && doc.fileName === document.fileName) {
                return id;
            }
        }

        return undefined;
    }
}
