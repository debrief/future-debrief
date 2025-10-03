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
import { PythonWheelInstaller } from './services/pythonWheelInstaller';
import { ToolVaultServerService } from './services/toolVaultServer';
import { ToolVaultConfigService } from './services/toolVaultConfig';


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
let toolVaultServer: ToolVaultServerService | null = null;

// Store references to the Debrief activity panel providers
let timeControllerProvider: TimeControllerProvider | null = null;
let debriefOutlineProvider: DebriefOutlineProvider | null = null;
let propertiesViewProvider: PropertiesViewProvider | null = null;
let currentStateProvider: CurrentStateProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.warn('Debrief Extension is now active!');

    vscode.window.showInformationMessage('Debrief Extension has been activated successfully!');

    // Start WebSocket server
    webSocketServer = new DebriefWebSocketServer();
    webSocketServer.start().catch(error => {
        console.error('Failed to start WebSocket server:', error);
        vscode.window.showErrorMessage('Failed to start Debrief WebSocket Bridge. Some features may not work.');
    });

    // Initialize Python wheel installer for automatic debrief-types installation
    const pythonWheelInstaller = new PythonWheelInstaller(context);
    pythonWheelInstaller.checkAndInstallPackage().catch(error => {
        console.error('Python wheel installation failed:', error);
        // Non-blocking error - extension continues to work without Python integration
    });

    // Initialize Tool Vault server
    toolVaultServer = ToolVaultServerService.getInstance();

    // Try to start Tool Vault server if auto-start is enabled
    const startToolVaultServer = async () => {
        try {
            // Get configuration from ToolVaultConfigService (handles auto-detection)
            const configService = ToolVaultConfigService.getInstance();
            const config = configService.getConfiguration();

            if (config && config.autoStart && config.serverPath) {
                await toolVaultServer!.startServer();

                // Load tool index and show success notification
                const toolIndex = await toolVaultServer!.getToolIndex();

                // Helper to count tools from tree structure
                function countTools(nodes: unknown[]): number {
                    let count = 0;
                    for (const node of nodes) {
                        const nodeObj = node as Record<string, unknown>;
                        if (nodeObj.type === 'tool') {
                            count++;
                        } else if (nodeObj.type === 'category' && Array.isArray(nodeObj.children)) {
                            count += countTools(nodeObj.children);
                        }
                    }
                    return count;
                }

                const toolCount = (toolIndex && typeof toolIndex === 'object' && 'root' in toolIndex && Array.isArray((toolIndex as Record<string, unknown>).root))
                    ? countTools((toolIndex as Record<string, unknown>).root as unknown[])
                    : 'unknown number of';

                vscode.window.showInformationMessage(
                    `Tool Vault server started successfully with ${toolCount} tools available.`
                );
            } else if (config && config.autoStart && !config.serverPath) {
                vscode.window.showInformationMessage(
                    'Tool Vault server auto-start is enabled but no server path is configured. Configure debrief.toolVault.serverPath in VS Code settings.'
                );
            }
        } catch (error) {
            const errorMessage = `Failed to start Tool Vault server: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMessage);

            // Show enhanced error message with action buttons
            vscode.window.showWarningMessage(
                errorMessage + ' Tools will not be available until server is manually started.',
                'Show Logs',
                'Manual Setup Guide'
            ).then(selection => {
                if (selection === 'Show Logs') {
                    toolVaultServer?.getOutputChannel().show();
                } else if (selection === 'Manual Setup Guide') {
                    vscode.window.showInformationMessage(
                        'Tool Vault Server Setup:\n\n' +
                        '1. Check the "Debrief Tools" output channel for detailed logs\n' +
                        '2. Ensure Python is installed and accessible\n' +
                        '3. Verify the .pyz file exists and is executable\n' +
                        '4. Try restarting with: "Debrief: Restart Tool Vault Server" command'
                    );
                }
            });
        }
    };

    // Start Tool Vault server asynchronously (non-blocking)
    startToolVaultServer();

    // Add cleanup to subscriptions
    context.subscriptions.push({
        dispose: () => {
            if (webSocketServer) {
                webSocketServer.stop().catch(error => {
                    console.error('Error stopping WebSocket server during cleanup:', error);
                });
            }
            if (toolVaultServer) {
                toolVaultServer.stopServer().catch(error => {
                    console.error('Error stopping Tool Vault server during cleanup:', error);
                });
            }
        }
    });

    const disposable = vscode.commands.registerCommand('vs-code.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Debrief Extension!');
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

    // Register Tool Vault server restart command
    const restartToolVaultCommand = vscode.commands.registerCommand(
        'debrief.restartToolVault',
        async () => {
            try {
                if (toolVaultServer) {
                    await toolVaultServer.restartServer();
                    const toolIndex = await toolVaultServer.getToolIndex();
                    const toolCount = (toolIndex as {tools?: unknown[]})?.tools?.length ?? 'unknown number of';
                    vscode.window.showInformationMessage(
                        `Tool Vault server restarted successfully with ${toolCount} tools available.`
                    );
                } else {
                    vscode.window.showErrorMessage('Tool Vault server service is not initialized.');
                }
            } catch (error) {
                const errorMessage = `Failed to restart Tool Vault server: ${error instanceof Error ? error.message : String(error)}`;
                console.error(errorMessage);
                vscode.window.showErrorMessage(errorMessage);
            }
        }
    );
    context.subscriptions.push(restartToolVaultCommand);

    // Register development mode toggle command
    const toggleDevelopmentModeCommand = vscode.commands.registerCommand(
        'debrief.toggleDevelopmentMode',
        async () => {
            const config = vscode.workspace.getConfiguration('debrief.development');
            const currentMode = config.get<boolean>('mode', false);
            await config.update('mode', !currentMode, vscode.ConfigurationTarget.Workspace);

            const newMode = !currentMode ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(
                `Development mode ${newMode}. ${!currentMode ? 'Non-essential views are now hidden.' : 'All views are now visible.'} ` +
                'Reload the window to apply changes.',
                'Reload Window'
            ).then(selection => {
                if (selection === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    );
    context.subscriptions.push(toggleDevelopmentModeCommand);

    // Register Tool Vault status command
    const toolVaultStatusCommand = vscode.commands.registerCommand(
        'debrief.toolVaultStatus',
        async () => {
            try {
                if (!toolVaultServer) {
                    vscode.window.showWarningMessage('Tool Vault server service is not initialized.');
                    return;
                }

                const isRunning = toolVaultServer.isRunning();
                const config = ToolVaultConfigService.getInstance().getConfiguration();

                let statusMessage = `**Tool Vault Server Status**\n\n`;
                statusMessage += `• **Running**: ${isRunning ? '✅ Yes' : '❌ No'}\n`;
                statusMessage += `• **Auto-start**: ${config.autoStart ? '✅ Enabled' : '❌ Disabled'}\n`;
                statusMessage += `• **Server Path**: ${config.serverPath || '❌ Not configured'}\n`;
                statusMessage += `• **Host**: ${config.host}\n`;
                statusMessage += `• **Port**: ${config.port}\n`;

                if (isRunning) {
                    try {
                        const healthCheck = await toolVaultServer.healthCheck();
                        statusMessage += `• **Health Check**: ${healthCheck ? '✅ Healthy' : '❌ Unhealthy'}\n`;

                        if (healthCheck) {
                            const toolIndex = await toolVaultServer.getToolIndex();
                            const toolCount = (toolIndex as {tools?: unknown[]})?.tools?.length ?? 0;
                            statusMessage += `• **Tools Available**: ${toolCount}\n`;
                        }
                    } catch (error) {
                        statusMessage += `• **Health Check**: ❌ Failed (${error instanceof Error ? error.message : String(error)})\n`;
                    }
                }

                // Show detailed status in a modal
                vscode.window.showInformationMessage(statusMessage, { modal: true }, 'Restart Server', 'Configure Settings').then(selection => {
                    if (selection === 'Restart Server') {
                        vscode.commands.executeCommand('debrief.restartToolVault');
                    } else if (selection === 'Configure Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'debrief.toolVault');
                    }
                });
            } catch (error) {
                const errorMessage = `Failed to get Tool Vault server status: ${error instanceof Error ? error.message : String(error)}`;
                console.error(errorMessage);
                vscode.window.showErrorMessage(errorMessage);
            }
        }
    );
    context.subscriptions.push(toolVaultStatusCommand);

    // Multi-select is now handled internally by the OutlineView webview component

    // Initialize Global Controller (new centralized state management)
    globalController = GlobalController.getInstance();
    context.subscriptions.push(globalController);

    // Initialize Tool Vault Server integration in GlobalController
    if (toolVaultServer) {
        globalController.initializeToolVaultServer(toolVaultServer);

        // Set up callback to notify GlobalController when server is ready
        toolVaultServer.setOnServerReadyCallback(() => {
            console.warn('[Extension] Tool Vault server ready callback triggered');
            if (globalController) {
                console.warn('[Extension] Calling globalController.notifyToolVaultReady()');
                globalController.notifyToolVaultReady();
            } else {
                console.error('[Extension] GlobalController is null when server ready callback triggered');
            }
        });
    }
    
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

    // Feature visibility is now handled internally by the OutlineView webview component

    // Register the webview view providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TimeControllerProvider.viewType, timeControllerProvider)
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DebriefOutlineProvider.viewType, debriefOutlineProvider)
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

    // Feature selection is now handled internally by the OutlineView webview component

    context.subscriptions.push(disposable);
}

export async function deactivate() {
    console.warn('Debrief Extension is now deactivating...');

    // Stop Tool Vault server first (more critical to clean up)
    if (toolVaultServer) {
        try {
            await toolVaultServer.stopServer();
            console.log('✅ Tool Vault server stopped');
        } catch (error) {
            console.error('Error stopping Tool Vault server:', error);
        }
        toolVaultServer = null;
    }

    // Stop WebSocket server and wait for it to fully shut down
    if (webSocketServer) {
        try {
            await webSocketServer.stop();
            console.log('✅ WebSocket server stopped');
        } catch (error) {
            console.error('Error stopping WebSocket server:', error);
        }
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
    toolVaultServer = null;

    console.warn('Debrief Extension deactivation complete');
}