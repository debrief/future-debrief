import * as vscode from 'vscode';
import { GlobalController } from '../../core/globalController';
import { SelectionState } from '@debrief/shared-types/derived/typescript/selectionstate';

export class DebriefOutlineProvider implements vscode.TreeDataProvider<OutlineItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OutlineItem | undefined | null | void> = new vscode.EventEmitter<OutlineItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OutlineItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _globalController: GlobalController;
    private _disposables: vscode.Disposable[] = [];
    private _currentEditorId?: string;
    private _featuresVisible = true;

    constructor() {
        this._globalController = GlobalController.getInstance();
        this._setupGlobalControllerSubscriptions();
    }

    public toggleFeatureVisibility(): void {
        this._featuresVisible = !this._featuresVisible;
        this.refresh();
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
        
        // Trigger initial refresh if we have an active editor
        if (this._currentEditorId) {
            this.refresh();
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: OutlineItem): vscode.TreeItem {
        const collapsibleState = element.hasChildren()
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const treeItem = new vscode.TreeItem(element.label, collapsibleState);
        treeItem.contextValue = 'debriefFeature';

        // Set icon based on feature type or state
        if (element.isSelected) {
            treeItem.iconPath = new vscode.ThemeIcon('location', new vscode.ThemeColor('charts.yellow'));
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('location');
        }

        // Only add command if leaf node
        if (!element.hasChildren()) {
            treeItem.command = {
                command: 'debrief.selectFeature',
                title: 'Select Feature',
                arguments: [element.featureIndex]
            };
        }

        // Add description with feature details
        if (element.featureType) {
            treeItem.description = element.featureType;
        }

        return treeItem;
    }

    getChildren(element?: OutlineItem): Promise<OutlineItem[]> {
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
                // Group features by properties.dataType
                const groups: { [dataType: string]: OutlineItem[] } = {};
                featureCollection.features.forEach((feature: unknown, index: number) => {
                    const f = feature as { id?: string | number; properties?: { name?: string; dataType?: string }; geometry?: { type?: string } };
                    const featureName = f.properties?.name || `Feature ${index}`;
                    const dataType = f.properties?.dataType || 'Unknown';
                    const featureType = f.geometry?.type || 'Unknown';
                    const featureId = f.id !== undefined ? String(f.id) : index.toString();
                    const isSelected = selectionState?.selectedIds?.includes(featureId) || false;
                    const item = new OutlineItem(featureName, index, featureType, isSelected, featureId);
                    if (!groups[dataType]) groups[dataType] = [];
                    groups[dataType].push(item);
                });
                // Create group nodes
                const groupNodes = Object.entries(groups).map(([dataType, children]) =>
                    new OutlineItem(dataType, -1, undefined, false, undefined, children)
                );
                return Promise.resolve(groupNodes);
            } catch (error) {
                console.error('Error creating debrief outline items:', error);
                return Promise.resolve([]);
            }
        } else {
            // Return children for a group node
            return Promise.resolve(element.children || []);
        }
    }

    /**
     * Handle feature selection from the outline
     */
    public selectFeature(featureIndex: number): void {
        if (this._currentEditorId) {
            // Get the feature collection to find the actual feature ID
            const featureCollection = this._globalController.getStateSlice(this._currentEditorId, 'featureCollection');
            if (featureCollection && featureCollection.features && featureCollection.features[featureIndex]) {
                const feature = featureCollection.features[featureIndex] as { id?: string | number };
                const featureId = feature.id !== undefined ? String(feature.id) : featureIndex.toString();
                
                const selectionState: SelectionState = {
                    selectedIds: [featureId]
                };
                this._globalController.updateState(this._currentEditorId, 'selectionState', selectionState);
            }
        }
    }

    // Add a new method to handle multi-select
    public toggleFeatureSelection(featureIndex: number, featureId?: string): void {
        if (!this._currentEditorId) return;
        const featureCollection = this._globalController.getStateSlice(this._currentEditorId, 'featureCollection');
        if (!featureCollection || !featureCollection.features) return;
        const id = featureId ?? featureIndex.toString();
        const selectionState = this._globalController.getStateSlice(this._currentEditorId, 'selectionState') || { selectedIds: [] };
        const selectedIds: Array<string | number> = Array.isArray(selectionState.selectedIds) ? [...selectionState.selectedIds] : [];
        const idx = selectedIds.indexOf(id);
        if (idx === -1) {
            selectedIds.push(id);
        } else {
            selectedIds.splice(idx, 1);
        }
        this._globalController.updateState(this._currentEditorId, 'selectionState', { selectedIds });
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
        public readonly isSelected = false,
        public readonly featureId?: string,
        public readonly children: OutlineItem[] = []
    ) {}
    hasChildren(): boolean {
        return this.children && this.children.length > 0;
    }
}