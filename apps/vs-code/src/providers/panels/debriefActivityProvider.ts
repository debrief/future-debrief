import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import {
    TimeState,
    DebriefFeatureCollection,
    SelectionState,
    CurrentState,
    DebriefFeature
} from '@debrief/shared-types';
import { ToolSchema } from '@debrief/web-components/services';
import { Property } from '@debrief/web-components';

/**
 * DebriefActivityProvider - Consolidated webview provider for all activity panel components
 *
 * This provider consolidates 4 separate webview providers (TimeController, OutlineView,
 * PropertiesView, CurrentState) into a single webview to improve startup performance.
 *
 * Performance Improvements:
 * - Single HTML generation instead of 4 separate generations
 * - Single web-components.js bundle load instead of 4 loads
 * - Single GlobalController subscription setup instead of 4 setups
 * - Reduced CSP and nonce generation overhead
 *
 * State Management:
 * - HTML is generated once during initialization (_initializeWebview)
 * - State updates use postMessage to call updateProps() on React component
 * - This preserves React component tree and internal state (e.g., panel sizes)
 * - Eliminates flicker and maintains smooth interactions
 */
export class DebriefActivityProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.activity';

    private _view?: vscode.WebviewView;
    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];
    private _toolListFailed = false;
    private _cachedToolList: unknown = null;
    private _lastToolResult?: { commandName: string; result: unknown };

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        this._globalController = GlobalController.getInstance();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(data => {
            this._handleWebviewMessage(data);
        });

        // Subscribe to GlobalController events
        this._setupGlobalControllerSubscriptions();

        // Initialize HTML content and wait for completion before checking Tool Vault state
        // This prevents race condition where Tool Vault updates are sent before webview is ready
        this._initializeWebview()
            .then(() => {
                // Check if Tool Vault server is already ready (only after webview is initialized)
                this._checkInitialToolVaultState();
            })
            .catch(error => {
                console.error('[DebriefActivityProvider] Failed to initialize webview:', error);
            });

        // Handle visibility changes - repopulate when becoming visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                console.warn('[DebriefActivityProvider] Webview became visible - refreshing state');
                void this._updateView();
            }
        });

        webviewView.onDidDispose(() => {
            this._cleanup();
        });
    }

    /**
     * Handle all messages from the webview
     */
    private _handleWebviewMessage(data: { type: string; [key: string]: unknown }): void {
        const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];

        switch (data.type) {
            // TimeController messages
            case 'timeChange':
                this._handleTimeChange(data.value as string);
                break;
            case 'openSettings':
                this._handleOpenSettings();
                break;
            case 'play':
                // TODO: Handle play functionality
                break;
            case 'pause':
                // TODO: Handle pause functionality
                break;
            case 'stop':
                this._handleStop();
                break;

            // OutlineView messages
            case 'selectionChanged':
                if (currentEditorId) {
                    const selectionState: SelectionState = {
                        selectedIds: data.selectedIds as string[]
                    };
                    this._globalController.updateState(currentEditorId, 'selectionState', selectionState);
                }
                break;

            case 'visibilityChanged':
                if (currentEditorId) {
                    this._handleVisibilityChange(currentEditorId, data.featureId as string, data.visible as boolean);
                }
                break;

            case 'viewFeature':
                // TODO: Handle view feature
                break;

            case 'deleteFeatures':
                // TODO: Handle delete features
                break;

            case 'collapseAll':
                // TODO: Handle collapse all
                break;

            case 'executeCommand':
                if (currentEditorId) {
                    let toolName = 'unknown-tool';
                    const command = data.command as string | { name?: string; tool?: { name?: string } };
                    if (typeof command === 'string') {
                        toolName = command;
                    } else if (command && typeof command === 'object') {
                        toolName = command.name || (command.tool && command.tool.name) || 'unknown-tool';
                    }
                    void this._executeToolCommand(toolName, data.selectedFeatures as unknown[]);
                }
                break;

            // PropertiesView messages
            case 'propertyChange':
                this._handlePropertyChange(data.property as string, data.value);
                break;

            default:
                console.warn('[DebriefActivityProvider] Unknown message type:', data.type);
        }
    }

    /**
     * Initialize webview with HTML content (only called once)
     */
    private async _initializeWebview(): Promise<void> {
        if (!this._view) return;

        const html = await this._getHtmlForWebview(this._view.webview);
        this._view.webview.html = html;
    }

    /**
     * Setup subscriptions to GlobalController events
     */
    private _setupGlobalControllerSubscriptions(): void {
        // Subscribe to time changes
        const timeSubscription = this._globalController.on('timeChanged', () => {
            this._updateView();
        });
        this._disposables.push(timeSubscription);

        // Subscribe to feature collection changes
        const fcSubscription = this._globalController.on('fcChanged', () => {
            this._updateView();
        });
        this._disposables.push(fcSubscription);

        // Subscribe to selection changes
        const selectionSubscription = this._globalController.on('selectionChanged', () => {
            this._updateView();
        });
        this._disposables.push(selectionSubscription);

        // Subscribe to viewport changes
        const viewportSubscription = this._globalController.on('viewportChanged', () => {
            this._updateView();
        });
        this._disposables.push(viewportSubscription);

        // Subscribe to active editor changes
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', () => {
            this._updateView();
        });
        this._disposables.push(activeEditorSubscription);

        // Subscribe to Tool Vault server ready events
        const toolVaultReadySubscription = this._globalController.on('toolVaultReady', async () => {
            console.warn('[DebriefActivityProvider] Tool Vault server ready - resetting failure flag and refreshing activity panel');
            // Reset failure flag and cache to allow fresh fetch
            this._toolListFailed = false;
            this._cachedToolList = null;
            await this._updateView();
        });
        this._disposables.push(toolVaultReadySubscription);
    }

    /**
     * Update the webview by posting state updates (preserves React component state)
     *
     * Note: We always use _postStateUpdate() to avoid destroying the React component tree
     * and losing internal state like panel sizes. HTML is only generated once during
     * resolveWebviewView().
     */
    private async _updateView(): Promise<void> {
        if (!this._view) return;

        // Always update via message to preserve React component state
        await this._postStateUpdate();
    }

    /**
     * Post state update message to existing webview
     *
     * This sends new props to the React component via updateProps(), preserving
     * component internal state (like panel sizes) instead of destroying and
     * recreating the entire component tree.
     */
    private async _postStateUpdate(): Promise<void> {
        if (!this._view) return;

        const currentState = await this._getCurrentState();
        this._view.webview.postMessage({
            type: 'updateState',
            ...currentState
        });
    }

    /**
     * Get current state for all sub-components
     */
    private async _getCurrentState(): Promise<{
        timeState: TimeState | null;
        featureCollection: DebriefFeatureCollection | null;
        selectedFeatureIds: string[];
        toolList: unknown;
        currentState: CurrentState | null;
        selectedFeatureProperties: Property[];
    }> {
        const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];

        if (!currentEditorId) {
            return {
                timeState: null,
                featureCollection: null,
                selectedFeatureIds: [],
                toolList: null,
                currentState: null,
                selectedFeatureProperties: []
            };
        }

        const editorState = this._globalController.getEditorState(currentEditorId);
        const filename = this._globalController.getEditorFilename(currentEditorId) || '';
        const history = this._globalController.getHistory(currentEditorId);
        const historyCount = Array.isArray(history) ? history.length : 0;

        const timeState = editorState?.timeState || null;
        const featureCollection = this._globalController.getStateSlice(currentEditorId, 'featureCollection') || null;
        const selectionState = this._globalController.getStateSlice(currentEditorId, 'selectionState') || { selectedIds: [] };
        const selectedFeatureIds = Array.isArray(selectionState.selectedIds)
            ? selectionState.selectedIds.map(id => String(id))
            : [];

        // Get tool list (stop trying after first failure until Tool Vault becomes ready)
        let toolList: unknown = null;
        if (this._toolListFailed) {
            // Tool Vault server failed to load - use cached value (null) until toolVaultReady event
            toolList = this._cachedToolList;
        } else if (this._cachedToolList !== null) {
            // We have a successful cached value
            toolList = this._cachedToolList;
        } else {
            // First attempt or retry after toolVaultReady
            try {
                toolList = await this._globalController.getToolIndex();
                if (!toolList || typeof toolList !== 'object') {
                    toolList = null;
                } else if (!('root' in toolList) || !Array.isArray((toolList as Record<string, unknown>).root)) {
                    toolList = null;
                }
                // Cache the successful result
                this._cachedToolList = toolList;
            } catch {
                // Mark as failed to prevent repeated attempts
                this._toolListFailed = true;
                this._cachedToolList = null;
                toolList = null;
            }
        }

        // Get properties for selected feature
        const selectedFeatureProperties = this._getSelectedFeatureProperties(featureCollection, selectedFeatureIds);

        // Build current state for CurrentStateTable
        const currentState: CurrentState = {
            editorId: currentEditorId,
            filename,
            editorState,
            historyCount
        };

        return {
            timeState,
            featureCollection,
            selectedFeatureIds,
            toolList,
            currentState,
            selectedFeatureProperties
        };
    }

    /**
     * Get properties for the first selected feature
     */
    private _getSelectedFeatureProperties(featureCollection: DebriefFeatureCollection | null, selectedFeatureIds: string[]): Property[] {
        if (!featureCollection || !Array.isArray(featureCollection.features) || selectedFeatureIds.length === 0) {
            return [];
        }

        // Find the first selected feature
        const selectedFeature = featureCollection.features.find((feature: DebriefFeature) => {
            const id = feature.id !== undefined ? String(feature.id) : undefined;
            return id && selectedFeatureIds.includes(id);
        });

        if (!selectedFeature) {
            return [];
        }

        const properties: Property[] = [];

        // Add feature ID if present
        if (selectedFeature.id !== undefined) {
            properties.push({
                key: 'ID',
                value: String(selectedFeature.id),
                type: 'string'
            });
        }

        // Add feature properties
        if (selectedFeature.properties && Object.keys(selectedFeature.properties).length > 0) {
            Object.entries(selectedFeature.properties).forEach(([key, value]) => {
                properties.push({
                    key,
                    value: value as string | number | boolean,
                    type: typeof value as 'string' | 'number' | 'boolean'
                });
            });
        }

        // Add geometry information
        if (selectedFeature.geometry) {
            properties.push({
                key: 'Geometry Type',
                value: selectedFeature.geometry.type,
                type: 'string'
            });
        }

        return properties;
    }

    /**
     * Handle time change from TimeController
     */
    private _handleTimeChange(newTimeISO: string): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            const currentTimeState = this._globalController.getStateSlice(activeEditorId, 'timeState');
            const updatedTimeState: TimeState = {
                current: newTimeISO,
                start: currentTimeState?.start || new Date(new Date(newTimeISO).getTime() - 3600000).toISOString(),
                end: currentTimeState?.end || new Date(new Date(newTimeISO).getTime() + 3600000).toISOString()
            };
            this._globalController.updateState(activeEditorId, 'timeState', updatedTimeState);
        }
    }

    /**
     * Handle stop action from TimeController
     */
    private _handleStop(): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            const currentTimeState = this._globalController.getStateSlice(activeEditorId, 'timeState');
            if (currentTimeState && currentTimeState.start && currentTimeState.end) {
                const updatedTimeState: TimeState = {
                    current: currentTimeState.start,
                    start: currentTimeState.start,
                    end: currentTimeState.end
                };
                this._globalController.updateState(activeEditorId, 'timeState', updatedTimeState);
            }
        }
    }

    /**
     * Handle opening time controller settings
     */
    private _handleOpenSettings(): void {
        void vscode.commands.executeCommand('workbench.action.openSettings', 'debrief.timeController.format');
    }

    /**
     * Handle visibility change from OutlineView
     */
    private _handleVisibilityChange(editorId: string, featureId: string, visible: boolean): void {
        const featureCollection = this._globalController.getStateSlice(editorId, 'featureCollection');
        if (featureCollection && featureCollection.features) {
            const updatedFeatures = featureCollection.features.map((feature: DebriefFeature) => {
                if (String(feature.id) === featureId) {
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            visible: visible
                        }
                    } as typeof feature;
                }
                return feature;
            });

            const updatedFeatureCollection: DebriefFeatureCollection = {
                ...featureCollection,
                features: updatedFeatures
            };

            this._globalController.updateState(editorId, 'featureCollection', updatedFeatureCollection);
        }
    }

    /**
     * Handle property changes from PropertiesView
     */
    private _handlePropertyChange(property: string, value: unknown): void {
        // TODO: Implement property editing functionality
        console.warn('Property change requested:', property, value);
    }

    /**
     * Execute a tool command
     */
    private async _executeToolCommand(commandName: string, selectedFeatures: unknown[]): Promise<void> {
        try {
            const toolIndex = await this._globalController.getToolIndex() as { root: unknown[] };
            if (!toolIndex || !Array.isArray(toolIndex.root)) {
                throw new Error('Tool index not available');
            }

            // Collect all tools from tree structure
            function collectTools(nodes: unknown[]): unknown[] {
                const tools: unknown[] = [];
                for (const node of nodes) {
                    const nodeObj = node as Record<string, unknown>;
                    if (nodeObj.type === 'tool') {
                        tools.push(node);
                    } else if (nodeObj.type === 'category' && Array.isArray(nodeObj.children)) {
                        tools.push(...collectTools(nodeObj.children));
                    }
                }
                return tools;
            }

            const allTools = collectTools(toolIndex.root);
            const toolSchema = allTools.find((tool: unknown) => (tool as { name: string }).name === commandName) as ToolSchema | undefined;

            if (!toolSchema) {
                throw new Error(`Tool schema not found for "${commandName}"`);
            }

            const typedSelectedFeatures = selectedFeatures as DebriefFeature[];

            if (this._globalController.toolRequiresUserInput(toolSchema)) {
                const userParams = this._globalController.getUserInputParameters(toolSchema);
                const userInputValues: Record<string, unknown> = {};

                for (const param of userParams) {
                    if (param.parameterName === 'lat_interval') {
                        userInputValues.lat_interval = 0.1;
                    } else if (param.parameterName === 'lon_interval') {
                        userInputValues.lon_interval = 0.1;
                    } else if (param.parameterName === 'min_speed' && param.defaultValue !== undefined) {
                        userInputValues.min_speed = param.defaultValue;
                    }
                }

                const result = await this._globalController.executeToolWithInjection(
                    toolSchema,
                    typedSelectedFeatures,
                    userInputValues
                );

                if (result.success) {
                    this._handleToolExecutionSuccess(commandName, result.result);
                }
            } else {
                const result = await this._globalController.executeToolWithInjection(
                    toolSchema,
                    typedSelectedFeatures
                );

                if (result.success) {
                    this._handleToolExecutionSuccess(commandName, result.result);
                }
            }

        } catch (error) {
            const errorMessage = `Failed to execute tool "${commandName}": ${error instanceof Error ? error.message : String(error)}`;
            console.error('[DebriefActivityProvider] Tool execution error:', error);
            vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * Handle successful tool execution
     */
    private _handleToolExecutionSuccess(commandName: string, result: unknown): void {
        console.warn('[DebriefActivityProvider] Tool execution success:', result);

        const hasDebriefCommands = this._containsDebriefCommands(result);

        if (hasDebriefCommands) {
            // Tool updated plot - no notification needed on success
            console.warn(`[DebriefActivityProvider] Tool "${commandName}" executed successfully and plot updated`);
        } else {
            // Store result for later access
            this._lastToolResult = { commandName, result };

            // Log success without showing notification
            console.warn(`[DebriefActivityProvider] Tool "${commandName}" executed successfully - use "View Last Tool Result" command to access output`);
        }
    }

    /**
     * Show tool results in a new document
     */
    private async _showToolResults(toolName: string, results: unknown): Promise<void> {
        try {
            const formattedResults = JSON.stringify(results, null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `tool-results-${toolName}-${timestamp}.json`;

            const document = await vscode.workspace.openTextDocument({
                content: formattedResults,
                language: 'json'
            });

            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage(`Tool results opened in new document. Save as "${fileName}" if needed.`);
        } catch (error) {
            console.error('[DebriefActivityProvider] Error showing tool results:', error);
            vscode.window.showErrorMessage(`Failed to show tool results: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Copy tool results to clipboard
     */
    private async _copyToolResults(results: unknown): Promise<void> {
        try {
            const formattedResults = JSON.stringify(results, null, 2);
            await vscode.env.clipboard.writeText(formattedResults);
            vscode.window.showInformationMessage('Tool results copied to clipboard');
        } catch (error) {
            console.error('[DebriefActivityProvider] Error copying tool results:', error);
            vscode.window.showErrorMessage(`Failed to copy tool results: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check if result contains DebriefCommands
     */
    private _containsDebriefCommands(result: unknown): boolean {
        if (!result || typeof result !== 'object') {
            return false;
        }

        if (this._isDebriefCommand(result)) {
            return true;
        }

        if (Array.isArray(result)) {
            return result.some(item => this._isDebriefCommand(item));
        }

        if ('commands' in result && Array.isArray((result as Record<string, unknown>).commands)) {
            return ((result as Record<string, unknown>).commands as unknown[]).some(item => this._isDebriefCommand(item));
        }

        return false;
    }

    /**
     * Type guard to check if an object is a DebriefCommand
     */
    private _isDebriefCommand(obj: unknown): boolean {
        return (
            typeof obj === 'object' &&
            obj !== null &&
            'command' in obj &&
            'payload' in obj &&
            typeof (obj as Record<string, unknown>).command === 'string'
        );
    }

    /**
     * Check if Tool Vault server is already ready when the provider initializes
     */
    private async _checkInitialToolVaultState(): Promise<void> {
        try {
            console.warn('[DebriefActivityProvider] Checking initial Tool Vault server state');
            const toolIndex = await this._globalController.getToolIndex();
            if (toolIndex) {
                console.warn('[DebriefActivityProvider] Tool Vault server already ready - refreshing activity panel');
                await this._updateView();
            }
        } catch (error) {
            console.warn('[DebriefActivityProvider] Tool Vault server not ready yet:', error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Get configured time format from VS Code settings
     */
    private _getTimeFormat(): string {
        const config = vscode.workspace.getConfiguration('debrief');
        return config.get<string>('timeController.format', 'rn-short');
    }

    /**
     * Cleanup subscriptions
     */
    private _cleanup(): void {
        this._disposables.forEach(disposable => disposable.dispose());
        this._disposables = [];
    }

    /**
     * Show last tool result in a new document
     */
    public showLastToolResult(): void {
        if (!this._lastToolResult) {
            vscode.window.showInformationMessage('No tool results available');
            return;
        }

        void this._showToolResults(this._lastToolResult.commandName, this._lastToolResult.result);
    }

    /**
     * Copy last tool result to clipboard
     */
    public copyLastToolResult(): void {
        if (!this._lastToolResult) {
            vscode.window.showInformationMessage('No tool results available');
            return;
        }

        void this._copyToolResults(this._lastToolResult.result);
    }

    /**
     * Dispose of the provider
     */
    public dispose(): void {
        this._cleanup();
    }

    /**
     * Generate HTML for the webview
     */
    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const webComponentsJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.js'));
        const webComponentsCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.css'));

        // Get codicons URI using the VS Code API
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));

        const nonce = getNonce();
        const state = await this._getCurrentState();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${webComponentsCssUri}" rel="stylesheet">
                <link id="vscode-codicon-stylesheet" href="${codiconsUri}" rel="stylesheet">
                <title>Debrief Activity</title>
                <style>
                    .codicon {
                        font-family: 'codicon';
                        font-display: block;
                        font-size: 16px;
                        text-rendering: auto;
                        text-align: center;
                        text-transform: none;
                        line-height: 1;
                        letter-spacing: 0px;
                        will-change: transform;
                    }

                    body {
                        font-family: var(--vscode-font-family, sans-serif);
                        margin: 0;
                        padding: 0;
                        font-size: 12px;
                        overflow: hidden;
                    }
                    #activity-container {
                        height: 100vh;
                        width: 100%;
                    }
                </style>
            </head>
            <body>
                <div id="activity-container"></div>

                <script nonce="${nonce}" src="${webComponentsJsUri}"></script>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const initialState = ${JSON.stringify(state)};
                    const timeFormat = '${this._getTimeFormat()}';

                    // Panel state persistence logic
                    const PANEL_STATE_KEY = 'debrief-activity-panel-states';
                    const FOLDER_STATE_KEY = 'debrief-activity-folder-states';

                    function loadPanelStates() {
                        // First try VS Code webview state (persists during session)
                        const vsCodeState = vscode.getState();
                        if (vsCodeState && vsCodeState.panelStates) {
                            return vsCodeState.panelStates;
                        }

                        // Fallback to localStorage (persists across sessions)
                        try {
                            const stored = localStorage.getItem(PANEL_STATE_KEY);
                            if (stored) {
                                return JSON.parse(stored);
                            }
                        } catch (e) {
                            console.warn('Failed to load panel states from localStorage:', e);
                        }

                        return null;
                    }

                    function savePanelStates(states) {
                        // Save to VS Code webview state
                        const currentState = vscode.getState() || {};
                        vscode.setState({ ...currentState, panelStates: states });

                        // Also save to localStorage for cross-session persistence
                        try {
                            localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(states));
                        } catch (e) {
                            console.warn('Failed to save panel states to localStorage:', e);
                        }
                    }

                    function loadFolderStates() {
                        // First try VS Code webview state (persists during session)
                        const vsCodeState = vscode.getState();
                        if (vsCodeState && vsCodeState.folderStates) {
                            return vsCodeState.folderStates;
                        }

                        // Fallback to localStorage (persists across sessions)
                        try {
                            const stored = localStorage.getItem(FOLDER_STATE_KEY);
                            if (stored) {
                                return JSON.parse(stored);
                            }
                        } catch (e) {
                            console.warn('Failed to load folder states from localStorage:', e);
                        }

                        return null;
                    }

                    function saveFolderStates(states) {
                        // Save to VS Code webview state
                        const currentState = vscode.getState() || {};
                        vscode.setState({ ...currentState, folderStates: states });

                        // Also save to localStorage for cross-session persistence
                        try {
                            localStorage.setItem(FOLDER_STATE_KEY, JSON.stringify(states));
                        } catch (e) {
                            console.warn('Failed to save folder states to localStorage:', e);
                        }
                    }

                    function initializeDebriefActivity() {
                        const container = document.getElementById('activity-container');
                        if (!container || !window.DebriefWebComponents || !window.DebriefWebComponents.createDebriefActivity) {
                            return;
                        }

                        try {
                            // Load saved panel states and folder states
                            const savedPanelStates = loadPanelStates();
                            const savedFolderStates = loadFolderStates();

                            const activityInstance = window.DebriefWebComponents.createDebriefActivity(container, {
                                timeState: initialState.timeState,
                                timeFormat: timeFormat,
                                featureCollection: initialState.featureCollection,
                                selectedFeatureIds: initialState.selectedFeatureIds,
                                toolList: initialState.toolList,
                                currentState: initialState.currentState,
                                selectedFeatureProperties: initialState.selectedFeatureProperties,

                                // Panel state persistence
                                initialPanelStates: savedPanelStates,
                                onPanelStatesChange: (states) => {
                                    savePanelStates(states);
                                },

                                // Folder state persistence
                                initialFolderStates: savedFolderStates,
                                onFolderStatesChange: (states) => {
                                    saveFolderStates(states);
                                },

                                // TimeController callbacks
                                onTimeChange: (time) => {
                                    vscode.postMessage({ type: 'timeChange', value: time });
                                },
                                onOpenSettings: () => {
                                    vscode.postMessage({ type: 'openSettings' });
                                },

                                // OutlineView callbacks
                                onSelectionChange: (ids) => {
                                    vscode.postMessage({ type: 'selectionChanged', selectedIds: ids });
                                },
                                onCommandExecute: (tool, selectedFeatures) => {
                                    vscode.postMessage({ type: 'executeCommand', command: tool, selectedFeatures });
                                },
                                onFeatureVisibilityChange: (id, visible) => {
                                    vscode.postMessage({ type: 'visibilityChanged', featureId: id, visible });
                                },
                                onViewFeature: (id) => {
                                    vscode.postMessage({ type: 'viewFeature', featureId: id });
                                },
                                onDeleteFeatures: (ids) => {
                                    vscode.postMessage({ type: 'deleteFeatures', featureIds: ids });
                                },
                                onCollapseAll: () => {
                                    vscode.postMessage({ type: 'collapseAll' });
                                }
                            });

                            // Listen for state update messages from VS Code
                            window.addEventListener('message', (event) => {
                                const message = event.data;
                                if (message.type === 'updateState' && activityInstance) {
                                    activityInstance.updateProps({
                                        timeState: message.timeState,
                                        featureCollection: message.featureCollection,
                                        selectedFeatureIds: message.selectedFeatureIds,
                                        toolList: message.toolList,
                                        currentState: message.currentState,
                                        selectedFeatureProperties: message.selectedFeatureProperties
                                    });
                                }
                            });

                        } catch (error) {
                            console.error('DebriefActivity initialization error:', error);
                        }
                    }

                    // Wait for DebriefWebComponents to be available
                    if (window.DebriefWebComponents) {
                        initializeDebriefActivity();
                    } else {
                        let attempts = 0;
                        const checkInterval = setInterval(() => {
                            attempts++;
                            if (window.DebriefWebComponents) {
                                clearInterval(checkInterval);
                                initializeDebriefActivity();
                            } else if (attempts > 50) {
                                clearInterval(checkInterval);
                                console.error('DebriefActivity: DebriefWebComponents not loaded within timeout');
                            }
                        }, 100);
                    }
                </script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
