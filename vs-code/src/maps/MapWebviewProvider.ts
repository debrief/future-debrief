import * as vscode from 'vscode';

export class MapWebviewProvider {
    constructor(private readonly extensionUri: vscode.Uri) {}

    public getHtmlForWebview(webview: vscode.Webview): string {
        const mapScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'map-components.js'));
        const leafletCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'leaflet', 'dist', 'leaflet.css'));
        const leafletJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'leaflet', 'dist', 'leaflet.js'));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
        style-src ${webview.cspSource} 'unsafe-inline' https:; 
        script-src ${webview.cspSource} 'unsafe-eval';
        img-src ${webview.cspSource} https: data:;
        connect-src https:;">
    <title>Debrief Map Editor</title>
    <link rel="stylesheet" href="${leafletCssUri}">
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
        }

        .header {
            padding: 8px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .title {
            font-size: 1.1em;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin: 0;
        }

        .subtitle {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin: 2px 0 0 0;
        }

        .map-container {
            height: calc(100vh - 60px);
            width: 100%;
            position: relative;
        }

        #map {
            height: 100%;
            width: 100%;
        }

        .error-container {
            padding: 16px;
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            margin: 16px;
            border-radius: 4px;
            display: none;
        }

        .error-title {
            font-weight: 600;
            margin-bottom: 8px;
        }

        .fallback-json {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            padding: 16px;
            white-space: pre-wrap;
            overflow: auto;
            max-height: calc(100vh - 120px);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: none;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 60px);
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">Debrief Map View</h1>
        <p class="subtitle">Interactive map visualization of GeoJSON data</p>
    </div>
    
    <div class="map-container">
        <div id="map"></div>
        <div class="loading" id="loading">Loading map...</div>
    </div>

    <div class="error-container" id="error">
        <div class="error-title">Map Error</div>
        <div id="error-message"></div>
    </div>

    <div class="fallback-json" id="fallback-json"></div>

    <script src="${leafletJsUri}"></script>
    <script type="module" src="${mapScriptUri}"></script>
</body>
</html>`;
    }
}