import { useState, useEffect } from 'react';
import type { MCPTool, ToolIndex } from '../types';
import { mcpService } from '../services/mcpService';

interface CodeTabProps {
  tool: MCPTool;
  toolIndex: ToolIndex | null;
  loading: boolean;
}

export function CodeTab({ tool, toolIndex, loading }: CodeTabProps) {
  const [sourceCode, setSourceCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (toolIndex?.files.source_code) {
      loadSourceCode();
    }
  }, [toolIndex]);

  const loadSourceCode = async () => {
    if (!toolIndex?.files.source_code) return;
    
    setCodeLoading(true);
    setError(null);
    try {
      const code = await mcpService.loadSourceCode(toolIndex.files.source_code.path, tool.name);
      setSourceCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source code');
      setSourceCode('');
    } finally {
      setCodeLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sourceCode);
      alert('Source code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return <div className="tab-loading">Loading source code...</div>;
  }

  return (
    <div className="code-tab">
      <div className="code-header">
        <h3>Source Code</h3>
        {sourceCode && (
          <button onClick={copyToClipboard} className="copy-button">
            Copy to Clipboard
          </button>
        )}
      </div>

      {codeLoading && <div className="loading">Loading source code...</div>}
      
      {error && (
        <div className="error-message">
          <p><strong>Error loading source code:</strong> {error}</p>
          <p>Falling back to basic tool description.</p>
        </div>
      )}

      {sourceCode ? (
        <div className="source-code-container">
          {toolIndex?.files.source_code.type === 'html' ? (
            <div 
              className="source-code-html"
              dangerouslySetInnerHTML={{ __html: sourceCode }}
            />
          ) : (
            <pre className="source-code-pre">
              <code>{sourceCode}</code>
            </pre>
          )}
        </div>
      ) : !codeLoading && !error ? (
        <div className="fallback-description">
          <h4>Tool Description</h4>
          <p>{tool.description}</p>
          <p><em>No source code available for this tool.</em></p>
        </div>
      ) : null}
    </div>
  );
}