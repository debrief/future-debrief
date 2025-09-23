import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToolFilterService } from './ToolFilterService';
import { OutlineView } from '../OutlineView/OutlineView';
import type { DebriefFeature, DebriefFeatureCollection } from '@debrief/shared-types';
import type { ToolIndexModel } from '@debrief/shared-types/src/types/ToolIndexModel';
import type { Tool } from '@debrief/shared-types/src/types/Tool';

// Mock data for realistic testing
const createMockToolIndex = (toolName: string, description: string): ToolIndexModel => ({
  tool_name: toolName,
  description,
  files: {
    execute: {
      path: 'main.py',
      description: 'Main execution file',
      type: 'python'
    },
    source_code: {
      path: 'source.py',
      description: 'Source code file',
      type: 'python'
    },
    git_history: {
      path: 'history.json',
      description: 'Git history',
      type: 'json'
    }
  },
  stats: {
    sample_inputs_count: 3,
    git_commits_count: 15,
    source_code_length: 2500
  }
});

// Mock tools for demonstration
const mockTools: { [key: string]: Tool } = {
  'track-analyzer': {
    name: 'track-analyzer',
    description: 'Analyzes vessel tracks for speed, bearing, and anomalies',
    inputSchema: {
      type: 'object',
      properties: {
        track: {
          type: 'object',
          description: 'Input track feature for analysis'
        }
      },
      required: ['track']
    }
  },
  'point-processor': {
    name: 'point-processor',
    description: 'Processes individual points for location validation',
    inputSchema: {
      type: 'object',
      properties: {
        point: {
          type: 'object',
          description: 'Input point feature for processing'
        }
      },
      required: ['point']
    }
  },
  'multi-feature-correlator': {
    name: 'multi-feature-correlator',
    description: 'Correlates multiple features for spatial-temporal analysis',
    inputSchema: {
      type: 'object',
      properties: {
        track: {
          type: 'object',
          description: 'Input track feature'
        },
        point: {
          type: 'object',
          description: 'Input point feature'
        }
      },
      required: ['track', 'point']
    }
  },
  'zone-analyzer': {
    name: 'zone-analyzer',
    description: 'Analyzes polygon zones and areas',
    inputSchema: {
      type: 'object',
      properties: {
        zone: {
          type: 'object',
          description: 'Input polygon feature for zone analysis'
        }
      },
      required: ['zone']
    }
  }
};

// Component for interactive demonstration
interface ToolFilterDemoProps {
  features: DebriefFeature[];
  toolIndex: ToolIndexModel;
  toolName?: string;
}

