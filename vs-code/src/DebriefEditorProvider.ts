import * as vscode from 'vscode';
import type { FeatureCollection } from 'geojson';
import { MapWebviewProvider } from './maps/MapWebviewProvider';

export class DebriefEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new DebriefEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            DebriefEditorProvider.viewType,
            provider
        );
        return providerRegistration;
    }

    private static readonly viewType = 'debrief.plotEditor';
    private mapWebviewProvider: MapWebviewProvider;

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        this.mapWebviewProvider = new MapWebviewProvider(context.extensionUri);
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup initial webview configuration
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'leaflet')
            ]
        };

        // Set the HTML content for the webview using MapWebviewProvider
        webviewPanel.webview.html = this.mapWebviewProvider.getHtmlForWebview(webviewPanel.webview);

        // Function to update the webview with current document content
        const updateWebview = () => {
            let content: string = document.getText();
            let parsedJson: any;
            let isValidJson = true;

            try {
                parsedJson = JSON.parse(content || '{}');
            } catch (error) {
                isValidJson = false;
                parsedJson = { error: 'Invalid JSON format', details: error instanceof Error ? error.message : 'Unknown error' };
            }

            webviewPanel.webview.postMessage({
                type: 'update',
                content: content || '{}',
                parsedJson: parsedJson,
                isValidJson: isValidJson
            });
        };

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        // Update webview when VS Code theme changes
        const changeThemeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
            webviewPanel.webview.html = this.mapWebviewProvider.getHtmlForWebview(webviewPanel.webview);
            updateWebview();
        });

        // Track when this editor becomes active/inactive
        webviewPanel.onDidChangeViewState(() => {
            if (webviewPanel.active) {
                const fc = this.extractFeatureCollection(document);
                console.log('DebriefEditorProvider: Editor became active, extracting FC', fc);
                vscode.commands.executeCommand('debrief.editorBecameActive', fc);
            } else {
                console.log('DebriefEditorProvider: Editor became inactive, sending null');
                vscode.commands.executeCommand('debrief.editorBecameActive', null);
            }
        });

        // Send initial message if this editor is already active
        if (webviewPanel.active) {
            const fc = this.extractFeatureCollection(document);
            console.log('DebriefEditorProvider: Editor created and is active, extracting FC', fc);
            vscode.commands.executeCommand('debrief.editorBecameActive', fc);
        }

        // Make sure we dispose of the subscriptions when the editor is closed
        webviewPanel.onDidDispose(() => {
            console.log('DebriefEditorProvider: Editor disposed, sending null 44');
            vscode.commands.executeCommand('debrief.editorBecameActive', null);
            changeDocumentSubscription.dispose();
            changeThemeSubscription.dispose();
        });

        // Send initial content to webview
        updateWebview();
    }

    private extractFeatureCollection(document: vscode.TextDocument): FeatureCollection | null {
        try {
            const content = document.getText();
            const parsed = JSON.parse(content);
            console.log('DebriefEditorProvider: Parsed document as JSON:', parsed);
            
            if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
                console.log('DebriefEditorProvider: Extracted FC with', parsed.features.length, 'features');
                return parsed as FeatureCollection;
            } else {
                console.log('DebriefEditorProvider: Document is not a valid FeatureCollection');
                return null;
            }
        } catch (error) {
            console.log('DebriefEditorProvider: Failed to parse document as JSON:', error);
            return null;
        }
    }

}