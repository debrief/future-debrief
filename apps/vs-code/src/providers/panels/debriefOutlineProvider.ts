import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { SelectionState } from '@debrief/shared-types/derived/typescript/selectionstate';

export class DebriefOutlineProvider implements vscode.TreeDataProvider<OutlineItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OutlineItem | undefined | null | void> = new vscode.EventEmitter<OutlineItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OutlineItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];
    private _currentEditorId?: string;

    constructor() {
        this._globalController = GlobalController.getInstance();
        this._setupGlobalControllerSubscriptions();
    }

    /**
     * Setup subscriptions to GlobalController events
     */
    private _setupGlobalControllerSubscriptions(): void {
        // Subscribe to feature collection changes
        const fcSubscription = this._globalController.on('fcChanged', (data) => {
            if (data.editorId === this._currentEditorId) {
                this.refresh();
            }
        });
        this._disposables.push(fcSubscription);

        // Subscribe to selection changes
        const selectionSubscription = this._globalController.on('selectionChanged', (data) => {
            if (data.editorId === this._currentEditorId) {
                this.refresh();
            }
        });
        this._disposables.push(selectionSubscription);

        // Subscribe to active editor changes
        const activeEditorSubscription = this._globalController.on('activeEditorChanged', (data) => {
            this._currentEditorId = data.currentEditorId;
            this.refresh();
        });
        this._disposables.push(activeEditorSubscription);

        // Initialize with current active editor
        this._currentEditorId = this._globalController.activeEditorId;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: OutlineItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        treeItem.contextValue = 'debriefFeature';
        
        // Set icon based on feature type or state
        if (element.isSelected) {
            treeItem.iconPath = new vscode.ThemeIcon('location', new vscode.ThemeColor('charts.yellow'));
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('location');
        }
        
        // Add command to select feature when clicked
        treeItem.command = {
            command: 'debrief.selectFeature',
            title: 'Select Feature',
            arguments: [element.featureIndex]
        };

        // Add description with feature details
        if (element.featureType) {
            treeItem.description = element.featureType;
        }
        
        return treeItem;
    }

    getChildren(element?: OutlineItem): Thenable<OutlineItem[]> {
        if (!element) {
            if (!this._currentEditorId) {
                return Promise.resolve([]);
            }

            try {
                // Get feature collection from GlobalController
                const featureCollection = this._globalController.getStateSlice(this._currentEditorId, 'featureCollection');
                const selectionState = this._globalController.getStateSlice(this._currentEditorId, 'selectionState');
                
                if (!featureCollection || !Array.isArray(featureCollection.features)) {
                    return Promise.resolve([]);
                }

                // Create outline items from features
                const items: OutlineItem[] = featureCollection.features.map((feature: unknown, index: number) => {
                    const f = feature as { properties?: { name?: string }; geometry?: { type?: string } };
                    const featureName = f.properties?.name || `Feature ${index}`;
                    const featureType = f.geometry?.type || 'Unknown';
                    const isSelected = selectionState?.selectedIds?.includes(index.toString()) || false;
                    
                    return new OutlineItem(featureName, index, featureType, isSelected);
                });

                return Promise.resolve(items);
            } catch (error) {
                console.error('Error creating debrief outline items:', error);
                return Promise.resolve([]);
            }
        }
        return Promise.resolve([]);
    }

    /**
     * Handle feature selection from the outline
     */
    public selectFeature(featureIndex: number): void {
        if (this._currentEditorId) {
            const selectionState: SelectionState = {
                selectedIds: [featureIndex.toString()]
            };
            this._globalController.updateState(this._currentEditorId, 'selectionState', selectionState);
        }
    }

    /**
     * Dispose of the provider
     */
    public dispose(): void {
        this._disposables.forEach(disposable => disposable.dispose());
        this._disposables = [];
    }
}

class OutlineItem {
    constructor(
        public readonly label: string,
        public readonly featureIndex: number,
        public readonly featureType?: string,
        public readonly isSelected = false
    ) {}
}