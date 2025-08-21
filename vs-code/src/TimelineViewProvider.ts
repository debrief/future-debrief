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

export class TimelineViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debriefTimeline';
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
            console.log('Timeline Provider: onDidReceiveMessage triggered with:', message);
            this._handleWebviewMessage(message);
        });

        // Set up extension event listeners
        this._setupExtensionListeners();
    }

    private _handleWebviewMessage(message: any) {
        try {
            console.log('Timeline Provider: Received message from webview:', message);
            
            // Validate message format
            const isValidSidebarMessage = MessageUtils.validateSidebarMessage(message);
            const hasLegacyType = message.type;
            
            if (!isValidSidebarMessage && !hasLegacyType) {
                console.log('Timeline Provider: Invalid message format:', message);
                this._sendErrorMessage('Invalid message format received from webview', 'validation');
                return;
            }

            const command = message.command || message.type;
            console.log('Timeline Provider: Processing command:', command);
            
            switch (command) {
                case 'webview-ready':
                    console.log('Timeline webview ready');
                    this._sendInitialState();
                    break;
                case 'ping':
                    console.log('Timeline: Received ping from webview:', message.value);
                    vscode.window.showInformationMessage(`Timeline ping: ${message.value?.message || 'Hello!'}`);
                    // Send a response back to the webview
                    this._sendMessage({
                        command: 'update-data',
                        value: { response: 'Timeline pong! Message received.', timestamp: Date.now() }
                    });
                    break;
                case 'show-info':
                    console.log('Timeline: Received show-info request from webview:', message.value);
                    const infoMessage = message.value?.info || 'Info message from timeline webview';
                    vscode.window.showInformationMessage(`🕒 ${infoMessage}`);
                    break;
                default:
                    console.log('Timeline: Unhandled message from webview:', message);
            }
        } catch (error) {
            this._sendErrorMessage('Failed to handle webview message', 'communication');
            console.error('Timeline: Message handling error:', error);
        }
    }

    private _setupExtensionListeners() {
        // Listen for theme changes
        this._disposables.push(
            vscode.window.onDidChangeActiveColorTheme(() => {
                this._sendThemeInfo();
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
                console.log('Timeline: Sent message:', enhancedMessage.command);
            } catch (error) {
                console.error('Timeline: Failed to send message to webview:', error);
            }
        }
    }

    private _sendInitialState() {
        this._sendThemeInfo();
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


    private _sendErrorMessage(message: string, type: ErrorPayload['type'] = 'communication') {
        const errorMessage = MessageUtils.createErrorMessage(message, type, 'timeline-provider');
        this._sendMessage(errorMessage);
        console.error('Timeline Provider Error:', message);
    }

    public onDebriefEditorActiveChanged(document: vscode.TextDocument | null) {
        console.log('TimelineViewProvider: Received Debrief editor active change:', document?.uri.toString() || 'null');
        // For now, just send a simple message to test the communication
        this._sendMessage({
            command: 'update-data',
            value: { 
                debriefEditor: document ? {
                    isActive: true,
                    fileName: document.uri.toString(),
                    timestamp: Date.now()
                } : {
                    isActive: false,
                    timestamp: Date.now()
                }
            },
            source: 'extension'
        });
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
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'timeline.js'));
        const reactRuntimeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles-Boiq29qA.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles-DsXVXsRt.css'));

        console.log('Timeline: Extension URI:', this._extensionUri.toString());
        console.log('Timeline: Script URI:', scriptUri.toString());
        console.log('Timeline: React Runtime URI:', reactRuntimeUri.toString());
        console.log('Timeline: Style URI:', styleUri.toString());

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-eval';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>Debrief Timeline</title>
        </head>
        <body>
            <div id="root"></div>
            <script>
                // Make VS Code API available for React components
                window.acquireVsCodeApi = acquireVsCodeApi;
            </script>
            <script type="module" src="${reactRuntimeUri}"></script>
            <script type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}