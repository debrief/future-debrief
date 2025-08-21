import * as vscode from 'vscode';

export class DebriefEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new DebriefEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            DebriefEditorProvider.viewType,
            provider
        );
        return providerRegistration;
    }

    private static readonly viewType = 'debrief.plotEditor';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup initial webview configuration
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        // Set the HTML content for the webview
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // Function to update the webview with current document content
        const updateWebview = () => {
            let content: string = document.getText();
            let parsedJson: any;
            let isValidJson = true;

            try {
                parsedJson = JSON.parse(content || '{}');
            } catch (error) {
                isValidJson = false;
                parsedJson = { error: 'Invalid JSON format', details: error instanceof Error ? error.message : 'Unknown error' };
            }

            webviewPanel.webview.postMessage({
                type: 'update',
                content: content || '{}',
                parsedJson: parsedJson,
                isValidJson: isValidJson
            });
        };

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        // Update webview when VS Code theme changes
        const changeThemeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
            webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
            updateWebview();
        });

        // Track when this editor becomes active/inactive
        webviewPanel.onDidChangeViewState(() => {
            if (webviewPanel.active) {
                console.log('DebriefEditorProvider: Editor became active, sending command 22', document, webviewPanel);
                vscode.commands.executeCommand('debrief.editorBecameActive', document);
            } else {
                console.log('DebriefEditorProvider: Editor became inactive, sending null');
                vscode.commands.executeCommand('debrief.editorBecameActive', null);
            }
        });

        // Send initial message if this editor is already active
        if (webviewPanel.active) {
            console.log('DebriefEditorProvider: Editor created and is active, sending command');
            vscode.commands.executeCommand('debrief.editorBecameActive', document);
        }

        // Make sure we dispose of the subscriptions when the editor is closed
        webviewPanel.onDidDispose(() => {
            console.log('DebriefEditorProvider: Editor disposed, sending null');
            vscode.commands.executeCommand('debrief.editorBecameActive', null);
            changeDocumentSubscription.dispose();
            changeThemeSubscription.dispose();
        });

        // Send initial content to webview
        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debrief Plot Editor</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
            line-height: 1.5;
        }

        .header {
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .title {
            font-size: 1.2em;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin: 0;
        }

        .subtitle {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin: 4px 0 0 0;
        }

        .content-container {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .json-content {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            padding: 12px;
            white-space: pre-wrap;
            overflow: auto;
            max-height: calc(100vh - 120px);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }

        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px;
            margin: 8px 0;
            border-radius: 4px;
        }

        .error-title {
            font-weight: 600;
            margin-bottom: 4px;
        }

        .json-key {
            color: var(--vscode-symbolIcon-keywordForeground, #569CD6);
        }

        .json-string {
            color: var(--vscode-symbolIcon-stringForeground, #CE9178);
        }

        .json-number {
            color: var(--vscode-symbolIcon-numberForeground, #B5CEA8);
        }

        .json-boolean {
            color: var(--vscode-symbolIcon-booleanForeground, #569CD6);
        }

        .json-null {
            color: var(--vscode-symbolIcon-nullForeground, #569CD6);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">Debrief Plot Editor</h1>
        <p class="subtitle">Read-only view of .plot.json file content</p>
    </div>
    
    <div class="content-container">
        <div id="content" class="json-content">Loading...</div>
    </div>

    <script>
        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'update') {
                const contentDiv = document.getElementById('content');
                
                if (!message.isValidJson) {
                    contentDiv.innerHTML = \`
                        <div class="error">
                            <div class="error-title">JSON Parse Error</div>
                            <div>\${message.parsedJson.details}</div>
                        </div>
                        <div style="margin-top: 16px;">
                            <strong>Raw content:</strong>
                            <pre style="margin: 8px 0; padding: 8px; background: var(--vscode-textCodeBlock-background); border-radius: 4px;">\${escapeHtml(message.content)}</pre>
                        </div>
                    \`;
                } else {
                    const formattedJson = JSON.stringify(message.parsedJson, null, 2);
                    contentDiv.innerHTML = \`<pre>\${syntaxHighlight(formattedJson)}</pre>\`;
                }
            }
        });

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function syntaxHighlight(json) {
            if (typeof json !== 'string') {
                json = JSON.stringify(json, undefined, 2);
            }
            
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
                var cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }
    </script>
</body>
</html>`;
    }
}