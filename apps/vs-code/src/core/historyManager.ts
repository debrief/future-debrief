import * as vscode from 'vscode';
import { GlobalController, EditorState, StateUpdatePayload } from './globalController';
import { EditorIdManager } from './editorIdManager';

/**
 * Represents a state change that can be undone/redone
 */
interface HistoryEntry {
    editorId: string;
    previousState: EditorState;
    newState: EditorState;
    timestamp: number;
    description: string;
}

/**
 * HistoryManager - Manages unified history stack for undo/redo operations
 * 
 * This class provides:
 * - Unified history stack for all state types (FC, selection, time, viewport)
 * - Integration with VS Code's undo/redo system on per-editor basis
 * - Proper state change tracking and restoration
 * - History limits and cleanup
 */
export class HistoryManager {
    private globalController: GlobalController;
    
    // History stacks per editor
    private historyStacks = new Map<string, HistoryEntry[]>();
    
    // Current position in history stack per editor
    private historyPositions = new Map<string, number>();
    
    // Maximum history entries per editor
    private static readonly MAX_HISTORY_ENTRIES = 50;
    
    // Flag to prevent history recording during undo/redo operations
    private isRedoUndoInProgress = false;
    
    constructor(globalController: GlobalController) {
        this.globalController = globalController;
    }
    
    /**
     * Initialize history manager with VS Code integration
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Subscribe to state changes to record history
        const stateSubscription = this.globalController.onDidChangeState((event) => {
            if (!this.isRedoUndoInProgress) {
                this.recordStateChange(event.editorId, event.eventType, event.state);
            }
        });
        context.subscriptions.push(stateSubscription);
        
        // Register undo/redo commands
        context.subscriptions.push(
            vscode.commands.registerCommand('debrief.undo', () => this.undo())
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('debrief.redo', () => this.redo())
        );
        
        // Listen for document closures to cleanup history
        context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument((document) => {
                if (EditorIdManager.isDebriefPlotFile(document)) {
                    const editorId = EditorIdManager.getEditorId(document);
                    this.clearEditorHistory(editorId);
                }
            })
        );
    }
    
    /**
     * Record a state change in the history stack
     */
    private recordStateChange(editorId: string, eventType: string, newState: EditorState): void {
        // Get previous state from history or create initial entry
        const historyStack = this.getHistoryStack(editorId);
        const currentPosition = this.historyPositions.get(editorId) || 0;
        
        let previousState: EditorState;
        if (historyStack.length > 0 && currentPosition < historyStack.length) {
            previousState = historyStack[currentPosition].newState;
        } else {
            // This is the first entry, use empty state as previous
            previousState = {};
        }
        
        // Create history entry
        const historyEntry: HistoryEntry = {
            editorId,
            previousState: this.deepCloneState(previousState),
            newState: this.deepCloneState(newState),
            timestamp: Date.now(),
            description: this.getDescriptionForEventType(eventType)
        };
        
        // If we're not at the end of history, remove all entries after current position
        if (currentPosition < historyStack.length - 1) {
            historyStack.splice(currentPosition + 1);
        }
        
        // Add new entry
        historyStack.push(historyEntry);
        
        // Update position to point to new entry
        this.historyPositions.set(editorId, historyStack.length - 1);
        
        // Limit history size
        if (historyStack.length > HistoryManager.MAX_HISTORY_ENTRIES) {
            historyStack.shift();
            this.historyPositions.set(editorId, historyStack.length - 1);
        }
    }
    
    /**
     * Undo the last operation for the active editor
     */
    public undo(): void {
        const activeEditorId = this.globalController.activeEditorId;
        if (!activeEditorId) {
            vscode.window.showWarningMessage('No active Debrief editor for undo operation');
            return;
        }
        
        const historyStack = this.getHistoryStack(activeEditorId);
        const currentPosition = this.historyPositions.get(activeEditorId) || 0;
        
        if (currentPosition <= 0 || historyStack.length === 0) {
            vscode.window.showInformationMessage('Nothing to undo');
            return;
        }
        
        // Get the current entry to find previous state
        const currentEntry = historyStack[currentPosition];
        
        // Move position back
        const newPosition = currentPosition - 1;
        this.historyPositions.set(activeEditorId, newPosition);
        
        // Restore previous state
        this.restoreState(activeEditorId, currentEntry.previousState);
        
        vscode.window.showInformationMessage(`Undone: ${currentEntry.description}`);
    }
    
