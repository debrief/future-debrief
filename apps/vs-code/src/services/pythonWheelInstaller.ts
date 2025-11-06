import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Service to automatically install debrief-types Python package in VS Code environment.
 * 
 * This service:
 * 1. Detects available Python environments via VS Code Python extension API
 * 2. Checks if debrief-types package is already installed and what version
 * 3. Installs/upgrades the bundled wheel if needed
 * 4. Handles multiple Python environments (venv, conda, system Python, Poetry)
 * 5. Provides user notifications and error handling
 */
export class PythonWheelInstaller {
    private readonly bundledWheelPath: string | null;
    private readonly packageName = 'debrief-types';
    private readonly packageVersion: string;

    constructor(context: vscode.ExtensionContext) {
        this.bundledWheelPath = this.findBundledWheelFile(context.extensionPath);
        this.packageVersion = this.bundledWheelPath ? this.extractVersionFromWheelName() : '1.0.0';
    }

    /**
     * Main entry point - checks and installs the Python package if needed.
     */
    async checkAndInstallPackage(): Promise<void> {
        try {
            console.log('[Python Wheel Installer] Starting installation check...');

            // Check if bundled wheel exists
            if (!this.bundledWheelPath) {
                console.warn('[Python Wheel Installer] Bundled wheel path is null');
                vscode.window.showWarningMessage(
                    'Debrief Python types wheel not found. Python integration features will not be available.',
                    'Show Build Instructions'
                ).then(selection => {
                    if (selection === 'Show Build Instructions') {
                        this.showWheelBuildInstructions();
                    }
                });
                return;
            }

            console.log(`[Python Wheel Installer] Checking for wheel at: ${this.bundledWheelPath}`);
            if (!fs.existsSync(this.bundledWheelPath)) {
                console.warn(`[Python Wheel Installer] Wheel file does not exist at: ${this.bundledWheelPath}`);
                vscode.window.showWarningMessage(
                    'Debrief Python types wheel not found. Python integration features will not be available.',
                    'Show Build Instructions'
                ).then(selection => {
                    if (selection === 'Show Build Instructions') {
                        this.showWheelBuildInstructions();
                    }
                });
                return;
            }

            console.log(`[Python Wheel Installer] Wheel found: ${this.bundledWheelPath}`);

            // Get Python interpreter from VS Code Python extension
            console.log('[Python Wheel Installer] Detecting Python interpreter...');
            const pythonPath = await this.getPythonInterpreter();
            if (!pythonPath) {
                console.warn('[Python Wheel Installer] No Python interpreter detected. Skipping installation.');
                return;
            }

            console.log(`[Python Wheel Installer] Using Python interpreter: ${pythonPath}`);

            // Check current installation status
            console.log('[Python Wheel Installer] Checking installed version...');
            const currentVersion = await this.getInstalledVersion(pythonPath);

            if (currentVersion) {
                console.log(`[Python Wheel Installer] Currently installed version: ${currentVersion}`);
                if (this.isVersionUpToDate(currentVersion, this.packageVersion)) {
                    console.log(`[Python Wheel Installer] debrief-types ${currentVersion} is already up to date.`);
                    return;
                }
                console.log(`[Python Wheel Installer] Upgrading debrief-types from ${currentVersion} to ${this.packageVersion}`);
            } else {
                console.log(`[Python Wheel Installer] No existing installation found. Installing debrief-types ${this.packageVersion}`);
            }

            // Install/upgrade the package
            console.log('[Python Wheel Installer] Starting installation...');
            await this.installPackage(pythonPath);
            console.log('[Python Wheel Installer] Installation completed successfully');

            // Verify installation
            console.log('[Python Wheel Installer] Verifying installation...');
            const newVersion = await this.getInstalledVersion(pythonPath);
            if (newVersion) {
                console.log(`[Python Wheel Installer] Verification successful - version ${newVersion} is now installed`);
                vscode.window.showInformationMessage(
                    `Debrief Python types installed successfully (v${newVersion}). You can now import types from the 'debrief' package.`,
                    'Show Example'
                ).then(selection => {
                    if (selection === 'Show Example') {
                        this.showUsageExample();
                    }
                });
            } else {
                throw new Error('Package installation verification failed');
            }

        } catch (error) {
            console.error('Failed to install debrief-types package:', error);
            
            vscode.window.showWarningMessage(
                `Failed to install Debrief Python types: ${error}. You can install manually: pip install ${this.bundledWheelPath || 'path/to/wheel'}`,
                'Show Instructions'
            ).then(selection => {
                if (selection === 'Show Instructions') {
                    this.showManualInstallInstructions();
                }
            });
        }
    }

