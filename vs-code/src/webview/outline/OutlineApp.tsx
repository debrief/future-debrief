import React, { useState, useEffect } from 'react';
import { WebviewMessage, WebviewState } from '../shared/types';

const OutlineApp: React.FC = () => {
  const [state, setState] = useState<WebviewState>({
    theme: { kind: 1 } // Default to light theme
  });

  useEffect(() => {
    // Listen for messages from the extension
    const handleMessage = (event: MessageEvent<WebviewMessage>) => {
      const message = event.data;
      
      switch (message.type) {
        case 'theme-changed':
          setState(prev => ({
            ...prev,
            theme: message.payload
          }));
          break;
        case 'update-data':
          setState(prev => ({
            ...prev,
            data: message.payload
          }));
          break;
        default:
          console.log('Outline: Unhandled message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify extension that webview is ready
    if (window.parent) {
      window.parent.postMessage({
        type: 'webview-ready',
        source: 'outline'
      }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="panel-content">
      <div>
        <div className="panel-title">Debrief Outline</div>
        <div className="panel-description">
          Outline view not yet implemented.
          <br />
          <small>Ready for Phase 3: postMessage pipeline integration</small>
        </div>
        {state.data && (
          <div style={{ marginTop: '16px', fontSize: '0.8em', opacity: 0.6 }}>
            Data received: {JSON.stringify(state.data).substring(0, 50)}...
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlineApp;