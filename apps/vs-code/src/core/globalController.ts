
import * as vscode from 'vscode';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';
import { ViewportState } from '@debrief/shared-types/derived/typescript/viewportstate';
import { SelectionState } from '@debrief/shared-types/derived/typescript/selectionstate';
import { DebriefFeatureCollection } from '@debrief/shared-types/derived/typescript/featurecollection';
import { EditorState } from '@debrief/shared-types/derived/typescript/editorstate';


// Event types for the GlobalController
export type StateEventType = 'fcChanged' | 'timeChanged' | 'viewportChanged' | 'selectionChanged' | 'activeEditorChanged';

export type StateSliceType = 'featureCollection' | 'timeState' | 'viewportState' | 'selectionState';

// Event handler types
export type StateEventHandler = (data: { editorId: string; state: EditorState }) => void;
export type ActiveEditorChangedHandler = (data: { previousEditorId?: string; currentEditorId?: string }) => void;

export interface StateUpdatePayload {
    featureCollection?: DebriefFeatureCollection;
    timeState?: TimeState;
    viewportState?: ViewportState;  
    selectionState?: SelectionState;
}

/**
 * GlobalController - Singleton class for managing centralized state across all Debrief editors
 * 
 * This class provides:
 * - Central state storage per editor instance (editorId → EditorState mapping)
 * - Event-driven updates with subscription system
 * - API for getting/updating specific state slices
 * - Active editor tracking and lifecycle management
 */
export class GlobalController {
    private static _instance: GlobalController;
    
    // State storage: editorId → EditorState
    private editorStates = new Map<string, EditorState>();
    
    // Track the currently active editor
    private _activeEditorId?: string;
    
    // Event system
    private eventHandlers = new Map<StateEventType, Set<StateEventHandler | ActiveEditorChangedHandler>>();
    
    // VS Code event emitter for integration
    private _onDidChangeState = new vscode.EventEmitter<{ editorId: string; eventType: StateEventType; state: EditorState }>();
    public readonly onDidChangeState = this._onDidChangeState.event;
    
    private constructor() {
        this.initializeEventHandlers();
    }
    
    /**
     * Get the singleton instance of GlobalController
     */
    public static getInstance(): GlobalController {
        if (!GlobalController._instance) {
            GlobalController._instance = new GlobalController();
        }
        return GlobalController._instance;
    }
    
    /**
     * Initialize event handler storage
     */
    private initializeEventHandlers(): void {
        const eventTypes: StateEventType[] = ['fcChanged', 'timeChanged', 'viewportChanged', 'selectionChanged', 'activeEditorChanged'];
        eventTypes.forEach(eventType => {
            this.eventHandlers.set(eventType, new Set<StateEventHandler | ActiveEditorChangedHandler>());
        });
    }
    
    /**
     * Get the currently active editor ID
     */
    public get activeEditorId(): string | undefined {
        return this._activeEditorId;
    }
    
    /**
     * Set the active editor and broadcast the change
     */
    public setActiveEditor(editorId: string): void {
        const previousEditorId = this._activeEditorId;
        
        if (previousEditorId === editorId) {
            return; // No change
        }
        
        this._activeEditorId = editorId;
        
        // Ensure the editor has an initialized state
        if (!this.editorStates.has(editorId)) {
            this.editorStates.set(editorId, {});
        }
        
        // Broadcast active editor change
        this.notifyActiveEditorChanged(previousEditorId, editorId);
    }
    
    /**
     * Get a specific state slice for an editor
     */
    public getStateSlice<K extends StateSliceType>(editorId: string, sliceType: K): EditorState[K] {
        const state = this.editorStates.get(editorId);
        return state?.[sliceType];
    }
    
    /**
     * Get the complete state for an editor
     */
    public getEditorState(editorId: string): EditorState {
        return this.editorStates.get(editorId) || {};
    }
    
    /**
     * Update state for a specific editor and slice type
     */
    public updateState(editorId: string, sliceType: StateSliceType, payload: StateUpdatePayload[StateSliceType]): void {
        // Ensure editor state exists
        if (!this.editorStates.has(editorId)) {
            this.editorStates.set(editorId, {});
        }
        
        const currentState = this.editorStates.get(editorId)!;
        
        // Update the specific slice
        switch (sliceType) {
            case 'featureCollection':
                currentState.featureCollection = payload as DebriefFeatureCollection;
                break;
            case 'timeState':
                currentState.timeState = payload as TimeState;
                break;
            case 'viewportState':
                currentState.viewportState = payload as ViewportState;
                break;
            case 'selectionState':
                currentState.selectionState = payload as SelectionState;
                break;
            default:
                throw new Error(`Unknown slice type: ${sliceType}`);
        }
        
        // Determine event type based on slice type
        const eventType = this.getEventTypeForSlice(sliceType);
        
        // Notify subscribers
        this.notifyStateChange(editorId, eventType, currentState);
    }
    
