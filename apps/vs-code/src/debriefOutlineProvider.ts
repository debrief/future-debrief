import * as vscode from 'vscode';

export class DebriefOutlineProvider implements vscode.TreeDataProvider<OutlineItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OutlineItem | undefined | null | void> = new vscode.EventEmitter<OutlineItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OutlineItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;
    private currentState: { selection?: { featureIndex: number } } = {};

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateDocument(document: vscode.TextDocument): void {
        this.currentDocument = document;
        this.refresh();
    }

    updateState(state: { selection?: { featureIndex: number } }): void {
        this.currentState = { ...this.currentState, ...state };
        this.refresh();
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
            if (!this.currentDocument) {
                return Promise.resolve([]);
            }

            try {
                const text = this.currentDocument.getText();
                if (text.trim().length === 0) {
                    return Promise.resolve([]);
                }

                const geoJson = JSON.parse(text);
                
                // Validate GeoJSON FeatureCollection
                if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
                    return Promise.resolve([]);
                }

                // Create outline items from features
                const items: OutlineItem[] = geoJson.features.map((feature: { properties?: { name?: string }; geometry?: { type?: string } }, index: number) => {
                    const featureName = feature.properties?.name || `Feature ${index}`;
                    const featureType = feature.geometry?.type || 'Unknown';
                    const isSelected = this.currentState.selection?.featureIndex === index;
                    
                    return new OutlineItem(featureName, index, featureType, isSelected);
                });

                return Promise.resolve(items);
            } catch (error) {
                console.error('Error parsing GeoJSON for debrief outline:', error);
                return Promise.resolve([]);
            }
        }
        return Promise.resolve([]);
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