import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { TimeState } from '@debrief/shared-types';

export class TimeControllerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debrief.timeController';

    private _view?: vscode.WebviewView;
    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];
    private _isUserDragging = false;
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

        this._updateView();


        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'timeChange':
                    // data.value is now an ISO string, not a timestamp
                    this._handleTimeChange(data.value);
                    break;
                case 'dragStart':
                    this._isUserDragging = true;
                    break;
                case 'dragEnd':
                    this._isUserDragging = false;
                    // Force update after dragging ends to sync with any missed state changes
                    setTimeout(() => this._updateView(), 100);
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
        // Subscribe to time changes - regenerate HTML
        const timeSubscription = this._globalController.on('timeChanged', () => {
            this._updateView();
        });
        this._disposables.push(timeSubscription);

        // Subscribe to active editor changes - regenerate HTML
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', () => {
            this._updateView();
        });
        this._disposables.push(activeEditorSubscription);
    }

    /**
     * Update the webview by regenerating HTML (like currentStateProvider)
     */
    private _updateView(): void {
        if (!this._view) return;
        
        const timeState = this._getCurrentTimeState();
        
        // If user is dragging, try to update component props instead of full HTML regeneration
        if (this._isUserDragging) {
            this._view.webview.postMessage({
                type: 'updateTimeState',
                timeState: timeState
            });
            return;
        }
        
        // Full HTML regeneration (first load or when not dragging)
        const html = this._getHtmlForWebview(this._view.webview, timeState);
        this._view.webview.html = html;
    }

    /**
     * Get current time state (like currentStateProvider)
     */
    private _getCurrentTimeState(): TimeState | null {
        const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
        
        if (!currentEditorId) {
            return null;
        }

        const editorState = this._globalController.getEditorState(currentEditorId);
        const timeState = editorState?.timeState || null;
        return timeState;
    }

    /**
     * Initialize with current editor state (with fallback like currentStateProvider)
     */
    private _updateFromCurrentEditor(): void {
        this._updateView();
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
                start: currentTimeState?.start || new Date(new Date(newTimeISO).getTime() - 3600000).toISOString(), // 1 hour before
                end: currentTimeState?.end || new Date(new Date(newTimeISO).getTime() + 3600000).toISOString()   // 1 hour after
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
            if (currentTimeState && currentTimeState.start && currentTimeState.end) {
                const updatedTimeState: TimeState = {
                    current: currentTimeState.start, // Reset to start of range
                    start: currentTimeState.start,
                    end: currentTimeState.end
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

    private _getHtmlForWebview(webview: vscode.Webview, timeState: TimeState | null) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const webComponentsJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.js'));
        const webComponentsCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'web-components.css'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${webComponentsCssUri}" rel="stylesheet">
                <title>Time Controller</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family, sans-serif); 
                        margin: 0; 
                        padding: 10px;
                        font-size: 12px;
                    }
                    .diagnostic {
                        background: #f0f0f0;
                        padding: 10px;
                        margin: 5px 0;
                        border-radius: 3px;
                        font-family: monospace;
                    }
                    .label {
                        font-weight: bold;
                        color: #0066cc;
                    }
                </style>
            </head>
            <body>
                <div id="time-controller-container"></div>
                
                <script nonce="${nonce}" src="${webComponentsJsUri}"></script>
                <script nonce="${nonce}">
                    const timeState = ${JSON.stringify(timeState)};
                    
                    function initializeTimeController() {
                        const container = document.getElementById('time-controller-container');
                        if (!container || !window.DebriefWebComponents || !window.DebriefWebComponents.createTimeController) {
                            return;
                        }
                        
                        try {
                            const vscode = acquireVsCodeApi();
                            let timeControllerInstance = null;
                            
                            let isDragging = false;
                            let lastUpdateTime = 0;
                            const UPDATE_THROTTLE = 50; // Limit updates to 20fps during drag
                            
                            timeControllerInstance = window.DebriefWebComponents.createTimeController(container, {
                                timeState: timeState,
                                isPlaying: false,
                                onTimeChange: (time) => {
                                    const now = Date.now();
                                    
                                    // If dragging, throttle updates to reduce lag
                                    if (isDragging && now - lastUpdateTime < UPDATE_THROTTLE) {
                                        return;
                                    }
                                    
                                    lastUpdateTime = now;
                                    vscode.postMessage({
                                        type: 'timeChange',
                                        value: time
                                    });
                                },
                                onPlayPause: () => {
                                    vscode.postMessage({ type: 'play' });
                                }
                            });
                            
                            // Listen for state update messages from VS Code
                            window.addEventListener('message', (event) => {
                                const message = event.data;
                                if (message.type === 'updateTimeState' && timeControllerInstance) {
                                    timeControllerInstance.updateProps({
                                        timeState: message.timeState
                                    });
                                }
                            });
                            
                            // Add drag detection to the slider
                            setTimeout(() => {
                                const slider = container.querySelector('input[type="range"]');
                                if (slider) {
                                    slider.addEventListener('mousedown', () => {
                                        isDragging = true;
                                        vscode.postMessage({ type: 'dragStart' });
                                    });
                                    
                                    slider.addEventListener('mouseup', () => {
                                        isDragging = false;
                                        vscode.postMessage({ type: 'dragEnd' });
                                    });
                                    
                                    // Also handle touch events for mobile
                                    slider.addEventListener('touchstart', () => {
                                        isDragging = true;
                                        vscode.postMessage({ type: 'dragStart' });
                                    });
                                    
                                    slider.addEventListener('touchend', () => {
                                        isDragging = false;
                                        vscode.postMessage({ type: 'dragEnd' });
                                    });
                                    
                                    // Handle case where mouse/touch leaves the slider during drag
                                    document.addEventListener('mouseup', () => {
                                        isDragging = false;
                                        vscode.postMessage({ type: 'dragEnd' });
                                    });
                                    
                                    document.addEventListener('touchend', () => {
                                        isDragging = false;
                                        vscode.postMessage({ type: 'dragEnd' });
                                    });
                                }
                            }, 100);
                                
                        } catch (error) {
                            console.error('TimeController initialization error:', error);
                        }
                    }
                    
                    // Wait for DebriefWebComponents to be available
                    if (window.DebriefWebComponents) {
                        initializeTimeController();
                    } else {
                        let attempts = 0;
                        const checkInterval = setInterval(() => {
                            attempts++;
                            if (window.DebriefWebComponents) {
                                clearInterval(checkInterval);
                                initializeTimeController();
                            } else if (attempts > 50) { // 5 seconds max
                                clearInterval(checkInterval);
                                console.error('TimeController: DebriefWebComponents not loaded within timeout');
                            }
                        }, 100);
                    }
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