import * as vscode from 'vscode';
import { 
    SidebarMessage, 
    EditorState, 
    FileChange, 
    ThemeChangedPayload, 
    EditorStateUpdatePayload, 
    FileChangePayload, 
    SelectionChangePayload,
    ErrorPayload,
    MessageUtils 
} from './webview/shared/types';

export class OutlineViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debriefOutline';
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            this._handleWebviewMessage(message);
        });

        // Set up extension event listeners
        this._setupExtensionListeners();
    }

    private _handleWebviewMessage(message: any) {
        try {
            // Validate message format
            if (!MessageUtils.validateSidebarMessage(message) && !message.type) {
                this._sendErrorMessage('Invalid message format received from webview', 'validation');
                return;
            }

            const command = message.command || message.type;
            
            switch (command) {
                case 'webview-ready':
                    console.log('Outline webview ready');
                    this._sendInitialState();
                    break;
                default:
                    console.log('Outline: Unhandled message from webview:', message);
            }
        } catch (error) {
            this._sendErrorMessage('Failed to handle webview message', 'communication');
            console.error('Outline: Message handling error:', error);
        }
    }

    private _setupExtensionListeners() {
        // Listen for theme changes
        this._disposables.push(
            vscode.window.onDidChangeActiveColorTheme(() => {
                this._sendThemeInfo();
            })
        );

        // Listen for editor state changes
        this._disposables.push(
            vscode.window.onDidChangeActiveTextEditor(() => {
                this._sendEditorStateUpdate();
            })
        );

        // Listen for selection changes
        this._disposables.push(
            vscode.window.onDidChangeTextEditorSelection(() => {
                this._sendSelectionChange();
            })
        );

        // Listen for file changes
        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                this._sendFileChange(event.document.uri, 'changed');
            })
        );

        this._disposables.push(
            vscode.workspace.onDidCreateFiles((event) => {
                event.files.forEach(uri => this._sendFileChange(uri, 'created'));
            })
        );

        this._disposables.push(
            vscode.workspace.onDidDeleteFiles((event) => {
                event.files.forEach(uri => this._sendFileChange(uri, 'deleted'));
            })
        );
    }

    private _sendMessage(message: SidebarMessage) {
        if (this._view) {
            try {
                const enhancedMessage: SidebarMessage = {
                    ...message,
                    timestamp: message.timestamp || Date.now(),
                    source: message.source || 'extension'
                };
                this._view.webview.postMessage(enhancedMessage);
                console.log('Outline: Sent message:', enhancedMessage.command);
            } catch (error) {
                console.error('Outline: Failed to send message to webview:', error);
            }
        }
    }

    private _sendInitialState() {
        this._sendThemeInfo();
        this._sendEditorStateUpdate();
    }

    private _sendThemeInfo() {
        const theme = vscode.window.activeColorTheme;
        const payload: ThemeChangedPayload = {
            theme: { kind: theme.kind }
        };
        
        this._sendMessage({
            command: 'theme-changed',
            value: payload
        });
    }

    private _sendEditorStateUpdate() {
        const activeEditor = vscode.window.activeTextEditor;
        const editorState: EditorState = {};

        if (activeEditor) {
            editorState.activeFile = activeEditor.document.uri.toString();
            editorState.selection = {
                start: {
                    line: activeEditor.selection.start.line,
                    character: activeEditor.selection.start.character
                },
                end: {
                    line: activeEditor.selection.end.line,
                    character: activeEditor.selection.end.character
                }
            };
            editorState.cursorPosition = {
                line: activeEditor.selection.active.line,
                character: activeEditor.selection.active.character
            };
            editorState.visibleRanges = activeEditor.visibleRanges.map(range => ({
                start: { line: range.start.line, character: range.start.character },
                end: { line: range.end.line, character: range.end.character }
            }));
        }

        const payload: EditorStateUpdatePayload = { editorState };
        
        this._sendMessage({
            command: 'editor-state-update',
            value: payload
        });
    }

    private _sendSelectionChange() {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const payload: SelectionChangePayload = {
                selection: {
                    start: {
                        line: activeEditor.selection.start.line,
                        character: activeEditor.selection.start.character
                    },
                    end: {
                        line: activeEditor.selection.end.line,
                        character: activeEditor.selection.end.character
                    }
                },
                activeFile: activeEditor.document.uri.toString()
            };
            
            this._sendMessage({
                command: 'selection-change',
                value: payload
            });
        }
    }

    private _sendFileChange(uri: vscode.Uri, type: 'created' | 'changed' | 'deleted') {
        const payload: FileChangePayload = {
            changes: [{
                uri: uri.toString(),
                type
            }]
        };
        
        this._sendMessage({
            command: 'file-change',
            value: payload
        });
    }

    private _sendErrorMessage(message: string, type: ErrorPayload['type'] = 'communication') {
        const errorMessage = MessageUtils.createErrorMessage(message, type, 'outline-provider');
        this._sendMessage(errorMessage);
        console.error('Outline Provider Error:', message);
    }

    public dispose() {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }

    public refresh(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get paths to the built React files
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'outline.js'));
        const reactRuntimeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles-Boiq29qA.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles-DsXVXsRt.css'));

        console.log('Outline: Extension URI:', this._extensionUri.toString());
        console.log('Outline: Script URI:', scriptUri.toString());
        console.log('Outline: React Runtime URI:', reactRuntimeUri.toString());
        console.log('Outline: Style URI:', styleUri.toString());

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-eval';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>Debrief Outline</title>
        </head>
        <body>
            <div id="root"></div>
            <script type="module" src="${reactRuntimeUri}"></script>
            <script type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}