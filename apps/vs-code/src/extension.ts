import * as vscode from 'vscode';
import { PlotJsonEditorProvider } from './plotJsonEditor';
import { CustomOutlineTreeProvider } from './customOutlineTreeProvider';
import { DebriefWebSocketServer } from './debriefWebSocketServer';
import { TimeControllerProvider } from './timeControllerProvider';
import { DebriefOutlineProvider } from './debriefOutlineProvider';
import { PropertiesViewProvider } from './propertiesViewProvider';
import { DebriefStateManager } from './debriefStateManager';

class HelloWorldProvider implements vscode.TreeDataProvider<string> {
    getTreeItem(element: string): vscode.TreeItem {
        return {
            label: element,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    getChildren(element?: string): Thenable<string[]> {
        if (!element) {
            return Promise.resolve(['Hello World from Debrief\'s Custom View!', 'Extension is working properly']);
        }
        return Promise.resolve([]);
    }
}

let webSocketServer: DebriefWebSocketServer | null = null;
let stateManager: DebriefStateManager | null = null;

// Store references to the Debrief activity panel providers
let timeControllerProvider: TimeControllerProvider | null = null;
let debriefOutlineProvider: DebriefOutlineProvider | null = null;
let propertiesViewProvider: PropertiesViewProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('Codespace Extension is now active!');
    
    vscode.window.showInformationMessage('Codespace Extension has been activated successfully!');

    // Start WebSocket server
    webSocketServer = new DebriefWebSocketServer();
    webSocketServer.start().catch(error => {
        console.error('Failed to start WebSocket server:', error);
        vscode.window.showErrorMessage('Failed to start Debrief WebSocket Bridge. Some features may not work.');
    });
    
    // Add cleanup to subscriptions
    context.subscriptions.push({
        dispose: () => {
            if (webSocketServer) {
                webSocketServer.stop().catch(error => {
                    console.error('Error stopping WebSocket server during cleanup:', error);
                });
            }
        }
    });

    const disposable = vscode.commands.registerCommand('vs-code.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Codespace Extension!');
    });

    const provider = new HelloWorldProvider();
    vscode.window.createTreeView('vs-code.helloView', { treeDataProvider: provider });

    // Create custom outline tree view
    const outlineTreeProvider = new CustomOutlineTreeProvider();
    
    // Register the custom plot JSON editor and wire up outline updates
    PlotJsonEditorProvider.setOutlineUpdateCallback((document) => {
        outlineTreeProvider.updateDocument(document);
    });
    context.subscriptions.push(PlotJsonEditorProvider.register(context));
    const outlineTreeView = vscode.window.createTreeView('customGeoJsonOutline', {
        treeDataProvider: outlineTreeProvider,
        showCollapseAll: false
    });
    context.subscriptions.push(outlineTreeView);

    // Update outline when active editor changes or document content changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.fileName.endsWith('.plot.json')) {
                outlineTreeProvider.updateDocument(editor.document);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.fileName.endsWith('.plot.json')) {
                outlineTreeProvider.updateDocument(event.document);
            }
        })
    );

    // Initialize with current active editor if it's a .plot.json file
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.fileName.endsWith('.plot.json')) {
        outlineTreeProvider.updateDocument(activeEditor.document);
    }

    // Register command to handle feature selection from custom outline
    const selectFeatureCommand = vscode.commands.registerCommand(
        'customOutline.selectFeature',
        (featureIndex: number) => {
            console.log('Feature selected from custom outline:', featureIndex);
            
            // Find the active custom editor webview and send highlight message
            vscode.window.tabGroups.all.forEach(tabGroup => {
                tabGroup.tabs.forEach(tab => {
                    if (tab.input instanceof vscode.TabInputCustom && 
                        tab.input.viewType === 'plotJsonEditor' && 
                        tab.isActive) {
                        // Send highlight message to the active webview
                        PlotJsonEditorProvider.sendMessageToActiveWebview({
                            type: 'highlightFeature',
                            featureIndex: featureIndex
                        });
                    }
                });
            });
        }
    );
    context.subscriptions.push(selectFeatureCommand);

    // Initialize Debrief State Manager
    stateManager = new DebriefStateManager();
    context.subscriptions.push(stateManager);

    // Register Debrief Activity Panel providers
    timeControllerProvider = new TimeControllerProvider(context.extensionUri);
    debriefOutlineProvider = new DebriefOutlineProvider();
    propertiesViewProvider = new PropertiesViewProvider(context.extensionUri);

    // Register the webview view providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TimeControllerProvider.viewType, timeControllerProvider)
    );
    
    context.subscriptions.push(
        vscode.window.createTreeView('debrief.outline', {
            treeDataProvider: debriefOutlineProvider,
            showCollapseAll: false
        })
    );
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PropertiesViewProvider.viewType, propertiesViewProvider)
    );

    // Connect state manager to the Debrief activity panels
    stateManager.subscribe((state) => {
        if (timeControllerProvider) {
            timeControllerProvider.updateState(state);
        }
        if (debriefOutlineProvider) {
            debriefOutlineProvider.updateState(state);
        }
        if (propertiesViewProvider && state.selection) {
            propertiesViewProvider.updateSelectedFeature(state.selection.feature);
        }
    });

    // Update state manager when document changes (connect existing outline logic)
    let lastDocument: vscode.TextDocument | undefined;
    stateManager.subscribe((_state) => {
        if (debriefOutlineProvider && stateManager) {
            const currentDoc = stateManager.getCurrentDocument();
            if (currentDoc && currentDoc !== lastDocument) {
                debriefOutlineProvider.updateDocument(currentDoc);
                lastDocument = currentDoc;
            }
        }
    });

    // Override the feature selection command to work with state manager
    const debriefSelectFeatureCommand = vscode.commands.registerCommand(
        'debrief.selectFeature',
        (featureIndex: number) => {
            console.log('Debrief feature selected:', featureIndex);
            if (stateManager) {
                stateManager.selectFeature(featureIndex);
            }
        }
    );
    context.subscriptions.push(debriefSelectFeatureCommand);

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Codespace Extension is now deactivated');
    
    // Stop WebSocket server
    if (webSocketServer) {
        webSocketServer.stop().catch(error => {
            console.error('Error stopping WebSocket server:', error);
        });
        webSocketServer = null;
    }

    // Cleanup state manager
    if (stateManager) {
        stateManager.dispose();
        stateManager = null;
    }

    // Clear provider references
    timeControllerProvider = null;
    debriefOutlineProvider = null;
    propertiesViewProvider = null;
}