import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { SelectionState } from '@debrief/shared-types/derived/typescript/selectionstate';

export class PropertiesViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.propertiesView';

    private _view?: vscode.WebviewView;
    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];
    private _currentEditorId?: string;

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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'propertyChange':
                    this._handlePropertyChange(data.property, data.value);
                    break;
            }
        });

        // Setup GlobalController subscriptions
        this._setupGlobalControllerSubscriptions();

        // Initialize with current active editor state
        this._updateFromActiveEditor();
    }

    /**
     * Setup subscriptions to GlobalController events
     */
    private _setupGlobalControllerSubscriptions(): void {
        // Subscribe to selection changes
        const selectionSubscription = this._globalController.on('selectionChanged', (data) => {
            if (data.editorId === this._currentEditorId) {
                this._updateSelectedFeatureDisplay(data.editorId, data.state.selectionState);
            }
        });
        this._disposables.push(selectionSubscription);

        // Subscribe to feature collection changes
        const fcSubscription = this._globalController.on('fcChanged', (data) => {
            if (data.editorId === this._currentEditorId) {
                // Re-display selected feature with updated data
                const selectionState = data.state.selectionState;
                this._updateSelectedFeatureDisplay(data.editorId, selectionState);
            }
        });
        this._disposables.push(fcSubscription);

        // Subscribe to active editor changes
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', (data) => {
            this._currentEditorId = data.currentEditorId;
            if (data.currentEditorId) {
                const state = this._globalController.getEditorState(data.currentEditorId);
                this._updateSelectedFeatureDisplay(data.currentEditorId, state.selectionState);
            } else {
                this._clearFeatureDisplay();
            }
        });
        this._disposables.push(activeEditorSubscription);

        // Initialize with current active editor
        this._currentEditorId = this._globalController.activeEditorId;
    }

    /**
     * Initialize with current active editor state
     */
    private _updateFromActiveEditor(): void {
        if (this._currentEditorId) {
            const state = this._globalController.getEditorState(this._currentEditorId);
            this._updateSelectedFeatureDisplay(this._currentEditorId, state.selectionState);
        }
    }

    /**
     * Update the properties display based on current selection
     */
    private _updateSelectedFeatureDisplay(editorId: string, selectionState?: SelectionState): void {
        if (!this._view || !selectionState || !selectionState.selectedIds || selectionState.selectedIds.length === 0) {
            this._clearFeatureDisplay();
            return;
        }

        try {
            const featureCollection = this._globalController.getStateSlice(editorId, 'featureCollection');
            if (!featureCollection || !Array.isArray(featureCollection.features)) {
                this._clearFeatureDisplay();
                return;
            }

            // Find all selected features by id (string match)
            const selectedFeatures = featureCollection.features.filter((feature: any) => {
                const id = feature.id !== undefined ? String(feature.id) : undefined;
                return id && selectionState.selectedIds.includes(id);
            });

            // Fallback: if no id match, try index match (legacy)
            if (selectedFeatures.length === 0) {
                for (const selId of selectionState.selectedIds) {
                    const idx = typeof selId === 'string' ? parseInt(selId, 10) : selId;
                    if (!isNaN(idx) && featureCollection.features[idx]) {
                        selectedFeatures.push(featureCollection.features[idx]);
                    }
                }
            }

            if (selectedFeatures.length > 0) {
                // For now, show the first selected feature (could be extended to show all)
                const selectedFeature = selectedFeatures[0];
                this._view.webview.postMessage({
                    type: 'featureSelected',
                    feature: {
                        id: selectedFeature.id?.toString(),
                        properties: selectedFeature.properties,
                        geometry: selectedFeature.geometry
                    }
                });
            } else {
                this._clearFeatureDisplay();
            }
        } catch (error) {
            console.error('Error updating selected feature display:', error);
            this._clearFeatureDisplay();
        }
    }

    /**
     * Clear the feature display
     */
    private _clearFeatureDisplay(): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'featureSelected',
                feature: null
            });
        }
    }

    /**
     * Handle property changes from the webview
     */
    private _handlePropertyChange(property: string, value: unknown): void {
        // TODO: Implement property editing functionality
        // This would update the feature in the feature collection and trigger
        // a state update through GlobalController
        console.log('Property change requested:', property, value);
    }

    /**
     * Dispose of the provider
     */
    public dispose(): void {
        this._disposables.forEach(disposable => disposable.dispose());
        this._disposables = [];
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <title>Properties View</title>
                <style>
                    .properties-container {
                        padding: 10px;
                    }
                    .property-group {
                        margin-bottom: 15px;
                    }
                    .property-group h3 {
                        font-size: 14px;
                        margin-bottom: 8px;
                        color: var(--vscode-editor-foreground);
                        border-bottom: 1px solid var(--vscode-widget-border);
                        padding-bottom: 4px;
                    }
                    .property-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 6px;
                        padding: 4px;
                        border-radius: 3px;
                    }
                    .property-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .property-label {
                        font-weight: 500;
                        font-size: 12px;
                        min-width: 80px;
                    }
                    .property-value {
                        font-size: 11px;
                        font-family: monospace;
                        color: var(--vscode-debugConsole-infoForeground);
                        word-break: break-all;
                        text-align: right;
                        flex: 1;
                        margin-left: 8px;
                    }
                    .no-selection {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        padding: 20px;
                    }
                    .geometry-info {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        padding: 8px;
                        border-radius: 4px;
                        margin-bottom: 10px;
                    }
                    .coordinates {
                        max-height: 150px;
                        overflow-y: auto;
                        font-size: 10px;
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 6px;
                        border-radius: 3px;
                    }
                </style>
            </head>
            <body>
                <div class="properties-container" id="propertiesContainer">
                    <div class="no-selection">
                        Select a feature to view its properties
                    </div>
                </div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const container = document.getElementById('propertiesContainer');

                    function displayFeatureProperties(feature) {
                        if (!feature) {
                            container.innerHTML = '<div class="no-selection">Select a feature to view its properties</div>';
                            return;
                        }

                        let html = '';

                        // Feature Properties
                        if (feature.properties && Object.keys(feature.properties).length > 0) {
                            html += '<div class="property-group">';
                            html += '<h3>Properties</h3>';
                            for (const [key, value] of Object.entries(feature.properties)) {
                                html += '<div class="property-item">';
                                html += '<div class="property-label">' + escapeHtml(key) + ':</div>';
                                html += '<div class="property-value">' + escapeHtml(String(value)) + '</div>';
                                html += '</div>';
                            }
                            html += '</div>';
                        }

                        // Geometry Information
                        if (feature.geometry) {
                            html += '<div class="property-group">';
                            html += '<h3>Geometry</h3>';
                            html += '<div class="geometry-info">';
                            html += '<div class="property-item">';
                            html += '<div class="property-label">Type:</div>';
                            html += '<div class="property-value">' + escapeHtml(feature.geometry.type) + '</div>';
                            html += '</div>';
                            
                            if (feature.geometry.coordinates) {
                                html += '<div class="property-item">';
                                html += '<div class="property-label">Coordinates:</div>';
                                html += '</div>';
                                html += '<div class="coordinates">';
                                html += '<pre>' + JSON.stringify(feature.geometry.coordinates, null, 2) + '</pre>';
                                html += '</div>';
                            }
                            html += '</div>';
                            html += '</div>';
                        }

                        // Feature ID if present
                        if (feature.id !== undefined) {
                            html += '<div class="property-group">';
                            html += '<h3>Feature ID</h3>';
                            html += '<div class="property-item">';
                            html += '<div class="property-label">ID:</div>';
                            html += '<div class="property-value">' + escapeHtml(String(feature.id)) + '</div>';
                            html += '</div>';
                            html += '</div>';
                        }

                        container.innerHTML = html;
                    }

                    function escapeHtml(text) {
                        const map = {
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            "'": '&#039;'
                        };
                        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'featureSelected':
                                displayFeatureProperties(message.feature);
                                break;
                            case 'stateUpdate':
                                // Handle general state updates if needed
                                break;
                        }
                    });

                    // Initial state
                    displayFeatureProperties(null);
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