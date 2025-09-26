import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ToolVaultConfig {
  serverPath: string | null;
  autoStart: boolean;
  port: number;
  host: string;
}

export class ToolVaultConfigService {
  private static instance: ToolVaultConfigService;

  private constructor() {}

  static getInstance(): ToolVaultConfigService {
    if (!ToolVaultConfigService.instance) {
      ToolVaultConfigService.instance = new ToolVaultConfigService();
    }
    return ToolVaultConfigService.instance;
  }

  /**
   * Load Tool Vault configuration with priority order:
   * 1. Environment Variable: DEBRIEF_TOOL_VAULT_PATH
   * 2. Workspace Settings: .vscode/settings.json in project root
   * 3. User Settings: Global VS Code settings
   * 4. Default Fallback: Relative path detection for development
   */
  getConfiguration(): ToolVaultConfig {
    const config = vscode.workspace.getConfiguration('debrief.toolVault');

    // Priority 1: Environment variable
    const envPath = process.env.DEBRIEF_TOOL_VAULT_PATH || null;

    // Priority 2 & 3: VS Code configuration (workspace takes precedence over user)
    const configServerPath = config.get<string>('serverPath') || null;
    const autoStart = config.get<boolean>('autoStart', true);
    const port = config.get<number>('port', 60124);
    const host = config.get<string>('host', '127.0.0.1');

    let serverPath: string | null = envPath || configServerPath;

    // Priority 4: Default fallback - look for relative paths in development
    if (!serverPath) {
      serverPath = this.detectDefaultServerPath();
    }

    const result: ToolVaultConfig = {
      serverPath,
      autoStart,
      port,
      host
    };

    // Validate the configuration
    this.validateConfiguration(result);

    return result;
  }

  /**
   * Detect default Tool Vault server path for development scenarios
   */
  private detectDefaultServerPath(): string | null {
    // Common development paths relative to VS Code extension
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Look for tool-vault-packager in monorepo structure
    const candidatePaths = [
      // In monorepo: libs/tool-vault-packager/dist/toolvault.pyz
      path.join(workspaceRoot, 'libs', 'tool-vault-packager', 'dist', 'toolvault.pyz'),
      // Alternative: tool-vault-packager/dist/toolvault.pyz
      path.join(workspaceRoot, 'tool-vault-packager', 'dist', 'toolvault.pyz'),
      // Direct in workspace: toolvault.pyz
      path.join(workspaceRoot, 'toolvault.pyz')
    ];

    for (const candidatePath of candidatePaths) {
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    return null;
  }

  /**
   * Validate the loaded configuration and throw descriptive errors
   */
  private validateConfiguration(config: ToolVaultConfig): void {
    if (!config.serverPath) {
      throw new Error(
        'Tool Vault server path not configured. Please set one of:\n' +
        '1. Environment variable: DEBRIEF_TOOL_VAULT_PATH\n' +
        '2. VS Code setting: debrief.toolVault.serverPath\n' +
        '3. Place toolvault.pyz in workspace root or libs/tool-vault-packager/dist/'
      );
    }

    if (!fs.existsSync(config.serverPath)) {
      throw new Error(`Tool Vault server file not found: ${config.serverPath}`);
    }

    if (!config.serverPath.endsWith('.pyz')) {
      throw new Error(`Tool Vault server path must be a .pyz file: ${config.serverPath}`);
    }

    if (config.port < 1024 || config.port > 65535) {
      throw new Error(`Invalid port number: ${config.port}. Must be between 1024 and 65535.`);
    }

    if (!config.host || config.host.trim() === '') {
      throw new Error('Host address cannot be empty');
    }
  }

  /**
   * Get a human-readable description of the current configuration source
   */
  getConfigurationSource(): string {
    const envPath = process.env.DEBRIEF_TOOL_VAULT_PATH;
    if (envPath) {
      return `Environment variable (DEBRIEF_TOOL_VAULT_PATH)`;
    }

    const config = vscode.workspace.getConfiguration('debrief.toolVault');
    const configServerPath = config.get<string>('serverPath');
    if (configServerPath) {
      const inspector = config.inspect('serverPath');
      if (inspector?.workspaceValue !== undefined) {
        return 'Workspace settings (.vscode/settings.json)';
      } else if (inspector?.globalValue !== undefined) {
        return 'User settings (global VS Code settings)';
      }
    }

    return 'Default fallback (auto-detected)';
  }
}