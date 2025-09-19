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
  const [testMode, setTestMode] = useState(false);
  const [unifiedSamples, setUnifiedSamples] = useState<Record<string, { input: Record<string, unknown>, expectedOutput?: Record<string, unknown> }> | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean, actual: any, expected: any }>>({});

  const loadUnifiedSamples = useCallback(async () => {
    try {
      const unified = await mcpService.loadUnifiedSampleData(tool.name);
      setUnifiedSamples(unified);
    } catch (err) {
      console.warn('Could not load unified sample data:', err);
      setUnifiedSamples(null);
    }
  }, [tool.name]);

  const loadSamples = useCallback(async () => {
    if (!toolIndex?.files.inputs) return;

    setSamplesLoading(true);
    setSamplesError(null);
    try {
      // Load unified samples for test mode
      await loadUnifiedSamples();

      const samplePromises = toolIndex.files.inputs.map(async (inputFile: any) => {
        try {
          const content = await mcpService.loadSampleInput(inputFile.path, tool.name);
          return { name: inputFile.name || inputFile.description, content };
        } catch (err) {
          console.warn(`Could not load sample ${inputFile.name}:`, err);
          return null;
        }
      });

      const loadedSamples = (await Promise.all(samplePromises))
        .filter((sample: any) => sample !== null) as Array<{name: string, content: Record<string, unknown>}>;

      setSamples(loadedSamples);

      if (loadedSamples.length > 0) {
        if (loadedSamples.length === 1) {
          setSelectedSample(loadedSamples[0].name);
          setFormData(loadedSamples[0].content);
          setInput(JSON.stringify(loadedSamples[0].content, null, 2));
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setSamplesError(`Error loading sample inputs: ${errorMessage}`);
      console.error('Error loading samples:', err);
    } finally {
      setSamplesLoading(false);
    }
  }, [toolIndex, tool.name, loadUnifiedSamples]);

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
      setFormData(sample.content);
      setInput(JSON.stringify(sample.content, null, 2));
    }
  };

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

  const handleRunAllTests = async () => {
    if (!unifiedSamples) return;

    setExecuting(true);
    setTestResults({});

    const results: Record<string, { passed: boolean, actual: any, expected: any }> = {};

    for (const [sampleName, sampleData] of Object.entries(unifiedSamples)) {
      try {
        const response = await mcpService.callTool({
          name: tool.name,
          arguments: sampleData.input
        });

        const actual = response.result;
        const expected = sampleData.expectedOutput;

        const passed = expected ? JSON.stringify(actual) === JSON.stringify(expected) : true;

        results[sampleName] = {
          passed,
          actual,
          expected
        };
      } catch (err) {
        results[sampleName] = {
          passed: false,
          actual: err instanceof Error ? err.message : 'Unknown error',
          expected: sampleData.expectedOutput
        };
      }
    }

    setTestResults(results);
    setExecuting(false);
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

      // If in test mode and we have a selected sample with expected output, check against it
      if (testMode && selectedSample && unifiedSamples) {
        const sampleKey = selectedSample.replace('.json', '');
        const expectedOutput = unifiedSamples[sampleKey]?.expectedOutput;
        if (expectedOutput) {
          const passed = JSON.stringify(response.result) === JSON.stringify(expectedOutput);
          setTestResults(prev => ({
            ...prev,
            [sampleKey]: {
              passed,
              actual: response.result,
              expected: expectedOutput
            }
          }));
        }
      }
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

          {/* Test Mode Section */}
          {unifiedSamples && (
            <div className="test-mode-section">
              <div className="test-mode-toggle">
                <label className="test-mode-label">
                  <input
                    type="checkbox"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                  />
                  Test Mode (Compare with Expected Output)
                </label>
              </div>

              {testMode && (
                <div className="test-mode-controls">
                  <button
                    className="run-all-tests-button"
                    onClick={handleRunAllTests}
                    disabled={executing}
                  >
                    {executing ? 'Running Tests...' : 'Run All Tests'}
                  </button>

                  {Object.keys(testResults).length > 0 && (
                    <div className="test-results-summary">
                      <h4>Test Results:</h4>
                      {Object.entries(testResults).map(([sampleName, result]) => (
                        <div key={sampleName} className={`test-result ${result.passed ? 'passed' : 'failed'}`}>
                          <span className="test-name">{sampleName}</span>
                          <span className={`test-status ${result.passed ? 'pass' : 'fail'}`}>
                            {result.passed ? '✓ PASS' : '✗ FAIL'}
                          </span>
                          {!result.passed && (
                            <div className="test-diff">
                              <div className="expected">Expected: {JSON.stringify(result.expected, null, 2)}</div>
                              <div className="actual">Actual: {JSON.stringify(result.actual, null, 2)}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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