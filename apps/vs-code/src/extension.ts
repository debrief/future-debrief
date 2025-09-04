import * as vscode from 'vscode';

// Core architecture
import { GlobalController } from './core/globalController';
import { EditorIdManager } from './core/editorIdManager';
import { EditorActivationHandler } from './core/editorActivationHandler';
import { StatePersistence } from './core/statePersistence';
import { HistoryManager } from './core/historyManager';

// UI Providers
import { PlotJsonEditorProvider } from './providers/editors/plotJsonEditor';
import { TimeControllerProvider } from './providers/panels/timeControllerProvider';
import { DebriefOutlineProvider } from './providers/panels/debriefOutlineProvider';
import { PropertiesViewProvider } from './providers/panels/propertiesViewProvider';
import { CurrentStateProvider } from './providers/panels/currentStateProvider';
import { CustomOutlineTreeProvider } from './providers/outlines/customOutlineTreeProvider';

// External services
import { DebriefWebSocketServer } from './services/debriefWebSocketServer';


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
let globalController: GlobalController | null = null;
let activationHandler: EditorActivationHandler | null = null;
let statePersistence: StatePersistence | null = null;
let historyManager: HistoryManager | null = null;

// Store references to the Debrief activity panel providers
let timeControllerProvider: TimeControllerProvider | null = null;
let debriefOutlineProvider: DebriefOutlineProvider | null = null;
let propertiesViewProvider: PropertiesViewProvider | null = null;
let currentStateProvider: CurrentStateProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.warn('Codespace Extension is now active!');
    
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
    // Note: Active editor handling is now managed by EditorActivationHandler
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
    
    // Handle document close events for GlobalController cleanup
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((document) => {
            if (EditorIdManager.isDebriefPlotFile(document)) {
                const editorId = EditorIdManager.removeDocument(document);
                if (editorId && globalController) {
                    globalController.removeEditor(editorId);
                }
            }
        })
    );

    // Initialize with current active editor if it's a .plot.json file
    // Note: Active editor initialization is now handled by EditorActivationHandler
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.fileName.endsWith('.plot.json')) {
        outlineTreeProvider.updateDocument(activeEditor.document);
    }

    // Register command to handle feature selection from custom outline
    const selectFeatureCommand = vscode.commands.registerCommand(
        'customOutline.selectFeature',
        (featureIndex: number) => {
            console.warn('Feature selected from custom outline:', featureIndex);
            
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

    // Register command to handle multi-select feature toggling from outline
    const toggleFeatureSelectionCommand = vscode.commands.registerCommand(
        'debrief.toggleFeatureSelection',
        (featureIndex: number, featureId?: string) => {
            if (debriefOutlineProvider) {
                debriefOutlineProvider.toggleFeatureSelection(featureIndex, featureId);
            }
        }
    );
    context.subscriptions.push(toggleFeatureSelectionCommand);

    // Initialize Global Controller (new centralized state management)
    globalController = GlobalController.getInstance();
    context.subscriptions.push(globalController);
    
    // Initialize Editor Activation Handler
    activationHandler = new EditorActivationHandler(globalController);
    activationHandler.initialize(context);
    activationHandler.registerCommands(context);
    context.subscriptions.push(activationHandler);
    
    // Initialize State Persistence
    statePersistence = new StatePersistence(globalController);
    statePersistence.initialize(context);

    // Initialize History Manager
    historyManager = new HistoryManager(globalController);
    historyManager.initialize(context);
    context.subscriptions.push(historyManager);


    // Register Debrief Activity Panel providers
    timeControllerProvider = new TimeControllerProvider(context.extensionUri);
    debriefOutlineProvider = new DebriefOutlineProvider();
    propertiesViewProvider = new PropertiesViewProvider(context.extensionUri);

    // Register feature visibility toggle command for Outline panel toolbar
    const toggleFeatureVisibilityCommand = vscode.commands.registerCommand(
        'debrief.toggleFeatureVisibility',
        () => {
            if (debriefOutlineProvider) {
                debriefOutlineProvider.toggleFeatureVisibility();
            }
        }
    );
    context.subscriptions.push(toggleFeatureVisibilityCommand);

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

    // Register the Current State panel
    currentStateProvider = new CurrentStateProvider();
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(CurrentStateProvider.viewType, currentStateProvider)
    );

    // Panel connections are handled automatically through GlobalController subscriptions

    // Register feature selection command to work with GlobalController
    const debriefSelectFeatureCommand = vscode.commands.registerCommand(
        'debrief.selectFeature',
        (featureIndex: number) => {
            console.warn('Debrief feature selected:', featureIndex);
            if (debriefOutlineProvider) {
                debriefOutlineProvider.selectFeature(featureIndex);
            }
        }
    );
    context.subscriptions.push(debriefSelectFeatureCommand);

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.warn('Codespace Extension is now deactivated');
    
    // Stop WebSocket server
    if (webSocketServer) {
        webSocketServer.stop().catch(error => {
            console.error('Error stopping WebSocket server:', error);
        });
        webSocketServer = null;
    }


    // Cleanup panel providers
    if (timeControllerProvider) {
        timeControllerProvider.dispose();
        timeControllerProvider = null;
    }
    
    if (debriefOutlineProvider) {
        debriefOutlineProvider.dispose();
        debriefOutlineProvider = null;
    }
    
    if (propertiesViewProvider) {
        propertiesViewProvider.dispose();
        propertiesViewProvider = null;
    }

    // Cleanup state persistence
    statePersistence = null;
    
    // Cleanup history manager
    if (historyManager) {
        historyManager.dispose();
        historyManager = null;
    }
    
    // Cleanup activation handler
    if (activationHandler) {
        activationHandler.dispose();
        activationHandler = null;
    }
    
    // Cleanup GlobalController
    if (globalController) {
        globalController.dispose();
        globalController = null;
    }
    
    // Clear editor ID manager
    EditorIdManager.clear();

    // Clear provider references
    timeControllerProvider = null;
    debriefOutlineProvider = null;
    propertiesViewProvider = null;
}