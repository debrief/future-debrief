import * as vscode from 'vscode';
import { GlobalController, EditorState } from './globalController';
import { EditorIdManager } from './editorIdManager';
import { TimeState, ViewportState } from '@debrief/shared-types';
import { calculateTimeRange } from '../common/time-helpers';
// Note: SelectionState imported in case needed for future enhancements
// import { SelectionState } from '@debrief/shared-types';

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

/**
 * StatePersistence - Handles loading and saving state with FeatureCollection integration
 * 
 * This class manages:
 * - Loading: Extract metadata features from FeatureCollection into separate state objects
 * - Saving: Inject metadata features back into FeatureCollection before save
 * - Document lifecycle integration with VS Code
 * - Metadata feature recognition and processing
 */
export class StatePersistence {
    private globalController: GlobalController;
    
    // Metadata feature types to recognize and extract
    private static readonly METADATA_TYPE = 'metadata';
    private static readonly METADATA_SUBTYPES = {
        TIME: 'time',
        VIEWPORT: 'viewport'
        // Note: Selection is ephemeral and not persisted
    };
    
    constructor(globalController: GlobalController) {
        this.globalController = globalController;
    }
    
    /**
     * Initialize persistence handling with VS Code event subscriptions
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Handle document opening/changes
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(this.handleDocumentOpen.bind(this))
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(this.handleDocumentChange.bind(this))
        );

        // Use onWillSaveTextDocument instead of onDidSaveTextDocument
        // This allows us to modify the document BEFORE it's saved, preventing it from staying dirty
        context.subscriptions.push(
            vscode.workspace.onWillSaveTextDocument(this.handleDocumentWillSave.bind(this))
        );

        // Initialize existing open documents
        vscode.workspace.textDocuments.forEach(doc => {
            if (EditorIdManager.isDebriefPlotFile(doc)) {
                this.loadStateFromDocument(doc);
            }
        });
    }
    
    /**
     * Handle document opening
     */
    private handleDocumentOpen(document: vscode.TextDocument): void {
        if (EditorIdManager.isDebriefPlotFile(document)) {
            this.loadStateFromDocument(document);
        }
    }
    
