
import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { CurrentState } from '@debrief/shared-types/derived/typescript/currentstate';

export class CurrentStateProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.currentState';
  private _view?: vscode.WebviewView;
  private _globalController: GlobalController;
  private _subscriptions: vscode.Disposable[] = [];

  constructor() {
    this._globalController = GlobalController.getInstance();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    this._update();
    this._setupEventSubscriptions();
    webviewView.onDidDispose(() => {
      this._cleanup();
    });
  }

  private _update() {
    if (!this._view) return;
    const currentState = this._getCurrentEditorState();
    const html = this._renderTable(currentState);
    this._view.webview.html = html;
  }

  private _getCurrentEditorState(): CurrentState | null {
    // Get the current active editor ID
    const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
    
    if (!currentEditorId) {
      return null;
    }

    const filename = this._globalController.getEditorFilename(currentEditorId) || '';
    const editorState = this._globalController.getEditorState(currentEditorId);
    const history = this._globalController.getHistory(currentEditorId);
    const historyCount = Array.isArray(history) ? history.length : 0;

    return {
      editorId: currentEditorId,
      filename,
      editorState,
      historyCount
    };
  }

  private _renderTable(currentState: CurrentState | null): string {
    // Use the vanilla web-components bundle and custom element
    const nonce = this._getNonce();
    if (!this._view) {
      return '<div>Error: View not initialized</div>';
    }
    
    if (!currentState) {
      return `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Current State (debug)</title>
          <style>
            body { font-family: var(--vscode-font-family, sans-serif); margin: 0; padding: 20px; }
          </style>
        </head>
        <body>
          <div>No active editor</div>
        </body>
        </html>`;
    }
    
    const extensionUri = vscode.extensions.getExtension('ian.vs-code')?.extensionUri || vscode.Uri.file('.');
    const webComponentsScriptUri = this._view.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'media', 'web-components.js')
    );
    const webComponentsCssUri = this._view.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'media', 'web-components.css')
    );
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${this._view?.webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Current State (debug)</title>
        <link rel="stylesheet" href="${webComponentsCssUri}">
        <style>
          body { font-family: var(--vscode-font-family, sans-serif); margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <current-state-table id="current-state-table"></current-state-table>
        <script nonce="${nonce}" src="${webComponentsScriptUri}"></script>
        <script nonce="${nonce}">
          const currentState = ${JSON.stringify(currentState)};
          function setTableData() {
            const table = document.getElementById('current-state-table');
            if (table && typeof table.setCurrentState === 'function') {
              table.setCurrentState(currentState);
            } else if (table) {
              table.currentState = currentState;
            }
          }
          if (window.customElements && customElements.get('current-state-table')) {
            setTableData();
          } else {
            customElements.whenDefined('current-state-table').then(setTableData);
          }
        </script>
      </body>
      </html>`;
  }

  private _getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private _setupEventSubscriptions(): void {
    // Subscribe to all state changes that affect the current state display
    const fcSubscription = this._globalController.on('fcChanged', () => {
      this._update();
    });
    
    const timeSubscription = this._globalController.on('timeChanged', () => {
      this._update();
    });
    
    const viewportSubscription = this._globalController.on('viewportChanged', () => {
      this._update();
    });
    
    const selectionSubscription = this._globalController.on('selectionChanged', () => {
      this._update();
    });
    
    const activeEditorSubscription = this._globalController.on('activeEditorChanged', () => {
      this._update();
    });

    // Store disposables for cleanup
    this._subscriptions.push(fcSubscription, timeSubscription, viewportSubscription, selectionSubscription, activeEditorSubscription);
  }

  private _cleanup(): void {
    // Dispose all event subscriptions
    this._subscriptions.forEach(disposable => disposable.dispose());
    this._subscriptions = [];
  }
}
