import * as vscode from 'vscode';
import { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types/derived/typescript/featurecollection';
import { validateFeatureCollectionComprehensive, getFeatureCounts } from '@debrief/shared-types/validators/typescript';

export class PlotJsonEditorProvider implements vscode.CustomTextEditorProvider {
    private static outlineUpdateCallback: ((document: vscode.TextDocument) => void) | undefined;
    private static activeWebviewPanel: vscode.WebviewPanel | undefined;
    private static currentSelectionState: { [filename: string]: string[] } = {};
    private static mapViewState: { [filename: string]: { center: [number, number], zoom: number } } = {};
    private static wasHidden: { [filename: string]: boolean } = {};

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

    public static saveMapViewState(filename: string, center: [number, number], zoom: number): void {
        PlotJsonEditorProvider.mapViewState[filename] = { center, zoom };
    }

    public static getMapViewState(filename: string): { center: [number, number], zoom: number } | undefined {
        return PlotJsonEditorProvider.mapViewState[filename];
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
        
        // Validate the document and check if it's valid
        let validationError: string | null = null;
        try {
            this.getDocumentAsJson(document, true); // This will throw on validation error
        } catch (error) {
            validationError = error instanceof Error ? error.message : String(error);
        }
        
        // Note: Document Activation Trigger removed - it conflicts with custom editor display

        // Track this as the active webview panel
        PlotJsonEditorProvider.activeWebviewPanel = webviewPanel;

        // Notify outline tree that this document is now active
        if (PlotJsonEditorProvider.outlineUpdateCallback) {
            PlotJsonEditorProvider.outlineUpdateCallback(document);
        }

        // Listen for when this webview panel becomes visible (tab switching)
        webviewPanel.onDidChangeViewState(() => {
            const filename = document.fileName;
            
            if (webviewPanel.visible) {
                PlotJsonEditorProvider.activeWebviewPanel = webviewPanel;
                if (PlotJsonEditorProvider.outlineUpdateCallback) {
                    PlotJsonEditorProvider.outlineUpdateCallback(document);
                }
                
                // Only restore state and force update if this tab was previously hidden
                if (PlotJsonEditorProvider.wasHidden[filename]) {
                    PlotJsonEditorProvider.wasHidden[filename] = false;
                    
                    // Send document content when tab becomes visible after being hidden
                    updateWebview();
                    
                    // Restore map state when tab becomes visible after being hidden
                    const savedState = PlotJsonEditorProvider.getMapViewState(filename);
                    if (savedState) {
                        webviewPanel.webview.postMessage({
                            type: 'restoreMapState',
                            center: savedState.center,
                            zoom: savedState.zoom
                        });
                    }
                    
                    // Restore selection state
                    const savedSelection = PlotJsonEditorProvider.getSelectedFeatures(filename);
                    if (savedSelection.length > 0) {
                        webviewPanel.webview.postMessage({
                            type: 'setSelectionByIds',
                            featureIds: savedSelection
                        });
                    }
                }
            } else {
                PlotJsonEditorProvider.wasHidden[filename] = true;
                // Tab is becoming hidden, request current map state to save it
                webviewPanel.webview.postMessage({
                    type: 'requestMapState'
                });
            }
        });

        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document, validationError);

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
                    return;

                case 'mapStateSaved':
                    // Save map view state when requested, but only if this is the active webview
                    if (PlotJsonEditorProvider.activeWebviewPanel === webviewPanel) {
                        const saveFilename = document.fileName;
                        PlotJsonEditorProvider.saveMapViewState(saveFilename, e.center, e.zoom);
                    }
                    return;

                case 'requestSavedState':
                    // Webview is asking if there's saved state to restore
                    const requestFilename = document.fileName;
                    const savedState = PlotJsonEditorProvider.getMapViewState(requestFilename);
                    if (savedState) {
                        webviewPanel.webview.postMessage({
                            type: 'restoreMapState',
                            center: savedState.center,
                            zoom: savedState.zoom
                        });
                    }
                    return;
            }
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument, validationError?: string | null): string {
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

        // If there's a validation error, show error page instead of map
        if (validationError) {
            return `<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${styleResetUri}" rel="stylesheet">
					<link href="${styleVSCodeUri}" rel="stylesheet">
					<title>Plot JSON Editor - Validation Error</title>
					<style>
						body {
							padding: 20px;
							font-family: var(--vscode-font-family);
							background-color: var(--vscode-editor-background);
							color: var(--vscode-editor-foreground);
						}
						.error-container {
							max-width: 800px;
							margin: 0 auto;
						}
						.error-header {
							color: var(--vscode-errorForeground);
							font-size: 1.2em;
							font-weight: bold;
							margin-bottom: 15px;
							display: flex;
							align-items: center;
						}
						.error-icon {
							margin-right: 8px;
							font-size: 1.5em;
						}
						.error-message {
							background-color: var(--vscode-inputValidation-errorBackground);
							border: 1px solid var(--vscode-inputValidation-errorBorder);
							padding: 15px;
							border-radius: 4px;
							margin-bottom: 20px;
							white-space: pre-wrap;
							font-family: var(--vscode-editor-font-family);
						}
						.help-text {
							color: var(--vscode-descriptionForeground);
							line-height: 1.5;
						}
						.requirements {
							background-color: var(--vscode-textBlockQuote-background);
							border-left: 4px solid var(--vscode-textBlockQuote-border);
							padding: 15px;
							margin-top: 15px;
						}
						.requirements ul {
							margin: 10px 0;
							padding-left: 20px;
						}
						.requirements li {
							margin: 5px 0;
						}
					</style>
				</head>
				<body>
					<div class="error-container">
						<div class="error-header">
							<span class="error-icon">⚠️</span>
							Invalid Plot File
						</div>
						<div class="error-message">${validationError.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
						<div class="help-text">
							This .plot.json file does not conform to the Debrief FeatureCollection schema and cannot be opened in the plot editor.
							<div class="requirements">
								<strong>Debrief FeatureCollection Requirements:</strong>
								<ul>
									<li>Type: "FeatureCollection"</li>
									<li>Features: Array of track, point, or annotation features</li>
									<li>Each feature must have: id, type:"Feature", geometry, properties</li>
									<li>Valid geometry types: Point (point/annotation), LineString/MultiLineString (track/annotation), Polygon/MultiPoint/MultiPolygon (annotation)</li>
								</ul>
							</div>
						</div>
					</div>
				</body>
				</html>`;
        }

        // Normal case - show the map editor
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

    private validateDebriefFeatureCollection(data: any): { valid: boolean; errors: string[]; featureCounts?: any } {
        // Use the comprehensive validator from shared-types
        const validation = validateFeatureCollectionComprehensive(data);
        
        return {
            valid: validation.isValid,
            errors: validation.errors,
            featureCounts: validation.featureCounts
        };
    }

    private getDocumentAsJson(document: vscode.TextDocument, throwOnValidationError: boolean = true): any {
        
        const text = document.getText();
        
        if (text.trim().length === 0) {
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        let json: any;
        try {
            json = JSON.parse(text);
        } catch (error) {
            throw new Error('Could not get document as json. Content is not valid json');
        }
        
        // Validate against Debrief schema using shared-types validators
        const validation = this.validateDebriefFeatureCollection(json);
        
        if (!validation.valid) {
            const errorMessage = `Invalid Debrief FeatureCollection:\n${validation.errors.join('\n')}`;
            
            vscode.window.showErrorMessage(errorMessage, 'Details', 'Schema Info').then(selection => {
                if (selection === 'Details') {
                    vscode.window.showInformationMessage(
                        'This plot.json file does not conform to the Debrief FeatureCollection schema. ' +
                        'Please check the validation errors and ensure all features have proper geometry, properties, and required fields.'
                    );
                } else if (selection === 'Schema Info') {
                    vscode.window.showInformationMessage(
                        'Debrief FeatureCollection schema requires:\n' +
                        '• Type: "FeatureCollection"\n' +
                        '• Features: Array of track, point, or annotation features\n' +
                        '• Each feature must have: id, type:"Feature", geometry, properties\n' +
                        '• Geometry types: Point (point/annotation), LineString/MultiLineString (track/annotation), Polygon/MultiPoint/MultiPolygon (annotation)'
                    );
                }
            });
            
            // Throw an error to prevent the invalid file from opening in the editor (only if requested)
            if (throwOnValidationError) {
                throw new Error(`Cannot open invalid plot file: ${validation.errors.join('; ')}`);
            } else {
                // Return a basic structure so the editor can still function
                return {
                    type: "FeatureCollection",
                    features: []
                };
            }
        } else if (validation.featureCounts) {
            // Show success message with feature counts for valid collections
            const counts = validation.featureCounts;
            const summary = `Valid FeatureCollection loaded: ${counts.total} features (${counts.tracks} tracks, ${counts.points} points, ${counts.annotations} annotations)`;
            console.log('Debrief FeatureCollection:', summary);
        }
        
        return json;
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