function ToolFilterDemo({ features, toolIndex, toolName }: ToolFilterDemoProps) {
  const [service] = useState(() => new ToolFilterService());
  const [result, setResult] = useState<ReturnType<ToolFilterService['getApplicableTools']> | null>(null);

  useEffect(() => {
    // Use the toolIndex directly (it's already a ToolIndexModel)
    const filterResult = service.getApplicableTools(features, toolIndex);
    setResult(filterResult);
  }, [features, toolIndex, service]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', margin: '8px 0', borderRadius: '8px' }}>
      <h4>{toolName || toolIndex.tool_name} Tool Filter Demo</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <h5>Input Features ({features.length})</h5>
          {features.map((feature, index) => (
            <div key={index} style={{ fontSize: '0.85em', margin: '4px 0', padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>{feature.properties?.dataType || 'unknown'}:</strong> {feature.properties?.name || feature.id || `Feature ${index + 1}`}
            </div>
          ))}
        </div>
        <div>
          <h5>Filter Results</h5>
          {result && (
            <div>
              <p><strong>Applicable:</strong> {(result.tools && result.tools.length > 0) ? 'Yes' : 'No'}</p>
              <p><strong>Matching tools:</strong> {result.tools ? result.tools.length : 0}</p>
              <p><strong>Has errors:</strong> {result.errors && result.errors.length > 0 ? 'Yes' : 'No'}</p>
              {result.warnings && result.warnings.length > 0 && (
                <div>
                  <strong>Warnings:</strong>
                  <ul style={{ fontSize: '0.8em', margin: '4px 0' }}>
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>
                        ⚠️ {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div>
                  <strong>Errors:</strong>
                  <ul style={{ fontSize: '0.8em', margin: '4px 0' }}>
                    {result.errors.map((error, idx) => (
                      <li key={idx}>
                        ❌ {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sample feature creation helper
const createSampleFeatures = (): DebriefFeature[] => [
  {
    type: 'Feature',
    id: 'track_001',
    geometry: {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1], [2, 2]]
    },
    properties: {
      dataType: 'track',
      name: 'Sample Track',
      timestamps: ['2023-01-01T10:00:00Z', '2023-01-01T11:00:00Z', '2023-01-01T12:00:00Z']
    }
  },
  {
    type: 'Feature',
    id: 'point_001',
    geometry: {
      type: 'Point',
      coordinates: [0.5, 0.5]
    },
    properties: {
      dataType: 'reference-point',
      name: 'Sample Point',
      timestamp: '2023-01-01T10:30:00Z'
    }
  },
  {
    type: 'Feature',
    id: 'zone_001',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    },
    properties: {
      dataType: 'zone',
      name: 'Sample Zone',
      zoneType: 'restricted'
    }
  }
];

// Story configuration
const meta: Meta<typeof ToolFilterDemo> = {
  title: 'Services/ToolFilterService',
  component: ToolFilterDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Interactive demonstration of the ToolFilterService for intelligent tool-feature matching'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof ToolFilterDemo>;

// Basic stories
export const TrackAnalyzer: Story = {
  args: {
    features: createSampleFeatures().filter(f => f.properties?.dataType === 'track'),
    toolIndex: createMockToolIndex('track-analyzer', 'Analyzes vessel tracks'),
    toolName: 'Track Analyzer'
  }
};

export const PointProcessor: Story = {
  args: {
    features: createSampleFeatures().filter(f => f.properties?.dataType === 'reference-point'),
    toolIndex: createMockToolIndex('point-processor', 'Processes individual points'),
    toolName: 'Point Processor'
  }
};

export const MultiFeatureCorrelator: Story = {
  args: {
    features: createSampleFeatures(),
    toolIndex: createMockToolIndex('multi-feature-correlator', 'Correlates multiple features'),
    toolName: 'Multi Feature Correlator'
  }
};

export const NoCompatibleFeatures: Story = {
  args: {
    features: createSampleFeatures().filter(f => f.properties?.dataType === 'zone'),
    toolIndex: createMockToolIndex('track-analyzer', 'Track analyzer with no tracks'),
    toolName: 'Track Analyzer (No Tracks)'
  }
};

export const EmptyFeatures: Story = {
  args: {
    features: [],
    toolIndex: createMockToolIndex('track-analyzer', 'Track analyzer with empty input'),
    toolName: 'Track Analyzer (Empty Input)'
  }
};

// Advanced caching demonstration
const CachingDemoComponent: React.FC = () => {
  const [service] = useState(() => new ToolFilterService());
  const [features] = useState(() => createSampleFeatures());
  const [results, setResults] = useState<Array<{
    run: number;
    fromCache: boolean;
    timestamp: string;
  }>>([]);

  const runFilter = () => {
    const toolIndex = {
      tools: [mockTools['track-analyzer']],
      version: '1.0.0',
      description: 'Caching demo'
    };

    const result = service.getApplicableTools(features, toolIndex);
    setResults(prev => [...prev, {
      run: prev.length + 1,
      fromCache: result.fromCache,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Caching Demonstration</h3>
      <p>The ToolFilterService caches results for 60 seconds. Run the filter multiple times to see caching in action.</p>

      <div style={{ margin: '20px 0' }}>
        <button onClick={runFilter} style={{ marginRight: '10px', padding: '8px 16px' }}>
          Run Filter
        </button>
        <button onClick={clearResults} style={{ padding: '8px 16px' }}>
          Clear Results
        </button>
      </div>

      <div>
        <h4>Results History:</h4>
        {results.length === 0 ? (
          <p>No results yet. Click &quot;Run Filter&quot; to start.</p>
        ) : (
          <ul>
            {results.map((result, index) => (
              <li key={index}>
                Run #{result.run} at {result.timestamp}: {result.fromCache ? '🟢 Cache Hit' : '🔴 Cache Miss'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const CachingDemo: Story = {
  render: () => <CachingDemoComponent />
};

// Real data demonstration
const WithRealDataComponent: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realFeatures, setRealFeatures] = useState<DebriefFeature[]>([]);
  const [realToolIndex, setRealToolIndex] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/large-sample.plot.json').then(res => res.json()),
      fetch('/tool-index.json').then(res => res.json())
    ])
      .then(([plotData, toolData]) => {
        if (plotData?.features) {
          setRealFeatures(plotData.features);
        } else {
          setRealFeatures(createSampleFeatures());
          setError('Plot data missing features, using sample data');
        }

        if (toolData?.tools) {
          setRealToolIndex(toolData);
        } else {
          setRealToolIndex(null);
          setError(error + ' | Tool data missing tools array');
        }

        setLoading(false);
      })
      .catch(err => {
        console.warn('Could not load real data, using sample data:', err);
        setRealFeatures(createSampleFeatures());
        setRealToolIndex(null);
        setError('Using sample data (could not load real data files)');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading real data...</div>;
  }

  return (
    <div>
      {error && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          color: '#856404',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {realToolIndex ? (
        <div>
          <h3>Real Tool Index Data ({realToolIndex.tools?.length || 0} tools found)</h3>
          {realToolIndex.tools?.slice(0, 3).map((tool: any, _index: number) => (
            <div key={tool.name} style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
              <h4>{tool.name}</h4>
              <p><em>{tool.description}</em></p>
              <ToolFilterDemo
                features={realFeatures.slice(0, 8)}
                toolIndex={createMockToolIndex(tool.name, tool.description)}
                toolName={tool.name}
              />
            </div>
          ))}
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <strong>Real Data Summary:</strong>
            <br />• Features: {realFeatures.length} maritime features loaded
            <br />• Tools: {realToolIndex.tools?.length || 0} real tools from tool vault
            <br />• Showing: First 3 tools with first 8 features for performance
          </div>
        </div>
      ) : (
        <div>
          <h3>Sample Data (Real data unavailable)</h3>
          <ToolFilterDemo
            features={realFeatures.slice(0, 5)}
            toolIndex={createMockToolIndex('sample-tool', 'Sample tool for demonstration')}
            toolName="Sample Tool"
          />
        </div>
      )}
    </div>
  );
};

export const WithRealData: Story = {
  render: () => <WithRealDataComponent />
};

// Enhanced interactive demonstration with real OutlineView integration
const EnhancedInteractiveDemo: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plotData, setPlotData] = useState<DebriefFeatureCollection | null>(null);
  const [toolsData, setToolsData] = useState<any>(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [service] = useState(() => new ToolFilterService());

  // Load real data on component mount
  useEffect(() => {
    Promise.all([
      fetch('/large-sample.plot.json').then(res => res.json()),
      fetch('/tool-index.json').then(res => res.json())
    ])
      .then(([plotResponse, toolResponse]) => {
        // Validate plot data structure
        if (plotResponse && plotResponse.type === 'FeatureCollection' && Array.isArray(plotResponse.features)) {
          setPlotData(plotResponse as DebriefFeatureCollection);
        } else {
          throw new Error('Invalid plot data format');
        }

        // Validate tool data structure
        if (toolResponse && Array.isArray(toolResponse.tools)) {
          setToolsData(toolResponse);
        } else {
          throw new Error('Invalid tool data format');
        }

        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // Handle feature selection changes from OutlineView
  const handleSelectionChange = (ids: string[]) => {
    setSelectedFeatureIds(ids);
  };

  // Calculate tool compatibility for each tool
  const calculateToolCompatibility = (tool: any, selectedFeatures: DebriefFeature[]) => {
    if (!tool.inputSchema?.properties) {
      return { compatible: true, matchingParams: 0, totalParams: 0, reason: 'No parameter requirements' };
    }

    const properties = tool.inputSchema.properties;
    const requiredParams = tool.inputSchema.required || [];
    const totalParams = Object.keys(properties).length;
    let matchingParams = 0;
    const missingRequirements: string[] = [];

    // Check each parameter requirement
    for (const [paramName, paramSchema] of Object.entries(properties)) {
      const paramDesc = (paramSchema as any)?.description?.toLowerCase() || '';
      const isRequired = requiredParams.includes(paramName);

      // Try to match features to this parameter
      let paramMatched = false;

      if (paramDesc.includes('track') || paramDesc.includes('linestring')) {
        paramMatched = selectedFeatures.some(f =>
          f.properties?.dataType === 'track' ||
          f.geometry?.type === 'LineString' ||
          f.geometry?.type === 'MultiLineString'
        );
      } else if (paramDesc.includes('point')) {
        paramMatched = selectedFeatures.some(f =>
          f.properties?.dataType === 'reference-point' ||
          f.geometry?.type === 'Point'
        );
      } else if (paramDesc.includes('polygon') || paramDesc.includes('zone')) {
        paramMatched = selectedFeatures.some(f =>
          f.properties?.dataType === 'zone' ||
          f.geometry?.type === 'Polygon' ||
          f.geometry?.type === 'MultiPolygon'
        );
      } else if (paramDesc.includes('feature')) {
        // Generic feature parameter - matches any feature
        paramMatched = selectedFeatures.length > 0;
      } else {
        // Non-feature parameter (like min_speed) - always considered matched
        paramMatched = true;
      }

      if (paramMatched) {
        matchingParams++;
      } else if (isRequired) {
        missingRequirements.push(paramName);
      }
    }

    const compatible = missingRequirements.length === 0 && selectedFeatures.length > 0;
    const reason = compatible
      ? `All requirements met (${matchingParams}/${totalParams} parameters)`
      : selectedFeatures.length === 0
        ? 'No features selected'
        : `Missing required: ${missingRequirements.join(', ')}`;

    return { compatible, matchingParams, totalParams, reason };
  };

  // Generate input schema summary
  const generateSchemaSummary = (inputSchema: any) => {
    if (!inputSchema?.properties) return 'No schema';

    const props = Object.keys(inputSchema.properties);
    const required = inputSchema.required || [];

    return props.map(prop => {
      const isReq = required.includes(prop);
      return `${prop}${isReq ? '*' : ''}`;
    }).join(', ');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading maritime data and tools...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '4px',
        color: '#a00'
      }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!plotData || !toolsData) {
    return (
      <div style={{ padding: '20px' }}>
        <div>No data available</div>
      </div>
    );
  }

  const selectedFeatures = plotData.features.filter(f =>
    selectedFeatureIds.includes(String(f.id))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '800px', gap: '20px' }}>
      {/* Header */}
      <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Enhanced ToolFilter Service - Interactive Demonstration</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Select features in the OutlineView to see real-time tool compatibility analysis.
          Tools are automatically filtered based on parameter schema matching.
        </p>
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left panel - OutlineView */}
        <div style={{
          flex: '0 0 300px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            fontWeight: 'bold'
          }}>
            Maritime Features ({plotData.features.length})
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {/* Import and use the real OutlineView component with dark background */}
            <div style={{
              backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
              color: 'var(--vscode-editor-foreground, #cccccc)',
              height: '100%',
              fontFamily: 'var(--vscode-font-family, "Segoe UI", system-ui, sans-serif)',
              fontSize: 'var(--vscode-font-size, 13px)'
            }}>
              <OutlineView
                featureCollection={plotData}
                selectedFeatureIds={selectedFeatureIds}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          </div>
        </div>

        {/* Right panel - Tools Table */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            fontWeight: 'bold'
          }}>
            Tool Compatibility Analysis ({toolsData.tools.length} tools)
          </div>

          {/* Selection status */}
          <div style={{
            padding: '12px',
            backgroundColor: selectedFeatures.length === 0 ? '#fff3cd' : '#d4edda',
            borderBottom: '1px solid #ddd',
            fontSize: '14px'
          }}>
            {selectedFeatures.length === 0 ? (
              <span style={{ color: '#856404' }}>
                ⚠️ No features selected for analysis - all tools are disabled
              </span>
            ) : (
              <span style={{ color: '#155724' }}>
                ✓ {selectedFeatures.length} feature(s) selected: {selectedFeatures.map(f => f.properties?.name || f.id).join(', ')}
              </span>
            )}
          </div>

          {/* Tools table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Tool Name</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Matching</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Total Params</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Input Schema</th>
                </tr>
              </thead>
              <tbody>
                {toolsData.tools.map((tool: any, index: number) => {
                  const compatibility = calculateToolCompatibility(tool, selectedFeatures);
                  const isEnabled = compatibility.compatible;

                  return (
                    <tr
                      key={tool.name || index}
                      style={{
                        opacity: isEnabled ? 1 : 0.5,
                        backgroundColor: isEnabled ? 'transparent' : '#f9f9f9'
                      }}
                    >
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        fontWeight: isEnabled ? 'normal' : '300'
                      }}>
                        {tool.name}
                      </td>
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        fontWeight: isEnabled ? 'normal' : '300'
                      }}>
                        {tool.name.includes('track') ? 'Track Analysis' :
                         tool.name.includes('viewport') ? 'Visualization' :
                         tool.name.includes('word') ? 'Text Processing' :
                         tool.name.includes('color') ? 'Styling' : 'General'}
                      </td>
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          color: isEnabled ? '#28a745' : '#6c757d',
                          fontWeight: 'bold'
                        }}>
                          {isEnabled ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                      </td>
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {compatibility.matchingParams}
                      </td>
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {compatibility.totalParams}
                      </td>
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid #eee',
                        fontSize: '12px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <span title={generateSchemaSummary(tool.inputSchema)}>
                          {generateSchemaSummary(tool.inputSchema)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer with summary */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #ddd',
            fontSize: '12px',
            color: '#6c757d'
          }}>
            <div>Total: {toolsData.tools.length} tools | Enabled: {toolsData.tools.filter((tool: any) => calculateToolCompatibility(tool, selectedFeatures).compatible).length}</div>
            <div style={{ marginTop: '4px' }}>
              * = required parameter | Schema shows parameter names and requirements
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EnhancedInteractive: Story = {
  render: () => <EnhancedInteractiveDemo />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Interactive demonstration with real OutlineView integration and dynamic tool filtering based on feature selection. Select features to see tools automatically enabled/disabled based on compatibility.'
      }
    }
  }
};