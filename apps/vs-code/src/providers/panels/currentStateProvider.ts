
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
    context: vscode.WebviewViewResolveContext,
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
    const editorStates = this._getEditorStates();
    const html = this._renderTable(editorStates);
    this._view.webview.html = html;
  }

  private _getEditorStates() {
    const editors = this._globalController.getEditorIds();
    return editors.map((editorId: string) => {
      const filename = this._globalController.getEditorFilename(editorId) || '';
      const timeState = this._globalController.getStateSlice(editorId, 'timeState') || '';
      const viewportState = this._globalController.getStateSlice(editorId, 'viewportState') || '';
      const selectedState = this._globalController.getStateSlice(editorId, 'selectionState');
      const selectedIds = selectedState?.selectedIds || [];
      const fc = this._globalController.getStateSlice(editorId, 'featureCollection');
      const fcSummary = fc ? `${fc.name || 'FC'} (${fc.features?.length || 0} features)` : '';
      const fcCount = fc?.features?.length || 0;
      const history = this._globalController.getHistory(editorId);
      const historyCount = Array.isArray(history) ? history.length : 0;
      return {
        editorId,
        filename,
        timeState: String(timeState),
        viewportState: String(viewportState),
        selectedIds,
        fcSummary,
        fcCount,
        historyCount,
      };
    });
  }

  private _renderTable(data: any[]): string {
    // Use the vanilla web-components bundle and custom element
    const nonce = this._getNonce();
    const extensionUri = (this._view as any)?.webview?.asWebviewUri
      ? (this._view as any).webview.asWebviewUri
      : (uri: any) => uri;
    const webComponentsScriptUri = extensionUri(
      vscode.Uri.joinPath(
        (vscode.extensions.getExtension('ian.vs-code')?.extensionUri || vscode.Uri.file('.')),
        'node_modules', '@debrief', 'web-components', 'dist', 'vanilla', 'index.js')
    );
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${this._view?.webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Current State</title>
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
}
