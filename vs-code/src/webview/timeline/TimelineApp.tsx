import React, { useState, useEffect } from 'react';
import { 
  WebviewMessage, 
  WebviewState, 
  SidebarMessage, 
  EditorState, 
  ThemeChangedPayload, 
  EditorStateUpdatePayload, 
  FileChangePayload, 
  SelectionChangePayload, 
  ErrorPayload 
} from '../shared/types';

interface TimelineState extends WebviewState {
  editorState?: EditorState;
  fileChanges?: Array<{ uri: string; type: string; timestamp: number }>;
  errors?: ErrorPayload[];
  lastUpdate?: number;
}

const TimelineApp: React.FC = () => {
  const [state, setState] = useState<TimelineState>({
    theme: { kind: 1 }, // Default to light theme
    fileChanges: [],
    errors: []
  });

  useEffect(() => {
    // Acquire VS Code API once at startup
    const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : null;
    
    // Enhanced message handling for new SidebarMessage structure
    const handleMessage = (event: MessageEvent<SidebarMessage | WebviewMessage>) => {
      const message = event.data;
      
      try {
        // Handle both old and new message formats for compatibility
        const command = (message as SidebarMessage).command || (message as WebviewMessage).type;
        const payload = (message as SidebarMessage).value || (message as WebviewMessage).payload;

        switch (command) {
          case 'theme-changed':
            const themePayload = payload as ThemeChangedPayload;
            setState(prev => ({
              ...prev,
              theme: themePayload.theme,
              lastUpdate: Date.now()
            }));
            console.log('Timeline: Theme updated', themePayload);
            break;

          case 'editor-state-update':
            const editorPayload = payload as EditorStateUpdatePayload;
            setState(prev => ({
              ...prev,
              editorState: editorPayload.editorState,
              lastUpdate: Date.now()
            }));
            console.log('Timeline: Editor state updated', editorPayload);
            break;

          case 'selection-change':
            const selectionPayload = payload as SelectionChangePayload;
            setState(prev => ({
              ...prev,
              editorState: {
                ...prev.editorState,
                selection: selectionPayload.selection,
                activeFile: selectionPayload.activeFile || prev.editorState?.activeFile
              },
              lastUpdate: Date.now()
            }));
            console.log('Timeline: Selection changed', selectionPayload);
            break;

          case 'file-change':
            const filePayload = payload as FileChangePayload;
            setState(prev => ({
              ...prev,
              fileChanges: [
                ...(prev.fileChanges || []).slice(-9), // Keep last 10 changes
                ...filePayload.changes.map(change => ({
                  ...change,
                  timestamp: Date.now()
                }))
              ],
              lastUpdate: Date.now()
            }));
            console.log('Timeline: File changes', filePayload);
            break;

          case 'error':
            const errorPayload = payload as ErrorPayload;
            setState(prev => ({
              ...prev,
              errors: [
                ...(prev.errors || []).slice(-4), // Keep last 5 errors
                errorPayload
              ],
              lastUpdate: Date.now()
            }));
            console.error('Timeline: Error received', errorPayload);
            break;

          // Backward compatibility
          case 'update-data':
            setState(prev => ({
              ...prev,
              data: payload,
              lastUpdate: Date.now()
            }));
            break;

          default:
            console.log('Timeline: Unhandled message command:', command, message);
        }
      } catch (error) {
        console.error('Timeline: Failed to process message:', error, message);
      }
    };

    window.addEventListener('message', handleMessage);

    // Send message to VS Code extension using acquired API
    const sendMessage = (msg: SidebarMessage) => {
      if (vscode) {
        console.log('Timeline: Sending via VS Code API:', msg);
        vscode.postMessage(msg);
      } else if (window.parent) {
        console.log('Timeline: Fallback to window.parent.postMessage:', msg);
        window.parent.postMessage(msg, '*');
      } else {
        console.error('Timeline: No way to send message - no VS Code API or parent window');
      }
    };

    // Function to send messages to extension (accessible to components)
    const sendMessageToExtension = (msg: SidebarMessage) => {
      console.log('Timeline: Sending message to extension:', msg);
      sendMessage(msg);
    };

    // Make sendMessageToExtension available globally for button clicks
    (window as any).sendMessageToExtension = sendMessageToExtension;

    // Notify extension that webview is ready
    sendMessage({
      command: 'webview-ready',
      source: 'timeline',
      timestamp: Date.now()
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="panel-content">
      <div>
        <div className="panel-title">Debrief Timeline</div>
        <div className="panel-description">
          Enhanced postMessage pipeline active
          <br />
          <small>Phase 3: Bidirectional communication implemented</small>
        </div>

        {/* Editor State Display */}
        {state.editorState && (
          <div style={{ marginTop: '16px', padding: '8px', background: 'var(--vscode-editor-background)', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '8px' }}>Editor State:</div>
            {state.editorState.activeFile && (
              <div style={{ fontSize: '0.8em', marginBottom: '4px' }}>
                📄 {state.editorState.activeFile.split('/').pop()}
              </div>
            )}
            {state.editorState.selection && (
              <div style={{ fontSize: '0.8em', marginBottom: '4px' }}>
                📍 Selection: L{state.editorState.selection.start.line + 1}:C{state.editorState.selection.start.character + 1} 
                {state.editorState.selection.start.line !== state.editorState.selection.end.line && 
                  ` → L${state.editorState.selection.end.line + 1}:C${state.editorState.selection.end.character + 1}`}
              </div>
            )}
            {state.editorState.cursorPosition && (
              <div style={{ fontSize: '0.8em', marginBottom: '4px' }}>
                🔸 Cursor: L{state.editorState.cursorPosition.line + 1}:C{state.editorState.cursorPosition.character + 1}
              </div>
            )}
          </div>
        )}

        {/* File Changes Timeline */}
        {state.fileChanges && state.fileChanges.length > 0 && (
          <div style={{ marginTop: '16px', padding: '8px', background: 'var(--vscode-editor-background)', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '8px' }}>File Timeline:</div>
            {state.fileChanges.slice(-5).map((change, index) => (
              <div key={`${change.uri}-${change.timestamp}`} style={{ fontSize: '0.8em', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                <div style={{ marginRight: '8px', minWidth: '16px' }}>
                  {change.type === 'created' && '✅'}
                  {change.type === 'changed' && '📝'}
                  {change.type === 'deleted' && '❌'}
                </div>
                <div style={{ flex: 1 }}>
                  {change.uri.split('/').pop()}
                </div>
                <div style={{ fontSize: '0.7em', opacity: 0.6, marginLeft: '8px' }}>
                  {new Date(change.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {state.errors && state.errors.length > 0 && (
          <div style={{ marginTop: '16px', padding: '8px', background: 'var(--vscode-errorBackground)', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '8px', color: 'var(--vscode-errorForeground)' }}>Errors:</div>
            {state.errors.slice(-2).map((error, index) => (
              <div key={index} style={{ fontSize: '0.8em', marginBottom: '4px', color: 'var(--vscode-errorForeground)' }}>
                ⚠️ {error.message}
              </div>
            ))}
          </div>
        )}

        {/* Interactive Controls */}
        <div style={{ marginTop: '16px', padding: '8px', background: 'var(--vscode-button-secondaryBackground)', borderRadius: '4px' }}>
          <div style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '8px' }}>Send Messages to Extension:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => (window as any).sendMessageToExtension({ command: 'ping', value: { message: 'Hello from Timeline!' }, source: 'timeline', timestamp: Date.now() })}
              style={{ 
                padding: '4px 8px', 
                fontSize: '0.8em', 
                background: 'var(--vscode-button-background)', 
                color: 'var(--vscode-button-foreground)', 
                border: 'none', 
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              📡 Send Ping
            </button>
            <button
              onClick={() => (window as any).sendMessageToExtension({ command: 'show-info', value: { info: 'Timeline panel says hi!' }, source: 'timeline', timestamp: Date.now() })}
              style={{ 
                padding: '4px 8px', 
                fontSize: '0.8em', 
                background: 'var(--vscode-button-background)', 
                color: 'var(--vscode-button-foreground)', 
                border: 'none', 
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              💬 Show Message
            </button>
          </div>
        </div>

        {/* Communication Status */}
        <div style={{ marginTop: '16px', fontSize: '0.7em', opacity: 0.6 }}>
          Last update: {state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString() : 'Never'}
          <br />
          Theme: {state.theme?.kind === 1 ? 'Light' : state.theme?.kind === 2 ? 'Dark' : 'Other'}
        </div>

        {/* Legacy data display for backward compatibility */}
        {state.data && (
          <div style={{ marginTop: '16px', fontSize: '0.8em', opacity: 0.6 }}>
            Legacy data: {JSON.stringify(state.data).substring(0, 50)}...
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineApp;