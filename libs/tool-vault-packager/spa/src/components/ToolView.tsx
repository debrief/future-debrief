import { useState, useEffect } from 'react';
import type { MCPTool, ToolIndex, TabType } from '../types';
import { mcpService } from '../services/mcpService';
import { InfoTab } from './InfoTab';
import { ExecuteTab } from './ExecuteTab';
import { CodeTab } from './CodeTab';
import { LoadingError } from './Warning';

interface ToolViewProps {
  tool: MCPTool;
}

export function ToolView({ tool }: ToolViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [toolIndex, setToolIndex] = useState<ToolIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadToolIndex();
  }, [tool]);

  const loadToolIndex = async () => {
    setLoading(true);
    setError(null);
    try {
      const index = await mcpService.loadToolIndex(tool.name);
      setToolIndex(index);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`Could not load tool index for ${tool.name}:`, err);
      setError(`Failed to load tool metadata: ${errorMessage}`);
      setToolIndex(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tool-view">
      <div className="tool-header">
        <h1>{tool.name}</h1>
        <p>{tool.description}</p>
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={`tab ${activeTab === 'execute' ? 'active' : ''}`}
          onClick={() => setActiveTab('execute')}
        >
          Execute
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
      </div>

      <div className="tab-content">
        {loading && <div className="loading">Loading tool metadata...</div>}
        {error && (
          <LoadingError 
            resource="tool metadata"
            error={error}
            onRetry={loadToolIndex}
          />
        )}
        
        {activeTab === 'info' && (
          <InfoTab 
            tool={tool} 
            toolIndex={toolIndex} 
            loading={loading} 
          />
        )}
        {activeTab === 'execute' && (
          <ExecuteTab 
            tool={tool} 
            toolIndex={toolIndex} 
            loading={loading} 
          />
        )}
        {activeTab === 'code' && (
          <CodeTab 
            tool={tool} 
            toolIndex={toolIndex} 
            loading={loading} 
          />
        )}
      </div>
    </div>
  );
}