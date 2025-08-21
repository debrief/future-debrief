import * as vscode from 'vscode';
import { DebriefSidebar } from './DebriefSidebar';
import { OutlineViewProvider } from './OutlineViewProvider';
import { TimelineViewProvider } from './TimelineViewProvider';
import { DebriefEditorProvider } from './DebriefEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Debrief VS Code extension is now active!');
	
	try {
		const debriefSidebar = new DebriefSidebar(context);
		const outlineProvider = new OutlineViewProvider(context.extensionUri);
		const timelineProvider = new TimelineViewProvider(context.extensionUri);

		// Register webview view providers
		const outlineRegistration = vscode.window.registerWebviewViewProvider('debriefOutline', outlineProvider);
		const timelineRegistration = vscode.window.registerWebviewViewProvider('debriefTimeline', timelineProvider);
		
		console.log('Debrief: Webview providers registered successfully');

		// Register the custom editor provider
		const editorProvider = DebriefEditorProvider.register(context);

		// Register command to handle Debrief editor active/inactive events
		const debriefEditorActiveCommand = vscode.commands.registerCommand('debrief.editorBecameActive', (document: vscode.TextDocument | null) => {
			console.log('Extension: Received debrief.editorBecameActive command with document:', document?.uri.toString() || 'null');
			// Forward to both sidebar providers
			outlineProvider.onDebriefEditorActiveChanged(document);
			timelineProvider.onDebriefEditorActiveChanged(document);
		});

		context.subscriptions.push(
			outlineRegistration,
			timelineRegistration,
			outlineProvider, // Ensure providers are disposed when extension deactivates
			timelineProvider,
			vscode.commands.registerCommand('debriefOutline.refresh', () => outlineProvider.refresh()),
			vscode.commands.registerCommand('debriefTimeline.refresh', () => timelineProvider.refresh()),
			debriefEditorActiveCommand,
			editorProvider
		);

		// Auto-refresh views on activation (helpful during development)
		setTimeout(() => {
			outlineProvider.refresh();
			timelineProvider.refresh();
		}, 100);
		
		console.log('Debrief: Extension activation completed successfully');
	} catch (error) {
		console.error('Debrief: Extension activation failed:', error);
		vscode.window.showErrorMessage(`Debrief extension failed to activate: ${error}`);
	}
}

export function deactivate() {}