    /**
     * Get Python interpreter path from VS Code Python extension.
     */
    private async getPythonInterpreter(): Promise<string | null> {
        try {
            // First, check for virtual environment in common Docker/workspace locations
            const venvPaths = [
                '/home/coder/workspace/tests/venv/bin/python',
                '/home/coder/workspace/venv/bin/python',
                './tests/venv/bin/python',
                './venv/bin/python'
            ];

            console.log(`[Python Wheel Installer] Checking ${venvPaths.length} common venv locations...`);
            for (const venvPath of venvPaths) {
                try {
                    console.log(`[Python Wheel Installer] Trying venv path: ${venvPath}`);
                    const { stdout } = await execAsync(`"${venvPath}" --version`);
                    if (stdout.includes('Python')) {
                        console.log(`[Python Wheel Installer] Found Python at venv: ${venvPath} (${stdout.trim()})`);
                        return venvPath;
                    }
                } catch (error) {
                    console.log(`[Python Wheel Installer] Venv path not found: ${venvPath}`);
                }
            }

            // Try to get Python path from VS Code Python extension
            console.log('[Python Wheel Installer] Checking VS Code Python extension...');
            const pythonExtension = vscode.extensions.getExtension('ms-python.python');
            if (pythonExtension && pythonExtension.isActive) {
                console.log('[Python Wheel Installer] Python extension is active');
                const pythonApi = pythonExtension.exports;
                if (pythonApi && pythonApi.settings && pythonApi.settings.getExecutionDetails) {
                    const executionDetails = pythonApi.settings.getExecutionDetails();
                    if (executionDetails && executionDetails.execCommand) {
                        const pythonPath = Array.isArray(executionDetails.execCommand)
                            ? executionDetails.execCommand[0]
                            : executionDetails.execCommand;
                        console.log(`[Python Wheel Installer] Found Python via VS Code extension: ${pythonPath}`);
                        return pythonPath;
                    }
                }
                console.log('[Python Wheel Installer] Python extension active but no execution details available');
            } else {
                console.log('[Python Wheel Installer] Python extension not available or not active');
            }

            // Fallback: try common Python commands
            console.log('[Python Wheel Installer] Trying common Python commands...');
            const pythonCommands = ['python3', 'python', 'py'];
            for (const cmd of pythonCommands) {
                try {
                    console.log(`[Python Wheel Installer] Trying command: ${cmd}`);
                    const { stdout } = await execAsync(`${cmd} --version`);
                    if (stdout.includes('Python')) {
                        console.log(`[Python Wheel Installer] Found Python via command: ${cmd} (${stdout.trim()})`);
                        return cmd;
                    }
                } catch (error) {
                    console.log(`[Python Wheel Installer] Command not found: ${cmd}`);
                }
            }

            console.warn('[Python Wheel Installer] No Python interpreter found');
            return null;
        } catch (error) {
            console.error('[Python Wheel Installer] Error getting Python interpreter:', error);
            return null;
        }
    }

    /**
     * Get currently installed version of debrief-types package.
     */
    private async getInstalledVersion(pythonPath: string): Promise<string | null> {
        try {
            const command = `"${pythonPath}" -m pip show ${this.packageName}`;
            console.log(`[Python Wheel Installer] Checking installed version with: ${command}`);
            const { stdout } = await execAsync(command);
            const versionMatch = stdout.match(/Version: (.+)/);
            const version = versionMatch ? versionMatch[1].trim() : null;
            console.log(`[Python Wheel Installer] Installed version: ${version || 'not found'}`);
            return version;
        } catch (error) {
            console.log(`[Python Wheel Installer] Package not installed (pip show failed)`);
            return null; // Package not installed
        }
    }

    /**
     * Install the bundled wheel package.
     */
    private async installPackage(pythonPath: string): Promise<void> {
        // Try installation with different strategies to handle PEP 668 and virtual environments
        const strategies = [
            // Strategy 1: Normal pip install (works in virtual environments)
            `"${pythonPath}" -m pip install "${this.bundledWheelPath}" --force-reinstall --quiet`,
            // Strategy 2: Use --user flag for user installation
            `"${pythonPath}" -m pip install "${this.bundledWheelPath}" --force-reinstall --quiet --user`,
            // Strategy 3: Use --break-system-packages flag for externally managed environments
            `"${pythonPath}" -m pip install "${this.bundledWheelPath}" --force-reinstall --quiet --break-system-packages`
        ];

        console.log(`[Python Wheel Installer] Will try ${strategies.length} installation strategies`);
        let lastError: Error | null = null;

        for (let i = 0; i < strategies.length; i++) {
            const installCommand = strategies[i];
            console.log(`[Python Wheel Installer] Strategy ${i + 1}/${strategies.length}: Attempting installation`);
            console.log(`[Python Wheel Installer] Command: ${installCommand}`);

            try {
                const result = await execAsync(installCommand);
                console.log(`[Python Wheel Installer] Strategy ${i + 1} succeeded`);
                if (result.stdout) {
                    console.log(`[Python Wheel Installer] stdout: ${result.stdout}`);
                }
                if (result.stderr) {
                    console.log(`[Python Wheel Installer] stderr: ${result.stderr}`);
                }
                return; // Success, exit the function
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.error(`[Python Wheel Installer] Strategy ${i + 1} failed:`, lastError.message);

                // If this was a PEP 668 error, continue to next strategy
                if (lastError.message.includes('externally-managed-environment') ||
                    lastError.message.includes('PEP 668')) {
                    console.log(`[Python Wheel Installer] PEP 668 error detected, trying next strategy`);
                    continue;
                }

                // For other errors on the first strategy, continue to next strategy
                if (i === 0) {
                    console.log(`[Python Wheel Installer] First strategy failed with non-PEP 668 error, trying next strategy`);
                    continue;
                }
            }
        }

        // If all strategies failed, throw the last error
        console.error(`[Python Wheel Installer] All ${strategies.length} installation strategies failed`);
        throw lastError || new Error('All installation strategies failed');
    }

