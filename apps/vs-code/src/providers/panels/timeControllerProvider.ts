import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';

export class TimeControllerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.timeController';

    private _view?: vscode.WebviewView;
    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];
    private _lastTimeString?: string;
    private _cachedTimestamp?: number;

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

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'timeChange':
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

        // Initialize with current active editor state
        this._updateFromActiveEditor();
    }

    /**
     * Setup subscriptions to GlobalController events
     */
    private _setupGlobalControllerSubscriptions(): void {
        // Subscribe to time changes
        const timeSubscription = this._globalController.on('timeChanged', (data) => {
            this._updateTimeDisplay(data.state.timeState);
        });
        this._disposables.push(timeSubscription);

        // Subscribe to active editor changes
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', (data) => {
            if (data.currentEditorId) {
                const state = this._globalController.getEditorState(data.currentEditorId);
                this._updateTimeDisplay(state.timeState);
            } else {
                this._updateTimeDisplay(undefined);
            }
        });
        this._disposables.push(activeEditorSubscription);
    }

    /**
     * Update the webview with current time state
     */
    private _updateTimeDisplay(timeState?: TimeState): void {
        if (this._view) {
            let timestamp: number | undefined;
            
            if (timeState?.current) {
                // Cache timestamp to avoid repeated Date parsing
                if (this._lastTimeString !== timeState.current) {
                    this._lastTimeString = timeState.current;
                    this._cachedTimestamp = new Date(timeState.current).getTime() / 1000;
                }
                timestamp = this._cachedTimestamp;
            } else {
                // Clear cache when no time state
                this._lastTimeString = undefined;
                this._cachedTimestamp = undefined;
                timestamp = undefined;
            }
            
            this._view.webview.postMessage({
                type: 'stateUpdate',
                state: {
                    time: timestamp
                }
            });
        }
    }

    /**
     * Initialize with current active editor state
     */
    private _updateFromActiveEditor(): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            const timeState = this._globalController.getStateSlice(activeEditorId, 'timeState');
            this._updateTimeDisplay(timeState);
        }
    }

    /**
     * Handle time change from webview
     */
    private _handleTimeChange(timeValue: number): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            const timeState: TimeState = {
                current: new Date(timeValue * 1000).toISOString()
            };
            this._globalController.updateState(activeEditorId, 'timeState', timeState);
        }
    }

    /**
     * Handle stop action
     */
    private _handleStop(): void {
        const activeEditorId = this._globalController.activeEditorId;
        if (activeEditorId) {
            const timeState: TimeState = {
                current: new Date(0).toISOString() // Reset to epoch
            };
            this._globalController.updateState(activeEditorId, 'timeState', timeState);
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

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <title>Time Controller</title>
                <style>
                    .time-controller {
                        padding: 10px;
                        height: 100px;
                        box-sizing: border-box;
                    }
                    .time-slider {
                        width: 100%;
                        margin-bottom: 10px;
                    }
                    .time-display {
                        text-align: center;
                        font-family: monospace;
                        font-size: 12px;
                    }
                    .controls {
                        display: flex;
                        justify-content: center;
                        gap: 5px;
                        margin-top: 10px;
                    }
                    button {
                        padding: 4px 8px;
                        font-size: 11px;
                    }
                </style>
            </head>
            <body>
                <div class="time-controller">
                    <div class="time-display" id="timeDisplay">00:00:00</div>
                    <input type="range" class="time-slider" id="timeSlider" min="0" max="100" value="0">
                    <div class="controls">
                        <button id="playBtn">▶</button>
                        <button id="pauseBtn">⏸</button>
                        <button id="stopBtn">⏹</button>
                    </div>
                </div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const timeSlider = document.getElementById('timeSlider');
                    const timeDisplay = document.getElementById('timeDisplay');
                    const playBtn = document.getElementById('playBtn');
                    const pauseBtn = document.getElementById('pauseBtn');
                    const stopBtn = document.getElementById('stopBtn');

                    let isPlaying = false;
                    let currentTime = 0;

                    timeSlider.addEventListener('input', (e) => {
                        currentTime = parseInt(e.target.value);
                        updateTimeDisplay();
                        vscode.postMessage({
                            type: 'timeChange',
                            value: currentTime
                        });
                    });

                    playBtn.addEventListener('click', () => {
                        isPlaying = true;
                        vscode.postMessage({ type: 'play' });
                    });

                    pauseBtn.addEventListener('click', () => {
                        isPlaying = false;
                        vscode.postMessage({ type: 'pause' });
                    });

                    stopBtn.addEventListener('click', () => {
                        isPlaying = false;
                        currentTime = 0;
                        timeSlider.value = '0';
                        updateTimeDisplay();
                        vscode.postMessage({ type: 'stop' });
                    });

                    function updateTimeDisplay() {
                        const hours = Math.floor(currentTime / 3600).toString().padStart(2, '0');
                        const minutes = Math.floor((currentTime % 3600) / 60).toString().padStart(2, '0');
                        const seconds = (currentTime % 60).toString().padStart(2, '0');
                        timeDisplay.textContent = hours + ':' + minutes + ':' + seconds;
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'stateUpdate':
                                if (message.state.time !== undefined) {
                                    currentTime = message.state.time;
                                    timeSlider.value = currentTime.toString();
                                    updateTimeDisplay();
                                } else {
                                    // Reset to default if no time state
                                    currentTime = 0;
                                    timeSlider.value = '0';
                                    updateTimeDisplay();
                                }
                                break;
                        }
                    });

                    updateTimeDisplay();
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