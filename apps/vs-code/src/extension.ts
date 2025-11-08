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
import { ToolsMcpClient } from './services/toolsMcpClient';

// Server status indicators
import { ServerStatusBarIndicator } from './components/ServerStatusBarIndicator';
import { createDebriefHttpConfig } from './config/serverIndicatorConfigs';

let mcpServer: DebriefMcpServer | null = null;
let globalController: GlobalController | null = null;
let activationHandler: EditorActivationHandler | null = null;
let statePersistence: StatePersistence | null = null;
let historyManager: HistoryManager | null = null;
let toolsMcpClient: ToolsMcpClient | null = null;

// Store reference to the consolidated Debrief activity panel provider
let debriefActivityProvider: DebriefActivityProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    try {
        console.warn('Debrief Extension is now active!');

    // Initialize Python wheel installer for automatic debrief-types installation
    const pythonWheelInstaller = new PythonWheelInstaller(context);
    pythonWheelInstaller.checkAndInstallPackage().catch(error => {
        console.error('[Python Wheel Installer] Installation failed:', error);
        console.error('[Python Wheel Installer] Error details:', error instanceof Error ? error.message : String(error));
        console.error('[Python Wheel Installer] Stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Non-blocking error - extension continues to work without Python integration
        // This is expected if Python environment is not yet set up
    });

    // Create server status bar indicator for Debrief HTTP server
    console.warn('[Extension] Creating server status bar indicator...');
    try {
        const debriefHttpConfig = createDebriefHttpConfig(
            () => mcpServer,
            (server) => { mcpServer = server; }
        );
        console.warn('[Extension] Debrief HTTP config created');

        const debriefIndicator = new ServerStatusBarIndicator(debriefHttpConfig, 100);
        console.warn('[Extension] Debrief HTTP indicator created');

        context.subscriptions.push(debriefIndicator);
        console.warn('[Extension] Status bar indicator registered successfully');

        // Auto-start Debrief HTTP Server (silently, no notification)
        // Status bar indicator will show the state
        console.warn('[Extension] Auto-starting Debrief HTTP Server...');
        debriefIndicator.start().catch((error: unknown) => {
            console.error('[Extension] Failed to auto-start Debrief HTTP Server:', error);
            // Error is already shown via status bar indicator error handling
        });
    } catch (error) {
        console.error('[Extension] Failed to create status bar indicator:', error);
    }

    // Add cleanup to subscriptions
    context.subscriptions.push({
        dispose: () => {
            if (mcpServer) {
                mcpServer.stop().catch((error: unknown) => {
                    console.error('Error stopping MCP server during cleanup:', error);
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

    // Multi-select is now handled internally by the OutlineView webview component

    // Initialize Global Controller (new centralized state management)
    globalController = GlobalController.getInstance();
    context.subscriptions.push(globalController);

    // Initialize Tools MCP Client integration
    // Check if MCP server URL is configured
    const mcpServerUrl = vscode.workspace.getConfiguration('debrief').get<string>('toolsMcp.serverUrl');
    if (mcpServerUrl) {
        console.warn('[Extension] Initializing Tools MCP client with URL:', mcpServerUrl);
        toolsMcpClient = ToolsMcpClient.getInstance();

        // Connect to MCP server asynchronously
        toolsMcpClient.connect(mcpServerUrl).then(() => {
            console.warn('[Extension] Tools MCP client connected successfully');
            if (globalController && toolsMcpClient) {
                globalController.initializeToolsMcpClient(toolsMcpClient);
                // Notify that tools are ready
                globalController.notifyToolsReady();
            }
        }).catch((error: unknown) => {
            console.error('[Extension] Failed to connect Tools MCP client:', error);
            vscode.window.showErrorMessage(`Failed to connect to Tools MCP server: ${error instanceof Error ? error.message : String(error)}`);
        });
    } else {
        console.warn('[Extension] No Tools MCP server URL configured');
        vscode.window.showWarningMessage('Tools MCP server URL is not configured. Tools will not be available. Configure debrief.toolsMcp.serverUrl in settings.');
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
    } catch (error) {
        console.error('[Extension Activation Error] Full stack trace:', error);
        if (error instanceof Error) {
            console.error('[Extension Activation Error] Message:', error.message);
            console.error('[Extension Activation Error] Stack:', error.stack);
        }
        // Re-throw to let VS Code show the error
        throw error;
    }
}

export async function deactivate() {
    console.warn('Debrief Extension is now deactivating...');

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

    console.warn('Debrief Extension deactivation complete');
}