    /**
     * Find the bundled wheel file in the python directory.
     */
    private findBundledWheelFile(extensionPath: string): string | null {
        try {
            const pythonDir = path.join(extensionPath, 'python');
            if (!fs.existsSync(pythonDir)) {
                return null;
            }

            const files = fs.readdirSync(pythonDir);
            const wheelFiles = files.filter(file => file.endsWith('.whl') && file.startsWith('debrief_types-'));
            
            if (wheelFiles.length === 0) {
                return null;
            }


            return path.join(pythonDir, wheelFiles[0]);
        } catch (error) {
            console.error('Error finding bundled wheel file:', error);
            return null;
        }
    }


    /**
     * Extract version from wheel filename.
     */
    private extractVersionFromWheelName(): string {
        if (!this.bundledWheelPath) {
            return '1.0.0';
        }
        const filename = path.basename(this.bundledWheelPath);
        const versionMatch = filename.match(/debrief_types-(.+?)-py/);
        return versionMatch ? versionMatch[1] : '1.0.0';
    }

    /**
     * Check if current version is up to date.
     */
    private isVersionUpToDate(currentVersion: string, targetVersion: string): boolean {
        // For now, do simple string comparison
        // In production, you might want to use semantic version comparison
        return currentVersion === targetVersion;
    }

    /**
     * Show usage example in a new document.
     */
    private async showUsageExample(): Promise<void> {
        const exampleContent = `# Debrief Python Types - Usage Example
# This file demonstrates how to use the automatically installed debrief-types package

from debrief.types import (
    TrackFeature, 
    PointFeature, 
    AnnotationFeature,
    DebriefFeatureCollection,
    TimeState,
    ViewportState,
    SelectionState,
    EditorState
)

from debrief.validators import (
    validate_track_feature,
    validate_point_feature,
    validate_annotation_feature,
    validate_feature_collection
)

from debrief.schemas import (
    get_track_schema,
    get_point_schema,
    list_schemas
)

# Example: Create a simple track feature
track_data = {
    "type": "Feature",
    "geometry": {
        "type": "LineString", 
        "coordinates": [[0, 0], [1, 1], [2, 2]]
    },
    "properties": {
        "name": "Example Track",
        "timestamps": ["2024-01-01T00:00:00Z", "2024-01-01T00:01:00Z", "2024-01-01T00:02:00Z"]
    }
}

# Validate the track data
try:
    is_valid = validate_track_feature(track_data)
    print(f"Track validation result: {is_valid}")
except Exception as e:
    print(f"Validation error: {e}")

# List available schemas
print("Available schemas:", list_schemas())

# Get track schema
track_schema = get_track_schema()
if track_schema:
    print("Track schema title:", track_schema.get("title"))

print("\\n✓ Debrief types are working correctly!")
print("You can now use these types in your Python scripts for maritime data analysis.")
`;

        const doc = await vscode.workspace.openTextDocument({
            content: exampleContent,
            language: 'python'
        });
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Show manual installation instructions.
     */
    private showManualInstallInstructions(): void {
        const instructions = `
To manually install Debrief Python types:

1. Open a terminal in VS Code (Terminal > New Terminal)
2. Make sure you're using the correct Python environment
3. Run: pip install "${this.bundledWheelPath}"

Or install from the workspace root:
pip install libs/shared-types/dist/python/debrief_types-*.whl

The package provides maritime GeoJSON types and validators for Python.
        `.trim();

        vscode.window.showInformationMessage(instructions);
    }

    /**
     * Show build instructions for creating the Python wheel.
     */
    private showWheelBuildInstructions(): void {
        const instructions = `
To build the missing Python wheel:

1. Navigate to the project root in terminal
2. Run: pnpm build:shared-types
3. This will create the debrief_types wheel in libs/shared-types/dist/python/
4. Reload the VS Code extension (Developer: Reload Window)

The Python wheel provides type definitions and validators for Debrief data structures.
        `.trim();

        vscode.window.showInformationMessage(instructions, 'Copy Build Command').then(selection => {
            if (selection === 'Copy Build Command') {
                vscode.env.clipboard.writeText('pnpm build:shared-types');
                vscode.window.showInformationMessage('Build command copied to clipboard');
            }
        });
    }
}