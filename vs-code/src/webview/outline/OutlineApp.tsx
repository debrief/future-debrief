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

interface OutlineState extends WebviewState {
  errors?: ErrorPayload[];
  lastUpdate?: number;
}

const OutlineApp: React.FC = () => {
  const [state, setState] = useState<OutlineState>({
    theme: { kind: 1 }, // Default to light theme
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
            console.error('Outline: Error received', errorPayload);
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
            console.log('Outline: Unhandled message command:', command, message);
        }
      } catch (error) {
        console.error('Outline: Failed to process message:', error, message);
      }
    };

    window.addEventListener('message', handleMessage);

    // Send message to VS Code extension using acquired API
    const sendMessage = (msg: SidebarMessage) => {
      if (vscode) {
        console.log('Outline: Sending via VS Code API:', msg);
        vscode.postMessage(msg);
      } else if (window.parent) {
        console.log('Outline: Fallback to window.parent.postMessage:', msg);
        window.parent.postMessage(msg, '*');
      } else {
        console.error('Outline: No way to send message - no VS Code API or parent window');
      }
    };

    // Function to send messages to extension (accessible to components)
    const sendMessageToExtension = (msg: SidebarMessage) => {
      console.log('Outline: Sending message to extension:', msg);
      sendMessage(msg);
    };

    // Make sendMessageToExtension available globally for button clicks
    (window as any).sendMessageToExtension = sendMessageToExtension;

    // Notify extension that webview is ready
    sendMessage({
      command: 'webview-ready',
      source: 'outline',
      timestamp: Date.now()
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="panel-content">
      <div>
        <div className="panel-title">Debrief Outline</div>
        <div className="panel-description">
          Enhanced postMessage pipeline active - UPDATED
          <br />
          <small>Phase 3: Bidirectional communication implemented</small>
        </div>


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
              onClick={() => (window as any).sendMessageToExtension({ command: 'refresh-request', source: 'outline', timestamp: Date.now() })}
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
              🔄 Request Refresh
            </button>
            <button
              onClick={() => (window as any).sendMessageToExtension({ command: 'ping', value: { message: 'Hello from Outline!' }, source: 'outline', timestamp: Date.now() })}
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
              👋 Say Hello
            </button>
            <button
              onClick={() => (window as any).sendMessageToExtension({ command: 'show-info', value: { info: 'Message from Outline panel' }, source: 'outline', timestamp: Date.now() })}
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
              ℹ️ Show Info
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

export default OutlineApp;