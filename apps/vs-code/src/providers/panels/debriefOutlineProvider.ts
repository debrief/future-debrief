import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { SelectionState, DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types';
import { ToolSchema } from '@debrief/web-components/services';

export class DebriefOutlineProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.outline';
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
    this._setupMessageHandlers();
    webviewView.onDidDispose(() => {
      this._cleanup();
    });

    // Check if Tool Vault server is already ready (handles race condition)
    this._checkInitialToolVaultState();
  }

  private async _update() {
    if (!this._view) return;
    const outlineData = this._getOutlineData();
    const html = await this._renderOutlineView(outlineData);
    this._view.webview.html = html;
  }

  private _getOutlineData(): {
    featureCollection: DebriefFeatureCollection | null;
    selectedFeatureIds: string[];
    currentEditorId?: string;
  } {
    const activeEditorId = this._globalController.activeEditorId;
    const allEditorIds = this._globalController.getEditorIds();
    const currentEditorId = activeEditorId || allEditorIds[0];

    console.warn('[DebriefOutlineProvider] Debug info:', {
      activeEditorId,
      allEditorIds,
      currentEditorId
    });

    if (!currentEditorId) {
      console.warn('[DebriefOutlineProvider] No current editor ID found');
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

  private async _renderOutlineView(data: {
    featureCollection: DebriefFeatureCollection | null;
    selectedFeatureIds: string[];
    currentEditorId?: string;
  }): Promise<string> {
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

    let toolList;
    try {
      toolList = await this._globalController.getToolIndex();
    } catch (error) {
      console.warn('[DebriefOutlineProvider] Failed to get tool index:', error);
      toolList = []; // Pass empty tool list on error
    }

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${this._view?.webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${this._view?.webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Outline View</title>
        <link rel="stylesheet" href="${webComponentsCssUri}">
        <style>
          /* VS Code Codicons for vscode-elements */
          @import url("vscode-resource://icons/codicon/codicon.css");
          .codicon {
            font-family: 'codicon';
            font-display: block;
            font-size: 16px;
            text-rendering: auto;
            text-align: center;
            text-transform: none;
            line-height: 1;
            letter-spacing: 0px;
            will-change: transform;
          }
        </style>
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
          const toolList = ${JSON.stringify(toolList)};
          
          function initializeOutlineView() {
            const container = document.getElementById('outline-container');
            if (!container || !window.DebriefWebComponents) return;
            
            const outlineComponent = window.DebriefWebComponents.createOutlineViewParent(container, {
              featureCollection: outlineData.featureCollection,
              selectedFeatureIds: outlineData.selectedFeatureIds,
              toolList,
              onSelectionChange: (ids) => {
                window.vscode.postMessage({
                  type: 'selectionChanged',
                  selectedIds: ids
                });
              },
              onCommandExecute: (tool, selectedFeatures) => {
                window.vscode.postMessage({
                  type: 'executeCommand',
                  command: tool,
                  selectedFeatures: selectedFeatures
                });
              },
              enableSmartFiltering: true,
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
      async message => {
        const currentEditorId = this._globalController.activeEditorId || this._globalController.getEditorIds()[0];
        if (!currentEditorId) return;

        switch (message.type) {
          case 'selectionChanged': {
            const selectionState: SelectionState = {
              selectedIds: message.selectedIds
            };
            this._globalController.updateState(currentEditorId, 'selectionState', selectionState);
            break;
          }

          case 'visibilityChanged': {
            // Update feature visibility in the feature collection
            const featureCollection = this._globalController.getStateSlice(currentEditorId, 'featureCollection');
            if (featureCollection && featureCollection.features) {
              const updatedFeatures = featureCollection.features.map(feature => {
                if (String(feature.id) === message.featureId) {
                  return {
                    ...feature,
                    properties: {
                      ...feature.properties,
                      visible: message.visible as boolean
                    }
                  } as typeof feature;
                }
                return feature;
              });
              
              const updatedFeatureCollection: DebriefFeatureCollection = {
                ...featureCollection,
                features: updatedFeatures
              };
              
              this._globalController.updateState(currentEditorId, 'featureCollection', updatedFeatureCollection);
            }
            break;
          }

          case 'viewFeature':
            // Handle view feature requests
            // Handle view feature requests
            break;

          case 'deleteFeatures':
            // Handle feature deletion
            // Handle feature deletion
            break;

          case 'collapseAll':
            // Handle collapse all
            // Handle collapse all
            break;

          case 'executeCommand': {
            // Extract tool name from the command object
            let toolName = 'unknown-tool';
            if (typeof message.command === 'string') {
              toolName = message.command;
            } else if (message.command && typeof message.command === 'object') {
              const cmd = message.command as { name?: string; tool?: { name?: string } };
              toolName = cmd.name || (cmd.tool && cmd.tool.name) || 'unknown-tool';
            }
            await this._executeToolCommand(toolName, message.selectedFeatures);
            break;
          }
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

    const activeEditorSubscription = this._globalController.on('activeEditorChanged', async (data) => {
      console.warn('[DebriefOutlineProvider] activeEditorChanged event received:', {
        previousEditorId: data.previousEditorId,
        currentEditorId: data.currentEditorId,
        globalControllerActiveId: this._globalController.activeEditorId
      });
      await this._update(); // Full refresh when editor changes
    });

    // Subscribe to Tool Vault server ready events to refresh tools
    const toolVaultReadySubscription = this._globalController.on('toolVaultReady', async () => {
      console.warn('[DebriefOutlineProvider] Tool Vault server ready - refreshing outline');
      await this._update(); // Full refresh when server becomes ready
    });

    // Store disposables for cleanup
    this._subscriptions.push(fcSubscription, selectionSubscription, activeEditorSubscription, toolVaultReadySubscription);
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
   * Check if Tool Vault server is already ready when outline initializes
   * This handles the race condition where server starts before outline subscribes to events
   */
  private async _checkInitialToolVaultState(): Promise<void> {
    try {
      console.warn('[DebriefOutlineProvider] Checking initial Tool Vault server state');
      // Try to get tool index - if this succeeds, server is ready
      const toolIndex = await this._globalController.getToolIndex();
      if (toolIndex) {
        console.warn('[DebriefOutlineProvider] Tool Vault server already ready - refreshing outline');
        await this._update();
      }
    } catch (error) {
      console.warn('[DebriefOutlineProvider] Tool Vault server not ready yet:', error instanceof Error ? error.message : String(error));
      // Server not ready yet, will be notified via event when it becomes ready
    }
  }



  /**
   * Execute a tool command through the GlobalController with automatic parameter injection
   */
  private async _executeToolCommand(commandName: string, selectedFeatures: unknown[]): Promise<void> {
    try {
      // Get tool index to find the schema for this tool
      const toolIndex = await this._globalController.getToolIndex() as any;
      if (!toolIndex || !Array.isArray(toolIndex.tools)) {
        throw new Error('Tool index not available');
      }

      // Find the tool schema
      const toolSchema = toolIndex.tools.find((tool: any) => tool.name === commandName) as ToolSchema | undefined;
      if (!toolSchema) {
        throw new Error(`Tool schema not found for "${commandName}"`);
      }

      // Cast selected features to proper type
      const typedSelectedFeatures = selectedFeatures as DebriefFeature[];

      // Check if tool requires user input
      if (this._globalController.toolRequiresUserInput(toolSchema)) {
        const userParams = this._globalController.getUserInputParameters(toolSchema);

        // For now, use hardcoded values for commonly used parameters
        // TODO: In the future, this could show a dynamic UI form
        const userInputValues: Record<string, unknown> = {};

        for (const param of userParams) {
          if (param.parameterName === 'lat_interval') {
            userInputValues.lat_interval = 0.1;
          } else if (param.parameterName === 'lon_interval') {
            userInputValues.lon_interval = 0.1;
          } else if (param.parameterName === 'min_speed' && param.defaultValue !== undefined) {
            // Use default value if available
            userInputValues.min_speed = param.defaultValue;
          }
          // Add more parameter mappings as needed
        }

        // Execute with automatic parameter injection
        const result = await this._globalController.executeToolWithInjection(
          toolSchema,
          typedSelectedFeatures,
          userInputValues
        );

        if (!result.success) {
          this._handleToolExecutionError(commandName, result.error);
          return;
        }

        this._handleToolExecutionSuccess(commandName, result.result);
      } else {
        // Tool can be fully auto-injected
        const result = await this._globalController.executeToolWithInjection(
          toolSchema,
          typedSelectedFeatures
        );

        if (!result.success) {
          this._handleToolExecutionError(commandName, result.error);
          return;
        }

        this._handleToolExecutionSuccess(commandName, result.result);
      }

    } catch (error) {
      const errorMessage = `Failed to execute tool "${commandName}": ${error instanceof Error ? error.message : String(error)}`;
      console.error('[DebriefOutlineProvider] Tool execution error:', error);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * Handle tool execution errors with detailed messaging
   */
  private _handleToolExecutionError(commandName: string, error?: string): void {
    console.error('[DebriefOutlineProvider] Tool execution error:', {
      tool: commandName,
      error: error
    });

    const detailedMessage = `Tool "${commandName}" failed with error:\n\n${error || 'Unknown error'}`;
    vscode.window.showErrorMessage(detailedMessage, { modal: true });
  }

  /**
   * Handle successful tool execution with result options
   */
  private _handleToolExecutionSuccess(commandName: string, result: unknown): void {
    const successMessage = `Tool "${commandName}" executed successfully`;
    console.warn('[DebriefOutlineProvider] Tool execution success:', result);

    vscode.window.showInformationMessage(
      successMessage,
      'View Results',
      'Copy Results'
    ).then(selection => {
      if (selection === 'View Results') {
        this._showToolResults(commandName, result);
      } else if (selection === 'Copy Results') {
        this._copyToolResults(result);
      }
    });
  }

  /**
   * Show tool results in a new document window
   */
  private async _showToolResults(toolName: string, results: unknown): Promise<void> {
    try {
      // Format results as pretty JSON
      const formattedResults = JSON.stringify(results, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `tool-results-${toolName}-${timestamp}.json`;

      // Create new untitled document with results
      const document = await vscode.workspace.openTextDocument({
        content: formattedResults,
        language: 'json'
      });

      // Show the document
      await vscode.window.showTextDocument(document);

      vscode.window.showInformationMessage(
        `Tool results opened in new document. Save as "${fileName}" if needed.`
      );
    } catch (error) {
      console.error('[DebriefOutlineProvider] Error showing tool results:', error);
      vscode.window.showErrorMessage(`Failed to show tool results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Copy tool results to clipboard
   */
  private async _copyToolResults(results: unknown): Promise<void> {
    try {
      const formattedResults = JSON.stringify(results, null, 2);
      await vscode.env.clipboard.writeText(formattedResults);
      vscode.window.showInformationMessage('Tool results copied to clipboard');
    } catch (error) {
      console.error('[DebriefOutlineProvider] Error copying tool results:', error);
      vscode.window.showErrorMessage(`Failed to copy tool results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Dispose of the provider
   */
  public dispose(): void {
    this._cleanup();
  }
}
