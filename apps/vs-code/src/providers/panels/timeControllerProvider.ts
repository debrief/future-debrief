import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';

export class TimeControllerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.timeController';

    private _view?: vscode.WebviewView;
    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        this._globalController = GlobalController.getInstance();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        console.warn('TimeControllerProvider: Webview resolved');

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'timeChange':
                    // data.value is now an ISO string, not a timestamp
                    console.warn('TimeControllerProvider: Time change requested', data.value);
                    this._handleTimeChange(data.value);
                    break;
                case 'play':
                    // TODO: Handle play functionality
                    break;
                case 'pause':
                    // TODO: Handle pause functionality  
                    break;
                case 'stop':
                    this._handleStop();
                    break;
            }
        });

        // Subscribe to GlobalController events
        this._setupGlobalControllerSubscriptions();

        // Initialize with current state immediately
        this._updateFromCurrentEditor();
    }

    /**
     * Setup subscriptions to GlobalController events
     */
    private _setupGlobalControllerSubscriptions(): void {
        // Subscribe to time changes - update from current editor
        const timeSubscription = this._globalController.on('timeChanged', () => {
            this._updateFromCurrentEditor();
        });
        this._disposables.push(timeSubscription);

        // Subscribe to active editor changes - update from current editor
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', () => {
            this._updateFromCurrentEditor();
        });
        this._disposables.push(activeEditorSubscription);
    }

    /**
     * Update the webview with current time state
     */
    private _updateTimeDisplay(timeState?: TimeState): void {
        console.warn('TimeControllerProvider: _updateTimeDisplay called with timeState:', timeState);
        if (this._view) {
            console.warn('TimeControllerProvider: Posting message to webview with timeState:', timeState);
            this._view.webview.postMessage({
                type: 'stateUpdate',
                state: {
                    timeState: timeState
                }
            });
        } else {
            console.warn('TimeControllerProvider: No webview available to update');
        }
    }

    /**
     * Initialize with current editor state (with fallback like currentStateProvider)
     */
    private _updateFromCurrentEditor(): void {
        // Get the current active editor ID, or fall back to first available editor
        const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
        
        if (currentEditorId) {
            const editorState = this._globalController.getEditorState(currentEditorId);
            const timeState = editorState?.timeState;
            this._updateTimeDisplay(timeState);
            console.warn('TimeControllerProvider: Initialized with current editor time state', timeState, 'from editor', currentEditorId);
        } else {
            console.warn('TimeControllerProvider: No editors available');
            this._updateTimeDisplay(undefined);
        }
    }

    /**
     * Handle time change from webview
     */
    private _handleTimeChange(newTimeISO: string): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            // Get current time state to preserve the range
            const currentTimeState = this._globalController.getStateSlice(activeEditorId, 'timeState');
            const updatedTimeState: TimeState = {
                current: newTimeISO,
                range: currentTimeState?.range || [
                    new Date(new Date(newTimeISO).getTime() - 3600000).toISOString(), // 1 hour before
                    new Date(new Date(newTimeISO).getTime() + 3600000).toISOString()   // 1 hour after
                ]
            };
            this._globalController.updateState(activeEditorId, 'timeState', updatedTimeState);
        }
    }

    /**
     * Handle stop action
     */
    private _handleStop(): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            // Get current time state to preserve the range
            const currentTimeState = this._globalController.getStateSlice(activeEditorId, 'timeState');
            if (currentTimeState && currentTimeState.range) {
                const updatedTimeState: TimeState = {
                    current: currentTimeState.range[0], // Reset to start of range
                    range: currentTimeState.range
                };
                this._globalController.updateState(activeEditorId, 'timeState', updatedTimeState);
            }
        }
    }

    /**
     * Dispose of the provider
     */
    public dispose(): void {
        this._disposables.forEach(disposable => disposable.dispose());
        this._disposables = [];
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const webComponentsJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.js'));
        const webComponentsCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.css'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${webComponentsCssUri}" rel="stylesheet">
                <title>Time Controller</title>
            </head>
            <body>
                <div id="timeController"></div>
                <script nonce="${nonce}" src="${webComponentsJsUri}"></script>
                <script nonce="${nonce}">
                    console.warn('TimeControllerProvider webview: Script starting');
                    const vscode = acquireVsCodeApi();
                    let timeControllerElement = null;
                    console.warn('TimeControllerProvider webview: vscode API acquired');

                    // Initialize TimeController with shared web component
                    function initializeTimeController(timeState) {
                        console.warn('TimeControllerProvider: initializeTimeController called with:', JSON.stringify(timeState));
                        
                        const container = document.getElementById('timeController');
                        
                        if (!timeState || !timeState.range || !timeState.current || 
                            !timeState.range[0] || !timeState.range[1]) {
                            console.warn('TimeControllerProvider: Validation failed - timeState:', JSON.stringify(timeState));
                            container.innerHTML = 
                                '<div style="padding: 10px; text-align: center;">TimeController: No time range available</div>';
                            return;
                        }

                        // Create debrief-time-controller web component
                        container.innerHTML = '<debrief-time-controller id="timeControllerComponent"></debrief-time-controller>';
                        
                        const timeController = container.querySelector('#timeControllerComponent');
                        
                        if (!timeController) {
                            console.error('TimeControllerProvider: Failed to create debrief-time-controller element');
                            container.innerHTML = 
                                '<div style="padding: 10px; text-align: center; color: red;">Error: Could not create time controller element</div>';
                            return;
                        }

                        // Set properties on the web component
                        timeController.timeState = timeState;
                        timeController.isPlaying = false;
                        
                        // Set up event listeners
                        timeController.addEventListener('timeChange', (event) => {
                            console.warn('TimeController: Time changed to', event.detail);
                            vscode.postMessage({
                                type: 'timeChange',
                                value: event.detail
                            });
                        });
                        
                        timeController.addEventListener('playPause', () => {
                            console.warn('TimeController: Play/pause clicked');
                            vscode.postMessage({ type: 'play' });
                        });

                        console.warn('TimeControllerProvider: Web component TimeController created successfully');
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        console.warn('TimeControllerProvider webview: Received message', message);
                        switch (message.type) {
                            case 'stateUpdate':
                                console.warn('TimeControllerProvider webview: Processing stateUpdate with timeState:', message.state.timeState);
                                initializeTimeController(message.state.timeState || null);
                                break;
                        }
                    });

                    // Initialize with empty state
                    initializeTimeController(null);
                </script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}