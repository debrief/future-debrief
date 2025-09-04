
import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';

export class CurrentStateProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.currentState';
  private _view?: vscode.WebviewView;
  private _globalController: GlobalController;
  private _interval?: NodeJS.Timeout;

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
    // Poll for state changes every 500ms
    this._interval = setInterval(() => this._update(), 500);
    webviewView.onDidDispose(() => {
      if (this._interval) clearInterval(this._interval);
    });
  }

  private _update() {
    if (!this._view) return;
    const editorStates = this._getCurrentEditorState();
    const html = this._renderTable(editorStates);
    this._view.webview.html = html;
  }

  private _getCurrentEditorState() {
    // Get the current active editor ID
    const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
    
    if (!currentEditorId) {
      return [];
    }

    const filename = this._globalController.getEditorFilename(currentEditorId) || '';
    const timeState = this._globalController.getStateSlice(currentEditorId, 'timeState') || '';
    const viewportState = this._globalController.getStateSlice(currentEditorId, 'viewportState') || '';
    const selectedState = this._globalController.getStateSlice(currentEditorId, 'selectionState');
    const selectedIds = selectedState?.selectedIds || [];
    const fc = this._globalController.getStateSlice(currentEditorId, 'featureCollection');
    const fcSummary = fc ? `FC (${fc.features?.length || 0} features)` : '';
    const fcCount = fc?.features?.length || 0;
    const history = this._globalController.getHistory(currentEditorId);
    const historyCount = Array.isArray(history) ? history.length : 0;

    // Return each field as its own row with field name and value
    return [
      { field: 'Editor ID', value: currentEditorId },
      { field: 'Filename', value: filename },
      { field: 'Time State', value: String(timeState) },
      { field: 'Viewport State', value: String(viewportState) },
      { field: 'Selected IDs', value: selectedIds.join(', ') },
      { field: 'FC Summary', value: fcSummary },
      { field: 'FC Count', value: fcCount.toString() },
      { field: 'History Count', value: historyCount.toString() },
    ];
  }

  private _renderTable(data: { field: string; value: string }[]): string {
    // Use the vanilla web-components bundle and custom element
    const nonce = this._getNonce();
    if (!this._view) {
      return '<div>Error: View not initialized</div>';
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
          const data = ${JSON.stringify(data)};
          function setTableData() {
            const table = document.getElementById('current-state-table');
            if (table && typeof table.setData === 'function') {
              table.setData(data);
            } else if (table) {
              table.data = data;
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
}
