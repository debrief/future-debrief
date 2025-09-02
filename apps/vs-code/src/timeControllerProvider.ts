import * as vscode from 'vscode';

export class TimeControllerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.timeController';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

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

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'timeChange':
                    console.log('Time changed to:', data.value);
                    break;
            }
        });
    }

    public updateState(state: any) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'stateUpdate',
                state: state
            });
        }
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