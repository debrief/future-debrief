import { useState, useEffect } from 'react';
import type { MCPTool, ToolIndex, ExecutionResult } from '../types';
import { mcpService } from '../services/mcpService';

interface ExecuteTabProps {
  tool: MCPTool;
  toolIndex: ToolIndex | null;
  loading: boolean;
}

export function ExecuteTab({ tool, toolIndex, loading }: ExecuteTabProps) {
  const [input, setInput] = useState('{}');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [samples, setSamples] = useState<Array<{name: string, content: Record<string, unknown>}>>([]);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [samplesLoading, setSamplesLoading] = useState(false);

  useEffect(() => {
    if (toolIndex?.files.inputs && toolIndex.files.inputs.length > 0) {
      loadSamples();
    } else {
      setInput('{}');
    }
  }, [toolIndex]);

  const loadSamples = async () => {
    if (!toolIndex?.files.inputs) return;
    
    setSamplesLoading(true);
    try {
      const samplePromises = toolIndex.files.inputs.map(async (inputFile) => {
        try {
          const content = await mcpService.loadSampleInput(inputFile.path, tool.name);
          return { name: inputFile.name || inputFile.description, content };
        } catch (err) {
          console.warn(`Could not load sample ${inputFile.name}:`, err);
          return null;
        }
      });

      const loadedSamples = (await Promise.all(samplePromises))
        .filter(sample => sample !== null) as Array<{name: string, content: Record<string, unknown>}>;
      
      setSamples(loadedSamples);
      
      if (loadedSamples.length > 0) {
        if (loadedSamples.length === 1) {
          setSelectedSample(loadedSamples[0].name);
          setInput(JSON.stringify(loadedSamples[0].content, null, 2));
        } else {
          setSelectedSample('');
        }
      }
    } catch (err) {
      console.error('Error loading samples:', err);
    } finally {
      setSamplesLoading(false);
    }
  };

  const handleSampleSelect = (sampleName: string) => {
    const sample = samples.find(s => s.name === sampleName);
    if (sample) {
      setSelectedSample(sampleName);
      setInput(JSON.stringify(sample.content, null, 2));
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setResult(null);
    
    try {
      let parsedInput: Record<string, unknown>;
      try {
        parsedInput = JSON.parse(input) as Record<string, unknown>;
      } catch {
        throw new Error('Invalid JSON input');
      }

      const response = await mcpService.callTool({
        name: tool.name,
        arguments: parsedInput
      });

      setResult({
        success: !response.isError,
        result: response.result,
        error: response.isError ? 'Tool execution failed' : undefined,
        timestamp: Date.now()
      });
    } catch (err) {
      setResult({
        success: false,
        result: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now()
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <div className="tab-loading">Loading execution environment...</div>;
  }

  return (
    <div className="execute-tab">
      <div className="execute-panel">
        <div className="input-section">
          <h3>Input</h3>
          
          {samples.length > 0 && (
            <div className="sample-selector">
              <label htmlFor="sample-select">Sample Input:</label>
              <select
                id="sample-select"
                value={selectedSample}
                onChange={(e) => handleSampleSelect(e.target.value)}
                disabled={samplesLoading}
              >
                <option value="">Select a sample...</option>
                {samples.map(sample => (
                  <option key={sample.name} value={sample.name}>
                    {sample.name}
                  </option>
                ))}
              </select>
              {samplesLoading && <span className="loading-text">Loading samples...</span>}
            </div>
          )}

          <textarea
            className="input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter JSON input..."
            rows={10}
          />
          
          <button
            className="execute-button"
            onClick={handleExecute}
            disabled={executing || !input.trim()}
          >
            {executing ? 'Executing...' : 'Execute'}
          </button>
        </div>

        <div className="result-section">
          <h3>Result</h3>
          {result ? (
            <div className={`result-container ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <pre className="result-content">
                  {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
                </pre>
              ) : (
                <div className="error-content">
                  <strong>Error:</strong> {result.error}
                  {result.result != null && (
                    <pre className="error-details">
                      {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              <div className="result-meta">
                Executed at {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="no-result">Click "Execute" to run the tool</div>
          )}
        </div>
      </div>
    </div>
  );
}