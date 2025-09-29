
import * as vscode from 'vscode';
import { TimeState, ViewportState, SelectionState, DebriefFeatureCollection, EditorState, DebriefFeature } from '@debrief/shared-types';
import { ToolVaultServerService } from '../services/toolVaultServer';
import {
  ToolParameterService,
  StateProvider,
  ToolSchema
} from '@debrief/web-components/services';

export { EditorState };


// Event types for the GlobalController
export type StateEventType = 'fcChanged' | 'timeChanged' | 'viewportChanged' | 'selectionChanged' | 'activeEditorChanged' | 'toolVaultReady';

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
 * - Tool parameter injection and execution
 */
export class GlobalController implements StateProvider {
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

    // Tool Vault Server integration
    private toolVaultServer?: ToolVaultServerService;

    // Tool Parameter Service for automatic parameter injection
    private toolParameterService: ToolParameterService;
    
    private constructor() {
        this.initializeEventHandlers();
        this.toolParameterService = new ToolParameterService(this);
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
        const eventTypes: StateEventType[] = ['fcChanged', 'timeChanged', 'viewportChanged', 'selectionChanged', 'activeEditorChanged', 'toolVaultReady'];
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
     * Initialize Tool Vault Server integration
     */
    public initializeToolVaultServer(toolVaultServer: ToolVaultServerService): void {
        console.warn('[GlobalController] Initializing Tool Vault server:', !!toolVaultServer);
        this.toolVaultServer = toolVaultServer;
        console.warn('[GlobalController] Tool Vault server initialized successfully');
    }

    /**
     * Notify that the Tool Vault server is ready and available
     */
    public notifyToolVaultReady(): void {
        console.warn('[GlobalController] Tool Vault server ready - notifying subscribers');
        const handlers = this.eventHandlers.get('toolVaultReady');
        console.warn('[GlobalController] Found', handlers?.size || 0, 'toolVaultReady handlers');
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    console.warn('[GlobalController] Calling toolVaultReady handler');
                    (handler as () => void)();
                } catch (error) {
                    console.error('[GlobalController] Error in toolVaultReady handler:', error);
                }
            });
        }
    }

    /**
     * Get the tool index from the Tool Vault Server
     */
    public async getToolIndex(): Promise<unknown> {
        console.warn('[GlobalController] getToolIndex called - toolVaultServer present:', !!this.toolVaultServer);

        if (!this.toolVaultServer) {
            console.error('[GlobalController] Tool Vault server is not initialized');
            throw new Error('Tool Vault server is not initialized');
        }

        console.warn('[GlobalController] Calling toolVaultServer.getToolIndex()');
        return this.toolVaultServer.getToolIndex();
    }

    /**
     * Execute a tool command with the given parameters
     */
    public async executeTool(toolName: string, parameters: Record<string, unknown>): Promise<{ success: boolean; result?: unknown; error?: string }> {
        console.warn('[GlobalController] executeTool called - toolVaultServer present:', !!this.toolVaultServer);

        if (!this.toolVaultServer) {
            console.error('[GlobalController] Tool Vault server is not initialized in executeTool');
            return {
                success: false,
                error: 'Tool Vault server is not initialized'
            };
        }

        console.warn('[GlobalController] Calling toolVaultServer.executeToolCommand for:', toolName);
        return this.toolVaultServer.executeToolCommand(toolName, parameters);
    }

    /**
     * Execute a tool with automatic parameter injection
     */
    public async executeToolWithInjection(
        toolSchema: ToolSchema,
        selectedFeatures: DebriefFeature[] = [],
        userParameters: Record<string, unknown> = {}
    ): Promise<{ success: boolean; result?: unknown; error?: string }> {
        console.warn('[GlobalController] executeToolWithInjection called for tool:', toolSchema.name);

        // Validate that all parameters can be satisfied
        const validation = this.toolParameterService.validateParameterSatisfaction(
            toolSchema,
            selectedFeatures,
            userParameters
        );

        if (!validation.canExecute) {
            const error = `Cannot execute tool "${toolSchema.name}": missing required parameters: ${validation.missingParams.join(', ')}`;
            console.error('[GlobalController]', error);
            return {
                success: false,
                error
            };
        }

        // Inject auto-injectable parameters
        const injectedParameters = this.toolParameterService.injectParameters(
            toolSchema,
            selectedFeatures,
            userParameters
        );

        console.warn('[GlobalController] Injected parameters:', Object.keys(injectedParameters));

        // Execute the tool with the complete parameter set
        return this.executeTool(toolSchema.name, injectedParameters);
    }

    /**
     * Analyze a tool schema to understand parameter requirements
     */
    public analyzeToolParameters(toolSchema: ToolSchema) {
        return this.toolParameterService.analyzeToolParameters(toolSchema);
    }

    /**
     * Check if a tool requires user input
     */
    public toolRequiresUserInput(toolSchema: ToolSchema): boolean {
        return this.toolParameterService.requiresUserInput(toolSchema);
    }

    /**
     * Get parameters that require user input for a tool
     */
    public getUserInputParameters(toolSchema: ToolSchema) {
        return this.toolParameterService.getUserInputParameters(toolSchema);
    }

    // StateProvider interface implementation

    /**
     * Get the current time state for the active editor
     */
    public getTimeState(): TimeState | null {
        const editorId = this._activeEditorId;
        if (!editorId) return null;
        return this.getStateSlice(editorId, 'timeState') || null;
    }

    /**
     * Get the current viewport state for the active editor
     */
    public getViewportState(): ViewportState | null {
        const editorId = this._activeEditorId;
        if (!editorId) return null;
        return this.getStateSlice(editorId, 'viewportState') || null;
    }

    /**
     * Get the current selection state for the active editor
     */
    public getSelectionState(): SelectionState | null {
        const editorId = this._activeEditorId;
        if (!editorId) return null;
        return this.getStateSlice(editorId, 'selectionState') || null;
    }

    /**
     * Get the complete state for an editor
     */
    public getEditorState(editorId: string): EditorState {
        return this.editorStates.get(editorId) || {};
    }

    /**
     * Get editor state for StateProvider interface (can return null)
     */
    public getEditorStateForProvider(editorId?: string): EditorState | null {
        const targetEditorId = editorId || this._activeEditorId;
        if (!targetEditorId) return null;
        return this.editorStates.get(targetEditorId) || null;
    }

    /**
     * Get the current feature collection for the active editor
     */
    public getFeatureCollection(): DebriefFeatureCollection | null {
        const editorId = this._activeEditorId;
        if (!editorId) return null;
        return this.getStateSlice(editorId, 'featureCollection') || null;
    }

    /**
     * Get selected features based on current selection state and feature collection
     */
    public getSelectedFeatures(): DebriefFeature[] {
        const selectionState = this.getSelectionState();
        const featureCollection = this.getFeatureCollection();

        if (!selectionState?.selectedIds || !featureCollection?.features) {
            return [];
        }

        const selectedIds = new Set(selectionState.selectedIds.map(id => String(id)));
        return featureCollection.features.filter(feature =>
            feature.id && selectedIds.has(String(feature.id))
        );
    }


    /**
     * Dispose of the GlobalController and clean up resources
     */
    public dispose(): void {
        this._onDidChangeState.dispose();
        this.eventHandlers.clear();
        this.editorStates.clear();
        this._activeEditorId = undefined;
        this.toolVaultServer = undefined;
    }
}