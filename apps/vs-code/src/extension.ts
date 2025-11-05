import * as vscode from 'vscode';

// Core architecture
import { GlobalController } from './core/globalController';
import { EditorIdManager } from './core/editorIdManager';
import { EditorActivationHandler } from './core/editorActivationHandler';
import { StatePersistence } from './core/statePersistence';
import { HistoryManager } from './core/historyManager';

// UI Providers
import { PlotJsonEditorProvider } from './providers/editors/plotJsonEditor';
import { DebriefActivityProvider } from './providers/panels/debriefActivityProvider';

// External services
import { DebriefMcpServer } from './services/debriefMcpServer';
import { PythonWheelInstaller } from './services/pythonWheelInstaller';
import { ToolVaultServerService } from './services/toolVaultServer';
import { ToolVaultConfigService } from './services/toolVaultConfig';

// Server status indicators
import { ServerStatusBarIndicator } from './components/ServerStatusBarIndicator';
import { createDebriefHttpConfig, createToolVaultConfig } from './config/serverIndicatorConfigs';

let mcpServer: DebriefMcpServer | null = null;
let globalController: GlobalController | null = null;
let activationHandler: EditorActivationHandler | null = null;
let statePersistence: StatePersistence | null = null;
let historyManager: HistoryManager | null = null;
let toolVaultServer: ToolVaultServerService | null = null;

// Store reference to the consolidated Debrief activity panel provider
let debriefActivityProvider: DebriefActivityProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.warn('Debrief Extension is now active!');

    // Initialize Python wheel installer for automatic debrief-types installation
    const pythonWheelInstaller = new PythonWheelInstaller(context);
    pythonWheelInstaller.checkAndInstallPackage().catch(error => {
        console.error('Python wheel installation failed:', error);
        // Non-blocking error - extension continues to work without Python integration
    });

    // Initialize Tool Vault server
    toolVaultServer = ToolVaultServerService.getInstance();

    // Create server status bar indicators
    console.warn('[Extension] Creating server status bar indicators...');
    try {
        const debriefHttpConfig = createDebriefHttpConfig(
            () => mcpServer,
            (server) => { mcpServer = server; }
        );
        console.warn('[Extension] Debrief HTTP config created');

        const toolVaultConfig = createToolVaultConfig();
        console.warn('[Extension] Tool Vault config created');

        const debriefIndicator = new ServerStatusBarIndicator(debriefHttpConfig, 100);
        console.warn('[Extension] Debrief HTTP indicator created');

        const toolVaultIndicator = new ServerStatusBarIndicator(toolVaultConfig, 99);
        console.warn('[Extension] Tool Vault indicator created');

        context.subscriptions.push(debriefIndicator, toolVaultIndicator);
        console.warn('[Extension] Status bar indicators registered successfully');

        // Auto-start Debrief HTTP Server (silently, no notification)
        // Status bar indicator will show the state
        console.warn('[Extension] Auto-starting Debrief HTTP Server...');
        debriefIndicator.start().catch((error: unknown) => {
            console.error('[Extension] Failed to auto-start Debrief HTTP Server:', error);
            // Error is already shown via status bar indicator error handling
        });

        // Auto-start Tool Vault Server if configured (silently, no notification)
        const configService = ToolVaultConfigService.getInstance();
        const tvConfig = configService.getConfiguration();
        if (tvConfig && tvConfig.autoStart && tvConfig.serverPath) {
            console.warn('[Extension] Auto-starting Tool Vault Server...');
            toolVaultIndicator.start().catch((error: unknown) => {
                console.error('[Extension] Failed to auto-start Tool Vault Server:', error);
                // Error is already shown via status bar indicator error handling
            });
        }
    } catch (error) {
        console.error('[Extension] Failed to create status bar indicators:', error);
    }

    // Add cleanup to subscriptions
    context.subscriptions.push({
        dispose: () => {
            if (mcpServer) {
                mcpServer.stop().catch((error: unknown) => {
                    console.error('Error stopping MCP server during cleanup:', error);
                });
            }
            if (toolVaultServer) {
                toolVaultServer.stopServer().catch((error: unknown) => {
                    console.error('Error stopping Tool Vault server during cleanup:', error);
                });
            }
        }
    });

    // Register the custom plot JSON editor
    context.subscriptions.push(PlotJsonEditorProvider.register(context));

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


    // Register consolidated Debrief Activity Panel provider
    // This replaces the previous 4 separate providers (TimeController, OutlineView, PropertiesView, CurrentState)
    // Performance improvement: Single webview load instead of 4 separate webview loads
    debriefActivityProvider = new DebriefActivityProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DebriefActivityProvider.viewType, debriefActivityProvider)
    );

    // Register commands for accessing last tool result
    const viewLastToolResultCommand = vscode.commands.registerCommand(
        'debrief.viewLastToolResult',
        () => {
            if (debriefActivityProvider) {
                debriefActivityProvider.showLastToolResult();
            }
        }
    );
    context.subscriptions.push(viewLastToolResultCommand);

    const copyLastToolResultCommand = vscode.commands.registerCommand(
        'debrief.copyLastToolResult',
        () => {
            if (debriefActivityProvider) {
                debriefActivityProvider.copyLastToolResult();
            }
        }
    );
    context.subscriptions.push(copyLastToolResultCommand);

    // Panel connections are handled automatically through GlobalController subscriptions
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

    // Stop MCP server and wait for it to fully shut down
    if (mcpServer) {
        try {
            await mcpServer.stop();
            console.log('✅ MCP server stopped');
        } catch (error) {
            console.error('Error stopping MCP server:', error);
        }
        mcpServer = null;
    }

    // Cleanup consolidated activity panel provider
    if (debriefActivityProvider) {
        debriefActivityProvider.dispose();
        debriefActivityProvider = null;
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

    // Clear tool vault server reference
    toolVaultServer = null;

    console.warn('Debrief Extension deactivation complete');
}