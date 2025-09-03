import * as vscode from 'vscode';
import { GlobalController } from './globalController';
import { EditorIdManager } from './editorIdManager';

/**
 * EditorActivationHandler - Manages editor focus events and integrates with GlobalController
 * 
 * This class handles:
 * - Custom editor webview focus events (editorFocused, editorBlurred)
 * - Standard text editor focus events
 * - Panel attachment/detachment to active editors
 * - Ensuring panels remain attached to last active Debrief editor
 */
export class EditorActivationHandler {
    private globalController: GlobalController;
    private lastActiveDebriefEditorId?: string;
    
    // Event emitters for custom editor focus events
    private _onDidFocusEditor = new vscode.EventEmitter<string>();
    private _onDidBlurEditor = new vscode.EventEmitter<string>();
    
    public readonly onDidFocusEditor = this._onDidFocusEditor.event;
    public readonly onDidBlurEditor = this._onDidBlurEditor.event;
    
    constructor(globalController: GlobalController) {
        this.globalController = globalController;
    }
    
    /**
     * Initialize activation handling with VS Code event subscriptions
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Handle standard text editor changes
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(this.handleTextEditorChange.bind(this))
        );
        
        // Handle window state changes (for webview focus)
        context.subscriptions.push(
            vscode.window.onDidChangeWindowState(this.handleWindowStateChange.bind(this))
        );
        
        // Handle tab group changes (for tab switching)
        context.subscriptions.push(
            vscode.window.tabGroups.onDidChangeTabs(this.handleTabsChange.bind(this))
        );
        
        // Initialize with current active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && EditorIdManager.isDebriefPlotFile(activeEditor.document)) {
            this.setActiveDebriefEditor(activeEditor.document);
        }
    }
    
    /**
     * Handle text editor focus changes
     */
    private handleTextEditorChange(editor: vscode.TextEditor | undefined): void {
        if (editor && EditorIdManager.isDebriefPlotFile(editor.document)) {
            this.setActiveDebriefEditor(editor.document);
        } else if (editor && this.lastActiveDebriefEditorId) {
            // Non-Debrief editor is now active, but keep panels attached to last Debrief editor
            // Don't change the GlobalController's active editor - panels should remain attached
            console.log(`Non-Debrief editor active, keeping panels attached to ${this.lastActiveDebriefEditorId}`);
        }
    }
    
    /**
     * Handle window state changes (useful for webview focus detection)
     */
    private handleWindowStateChange(windowState: vscode.WindowState): void {
        if (windowState.focused) {
            // Window gained focus - check if we need to restore active editor state
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && EditorIdManager.isDebriefPlotFile(activeEditor.document)) {
                this.setActiveDebriefEditor(activeEditor.document);
            }
        }
    }
    
    /**
     * Handle tabs changes (for webview tab switching)
     */
    private handleTabsChange(event: vscode.TabChangeEvent): void {
        // Look for newly opened or activated tabs
        for (const tab of event.opened) {
            this.handleTabActivation(tab);
        }
        
        for (const tab of event.changed) {
            if (tab.isActive) {
                this.handleTabActivation(tab);
            }
        }
    }
    
    /**
     * Handle activation of a specific tab
     */
    private handleTabActivation(tab: vscode.Tab): void {
        // Check if this is a custom editor (webview) for a Debrief file
        if (tab.input instanceof vscode.TabInputCustom && 
            tab.input.viewType === 'plotJsonEditor') {
            
            // Find the document associated with this custom editor
            const uri = tab.input.uri;
            const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
            
            if (document && EditorIdManager.isDebriefPlotFile(document)) {
                this.setActiveDebriefEditor(document);
                
                // Fire custom editor focused event
                const editorId = EditorIdManager.getEditorId(document);
                this._onDidFocusEditor.fire(editorId);
            }
        }
    }
    
    /**
     * Set the active Debrief editor and update GlobalController
     */
    private setActiveDebriefEditor(document: vscode.TextDocument): void {
        const editorId = EditorIdManager.getEditorId(document);
        
        // Update GlobalController
        this.globalController.setActiveEditor(editorId);
        
        // Track as last active Debrief editor
        this.lastActiveDebriefEditorId = editorId;
        
        console.log(`Active Debrief editor changed to: ${editorId} (${document.fileName})`);
    }
    
    /**
     * Manually set editor focus (for external calls)
     */
    public setEditorFocused(editorId: string): void {
        this.globalController.setActiveEditor(editorId);
        this.lastActiveDebriefEditorId = editorId;
        this._onDidFocusEditor.fire(editorId);
    }
    
    /**
     * Manually set editor blur (for external calls)
     */
    public setEditorBlurred(editorId: string): void {
        this._onDidBlurEditor.fire(editorId);
        // Note: Don't change active editor on blur - keep it for panel attachment
    }
    
    /**
     * Get the last active Debrief editor ID
     */
    public getLastActiveDebriefEditor(): string | undefined {
        return this.lastActiveDebriefEditorId;
    }
    
    /**
     * Check if panels should be attached to a specific editor
     */
    public shouldPanelsAttachTo(editorId: string): boolean {
        return editorId === this.lastActiveDebriefEditorId;
    }
    
    /**
     * Register a command that panels can use to check attachment status
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        const checkAttachmentCommand = vscode.commands.registerCommand(
            'debrief.checkPanelAttachment',
            (editorId: string) => {
                return this.shouldPanelsAttachTo(editorId);
            }
        );
        context.subscriptions.push(checkAttachmentCommand);
    }
    
    /**
     * Dispose of resources
     */
    public dispose(): void {
        this._onDidFocusEditor.dispose();
        this._onDidBlurEditor.dispose();
    }
}