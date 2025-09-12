import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { SelectionState, DebriefFeatureCollection } from '@debrief/shared-types';

export class DebriefOutlineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.outline';
  private _view?: vscode.WebviewView;
  private _globalController: GlobalController;
  private _subscriptions: vscode.Disposable[] = [];
  private _outlineComponent: any = null;

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
    this._setupMessageHandlers();
    webviewView.onDidDispose(() => {
      this._cleanup();
    });
  }

  private _update() {
    if (!this._view) return;
    const outlineData = this._getOutlineData();
    const html = this._renderOutlineView(outlineData);
    this._view.webview.html = html;
  }

  private _getOutlineData(): {
    featureCollection: DebriefFeatureCollection | null;
    selectedFeatureIds: string[];
    currentEditorId?: string;
  } {
    const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
    
    if (!currentEditorId) {
      return {
        featureCollection: { type: 'FeatureCollection', features: [] },
        selectedFeatureIds: [],
      };
    }

    const featureCollection = this._globalController.getStateSlice(currentEditorId, 'featureCollection') || { type: 'FeatureCollection', features: [] };
    const selectionState = this._globalController.getStateSlice(currentEditorId, 'selectionState') || { selectedIds: [] };
    const selectedFeatureIds = Array.isArray(selectionState.selectedIds) 
      ? selectionState.selectedIds.map(id => String(id))
      : [];

    return {
      featureCollection,
      selectedFeatureIds,
      currentEditorId
    };
  }

  private _renderOutlineView(data: {
    featureCollection: DebriefFeatureCollection | null;
    selectedFeatureIds: string[];
    currentEditorId?: string;
  }): string {
    const nonce = this._getNonce();
    if (!this._view) {
      return '<div>Error: View not initialized</div>';
    }
    
    if (!data.featureCollection || !data.currentEditorId) {
      return `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Outline View</title>
          <style>
            body { 
              font-family: var(--vscode-font-family, sans-serif); 
              margin: 0; 
              padding: 20px; 
              color: var(--vscode-foreground);
              background-color: var(--vscode-editor-background);
            }
          </style>
        </head>
        <body>
          <div>No active plot editor</div>
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
        <title>Outline View</title>
        <link rel="stylesheet" href="${webComponentsCssUri}">
        <style>
          body { 
            font-family: var(--vscode-font-family, sans-serif); 
            margin: 0; 
            padding: 0; 
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          #outline-container {
            height: 100vh;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="outline-container"></div>
        <script nonce="${nonce}" src="${webComponentsScriptUri}"></script>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          window.vscode = vscode;
          const outlineData = ${JSON.stringify(data)};
          
          function initializeOutlineView() {
            const container = document.getElementById('outline-container');
            if (!container || !window.DebriefWebComponents) return;
            
            const outlineComponent = window.DebriefWebComponents.createOutlineView(container, {
              featureCollection: outlineData.featureCollection,
              selectedFeatureIds: outlineData.selectedFeatureIds,
              onSelectionChange: (ids) => {
                window.vscode.postMessage({
                  type: 'selectionChanged',
                  selectedIds: ids
                });
              },
              onFeatureVisibilityChange: (id, visible) => {
                window.vscode.postMessage({
                  type: 'visibilityChanged',
                  featureId: id,
                  visible: visible
                });
              },
              onViewFeature: (id) => {
                window.vscode.postMessage({
                  type: 'viewFeature',
                  featureId: id
                });
              },
              onDeleteFeatures: (ids) => {
                window.vscode.postMessage({
                  type: 'deleteFeatures',
                  featureIds: ids
                });
              },
              onCollapseAll: () => {
                window.vscode.postMessage({
                  type: 'collapseAll'
                });
              }
            });
            
            // Store reference for updates
            window.outlineComponent = outlineComponent;
          }
          
          // Handle VS Code messages for updates
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'updateOutlineData':
                if (window.outlineComponent) {
                  window.outlineComponent.updateProps({
                    featureCollection: message.data.featureCollection,
                    selectedFeatureIds: message.data.selectedFeatureIds
                  });
                }
                break;
            }
          });
          
          if (window.DebriefWebComponents) {
            initializeOutlineView();
          } else {
            // Wait for components to load
            document.addEventListener('DOMContentLoaded', initializeOutlineView);
          }
        </script>
      </body>
      </html>`;
  }

  private _setupMessageHandlers(): void {
    if (!this._view) return;
    
    this._view.webview.onDidReceiveMessage(
      message => {
        const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
        if (!currentEditorId) return;

        switch (message.type) {
          case 'selectionChanged':
            const selectionState: SelectionState = {
              selectedIds: message.selectedIds
            };
            this._globalController.updateState(currentEditorId, 'selectionState', selectionState);
            break;

          case 'visibilityChanged':
            // Handle visibility changes if needed
            console.log(`Feature ${message.featureId} visibility changed to ${message.visible}`);
            break;

          case 'viewFeature':
            // Handle view feature requests
            console.log(`View feature ${message.featureId}`);
            break;

          case 'deleteFeatures':
            // Handle feature deletion
            console.log(`Delete features`, message.featureIds);
            break;

          case 'collapseAll':
            // Handle collapse all
            console.log('Collapse all requested');
            break;
        }
      },
      undefined,
      this._subscriptions
    );
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
    // Subscribe to all state changes that affect the outline display
    const fcSubscription = this._globalController.on('fcChanged', () => {
      this._updateWebviewData();
    });
    
    const selectionSubscription = this._globalController.on('selectionChanged', () => {
      this._updateWebviewData();
    });
    
    const activeEditorSubscription = this._globalController.on('activeEditorChanged', () => {
      this._update(); // Full refresh when editor changes
    });

    // Store disposables for cleanup
    this._subscriptions.push(fcSubscription, selectionSubscription, activeEditorSubscription);
  }

  private _updateWebviewData(): void {
    if (!this._view) return;
    
    const outlineData = this._getOutlineData();
    this._view.webview.postMessage({
      type: 'updateOutlineData',
      data: outlineData
    });
  }

  private _cleanup(): void {
    // Dispose all event subscriptions
    this._subscriptions.forEach(disposable => disposable.dispose());
    this._subscriptions = [];
  }

  /**
   * Dispose of the provider
   */
  public dispose(): void {
    this._cleanup();
  }
}