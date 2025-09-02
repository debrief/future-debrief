import * as vscode from 'vscode';

export class PropertiesViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.propertiesView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

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
                    console.log('Property changed:', data.property, data.value);
                    break;
            }
        });
    }

    public updateState(state: any) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'stateUpdate',
                state: state
            });
        }
    }

    public updateSelectedFeature(feature: any) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'featureSelected',
                feature: feature
            });
        }
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