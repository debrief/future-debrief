import * as vscode from 'vscode';
import { DebriefSidebar } from './DebriefSidebar';
import { OutlineViewProvider } from './OutlineViewProvider';
import { TimelineViewProvider } from './TimelineViewProvider';
import { DebriefEditorProvider } from './DebriefEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Debrief VS Code extension is now active!');

	const debriefSidebar = new DebriefSidebar(context);
	const outlineProvider = new OutlineViewProvider(context.extensionUri);
	const timelineProvider = new TimelineViewProvider(context.extensionUri);

	// Register webview view providers
	vscode.window.registerWebviewViewProvider('debriefOutline', outlineProvider);
	vscode.window.registerWebviewViewProvider('debriefTimeline', timelineProvider);

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
