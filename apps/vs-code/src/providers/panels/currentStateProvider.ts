import * as vscode from 'vscode';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { CurrentStateTable, EditorStateRow } from '@debrief/web-components';
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

  private _getEditorStates(): EditorStateRow[] {
    // TODO: Replace with real state from globalController
    const editors = this._globalController.getAllEditorIds();
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

  private _renderTable(data: EditorStateRow[]): string {
    // Render the React table to static HTML for the webview
    const table = React.createElement(CurrentStateTable, { data });
    const tableHtml = renderToString(table);
    return `
      <html>
        <head>
          <style>
            body { font-family: var(--vscode-font-family, sans-serif); margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
            th { background: #f4f4f4; }
            tr:nth-child(even) { background: #fafafa; }
            .highlight { background: #fff7c0 !important; transition: background 0.2s; }
          </style>
        </head>
        <body>${tableHtml}</body>
      </html>
    `;
  }
}
