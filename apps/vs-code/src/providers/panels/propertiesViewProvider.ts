import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { SelectionState, DebriefFeature } from '@debrief/shared-types';

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
                this._updateSelectedFeatureDisplay(data.editorId, data.state.selectionState || undefined);
            }
        });
        this._disposables.push(selectionSubscription);

        // Subscribe to feature collection changes
        const fcSubscription = this._globalController.on('fcChanged', (data) => {
            if (data.editorId === this._currentEditorId) {
                // Re-display selected feature with updated data
                const selectionState = data.state.selectionState;
                this._updateSelectedFeatureDisplay(data.editorId, selectionState || undefined);
            }
        });
        this._disposables.push(fcSubscription);

        // Subscribe to active editor changes
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', (data) => {
            this._currentEditorId = data.currentEditorId;
            if (data.currentEditorId) {
                const state = this._globalController.getEditorState(data.currentEditorId);
                this._updateSelectedFeatureDisplay(data.currentEditorId, state.selectionState || undefined);
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
            this._updateSelectedFeatureDisplay(this._currentEditorId, state.selectionState || undefined);
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
            const selectedFeatures = featureCollection.features.filter((feature: DebriefFeature) => {
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
        console.warn('Property change requested:', property, value);
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
        const webComponentsCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.css'));
        const webComponentsJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${webComponentsCssUri}" rel="stylesheet">
                <title>Properties View</title>
                <style>
                    .properties-container {
                        padding: 10px;
                    }
                    .no-selection {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        padding: 20px;
                    }
                </style>
            </head>
            <body>
                <div id="root" class="properties-container">
                    <div class="no-selection">
                        Select a feature to view its properties
                    </div>
                </div>
                <script nonce="${nonce}" src="${webComponentsJsUri}"></script>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentFeature = null;
                    let root = null;

                    // Wait for React to be available
                    function initializeReact() {
                        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
                            setTimeout(initializeReact, 100);
                            return;
                        }

                        // Create React root
                        const container = document.getElementById('root');
                        root = ReactDOM.createRoot(container);
                        
                        // Initial render
                        renderPropertiesView(null);
                    }

                    function transformFeatureToProperties(feature) {
                        if (!feature) return [];
                        
                        const properties = [];
                        
                        // Add feature ID if present
                        if (feature.id !== undefined) {
                            properties.push({
                                key: 'ID',
                                value: String(feature.id),
                                type: 'string'
                            });
                        }
                        
                        // Add feature properties
                        if (feature.properties && Object.keys(feature.properties).length > 0) {
                            Object.entries(feature.properties).forEach(([key, value]) => {
                                properties.push({
                                    key,
                                    value: value,
                                    type: typeof value
                                });
                            });
                        }
                        
                        // Add geometry information
                        if (feature.geometry) {
                            properties.push({
                                key: 'Geometry Type',
                                value: feature.geometry.type,
                                type: 'string'
                            });
                            
                            if (feature.geometry.coordinates) {
                                properties.push({
                                    key: 'Coordinates',
                                    value: JSON.stringify(feature.geometry.coordinates),
                                    type: 'string'
                                });
                            }
                        }
                        
                        return properties;
                    }

                    function renderPropertiesView(feature) {
                        if (!root) return;
                        
                        currentFeature = feature;
                        const properties = transformFeatureToProperties(feature);
                        
                        if (properties.length === 0) {
                            root.render(React.createElement('div', {
                                className: 'no-selection'
                            }, 'Select a feature to view its properties'));
                        } else {
                            // Use the PropertiesView component from the web-components bundle
                            // Assuming it's available as window.DebriefWebComponents.PropertiesView or similar
                            const PropertiesView = window.DebriefWebComponents?.PropertiesView || 
                                                 window.PropertiesView ||
                                                 (() => React.createElement('div', null, 'PropertiesView component not found'));
                            
                            root.render(React.createElement(PropertiesView, {
                                properties: properties,
                                title: 'Feature Properties',
                                readonly: true,
                                onPropertyChange: (key, value) => {
                                    // Handle property changes
                                    vscode.postMessage({
                                        type: 'propertyChange',
                                        property: key,
                                        value: value
                                    });
                                }
                            }));
                        }
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'featureSelected':
                                renderPropertiesView(message.feature);
                                break;
                            case 'stateUpdate':
                                // Handle general state updates if needed
                                break;
                        }
                    });

                    // Initialize React when DOM is ready
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initializeReact);
                    } else {
                        initializeReact();
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