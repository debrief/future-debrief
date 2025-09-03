import * as vscode from 'vscode';

/**
 * EditorIdManager - Utility for generating and managing unique editor IDs
 * 
 * This handles mapping VS Code TextDocument instances to stable editor IDs
 * that can be used consistently across the GlobalController system.
 */
export class EditorIdManager {
    private static documentToEditorId = new Map<string, string>();
    private static editorIdToDocument = new Map<string, vscode.TextDocument>();
    private static idCounter = 0;

    /**
     * Get or create a stable editor ID for a VS Code TextDocument
     */
    public static getEditorId(document: vscode.TextDocument): string {
        const documentKey = document.uri.toString();
        
        let editorId = this.documentToEditorId.get(documentKey);
        if (!editorId) {
            editorId = this.generateEditorId(document);
            this.documentToEditorId.set(documentKey, editorId);
            this.editorIdToDocument.set(editorId, document);
        }
        
        return editorId;
    }
    
    /**
     * Get the TextDocument associated with an editor ID
     */
    public static getDocument(editorId: string): vscode.TextDocument | undefined {
        return this.editorIdToDocument.get(editorId);
    }
    
    /**
     * Remove tracking for a document (cleanup when document is closed)
     */
    public static removeDocument(document: vscode.TextDocument): string | undefined {
        const documentKey = document.uri.toString();
        const editorId = this.documentToEditorId.get(documentKey);
        
        if (editorId) {
            this.documentToEditorId.delete(documentKey);
            this.editorIdToDocument.delete(editorId);
        }
        
        return editorId;
    }
    
    /**
     * Check if a document is a Debrief plot file
     */
    public static isDebriefPlotFile(document: vscode.TextDocument): boolean {
        return document.fileName.endsWith('.plot.json');
    }
    
    /**
     * Get all currently tracked editor IDs for Debrief plot files
     */
    public static getAllDebriefEditorIds(): string[] {
        const editorIds: string[] = [];
        
        for (const [editorId, document] of this.editorIdToDocument.entries()) {
            if (this.isDebriefPlotFile(document)) {
                editorIds.push(editorId);
            }
        }
        
        return editorIds;
    }
    
    /**
     * Generate a unique editor ID based on document properties
     */
    private static generateEditorId(document: vscode.TextDocument): string {
        const fileName = document.fileName.split('/').pop() || 'unknown';
        const baseName = fileName.replace('.plot.json', '');
        const id = `debrief-${baseName}-${++this.idCounter}`;
        
        return id;
    }
    
    /**
     * Clear all tracking (for testing/cleanup)
     */
    public static clear(): void {
        this.documentToEditorId.clear();
        this.editorIdToDocument.clear();
        this.idCounter = 0;
    }
}