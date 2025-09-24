import { useState, useEffect, useCallback } from 'react';
import type { Tool, ToolIndexModel, ExecutionResult } from '../types';
import { mcpService } from '../services/mcpService';
import { SchemaForm } from './SchemaForm';
import { NoDataWarning, LoadingError } from './Warning';

interface ExecuteTabProps {
  tool: Tool;
  toolIndex: ToolIndexModel | null;
  loading: boolean;
}

export function ExecuteTab({ tool, toolIndex, loading }: ExecuteTabProps) {
  const [input, setInput] = useState('{}');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [inputMethod, setInputMethod] = useState<'form' | 'json'>('form');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [samples, setSamples] = useState<Array<{name: string, content: Record<string, unknown>}>>([]);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [toolIndexError] = useState<string | null>(null);

  const loadSamples = useCallback(async () => {
    if (!toolIndex?.files.inputs) return;
    if ((toolIndex as any).tool_name && (toolIndex as any).tool_name !== tool.name) {
      return;
    }

    const currentToolName = tool.name;
    setSamplesLoading(true);
    setSamplesError(null);
    setSamples([]);
    setSelectedSample('');
    try {
      const samplePromises = toolIndex.files.inputs.map(async (inputFile: any) => {
        try {
          const content = await mcpService.loadSampleInput(inputFile.path, tool.name);

          // Validate sample data structure during loading
          if (!content || typeof content !== 'object' || !content.input) {
            console.error(`Invalid sample data structure in "${inputFile.name}". Sample files must have an "input" property containing the tool parameters. Found: ${JSON.stringify(Object.keys(content || {}))}`);
            throw new Error(`Invalid sample data structure: missing "input" property`);
          }

          return { name: inputFile.name || inputFile.description, content };
        } catch (err) {
          console.warn(`Could not load sample ${inputFile.name}:`, err);
          return null;
        }
      });

      const loadedSamples = (await Promise.all(samplePromises))
        .filter((sample: any) => sample !== null) as Array<{name: string, content: Record<string, unknown>}>;

      // If tool changed while loading, ignore these results
      if (tool.name !== currentToolName) {
        return;
      }

      setSamples(loadedSamples);

      if (loadedSamples.length > 0) {
        if (loadedSamples.length === 1) {
          setSelectedSample(loadedSamples[0].name);

          // Enforce correct sample data structure: must have 'input' property
          const sampleContent = loadedSamples[0].content as any;
          if (!sampleContent || typeof sampleContent !== 'object' || !sampleContent.input) {
            setSamplesError(`Invalid sample data structure in "${loadedSamples[0].name}". Sample files must have an "input" property containing the tool parameters. Found: ${JSON.stringify(Object.keys(sampleContent || {}))}`);
            return;
          }

          const inputData = sampleContent.input;
          setFormData(inputData);
          setInput(JSON.stringify(inputData, null, 2));
        } else {
          setSelectedSample('');
          const emptyData = {};
          setFormData(emptyData);
          setInput('{}');
        }
      } else {
        setSamplesError(`Failed to load ${toolIndex.files.inputs.length} sample input(s) for this tool`);
      }
    } catch (err) {
      if (tool.name !== currentToolName) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setSamplesError(`Error loading sample inputs: ${errorMessage}`);
      console.error('Error loading samples:', err);
    } finally {
      if (tool.name !== currentToolName) {
        return;
      }
      setSamplesLoading(false);
    }
  }, [toolIndex, tool.name]);

  useEffect(() => {
    if (toolIndex?.files.inputs && toolIndex.files.inputs.length > 0) {
      loadSamples();
    } else {
      const emptyData = {};
      setInput('{}');
      setFormData(emptyData);
    }
  }, [toolIndex, loadSamples]);

  const handleSampleSelect = (sampleName: string) => {
    const sample = samples.find(s => s.name === sampleName);
    if (sample) {
      setSelectedSample(sampleName);

      // Enforce correct sample data structure: must have 'input' property
      const sampleContent = sample.content as any;
      if (!sampleContent || typeof sampleContent !== 'object' || !sampleContent.input) {
        setSamplesError(`Invalid sample data structure in "${sampleName}". Sample files must have an "input" property containing the tool parameters. Found: ${JSON.stringify(Object.keys(sampleContent || {}))}`);
        return;
      }

      const inputData = sampleContent.input;
      setFormData(inputData);
      setInput(JSON.stringify(inputData, null, 2));
      // Clear any previous errors
      setSamplesError(null);
    }
  };

  useEffect(() => {
    setSamples([]);
    setSelectedSample('');
    setSamplesError(null);
    setResult(null);
  }, [tool.name]);

  const handleFormDataChange = (data: Record<string, unknown>) => {
    setFormData(data);
    setInput(JSON.stringify(data, null, 2));
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      setFormData(parsed);
    } catch {
      // Invalid JSON - keep form data as is
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

      const executionResult = {
        success: !response.isError,
        result: response.result,
        error: response.isError ? 'Tool execution failed' : undefined,
        timestamp: Date.now()
      };

      setResult(executionResult);

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
          
          {/* Tool Index Error Warning */}
          {toolIndexError && (
            <LoadingError 
              resource="tool metadata"
              error={toolIndexError}
              onRetry={() => window.location.reload()}
            />
          )}
          
          {/* Sample Input Section */}
          {!toolIndex?.files.inputs || toolIndex.files.inputs.length === 0 ? (
            <NoDataWarning
              title="No Sample Inputs Available"
              message="This tool doesn't have any sample input files."
              suggestion="You'll need to create the input manually using the form or JSON editor below."
            />
          ) : (
            <>
              {samplesError ? (
                <LoadingError 
                  resource="sample inputs"
                  error={samplesError}
                  onRetry={loadSamples}
                />
              ) : samples.length > 0 ? (
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
              ) : samplesLoading ? (
                <div className="loading-text">Loading sample inputs...</div>
              ) : null}
            </>
          )}

          <div className="input-method-toggle">
            <button
              className={`input-method-button ${inputMethod === 'form' ? 'active' : ''}`}
              onClick={() => setInputMethod('form')}
            >
              Form Input
            </button>
            <button
              className={`input-method-button ${inputMethod === 'json' ? 'active' : ''}`}
              onClick={() => setInputMethod('json')}
            >
              JSON Input
            </button>
          </div>

          {inputMethod === 'form' ? (
            <SchemaForm
              schema={tool.inputSchema}
              initialValue={formData}
              onChange={handleFormDataChange}
            />
          ) : (
            <textarea
              className="input-textarea"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter JSON input..."
              rows={10}
            />
          )}
          
          <button
            className="execute-button"
            onClick={handleExecute}
            disabled={executing || (!input.trim() && Object.keys(formData).length === 0)}
            data-testid="execute-button"
          >
            {executing ? 'Executing...' : 'Execute'}
          </button>
        </div>

        <div className="result-section">
          <h3>Result</h3>
          {result ? (
            <div className={`result-container ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <pre className="result-content" data-testid="execution-result">
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