    /**
     * Update multiple state slices atomically
     */
    public updateMultipleStates(editorId: string, updates: Partial<StateUpdatePayload>): void {
        // Ensure editor state exists
        if (!this.editorStates.has(editorId)) {
            this.editorStates.set(editorId, {});
        }
        
        const currentState = this.editorStates.get(editorId)!;
        const eventTypes = new Set<StateEventType>();
        
        // Apply all updates
        Object.entries(updates).forEach(([sliceType, payload]) => {
            if (payload !== undefined) {
                const sliceKey = sliceType as StateSliceType;
                switch (sliceKey) {
                    case 'featureCollection':
                        currentState.featureCollection = payload as DebriefFeatureCollection;
                        break;
                    case 'timeState':
                        currentState.timeState = payload as TimeState;
                        break;
                    case 'viewportState':
                        currentState.viewportState = payload as ViewportState;
                        break;
                    case 'selectionState':
                        currentState.selectionState = payload as SelectionState;
                        break;
                    default:
                        throw new Error(`Unknown slice type: ${sliceKey}`);
                }
                eventTypes.add(this.getEventTypeForSlice(sliceKey));
            }
        });
        
        // Notify for each changed slice type
        eventTypes.forEach(eventType => {
            this.notifyStateChange(editorId, eventType, currentState);
        });
    }
    
    /**
     * Subscribe to state change events
     */
    public on(eventType: 'activeEditorChanged', handler: ActiveEditorChangedHandler): vscode.Disposable;
    public on(eventType: Exclude<StateEventType, 'activeEditorChanged'>, handler: StateEventHandler): vscode.Disposable;
    public on(eventType: StateEventType, handler: StateEventHandler | ActiveEditorChangedHandler): vscode.Disposable {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.add(handler);
        }
        
        return new vscode.Disposable(() => {
            const handlers = this.eventHandlers.get(eventType);
            if (handlers) {
                handlers.delete(handler);
            }
        });
    }
    
    /**
     * Remove an editor from state tracking (cleanup)
     */
    public removeEditor(editorId: string): void {
        this.editorStates.delete(editorId);
        
        // If this was the active editor, clear active editor
        if (this._activeEditorId === editorId) {
            const previousEditorId = this._activeEditorId;
            this._activeEditorId = undefined;
            this.notifyActiveEditorChanged(previousEditorId, undefined);
        }
    }
    
    /**
     * Get all editor IDs that have state
     */
    public getEditorIds(): string[] {
        return Array.from(this.editorStates.keys());
    }

    /**
     * Get the filename for an editorId (stub for now, should be implemented with real mapping)
     */
    public getEditorFilename(editorId: string): string | undefined {
        // TODO: Implement real filename lookup if available
        return editorId;
    }

    /**
     * Get the history for an editorId (stub, to be implemented by integrating with HistoryManager)
     */
    public getHistory(_editorId: string): unknown[] {
        // TODO: Integrate with HistoryManager for real history
        return [];
    }
    
    /**
     * Check if an editor has any state
     */
    public hasEditor(editorId: string): boolean {
        return this.editorStates.has(editorId);
    }
    
    /**
     * Map state slice type to corresponding event type
     */
    private getEventTypeForSlice(sliceType: StateSliceType): StateEventType {
        switch (sliceType) {
            case 'featureCollection':
                return 'fcChanged';
            case 'timeState':
                return 'timeChanged';
            case 'viewportState':
                return 'viewportChanged';
            case 'selectionState':
                return 'selectionChanged';
            default:
                throw new Error(`Unknown slice type: ${sliceType}`);
        }
    }
    
    /**
     * Notify subscribers of state changes
     */
    private notifyStateChange(editorId: string, eventType: StateEventType, state: EditorState): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const eventData = { editorId, state };
            handlers.forEach(handler => {
                try {
                    (handler as StateEventHandler)(eventData);
                } catch (error) {
                    console.error(`Error in state change handler for ${eventType}:`, error);
                }
            });
        }
        
        // Also emit VS Code event
        this._onDidChangeState.fire({ editorId, eventType, state });
    }
    
    /**
     * Notify subscribers of active editor changes
     */
    private notifyActiveEditorChanged(previousEditorId?: string, currentEditorId?: string): void {
        const handlers = this.eventHandlers.get('activeEditorChanged');
        if (handlers) {
            const eventData = { previousEditorId, currentEditorId };
            handlers.forEach(handler => {
                try {
                    (handler as ActiveEditorChangedHandler)(eventData);
                } catch (error) {
                    console.error('Error in active editor change handler:', error);
                }
            });
        }
        
        // Also emit VS Code event with dummy state for consistency
        if (currentEditorId) {
            const state = this.getEditorState(currentEditorId);
            this._onDidChangeState.fire({ editorId: currentEditorId, eventType: 'activeEditorChanged', state });
        }
    }
    
    /**
     * Dispose of the GlobalController and clean up resources
     */
    public dispose(): void {
        this._onDidChangeState.dispose();
        this.eventHandlers.clear();
        this.editorStates.clear();
        this._activeEditorId = undefined;
    }
}