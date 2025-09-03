import * as vscode from 'vscode';
import { GlobalController, EditorState } from './globalController';
import { EditorIdManager } from './editorIdManager';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';
import { ViewportState } from '@debrief/shared-types/derived/typescript/viewportstate';
// Note: SelectionState imported in case needed for future enhancements
// import { SelectionState } from '@debrief/shared-types/derived/typescript/selectionstate';

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
    private static readonly METADATA_FEATURE_TYPES = {
        TIME: 'debrief-time-state',
        VIEWPORT: 'debrief-viewport-state'
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
        
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(this.handleDocumentSave.bind(this))
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
     * Handle document saving
     */
    private handleDocumentSave(document: vscode.TextDocument): void {
        if (EditorIdManager.isDebriefPlotFile(document)) {
            // Inject current state back into document before save
            this.saveStateToDocument(document);
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
                this.globalController.updateMultipleStates(editorId, {
                    featureCollection: { type: 'FeatureCollection', features: [] },
                    selectionState: { selectedIds: [] }
                });
                return;
            }
            
            const geoJson: GeoJSONFeatureCollection = JSON.parse(text);
            
            if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
                console.warn(`Invalid FeatureCollection in ${document.fileName}`);
                return;
            }
            
            // Extract metadata features and regular features
            const { metadataFeatures, dataFeatures } = this.separateFeatures(geoJson.features);
            
            // Parse metadata features into state objects
            const extractedState = this.extractMetadataState(metadataFeatures);
            
            // Create clean FeatureCollection for data features only
            const cleanFeatureCollection: GeoJSONFeatureCollection = {
                ...geoJson,
                features: dataFeatures
            };
            
            // Update GlobalController with all state
            // Note: If no viewport state exists, leave it undefined so map can fitBounds()
            this.globalController.updateMultipleStates(editorId, {
                featureCollection: cleanFeatureCollection,
                timeState: extractedState.timeState,
                viewportState: extractedState.viewportState, // undefined if no saved viewport
                selectionState: { selectedIds: [] } // Selection is always empty on load
            });
            
            console.log(`Loaded state for editor ${editorId}: ${dataFeatures.length} features, ` +
                       `${extractedState.timeState ? 'time' : 'no time'}, ` +
                       `${extractedState.viewportState ? 'saved viewport' : 'no viewport (will fitBounds)'}`);
            
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
                features: allFeatures
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
            
            console.log(`Saved state for editor ${editorId} with ${metadataFeatures.length} metadata features`);
            
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
            const featureType = feature.properties?.['debrief-feature-type'];
            
            if (Object.values(StatePersistence.METADATA_FEATURE_TYPES).includes(featureType as string)) {
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
            const featureType = feature.properties?.['debrief-feature-type'];
            
            switch (featureType) {
                case StatePersistence.METADATA_FEATURE_TYPES.TIME:
                    timeState = this.extractTimeState(feature);
                    break;
                    
                case StatePersistence.METADATA_FEATURE_TYPES.VIEWPORT:
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
            if (typeof current === 'string') {
                return { current };
            }
        } catch (error) {
            console.error('Error extracting time state:', error);
        }
        return undefined;
    }
    
    /**
     * Extract ViewportState from a metadata feature
     */
    private extractViewportState(feature: GeoJSONFeature): ViewportState | undefined {
        try {
            const bounds = feature.properties?.['bounds'];
            if (Array.isArray(bounds) && bounds.length === 4) {
                return { bounds: bounds as [number, number, number, number] };
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
            metadataFeatures.push({
                type: 'Feature',
                id: 'debrief-time-metadata',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0] // Metadata features don't need real coordinates
                },
                properties: {
                    'debrief-feature-type': StatePersistence.METADATA_FEATURE_TYPES.TIME,
                    'current': state.timeState.current,
                    'visible': false // Hide metadata features from map display
                }
            });
        }
        
        // Create viewport metadata feature
        if (state.viewportState) {
            metadataFeatures.push({
                type: 'Feature',
                id: 'debrief-viewport-metadata',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                },
                properties: {
                    'debrief-feature-type': StatePersistence.METADATA_FEATURE_TYPES.VIEWPORT,
                    'bounds': state.viewportState.bounds,
                    'visible': false
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