import * as vscode from 'vscode';
import { validateFeatureCollectionComprehensive } from '@debrief/shared-types/validators/typescript';
import { GlobalController } from '../../core/globalController';
import { EditorIdManager } from '../../core/editorIdManager';
import { StatePersistence } from '../../core/statePersistence';

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

interface WebviewMessage {
    type: string;
    [key: string]: unknown;
}

export class PlotJsonEditorProvider implements vscode.CustomTextEditorProvider {
    private static outlineUpdateCallback: ((document: vscode.TextDocument) => void) | undefined;
    private static activeWebviewPanel: vscode.WebviewPanel | undefined;

    public static setOutlineUpdateCallback(callback: (document: vscode.TextDocument) => void): void {
        PlotJsonEditorProvider.outlineUpdateCallback = callback;
    }

    public static sendMessageToActiveWebview(message: WebviewMessage): void {
        if (PlotJsonEditorProvider.activeWebviewPanel) {
            PlotJsonEditorProvider.activeWebviewPanel.webview.postMessage(message);
        }
    }

    public static getSelectedFeatures(filename: string): string[] {
        // Legacy method - find editor and use GlobalController
        const globalController = GlobalController.getInstance();
        const editorIds = globalController.getEditorIds();
        
        for (const editorId of editorIds) {
            const document = EditorIdManager.getDocument(editorId);
            if (document && document.fileName === filename) {
                const selectionState = globalController.getStateSlice(editorId, 'selectionState');
                return selectionState?.selectedIds?.map((id: string | number) => String(id)) || [];
            }
        }
        return [];
    }

    public static setSelectedFeatures(filename: string, featureIds: string[]): void {
        // Legacy method - find editor and use GlobalController
        const globalController = GlobalController.getInstance();
        const editorIds = globalController.getEditorIds();
        
        for (const editorId of editorIds) {
            const document = EditorIdManager.getDocument(editorId);
            if (document && document.fileName === filename) {
                globalController.updateState(editorId, 'selectionState', { selectedIds: featureIds });
                break;
            }
        }
        
        // Send to active webview if it matches
        if (PlotJsonEditorProvider.activeWebviewPanel) {
            PlotJsonEditorProvider.activeWebviewPanel.webview.postMessage({
                type: 'setSelectionByIds',
                featureIds: featureIds
            });
        }
    }

    public static saveMapViewState(filename: string, center: [number, number], zoom: number): void {
        // Legacy method - find editor and use GlobalController
        const globalController = GlobalController.getInstance();
        const editorIds = globalController.getEditorIds();
        
        for (const editorId of editorIds) {
            const document = EditorIdManager.getDocument(editorId);
            if (document && document.fileName === filename) {
                const viewportState = PlotJsonEditorProvider.convertCenterZoomToBounds(center, zoom);
                globalController.updateState(editorId, 'viewportState', viewportState);
                break;
            }
        }
    }

    public static getMapViewState(filename: string): { center: [number, number], zoom: number } | undefined {
        // Legacy method - find editor and use GlobalController
        const globalController = GlobalController.getInstance();
        const editorIds = globalController.getEditorIds();
        
        for (const editorId of editorIds) {
            const document = EditorIdManager.getDocument(editorId);
            if (document && document.fileName === filename) {
                const viewportState = globalController.getStateSlice(editorId, 'viewportState');
                const result = PlotJsonEditorProvider.convertBoundsToMapState(viewportState?.bounds);
                return result || undefined;
            }
        }
        return undefined;
    }

    private static convertCenterZoomToBounds(center: [number, number], zoom: number): { bounds: [number, number, number, number] } {
        // Convert center/zoom to approximate bounds
        const latRange = 180 / Math.pow(2, zoom);
        const lngRange = 360 / Math.pow(2, zoom);
        
        return {
            bounds: [
                center[1] - lngRange/2,  // west
                center[0] - latRange/2,  // south  
                center[1] + lngRange/2,  // east
                center[0] + latRange/2   // north
            ]
        };
    }

