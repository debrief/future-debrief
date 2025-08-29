import * as vscode from 'vscode';

export class PlotJsonEditorProvider implements vscode.CustomTextEditorProvider {
    private static outlineUpdateCallback: ((document: vscode.TextDocument) => void) | undefined;
    private static activeWebviewPanel: vscode.WebviewPanel | undefined;
    private static currentSelectionState: { [filename: string]: string[] } = {};

    public static setOutlineUpdateCallback(callback: (document: vscode.TextDocument) => void): void {
        PlotJsonEditorProvider.outlineUpdateCallback = callback;
    }

    public static sendMessageToActiveWebview(message: any): void {
        if (PlotJsonEditorProvider.activeWebviewPanel) {
            PlotJsonEditorProvider.activeWebviewPanel.webview.postMessage(message);
        }
    }

    public static getSelectedFeatures(filename: string): string[] {
        return PlotJsonEditorProvider.currentSelectionState[filename] || [];
    }

    public static setSelectedFeatures(filename: string, featureIds: string[]): void {
        PlotJsonEditorProvider.currentSelectionState[filename] = [...featureIds];
        
        // Convert feature IDs to indices and send to webview
        if (PlotJsonEditorProvider.activeWebviewPanel) {
            PlotJsonEditorProvider.activeWebviewPanel.webview.postMessage({
                type: 'setSelectionByIds',
                featureIds: featureIds
            });
        }
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new PlotJsonEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider('plotJsonEditor', provider);
        return providerRegistration;
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Note: Document Activation Trigger removed - it conflicts with custom editor display

        // Track this as the active webview panel
        PlotJsonEditorProvider.activeWebviewPanel = webviewPanel;

        // Notify outline tree that this document is now active
        if (PlotJsonEditorProvider.outlineUpdateCallback) {
            PlotJsonEditorProvider.outlineUpdateCallback(document);
        }

        // Listen for when this webview panel becomes visible (tab switching)
        webviewPanel.onDidChangeViewState(() => {
            if (webviewPanel.visible) {
                PlotJsonEditorProvider.activeWebviewPanel = webviewPanel;
                if (PlotJsonEditorProvider.outlineUpdateCallback) {
                    PlotJsonEditorProvider.outlineUpdateCallback(document);
                }
            }
        });

        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        function updateWebview() {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        }

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            // Clear active webview reference if this panel is disposed
            if (PlotJsonEditorProvider.activeWebviewPanel === webviewPanel) {
                PlotJsonEditorProvider.activeWebviewPanel = undefined;
            }
        });

        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'add':
                    this.addNewPoint(document);
                    return;

                case 'addPoint':
                    this.addPointAtLocation(document, e.lat, e.lng);
                    return;

                case 'delete':
                    this.deleteScratch(document, e.id);
                    return;

                case 'selectionChanged':
                    // Update selection state when user clicks features in webview
                    const filename = document.fileName;
                    PlotJsonEditorProvider.currentSelectionState[filename] = e.selectedFeatureIds;
                    console.log(`🔄 Selection updated for ${filename}:`);
                    console.log('  Selected feature IDs:', e.selectedFeatureIds);
                    console.log('  Selected indices:', e.selectedIndices);
                    console.log('  Current selection state:', PlotJsonEditorProvider.currentSelectionState);
                    return;
            }
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'plotJsonEditor.js'));

        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'reset.css'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'vscode.css'));

        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'plotJsonEditor.css'));

        const markerIconUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'marker-icon.png'));
        const markerIcon2xUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'marker-icon-2x.png'));
        const markerShadowUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'marker-shadow.png'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} https://unpkg.com; script-src 'nonce-${nonce}' https://unpkg.com; img-src ${webview.cspSource} https://*.tile.openstreetmap.org data:; connect-src https://*.tile.openstreetmap.org;">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
					integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
				<title>Plot JSON Editor</title>
			</head>
			<body>
				<div class="plot-editor">
					<div id="map"></div>
				</div>
				<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
					integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
				<script nonce="${nonce}">
					// Configure Leaflet icon paths
					delete L.Icon.Default.prototype._getIconUrl;
					L.Icon.Default.mergeOptions({
						iconUrl: '${markerIconUri}',
						iconRetinaUrl: '${markerIcon2xUri}',
						shadowUrl: '${markerShadowUri}',
					});
				</script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }

    private addNewPoint(document: vscode.TextDocument) {
        const json = this.getDocumentAsJson(document);
        if (!json.features) {
            json.features = [];
        }

        json.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [0, 0]
            },
            properties: {
                name: `Point ${json.features.length + 1}`
            }
        });

        return this.updateTextDocument(document, json);
    }

    private addPointAtLocation(document: vscode.TextDocument, lat: number, lng: number) {
        const json = this.getDocumentAsJson(document);
        if (!json.features) {
            json.features = [];
        }

        json.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lng, lat] // GeoJSON uses [longitude, latitude]
            },
            properties: {
                name: `Point at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
            }
        });

        return this.updateTextDocument(document, json);
    }

    private deleteScratch(document: vscode.TextDocument, id: string) {
        const json = this.getDocumentAsJson(document);
        if (!json.features) {
            return;
        }

        json.features = json.features.filter((feature: any, index: number) => index.toString() !== id);

        return this.updateTextDocument(document, json);
    }

    private getDocumentAsJson(document: vscode.TextDocument): any {
        const text = document.getText();
        if (text.trim().length === 0) {
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Could not get document as json. Content is not valid json');
        }
    }

    private updateTextDocument(document: vscode.TextDocument, json: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(json, null, 2));

        return vscode.workspace.applyEdit(edit);
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