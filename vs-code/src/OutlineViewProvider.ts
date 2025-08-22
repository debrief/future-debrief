import * as vscode from 'vscode';
import type { FeatureCollection } from 'geojson';
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
    private _currentFeatureCollection: FeatureCollection | null = null;

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
            console.log('Outline Provider: onDidReceiveMessage triggered with:', message);
            this._handleWebviewMessage(message);
        });

        // Set up extension event listeners
        this._setupExtensionListeners();
    }

    private _handleWebviewMessage(message: any) {
        try {
            console.log('Outline Provider: Received message from webview:', message);
            
            // Validate message format
            const isValidSidebarMessage = MessageUtils.validateSidebarMessage(message);
            const hasLegacyType = message.type;
            
            if (!isValidSidebarMessage && !hasLegacyType) {
                console.log('Outline Provider: Invalid message format:', message);
                this._sendErrorMessage('Invalid message format received from webview', 'validation');
                return;
            }

            const command = message.command || message.type;
            console.log('Outline Provider: Processing command:', command);
            
            switch (command) {
                case 'webview-ready':
                    console.log('Outline webview ready');
                    this._sendInitialState();
                    // Send current feature collection if we have one
                    if (this._currentFeatureCollection !== null) {
                        console.log('Outline webview ready: Sending stored FC with', this._currentFeatureCollection?.features?.length || 0, 'features');
                        this._sendFeatureCollectionUpdate(this._currentFeatureCollection);
                    }
                    break;
                case 'refresh-request':
                    console.log('Outline: Received refresh request from webview');
                    this._sendInitialState();
                    vscode.window.showInformationMessage('Outline panel refreshed at webview request');
                    break;
                case 'ping':
                    console.log('Outline: Received ping from webview:', message.value);
                    vscode.window.showInformationMessage(`Ping received from Outline: ${message.value?.message || 'Hello!'}`);
                    // Send a response back to the webview
                    this._sendMessage({
                        command: 'update-data',
                        value: { response: 'Pong! Extension received your message.', timestamp: Date.now() }
                    });
                    break;
                case 'show-info':
                    console.log('Outline: Received show-info request from webview:', message.value);
                    const infoMessage = message.value?.info || 'Info message from webview';
                    vscode.window.showInformationMessage(`📋 ${infoMessage}`);
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
        const errorMessage = MessageUtils.createErrorMessage(message, type, 'outline-provider');
        this._sendMessage(errorMessage);
        console.error('Outline Provider Error:', message);
    }

    public onDebriefEditorActiveChanged(featureCollection: FeatureCollection | null) {
        console.log('OutlineViewProvider: Received Debrief editor active change:', featureCollection ? `FC with ${featureCollection.features?.length || 0} features` : 'null');
        
        // Store the current feature collection
        this._currentFeatureCollection = featureCollection;
        
        // Send to webview if it's ready
        this._sendFeatureCollectionUpdate(featureCollection);
    }

    private _sendFeatureCollectionUpdate(featureCollection: FeatureCollection | null) {
        // Send the FeatureCollection to the React component
        this._sendMessage({
            command: 'update-data',
            value: { 
                debriefEditor: featureCollection ? {
                    isActive: true,
                    featureCollection: featureCollection,
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
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'outline.js'));
        const reactRuntimeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles-Boiq29qA.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles-DsXVXsRt.css'));

        // console.log('Outline: Extension URI 12:', this._extensionUri.toString());
        // console.log('Outline: Script URI:', scriptUri.toString());
        // console.log('Outline: React Runtime URI:', reactRuntimeUri.toString());
        // console.log('Outline: Style URI:', styleUri.toString());

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