    /**
     * Redo the next operation for the active editor
     */
    public redo(): void {
        const activeEditorId = this.globalController.activeEditorId;
        if (!activeEditorId) {
            vscode.window.showWarningMessage('No active Debrief editor for redo operation');
            return;
        }
        
        const historyStack = this.getHistoryStack(activeEditorId);
        const currentPosition = this.historyPositions.get(activeEditorId) || 0;
        
        if (currentPosition >= historyStack.length - 1) {
            vscode.window.showInformationMessage('Nothing to redo');
            return;
        }
        
        // Move position forward
        const newPosition = currentPosition + 1;
        this.historyPositions.set(activeEditorId, newPosition);
        
        // Get the entry to redo
        const redoEntry = historyStack[newPosition];
        
        // Restore new state
        this.restoreState(activeEditorId, redoEntry.newState);
        
        vscode.window.showInformationMessage(`Redone: ${redoEntry.description}`);
    }
    
    /**
     * Restore a complete state to GlobalController
     */
    private restoreState(editorId: string, state: EditorState): void {
        this.isRedoUndoInProgress = true;
        
        try {
            // Update all state slices
            const updates: Partial<StateUpdatePayload> = {};

            if (state.featureCollection !== undefined && state.featureCollection !== null) {
                updates.featureCollection = state.featureCollection;
            }

            if (state.timeState !== undefined && state.timeState !== null) {
                updates.timeState = state.timeState;
            }

            if (state.viewportState !== undefined && state.viewportState !== null) {
                updates.viewportState = state.viewportState;
            }

            if (state.selectionState !== undefined && state.selectionState !== null) {
                updates.selectionState = state.selectionState;
            }
            
            this.globalController.updateMultipleStates(editorId, updates);
            
        } finally {
            this.isRedoUndoInProgress = false;
        }
    }
    
    /**
     * Get history stack for an editor (creates if doesn't exist)
     */
    private getHistoryStack(editorId: string): HistoryEntry[] {
        if (!this.historyStacks.has(editorId)) {
            this.historyStacks.set(editorId, []);
            this.historyPositions.set(editorId, -1);
        }
        return this.historyStacks.get(editorId)!;
    }
    
    /**
     * Clear history for a specific editor
     */
    private clearEditorHistory(editorId: string): void {
        this.historyStacks.delete(editorId);
        this.historyPositions.delete(editorId);
    }
    
    /**
     * Deep clone state to avoid reference issues
     * Uses structuredClone when available, with JSON fallback for compatibility
     */
    private deepCloneState(state: EditorState): EditorState {
        try {
            // Use structuredClone if available (Node 17+/modern browsers)
            // This handles more edge cases than JSON.parse/stringify (dates, regexes, etc.)
            if (typeof structuredClone === 'function') {
                return structuredClone(state);
            }
            
            // Fallback to JSON method for older environments
            // Note: This won't handle functions, undefined values, symbols, or circular references
            // but these shouldn't exist in our EditorState objects anyway
            return JSON.parse(JSON.stringify(state));
        } catch (error) {
            console.error('Error deep cloning state:', error);
            // If cloning fails, return a basic empty state to prevent crashes
            return {};
        }
    }
    
    /**
     * Get user-friendly description for event type
     */
    private getDescriptionForEventType(eventType: string): string {
        switch (eventType) {
            case 'fcChanged':
                return 'Feature collection change';
            case 'timeChanged':
                return 'Time change';
            case 'viewportChanged':
                return 'Viewport change';
            case 'selectionChanged':
                return 'Selection change';
            default:
                return 'State change';
        }
    }
    
    /**
     * Get history information for debugging
     */
    public getHistoryInfo(editorId?: string): { editorId: string; entries: number; position: number }[] {
        const targetEditorIds = editorId ? [editorId] : Array.from(this.historyStacks.keys());
        
        return targetEditorIds.map(id => ({
            editorId: id,
            entries: this.historyStacks.get(id)?.length || 0,
            position: this.historyPositions.get(id) || -1
        }));
    }
    
    /**
     * Clear all history (for debugging/testing)
     */
    public clearAllHistory(): void {
        this.historyStacks.clear();
        this.historyPositions.clear();
    }
    
    /**
     * Dispose of the history manager
     */
    public dispose(): void {
        this.clearAllHistory();
    }
}