    /**
     * Handle document changes
     */
    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        if (EditorIdManager.isDebriefPlotFile(event.document)) {
            // Reload state when document changes
            this.loadStateFromDocument(event.document);
        }
    }
    
    /**
     * Handle document will save - inject metadata before save happens
     */
    private handleDocumentWillSave(event: vscode.TextDocumentWillSaveEvent): void {
        if (!EditorIdManager.isDebriefPlotFile(event.document)) {
            return;
        }

        const editorId = EditorIdManager.getEditorId(event.document);
        const currentState = this.globalController.getEditorState(editorId);

        if (!currentState.featureCollection) {
            return; // Nothing to save
        }

        try {
            // Create metadata features from current state
            const metadataFeatures = this.createMetadataFeatures(currentState);

            // Combine data features with metadata features
            const allFeatures = [
                ...(currentState.featureCollection.features as GeoJSONFeature[]),
                ...metadataFeatures
            ];

            // Create final FeatureCollection
            const finalFeatureCollection: GeoJSONFeatureCollection = {
                ...currentState.featureCollection,
                type: "FeatureCollection",
                features: allFeatures,
                bbox: currentState.featureCollection.bbox || undefined
            };

            // Update document content
            const jsonContent = JSON.stringify(finalFeatureCollection, null, 2);

            // Create edit to replace entire document
            const fullRange = new vscode.Range(
                event.document.positionAt(0),
                event.document.positionAt(event.document.getText().length)
            );

            // Queue the edit to be applied before save
            event.waitUntil(
                Promise.resolve([vscode.TextEdit.replace(fullRange, jsonContent)])
            );

        } catch (error) {
            console.error(`Error preparing document save for ${event.document.fileName}:`, error);
        }
    }
    
    /**
     * Load state from a document and update GlobalController
     */
    public loadStateFromDocument(document: vscode.TextDocument): void {
        const editorId = EditorIdManager.getEditorId(document);
        
        try {
            const text = document.getText().trim();
            
            if (text.length === 0) {
                // Empty document - initialize with default state
                const stateUpdates: Record<string, unknown> = {
                    featureCollection: { type: 'FeatureCollection', features: [] }
                };

                // Preserve existing selection state if it exists
                const currentState = this.globalController.getEditorState(editorId);
                if (!currentState.selectionState || currentState.selectionState.selectedIds.length === 0) {
                    stateUpdates.selectionState = { selectedIds: [] };
                }

                this.globalController.updateMultipleStates(editorId, stateUpdates);
                return;
            }
            
            const geoJson: GeoJSONFeatureCollection = JSON.parse(text);
            
            if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
                return;
            }
            
            // Extract metadata features and regular features
            const { metadataFeatures, dataFeatures } = this.separateFeatures(geoJson.features);

            // Parse metadata features into state objects
            const extractedState = this.extractMetadataState(metadataFeatures);

            // If no timeState from metadata, try to generate one from data features
            if (!extractedState.timeState && dataFeatures.length > 0) {
                const timeRange = calculateTimeRange(dataFeatures as GeoJSONFeature[]);
                if (timeRange) {
                    extractedState.timeState = {
                        current: timeRange[0], // Start at beginning of time range
                        start: timeRange[0],
                        end: timeRange[1]
                    };
                }
            }
            
            // Create clean FeatureCollection for data features only
            const cleanFeatureCollection: GeoJSONFeatureCollection = {
                ...geoJson,
                features: dataFeatures
            };
            
            // Update GlobalController with all state
            // Note: If no viewport state exists, leave it undefined so map can fitBounds()
            const stateUpdates: Record<string, unknown> = {
                featureCollection: cleanFeatureCollection
            };

            // Only add timeState and viewportState if they're defined
            if (extractedState.timeState) {
                stateUpdates.timeState = extractedState.timeState;
            }
            if (extractedState.viewportState) {
                stateUpdates.viewportState = extractedState.viewportState;
            }

            // Preserve existing selection state - only reset on initial load
            const currentState = this.globalController.getEditorState(editorId);
            if (!currentState.selectionState || currentState.selectionState.selectedIds.length === 0) {
                // Only set empty selection if there's no existing selection
                stateUpdates.selectionState = { selectedIds: [] };
            }
            // Otherwise, keep the current selection state (don't update it)

            this.globalController.updateMultipleStates(editorId, stateUpdates);
            
        } catch (error) {
            console.error(`Error loading state from ${document.fileName}:`, error);
        }
    }
    
    /**
     * Save current state to a document by injecting metadata features
     */
    public saveStateToDocument(document: vscode.TextDocument): void {
        const editorId = EditorIdManager.getEditorId(document);
        const currentState = this.globalController.getEditorState(editorId);
        
        if (!currentState.featureCollection) {
            return; // Nothing to save
        }
        
        try {
            // Create metadata features from current state
            const metadataFeatures = this.createMetadataFeatures(currentState);
            
            // Combine data features with metadata features
            const allFeatures = [
                ...(currentState.featureCollection.features as GeoJSONFeature[]),
                ...metadataFeatures
            ];
            
            // Create final FeatureCollection
            const finalFeatureCollection: GeoJSONFeatureCollection = {
                ...currentState.featureCollection,
                type: "FeatureCollection",
                features: allFeatures,
                bbox: currentState.featureCollection.bbox || undefined
            };
            
            // Update document content
            const jsonContent = JSON.stringify(finalFeatureCollection, null, 2);
            
            // Apply edit to document
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            
            edit.replace(document.uri, fullRange, jsonContent);
            vscode.workspace.applyEdit(edit);
            
            
        } catch (error) {
            console.error(`Error saving state to ${document.fileName}:`, error);
        }
    }
    
    /**
     * Separate regular features from metadata features
     */
    private separateFeatures(features: GeoJSONFeature[]): {
        metadataFeatures: GeoJSONFeature[],
        dataFeatures: GeoJSONFeature[]
    } {
        const metadataFeatures: GeoJSONFeature[] = [];
        const dataFeatures: GeoJSONFeature[] = [];

        features.forEach(feature => {
            const dataType = feature.properties?.['dataType'];

            if (dataType === StatePersistence.METADATA_TYPE) {
                metadataFeatures.push(feature);
            } else {
                dataFeatures.push(feature);
            }
        });

        return { metadataFeatures, dataFeatures };
    }
    
    /**
     * Extract metadata state from metadata features
     */
    private extractMetadataState(metadataFeatures: GeoJSONFeature[]): {
        timeState?: TimeState,
        viewportState?: ViewportState
    } {
        let timeState: TimeState | undefined;
        let viewportState: ViewportState | undefined;

        metadataFeatures.forEach(feature => {
            const metadataType = feature.properties?.['metadataType'];

            switch (metadataType) {
                case StatePersistence.METADATA_SUBTYPES.TIME:
                    timeState = this.extractTimeState(feature);
                    break;

                case StatePersistence.METADATA_SUBTYPES.VIEWPORT:
                    viewportState = this.extractViewportState(feature);
                    break;
            }
        });

        return { timeState, viewportState };
    }
    
    /**
     * Extract TimeState from a metadata feature
     */
    private extractTimeState(feature: GeoJSONFeature): TimeState | undefined {
        try {
            const current = feature.properties?.['current'];
            const start = feature.properties?.['start'];
            const end = feature.properties?.['end'];

            if (typeof current === 'string' && typeof start === 'string' && typeof end === 'string') {
                return { current, start, end };
            }
        } catch (error) {
            console.error('Error extracting time state:', error);
        }
        return undefined;
    }
    
    /**
     * Extract ViewportState from a metadata feature
     * Viewport bounds are stored in the Polygon geometry
     */
    private extractViewportState(feature: GeoJSONFeature): ViewportState | undefined {
        try {
            if (feature.geometry?.type === 'Polygon' && Array.isArray(feature.geometry.coordinates)) {
                const ring = feature.geometry.coordinates[0];
                if (Array.isArray(ring) && ring.length >= 4) {
                    // Extract bounding box from polygon coordinates
                    // Polygon format: [[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]
                    const minLng = (ring[0] as number[])[0];
                    const minLat = (ring[0] as number[])[1];
                    const maxLng = (ring[2] as number[])[0];
                    const maxLat = (ring[2] as number[])[1];

                    return { bounds: [minLng, minLat, maxLng, maxLat] };
                }
            }
        } catch (error) {
            console.error('Error extracting viewport state:', error);
        }
        return undefined;
    }
    
    /**
     * Create metadata features from current state
     */
    private createMetadataFeatures(state: EditorState): GeoJSONFeature[] {
        const metadataFeatures: GeoJSONFeature[] = [];

        // Create time metadata feature
        if (state.timeState) {
            // Use empty polygon geometry for time metadata (no geographic representation)
            metadataFeatures.push({
                type: 'Feature',
                id: 'debrief-time-metadata',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[]] // Empty polygon
                },
                properties: {
                    'dataType': StatePersistence.METADATA_TYPE,
                    'metadataType': StatePersistence.METADATA_SUBTYPES.TIME,
                    'current': state.timeState.current,
                    'start': state.timeState.start,
                    'end': state.timeState.end
                }
            });
        }

        // Create viewport metadata feature
        if (state.viewportState) {
            const bounds = state.viewportState.bounds;
            // Viewport bounds stored as polygon geometry: [[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]
            metadataFeatures.push({
                type: 'Feature',
                id: 'debrief-viewport-metadata',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [bounds[0], bounds[1]], // SW corner
                        [bounds[2], bounds[1]], // SE corner
                        [bounds[2], bounds[3]], // NE corner
                        [bounds[0], bounds[3]], // NW corner
                        [bounds[0], bounds[1]]  // Close the polygon
                    ]]
                },
                properties: {
                    'dataType': StatePersistence.METADATA_TYPE,
                    'metadataType': StatePersistence.METADATA_SUBTYPES.VIEWPORT
                }
            });
        }

        return metadataFeatures;
    }
    
    /**
     * Manually trigger state load for a specific document
     */
    public forceLoadDocument(document: vscode.TextDocument): void {
        if (EditorIdManager.isDebriefPlotFile(document)) {
            this.loadStateFromDocument(document);
        }
    }
    
    /**
     * Manually trigger state save for a specific document
     */
    public forceSaveDocument(document: vscode.TextDocument): void {
        if (EditorIdManager.isDebriefPlotFile(document)) {
            this.saveStateToDocument(document);
        }
    }
}