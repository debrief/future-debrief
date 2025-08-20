import * as vscode from 'vscode';

export class TimelineViewProvider implements vscode.TreeDataProvider<TimelineItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TimelineItem | undefined | null | void> = new vscode.EventEmitter<TimelineItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TimelineItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TimelineItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TimelineItem): Thenable<TimelineItem[]> {
        if (!element) {
            return Promise.resolve([
                new TimelineItem('Recent Events', vscode.TreeItemCollapsibleState.Collapsed),
                new TimelineItem('Analysis History', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        } else {
            return Promise.resolve([]);
        }
    }
}

class TimelineItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }
}