    private static convertBoundsToMapState(bounds?: [number, number, number, number]): { center: [number, number], zoom: number } | null {
        if (!bounds) return null;
        
        const [west, south, east, north] = bounds;
        const center: [number, number] = [(south + north) / 2, (west + east) / 2];
        
        // Approximate zoom from bounds size
        const latRange = north - south;
        const zoom = Math.floor(Math.log2(180 / latRange));
        
        return { center, zoom: Math.max(1, Math.min(18, zoom)) };
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
        
        // Force state loading and activation for GlobalController integration
        try {
            // Get the GlobalController and StatePersistence instances
            const globalController = GlobalController.getInstance();
            const editorId = EditorIdManager.getEditorId(document);
            
            // Force load state from document
            const statePersistence = new StatePersistence(globalController);
            statePersistence.loadStateFromDocument(document);
            
            // Set this as the active editor
            globalController.setActiveEditor(editorId);
        } catch (error) {
            console.error('PlotJsonEditor: Error forcing state loading:', error);
        }

        // Track this as the active webview panel
        PlotJsonEditorProvider.activeWebviewPanel = webviewPanel;

        // Notify outline tree that this document is now active (legacy)
        if (PlotJsonEditorProvider.outlineUpdateCallback) {
            PlotJsonEditorProvider.outlineUpdateCallback(document);
        }

        // Subscribe to GlobalController state changes for this editor
        const editorId = EditorIdManager.getEditorId(document);
        const globalController = GlobalController.getInstance();
        
        const stateSubscriptions: vscode.Disposable[] = [];

        // Subscribe to selection changes
        const selectionSubscription = globalController.on('selectionChanged', (data) => {
            if (data.editorId === editorId && webviewPanel.visible) {
                webviewPanel.webview.postMessage({
                    type: 'setSelectionByIds',
                    featureIds: data.state.selectionState?.selectedIds || []
                });
            }
        });
        stateSubscriptions.push(selectionSubscription);

        // Subscribe to viewport changes
        const viewportSubscription = globalController.on('viewportChanged', (data) => {
            if (data.editorId === editorId && webviewPanel.visible) {
                const mapState = PlotJsonEditorProvider.convertBoundsToMapState(data.state.viewportState?.bounds);
                if (mapState) {
                    webviewPanel.webview.postMessage({
                        type: 'restoreMapState',
                        center: mapState.center,
                        zoom: mapState.zoom
                    });
                }
            }
        });
        stateSubscriptions.push(viewportSubscription);

        // Listen for when this webview panel becomes visible (tab switching)
        webviewPanel.onDidChangeViewState(() => {
            const editorId = EditorIdManager.getEditorId(document);
            const globalController = GlobalController.getInstance();
            
            if (webviewPanel.visible) {
                PlotJsonEditorProvider.activeWebviewPanel = webviewPanel;
                if (PlotJsonEditorProvider.outlineUpdateCallback) {
                    PlotJsonEditorProvider.outlineUpdateCallback(document);
                }
                
                // Editor became visible - sync current state and set as active
                globalController.setActiveEditor(editorId);
                this.syncWebviewWithGlobalState(webviewPanel, editorId);
            } else {
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
            
            // Dispose of state subscriptions
            stateSubscriptions.forEach(subscription => subscription.dispose());
            
            // Clear active webview reference if this panel is disposed
            if (PlotJsonEditorProvider.activeWebviewPanel === webviewPanel) {
                PlotJsonEditorProvider.activeWebviewPanel = undefined;
            }
            
            // Remove editor from GlobalController tracking
            const editorId = EditorIdManager.getEditorId(document);
            EditorIdManager.removeDocument(document);
            globalController.removeEditor(editorId);
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

                case 'selectionChanged': {
                    // Update selection state using GlobalController
                    const editorId = EditorIdManager.getEditorId(document);
                    const globalController = GlobalController.getInstance();
                    const selectionState = { selectedIds: e.selectedFeatureIds };
                    globalController.updateState(editorId, 'selectionState', selectionState);
                    return;
                }

                case 'mapStateSaved': {
                    // Save map view state using GlobalController, but only if this is the active webview
                    if (PlotJsonEditorProvider.activeWebviewPanel === webviewPanel) {
                        const editorId = EditorIdManager.getEditorId(document);
                        const globalController = GlobalController.getInstance();
                        const viewportState = PlotJsonEditorProvider.convertCenterZoomToBounds(e.center, e.zoom);
                        globalController.updateState(editorId, 'viewportState', viewportState);
                    }
                    return;
                }

                case 'requestSavedState': {
                    // Webview is asking if there's saved state to restore - use GlobalController
                    const editorId = EditorIdManager.getEditorId(document);
                    this.syncWebviewWithGlobalState(webviewPanel, editorId);
                    return;
                }
            }
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview, _document: vscode.TextDocument, validationError?: string | null): string {
        const webComponentsScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'web-components.js'));

        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'reset.css'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'vscode.css'));

        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'plotJsonEditor.css'));

        const webComponentsStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'node_modules', '@debrief', 'web-components', 'dist', 'vanilla', 'index.css'));

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
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} https://unpkg.com https://cdnjs.cloudflare.com; script-src 'nonce-${nonce}' https://unpkg.com; img-src ${webview.cspSource} https://*.tile.openstreetmap.org data: https://cdnjs.cloudflare.com; connect-src https://*.tile.openstreetmap.org;">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<link href="${webComponentsStyleUri}" rel="stylesheet">
				<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
					integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
				<title>Plot JSON Editor</title>
			</head>
			<body>
				<div id="map-container"></div>
				<script nonce="${nonce}" src="${webComponentsScriptUri}"></script>
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					let mapComponentInstance = null;
					let currentGeoJsonData = null;

					// Initialize MapComponent when the page loads
					window.addEventListener('DOMContentLoaded', () => {
						const container = document.getElementById('map-container');
						
						// Wait for DebriefWebComponents to be available using a proper check
						function initializeMapComponent() {
							try {
								// Get the createMapComponent function from DebriefWebComponents namespace
								if (typeof window.DebriefWebComponents === 'undefined' || !window.DebriefWebComponents.createMapComponent) {
									// If not available yet, check again in next tick
									requestAnimationFrame(initializeMapComponent);
									return;
								}
								
								const createMapComponent = window.DebriefWebComponents.createMapComponent;
							
							mapComponentInstance = createMapComponent(container, {
								showAddButton: true,
								onAddClick: () => {
									vscode.postMessage({ type: 'add' });
								},
								onMapClick: (lat, lng) => {
									vscode.postMessage({ type: 'addPoint', lat, lng });
								},
								onSelectionChange: (selectedFeatures, selectedIndices) => {
									const selectedFeatureIds = selectedFeatures.map(f => f.id).filter(id => id != null);
									vscode.postMessage({ 
										type: 'selectionChanged', 
										selectedFeatureIds: selectedFeatureIds 
									});
								},
								onMapStateChange: (state) => {
									vscode.postMessage({ 
										type: 'mapStateSaved', 
										center: state.center, 
										zoom: state.zoom 
									});
								}
							});

								// Request saved state after initialization
								vscode.postMessage({ type: 'requestSavedState' });
							} catch (err) {
								console.error('Failed to load MapComponent:', err);
								document.getElementById('map-container').innerHTML = 
									'<div style="padding: 20px; color: red;">Failed to load map component: ' + err.message + '</div>';
							}
						}
						
						// Start the initialization process
						initializeMapComponent();
					});

					// Handle messages from VS Code
					window.addEventListener('message', event => {
						const message = event.data;
						
						switch (message.type) {
							case 'update':
								try {
									if (message.text.trim()) {
										currentGeoJsonData = JSON.parse(message.text);
									} else {
										currentGeoJsonData = { type: 'FeatureCollection', features: [] };
									}
									
									if (mapComponentInstance) {
										mapComponentInstance.updateProps({
											geoJsonData: currentGeoJsonData
										});
									}
								} catch (error) {
									console.error('Error parsing GeoJSON:', error);
								}
								break;
								
							case 'setSelectionByIds':
								if (mapComponentInstance) {
									mapComponentInstance.updateProps({
										selectedFeatureIds: message.featureIds || []
									});
								}
								break;
								
							case 'restoreMapState':
								if (mapComponentInstance) {
									mapComponentInstance.updateProps({
										initialMapState: {
											center: message.center,
											zoom: message.zoom
										}
									});
								}
								break;
								
							case 'requestMapState':
								// MapComponent handles this automatically through onMapStateChange
								break;
						}
					});
				</script>
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

        json.features = json.features.filter((_feature: GeoJSONFeature, index: number) => index.toString() !== id);

        return this.updateTextDocument(document, json);
    }

    private validateDebriefFeatureCollection(data: unknown): { valid: boolean; errors: string[]; featureCounts?: { tracks: number; points: number; annotations: number; unknown: number; total: number } } {
        // Use the comprehensive validator from shared-types
        const validation = validateFeatureCollectionComprehensive(data);
        
        // Enhanced error reporting with detailed feature errors
        const detailedErrors = [...validation.errors];
        
        if (validation.featureErrors) {
            validation.featureErrors.forEach(featureError => {
                detailedErrors.push(`\n${featureError.featureType.toUpperCase()} Feature at index ${featureError.index} (id: "${featureError.featureId || 'no id'}"):`);
                featureError.errors.forEach((error, i) => {
                    detailedErrors.push(`  ${i + 1}. ${error}`);
                });
            });
        }
        
        return {
            valid: validation.isValid,
            errors: detailedErrors,
            featureCounts: validation.featureCounts
        };
    }

    private getDocumentAsJson(document: vscode.TextDocument, throwOnValidationError = true): GeoJSONFeatureCollection {
        
        const text = document.getText();
        
        if (text.trim().length === 0) {
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        let json: GeoJSONFeatureCollection;
        try {
            json = JSON.parse(text);
        } catch {
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
            console.warn('Debrief FeatureCollection:', summary);
        }
        
        return json;
    }

    private updateTextDocument(document: vscode.TextDocument, json: GeoJSONFeatureCollection) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(json, null, 2));

        return vscode.workspace.applyEdit(edit);
    }


    private syncWebviewWithGlobalState(webviewPanel: vscode.WebviewPanel, editorId: string): void {
        const globalController = GlobalController.getInstance();
        const state = globalController.getEditorState(editorId);
        
        // Sync selection
        if (state.selectionState?.selectedIds) {
            webviewPanel.webview.postMessage({
                type: 'setSelectionByIds',
                featureIds: state.selectionState.selectedIds
            });
        }
        
        // Sync viewport
        if (state.viewportState?.bounds) {
            const mapState = PlotJsonEditorProvider.convertBoundsToMapState(state.viewportState.bounds);
            if (mapState) {
                webviewPanel.webview.postMessage({
                    type: 'restoreMapState',
                    center: mapState.center,
                    zoom: mapState.zoom
                });
            }
        }
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