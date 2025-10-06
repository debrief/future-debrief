import { useState, useEffect } from 'react';
import type { Tool, AppState } from './types';
import type { Root } from '@debrief/shared-types/src/types/tools/global_tool_index';
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

      // Then load the global index (hierarchical structure)
      const globalIndex = await mcpService.listTools();
      console.log('Global Index:', globalIndex);

      // Flatten the hierarchical tree to extract all tools
      const flattenTools = (nodes: Root): Tool[] => {
        const tools: Tool[] = [];
        for (const node of nodes) {
          if (node.type === 'tool' || !node.type) {
            // It's a tool (type is 'tool' or undefined defaults to tool)
            tools.push(node as Tool);
          } else if (node.type === 'category' && 'children' in node) {
            // It's a category with children
            tools.push(...flattenTools(node.children as Root));
          }
        }
        return tools;
      };

      const tools = flattenTools(globalIndex.root);
      console.log('Flattened tools:', tools);

      setState(prev => ({
        ...prev,
        loading: false,
        tools: tools,
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
