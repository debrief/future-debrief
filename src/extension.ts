import * as vscode from 'vscode';
import { PlotJsonEditorProvider } from './plotJsonEditor';
import { CustomOutlineTreeProvider } from './customOutlineTreeProvider';

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

export function activate(context: vscode.ExtensionContext) {
    console.log('Codespace Extension is now active!');
    
    vscode.window.showInformationMessage('Codespace Extension has been activated successfully!');

    const disposable = vscode.commands.registerCommand('codespace-extension.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Codespace Extension!');
    });

    const provider = new HelloWorldProvider();
    vscode.window.createTreeView('codespace-extension.helloView', { treeDataProvider: provider });

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

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Codespace Extension is now deactivated');
}