import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { ToolVaultConfig, ToolVaultConfigService } from './toolVaultConfig';

export interface ToolInfo {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
}

export interface ToolVaultCommand {
  command: string;
  parameters?: Record<string, unknown>;
}

export interface ToolVaultResponse {
  result?: unknown;
  error?: {
    message: string;
    code: number | string;
  };
}

export class ToolVaultServerService {
  private static instance: ToolVaultServerService;
  private process: ChildProcess | null = null;
  private config: ToolVaultConfig | null = null;
  private outputChannel: vscode.OutputChannel;
  private configService: ToolVaultConfigService;
  private isStarting = false;
  private startPromise: Promise<void> | null = null;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Debrief Tools');
    this.configService = ToolVaultConfigService.getInstance();
  }

  static getInstance(): ToolVaultServerService {
    if (!ToolVaultServerService.instance) {
      ToolVaultServerService.instance = new ToolVaultServerService();
    }
    return ToolVaultServerService.instance;
  }

  /**
   * Start the Tool Vault server if not already running
   */
  async startServer(): Promise<void> {
    if (this.isStarting && this.startPromise) {
      return this.startPromise;
    }

    if (this.isRunning()) {
      this.log('Tool Vault server is already running');
      return;
    }

    this.isStarting = true;
    this.startPromise = this._startServer();

    try {
      await this.startPromise;
    } finally {
      this.isStarting = false;
      this.startPromise = null;
    }
  }

  private async _startServer(): Promise<void> {
    let pythonInterpreter = 'python'; // Default fallback

    try {
      this.config = this.configService.getConfiguration();
      this.log(`Loading configuration from: ${this.configService.getConfigurationSource()}`);
      this.log(`Server path: ${this.config.serverPath}`);
      this.log(`Host: ${this.config.host}:${this.config.port}`);

      pythonInterpreter = await this.detectPythonInterpreter();
      this.log(`Using Python interpreter: ${pythonInterpreter}`);

      // Check if port is available
      const isPortAvailable = await this.checkPortAvailable(this.config.port);
      if (!isPortAvailable) {
        throw new Error(
          `Port ${this.config.port} is already in use. Please configure a different port ` +
          `in VS Code settings (debrief.toolVault.port) or stop the process using this port.`
        );
      }

      // Start the server process
      const args = [
        this.config.serverPath!,
        'serve',
        '--host', this.config.host,
        '--port', this.config.port.toString()
      ];

      this.log(`Starting Tool Vault server: ${pythonInterpreter} ${args.join(' ')}`);

      this.process = spawn(pythonInterpreter, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Handle process output
      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          this.log(`[stdout] ${data.toString().trim()}`);
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const stderr = data.toString().trim();
          this.log(`[stderr] ${stderr}`);
          // Show critical startup errors immediately
          if (stderr.includes('Error') || stderr.includes('Exception') || stderr.includes('Failed')) {
            console.error(`[ToolVault Critical] ${stderr}`);
          }
        });
      }

      // Handle process events
      this.process.on('error', (error) => {
        this.log(`Process error: ${error.message}`);
        this.process = null;
      });

      this.process.on('exit', (code, signal) => {
        this.log(`Process exited with code ${code}, signal ${signal}`);
        this.process = null;
      });

      // Wait for server to be ready
      await this.waitForServerReady();
      this.log('Tool Vault server started successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Failed to start Tool Vault server: ${errorMessage}`);

      // Provide enhanced diagnostics
      const diagnostics = [
        `Error: ${errorMessage}`,
        `Server Path: ${this.config?.serverPath}`,
        `Python Interpreter: ${pythonInterpreter}`,
        `Host: ${this.config?.host}:${this.config?.port}`,
        `Process Status: ${this.process ? 'Created' : 'Not Created'}`,
        `Port Available: ${await this.checkPortAvailable(this.config?.port || 60124) ? 'Yes' : 'No'}`
      ];

      console.error(`[ToolVault Diagnostics]\n${diagnostics.join('\n')}`);
      this.log(`Diagnostics:\n${diagnostics.join('\n')}`);

      await this.stopServer();
      throw new Error(`Tool Vault server startup failed.\n${diagnostics.join('\n')}`);
    }
  }

  /**
   * Stop the Tool Vault server gracefully
   */
  async stopServer(): Promise<void> {
    if (!this.process) {
      this.log('Tool Vault server is not running');
      return;
    }

    this.log('Stopping Tool Vault server...');

    return new Promise<void>((resolve) => {
      const process = this.process!;
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          this.process = null;
          this.log('Tool Vault server stopped');
          resolve();
        }
      };

      // Set up timeout for forceful kill
      const killTimeout = setTimeout(() => {
        if (process && !process.killed) {
          this.log('Force killing Tool Vault server (SIGKILL)');
          process.kill('SIGKILL');
        }
        cleanup();
      }, 5000);

      // Handle process exit
      process.on('exit', () => {
        clearTimeout(killTimeout);
        cleanup();
      });

      // Try graceful shutdown first
      if (!process.killed) {
        this.log('Sending SIGTERM to Tool Vault server');
        process.kill('SIGTERM');
      } else {
        cleanup();
      }
    });
  }

  /**
   * Check if the server is currently running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Perform health check on the running server
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isRunning() || !this.config) {
      return false;
    }

    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/health`);
      return response.ok;
    } catch (error) {
      this.log(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get the list of available tools from the server
   */
  async getToolIndex(): Promise<unknown> {
    if (!this.isRunning() || !this.config) {
      throw new Error('Tool Vault server is not running');
    }

    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/tools/list`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = `Failed to get tool index: ${error instanceof Error ? error.message : String(error)}`;
      this.log(message);
      throw new Error(message);
    }
  }

  /**
   * Execute a command on the Tool Vault server
   */
  async executeCommand(command: ToolVaultCommand): Promise<ToolVaultResponse> {
    if (!this.isRunning() || !this.config) {
      throw new Error('Tool Vault server is not running');
    }

    try {
      // Transform to the format expected by tool-vault server
      // Convert object parameters to array of {name, value} objects
      const argumentsArray = Object.entries(command.parameters || {}).map(([name, value]) => ({
        name,
        value
      }));

      const payload = {
        name: command.command,
        arguments: argumentsArray
      };

      this.log(`Sending payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await fetch(`http://${this.config.host}:${this.config.port}/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: {
            message: data.message || `HTTP ${response.status}: ${response.statusText}`,
            code: response.status
          }
        };
      }

      return { result: data };
    } catch (error) {
      const message = `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
      this.log(message);
      return {
        error: {
          message,
          code: 500
        }
      };
    }
  }

  /**
   * Detect available Python interpreter
   */
  private async detectPythonInterpreter(): Promise<string> {
    // Priority 1: VS Code Python extension interpreter
    try {
      const pythonExtension = vscode.extensions.getExtension('ms-python.python');
      if (pythonExtension && pythonExtension.isActive) {
        const pythonPath = pythonExtension.exports?.settings?.getExecutionDetails?.()?.execCommand?.[0];
        if (pythonPath && await this.checkPythonExecutable(pythonPath)) {
          return pythonPath;
        }
      }
    } catch (error) {
      this.log(`Could not get Python path from extension: ${error}`);
    }

    // Priority 2: System Python
    const systemPythons = ['python3', 'python'];
    for (const pythonCmd of systemPythons) {
      if (await this.checkPythonExecutable(pythonCmd)) {
        return pythonCmd;
      }
    }

    throw new Error(
      'No suitable Python interpreter found. Please install Python or configure the VS Code Python extension.'
    );
  }

  /**
   * Check if a Python executable is available and suitable
   */
  private async checkPythonExecutable(pythonPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(pythonPath, ['--version'], { stdio: 'pipe' });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Check if a port is available
   */
  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const net = require('net');
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });

      server.on('error', () => resolve(false));
    });
  }

  /**
   * Wait for the server to be ready by polling the health endpoint
   */
  private async waitForServerReady(): Promise<void> {
    const maxAttempts = 10;
    const delays = [500, 500, 500, 500, 1000, 1000, 1000, 1000, 2000, 2000]; // More generous timing
    const totalTime = delays.reduce((a, b) => a + b, 0);

    this.log(`Waiting for server to be ready (max ${totalTime/1000}s)...`);

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, delays[i]));

      this.log(`Health check attempt ${i + 1}/${maxAttempts}...`);
      if (await this.healthCheck()) {
        this.log('Server health check passed!');
        return;
      }
    }

    // Provide additional diagnostics for timeout
    const processStatus = this.process ? (this.process.killed ? 'Killed' : 'Running') : 'Not Created';
    const diagnostics = [
      `Timeout: Server failed to start within ${totalTime/1000} seconds`,
      `Process Status: ${processStatus}`,
      `Process PID: ${this.process?.pid || 'N/A'}`,
      `Health Endpoint: http://${this.config?.host}:${this.config?.port}/health`,
      'Check the "Debrief Tools" output channel for server logs'
    ];

    throw new Error(`Tool Vault server startup timeout.\n${diagnostics.join('\n')}`);
  }

  /**
   * Log message to the output channel
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Get the output channel for debugging
   */
  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolVaultConfig | null {
    return this.config;
  }

  /**
   * Restart the server (stop and start)
   */
  async restartServer(): Promise<void> {
    this.log('Restarting Tool Vault server...');
    await this.stopServer();
    await this.startServer();
  }


  /**
   * Execute a tool command with proper error handling and logging
   */
  async executeToolCommand(toolName: string, parameters: Record<string, unknown>): Promise<{ success: boolean; result?: unknown; error?: string }> {
    try {
      if (!this.isRunning()) {
        return {
          success: false,
          error: 'Tool Vault server is not running'
        };
      }

      // Log command execution attempt
      this.log(`Executing tool: ${toolName}`);
      this.log(`Parameters: ${JSON.stringify(parameters, null, 2)}`);

      // Execute command on server
      const response = await this.executeCommand({
        command: toolName,
        parameters
      });

      if (response.error) {
        const errorMessage = `Tool execution failed: ${response.error.message}`;
        this.log(`Error: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Log success
      const successMessage = `Tool "${toolName}" executed successfully`;
      this.log(`Success: ${successMessage}`);
      this.log(`Result: ${JSON.stringify(response.result, null, 2)}`);

      return {
        success: true,
        result: response.result
      };

    } catch (error) {
      const errorMessage = `Failed to execute tool "${toolName}": ${error instanceof Error ? error.message : String(error)}`;
      this.log(`Error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

}