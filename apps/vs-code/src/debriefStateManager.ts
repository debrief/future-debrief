import * as vscode from 'vscode';

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

export interface DebriefState {
    time?: number;
    viewport?: {
        center: [number, number];
        zoom: number;
    };
    selection?: {
        featureIndex: number;
        feature: GeoJSONFeature;
    };
    featureCollection?: GeoJSONFeatureCollection;
    [key: string]: unknown;
}

export class DebriefStateManager {
    private _onDidChangeState = new vscode.EventEmitter<DebriefState>();
    public readonly onDidChangeState = this._onDidChangeState.event;

    private currentState: DebriefState = {};
    private currentDocument: vscode.TextDocument | undefined;

    private subscribers: Array<(state: DebriefState) => void> = [];

    constructor() {
        // Listen for active editor changes
        vscode.window.onDidChangeActiveTextEditor(this.handleEditorChange.bind(this));
        
        // Listen for document changes
        vscode.workspace.onDidChangeTextDocument(this.handleDocumentChange.bind(this));
        
        // Initialize with current editor if available
        this.handleEditorChange(vscode.window.activeTextEditor);
    }

    public subscribe(callback: (state: DebriefState) => void): vscode.Disposable {
        this.subscribers.push(callback);
        
        // Send current state to new subscriber
        callback(this.currentState);
        
        return new vscode.Disposable(() => {
            const index = this.subscribers.indexOf(callback);
            if (index >= 0) {
                this.subscribers.splice(index, 1);
            }
        });
    }

    public updateState(partialState: Partial<DebriefState>): void {
        this.currentState = { ...this.currentState, ...partialState };
        this.notifySubscribers();
    }

    public getCurrentState(): DebriefState {
        return { ...this.currentState };
    }

    public getCurrentDocument(): vscode.TextDocument | undefined {
        return this.currentDocument;
    }

    public selectFeature(featureIndex: number): void {
        if (this.currentDocument) {
            try {
                const text = this.currentDocument.getText();
                const geoJson = JSON.parse(text);
                
                if (geoJson.type === 'FeatureCollection' && 
                    Array.isArray(geoJson.features) && 
                    featureIndex >= 0 && 
                    featureIndex < geoJson.features.length) {
                    
                    const feature = geoJson.features[featureIndex];
                    this.updateState({
                        selection: {
                            featureIndex,
                            feature
                        }
                    });
                }
            } catch (error) {
                console.error('Error selecting feature:', error);
            }
        }
    }

    private handleEditorChange(editor: vscode.TextEditor | undefined): void {
        if (editor && this.isPlotJsonFile(editor.document)) {
            this.currentDocument = editor.document;
            this.updateFeatureCollection();
            // Reset selection when switching documents
            this.updateState({ selection: undefined });
        } else if (!editor || !this.isPlotJsonFile(editor.document)) {
            // No relevant editor active
            this.currentDocument = undefined;
            this.updateState({ 
                featureCollection: undefined,
                selection: undefined
            });
        }
    }

    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        if (this.currentDocument && event.document === this.currentDocument) {
            this.updateFeatureCollection();
        }
    }

    private updateFeatureCollection(): void {
        if (!this.currentDocument) {
            return;
        }

        try {
            const text = this.currentDocument.getText();
            if (text.trim().length === 0) {
                this.updateState({ featureCollection: undefined });
                return;
            }

            const geoJson = JSON.parse(text);
            if (geoJson.type === 'FeatureCollection') {
                this.updateState({ featureCollection: geoJson });
            }
        } catch (error) {
            console.error('Error parsing GeoJSON for state update:', error);
            this.updateState({ featureCollection: undefined });
        }
    }

    private isPlotJsonFile(document: vscode.TextDocument): boolean {
        return document.fileName.endsWith('.plot.json');
    }

    private notifySubscribers(): void {
        this._onDidChangeState.fire(this.currentState);
        this.subscribers.forEach(callback => {
            try {
                callback(this.currentState);
            } catch (error) {
                console.error('Error in state subscriber callback:', error);
            }
        });
    }

    public dispose(): void {
        this._onDidChangeState.dispose();
        this.subscribers.length = 0;
    }
}