import { useState, useEffect } from 'react';
import type { Tool, AppState } from './types';
import { mcpService } from './services/mcpService';
import { Sidebar } from './components/Sidebar';
import { WelcomePage } from './components/WelcomePage';
import { ToolView } from './components/ToolView';
import './App.css';

function App() { 
  const [state, setState] = useState<AppState>({ 
    loading: true,
    error: null,
    tools: [],
    selectedTool: null,
    toolIndex: null,
    globalIndex: null
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // First discover the endpoints and get root info
      const rootInfo = await mcpService.discoverEndpoints();
      console.log('ToolVault Root Info:', rootInfo);
      
      // Then load the tools using the discovered endpoint
      const toolsResponse = await mcpService.listTools();
      
      // Create a pseudo-global index from root info and tools
      const globalIndex = {
        tools: toolsResponse.tools,
        version: rootInfo.version || toolsResponse.version || 'Unknown',
        description: rootInfo.name || 'ToolVault',
        packageInfo: {
          buildDate: new Date().toISOString(),
          commit: 'unknown',
          author: 'ToolVault'
        }
      };
      
      setState(prev => ({
        ...prev,
        loading: false,
        tools: toolsResponse.tools,
        globalIndex: globalIndex,
        error: null
      }));
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load ToolVault'
      }));
    }
  };

  const handleToolSelect = (tool: Tool | null) => {
    setState(prev => ({
      ...prev,
      selectedTool: tool,
      toolIndex: null
    }));
  };

  if (state.error) {
    return (
      <div className="app error-state">
        <div className="error-container">
          <h1>Error Loading ToolVault</h1>
          <p>{state.error}</p>
          <button onClick={initializeApp}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        tools={state.tools}
        selectedTool={state.selectedTool}
        onToolSelect={handleToolSelect}
        loading={state.loading}
      />
      
      <main className="main-content">
        {state.selectedTool ? (
          <ToolView tool={state.selectedTool} />
        ) : (
          <WelcomePage 
            globalIndex={state.globalIndex}
            tools={state.tools}
            loading={state.loading}
          />
        )}
      </main>
    </div>
  );
}

export default App;
