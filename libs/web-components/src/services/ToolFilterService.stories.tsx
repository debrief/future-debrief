import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToolFilterService } from './ToolFilterService';
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
          <p>No results yet. Click "Run Filter" to start.</p>
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