import * as vscode from 'vscode';

export class CustomOutlineTreeProvider implements vscode.TreeDataProvider<OutlineItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OutlineItem | undefined | null | void> = new vscode.EventEmitter<OutlineItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OutlineItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateDocument(document: vscode.TextDocument): void {
        this.currentDocument = document;
        this.refresh();
    }

    getTreeItem(element: OutlineItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        treeItem.contextValue = 'feature';
        treeItem.iconPath = new vscode.ThemeIcon('location');
        
        // Add command to highlight feature when clicked
        treeItem.command = {
            command: 'customOutline.selectFeature',
            title: 'Select Feature',
            arguments: [element.featureIndex]
        };
        
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
                const items: OutlineItem[] = geoJson.features.map((feature: any, index: number) => {
                    const featureName = feature.properties?.name || `Feature ${index}`;
                    return new OutlineItem(featureName, index);
                });

                return Promise.resolve(items);
            } catch (error) {
                console.error('Error parsing GeoJSON for custom outline:', error);
                return Promise.resolve([]);
            }
        }
        return Promise.resolve([]);
    }
}

class OutlineItem {
    constructor(
        public readonly label: string,
        public readonly featureIndex: number
    ) {}
}