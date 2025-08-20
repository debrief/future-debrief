import * as vscode from 'vscode';
import { DebriefSidebar } from './DebriefSidebar';
import { OutlineViewProvider } from './OutlineViewProvider';
import { TimelineViewProvider } from './TimelineViewProvider';
import { DebriefEditorProvider } from './DebriefEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Debrief VS Code extension is now active!');

	const debriefSidebar = new DebriefSidebar(context);
	const outlineProvider = new OutlineViewProvider();
	const timelineProvider = new TimelineViewProvider();

	vscode.window.registerTreeDataProvider('debriefOutline', outlineProvider);
	vscode.window.registerTreeDataProvider('debriefTimeline', timelineProvider);

	// Register the custom editor provider
	const editorProvider = DebriefEditorProvider.register(context);

	context.subscriptions.push(
		vscode.commands.registerCommand('debriefOutline.refresh', () => outlineProvider.refresh()),
		vscode.commands.registerCommand('debriefTimeline.refresh', () => timelineProvider.refresh()),
		editorProvider
	);

	// Auto-refresh views on activation (helpful during development)
	setTimeout(() => {
		outlineProvider.refresh();
		timelineProvider.refresh();
	}, 100);
}

export function deactivate() {}
