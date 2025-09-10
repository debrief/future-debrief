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
    private readonly extensionContext: vscode.ExtensionContext;
    private readonly bundledWheelPath: string | null;
    private readonly packageName = 'debrief-types';
    private readonly packageVersion: string;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.bundledWheelPath = this.findBundledWheelFile(context.extensionPath);
        this.packageVersion = this.bundledWheelPath ? this.extractVersionFromWheelName() : '1.0.0';
    }

    /**
     * Main entry point - checks and installs the Python package if needed.
     */
    async checkAndInstallPackage(): Promise<void> {
        try {
            // Check if bundled wheel exists
            if (!this.bundledWheelPath || !fs.existsSync(this.bundledWheelPath)) {
                console.warn('Bundled debrief-types wheel not found. Python integration will not be available.');
                return;
            }

            // Get Python interpreter from VS Code Python extension
            const pythonPath = await this.getPythonInterpreter();
            if (!pythonPath) {
                console.warn('No Python interpreter detected. Skipping debrief-types installation.');
                return;
            }

            console.log(`Using Python interpreter: ${pythonPath}`);

            // Check current installation status
            const currentVersion = await this.getInstalledVersion(pythonPath);
            
            if (currentVersion) {
                if (this.isVersionUpToDate(currentVersion, this.packageVersion)) {
                    console.log(`debrief-types ${currentVersion} is already up to date.`);
                    return;
                }
                console.log(`Upgrading debrief-types from ${currentVersion} to ${this.packageVersion}`);
            } else {
                console.log(`Installing debrief-types ${this.packageVersion}`);
            }

            // Install/upgrade the package
            await this.installPackage(pythonPath);

            // Verify installation
            const newVersion = await this.getInstalledVersion(pythonPath);
            if (newVersion) {
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
            
            for (const venvPath of venvPaths) {
                try {
                    const { stdout } = await execAsync(`"${venvPath}" --version`);
                    if (stdout.includes('Python')) {
                        return venvPath;
                    }
                } catch {
                    // Continue to next path
                }
            }

            // Try to get Python path from VS Code Python extension
            const pythonExtension = vscode.extensions.getExtension('ms-python.python');
            if (pythonExtension && pythonExtension.isActive) {
                const pythonApi = pythonExtension.exports;
                if (pythonApi && pythonApi.settings && pythonApi.settings.getExecutionDetails) {
                    const executionDetails = pythonApi.settings.getExecutionDetails();
                    if (executionDetails && executionDetails.execCommand) {
                        const pythonPath = Array.isArray(executionDetails.execCommand) 
                            ? executionDetails.execCommand[0] 
                            : executionDetails.execCommand;
                        return pythonPath;
                    }
                }
            }

            // Fallback: try common Python commands
            const pythonCommands = ['python3', 'python', 'py'];
            for (const cmd of pythonCommands) {
                try {
                    const { stdout } = await execAsync(`${cmd} --version`);
                    if (stdout.includes('Python')) {
                        return cmd;
                    }
                } catch {
                    // Continue to next command
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting Python interpreter:', error);
            return null;
        }
    }

    /**
     * Get currently installed version of debrief-types package.
     */
    private async getInstalledVersion(pythonPath: string): Promise<string | null> {
        try {
            const { stdout } = await execAsync(`"${pythonPath}" -m pip show ${this.packageName}`);
            const versionMatch = stdout.match(/Version: (.+)/);
            return versionMatch ? versionMatch[1].trim() : null;
        } catch {
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

        let lastError: Error | null = null;

        for (let i = 0; i < strategies.length; i++) {
            const installCommand = strategies[i];
            
            try {
                const { stdout, stderr } = await execAsync(installCommand);
                return; // Success, exit the function
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                // If this was a PEP 668 error, continue to next strategy
                if (lastError.message.includes('externally-managed-environment') || 
                    lastError.message.includes('PEP 668')) {
                    continue;
                }
                
                // For other errors on the first strategy, continue to next strategy
                if (i === 0) {
                    continue;
                }
            }
        }

        // If all strategies failed, throw the last error
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
     * List contents of python directory for debugging.
     */
    private listPythonDirectory(): void {
        try {
            const pythonDir = path.join(this.extensionContext.extensionPath, 'python');
            if (fs.existsSync(pythonDir)) {
                const files = fs.readdirSync(pythonDir);
                console.warn('Python directory contents:', files);
            } else {
                console.warn('Python directory does not exist');
            }
        } catch (error) {
            console.warn('Error listing python directory:', error);
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
}