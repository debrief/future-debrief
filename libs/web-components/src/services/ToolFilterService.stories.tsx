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
  toolName: string;
}

const ToolFilterDemo: React.FC<ToolFilterDemoProps> = ({ features, toolIndex, toolName }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<DebriefFeature[]>([]);
  const [filterService] = useState(() => new ToolFilterService());
  const [result, setResult] = useState<ReturnType<ToolFilterService['getApplicableTools']> | null>(null);
  const [cacheStats, setCacheStats] = useState<ReturnType<ToolFilterService['getCacheStats']> | null>(null);

  // Mock the extractToolsFromIndex method to return our predefined tools
  useEffect(() => {
    // Override the private method for demo purposes
    (filterService as any).extractToolsFromIndex = () => {
      return toolName in mockTools ? [mockTools[toolName]] : [mockTools['track-analyzer']];
    };
  }, [filterService, toolName]);

  useEffect(() => {
    if (selectedFeatures.length >= 0) {
      const filterResult = filterService.getApplicableTools(selectedFeatures, toolIndex);
      setResult(filterResult);
      setCacheStats(filterService.getCacheStats());
    }
  }, [selectedFeatures, toolIndex, filterService]);

  const handleFeatureToggle = (feature: DebriefFeature) => {
    setSelectedFeatures(prev => {
      const featureId = 'id' in feature ? feature.id : Math.random().toString();
      const exists = prev.some(f => ('id' in f ? f.id : Math.random()) === featureId);

      if (exists) {
        return prev.filter(f => ('id' in f ? f.id : Math.random()) !== featureId);
      } else {
        return [...prev, feature];
      }
    });
  };

  const clearCache = () => {
    filterService.clearCache();
    setCacheStats(filterService.getCacheStats());
  };

  const clearExpiredCache = () => {
    filterService.clearExpiredCache();
    setCacheStats(filterService.getCacheStats());
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>ToolFilterService Interactive Demo</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Tool Index Information</h3>
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          <strong>Tool:</strong> {toolIndex.tool_name}<br />
          <strong>Description:</strong> {toolIndex.description}<br />
          <strong>Stats:</strong> {toolIndex.stats.sample_inputs_count} samples, {toolIndex.stats.git_commits_count} commits
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Available Features ({features.length})</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {features.map((feature, index) => {
            const featureId = 'id' in feature ? feature.id : `feature-${index}`;
            const isSelected = selectedFeatures.some(f => ('id' in f ? f.id : `feature-${index}`) === featureId);
            const featureName = feature.properties && typeof feature.properties === 'object' && 'name' in feature.properties
              ? String(feature.properties.name)
              : `${feature.geometry?.type || 'Unknown'} ${index + 1}`;

            return (
              <label key={index} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleFeatureToggle(feature)}
                  style={{ marginRight: '8px' }}
                />
                <strong>{featureName}</strong> ({feature.geometry?.type})
                {feature.properties && typeof feature.properties === 'object' && 'dataType' in feature.properties && (
                  <em> - {String(feature.properties.dataType)}</em>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Selected Features ({selectedFeatures.length})</h3>
        {selectedFeatures.length === 0 ? (
          <p><em>No features selected</em></p>
        ) : (
          <ul>
            {selectedFeatures.map((feature, index) => {
              const featureName = feature.properties && typeof feature.properties === 'object' && 'name' in feature.properties
                ? String(feature.properties.name)
                : `Feature ${index + 1}`;
              return (
                <li key={index}>
                  <strong>{featureName}</strong> ({feature.geometry?.type})
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {result && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Filter Results</h3>

          <div style={{ marginBottom: '10px' }}>
            <h4>Applicable Tools ({result.tools.length})</h4>
            {result.tools.length === 0 ? (
              <p><em>No applicable tools found</em></p>
            ) : (
              <ul>
                {result.tools.map((tool, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    <strong>{tool.name}</strong>: {tool.description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <h4>Warnings ({result.warnings.length})</h4>
              <ul style={{ color: '#ff8800' }}>
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <h4>Errors ({result.errors.length})</h4>
              <ul style={{ color: '#cc0000' }}>
                {result.errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {cacheStats && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Cache Statistics</h3>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
            <strong>Total entries:</strong> {cacheStats.size}<br />
            <strong>Valid entries:</strong> {cacheStats.validEntries}<br />
            <strong>Expired entries:</strong> {cacheStats.expiredEntries}<br />
            <div style={{ marginTop: '10px' }}>
              <button onClick={clearCache} style={{ marginRight: '10px' }}>
                Clear All Cache
              </button>
              <button onClick={clearExpiredCache}>
                Clear Expired Cache
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3>Instructions</h3>
        <p>
          1. Select features from the list above to see which tools can process them.<br />
          2. The filter service uses validation matrix logic to match features with tool requirements.<br />
          3. Cache statistics show how the service optimizes repeated queries.<br />
          4. Different tool types have different feature requirements - experiment with selections!
        </p>
      </div>
    </div>
  );
};

// Create sample features for demonstration
const createSampleFeatures = (): DebriefFeature[] => [
  // Track feature
  {
    type: 'Feature',
    id: 'vessel-track-1',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1.0, 52.0],
        [-1.1, 52.1],
        [-1.2, 52.2],
        [-1.3, 52.3]
      ]
    },
    properties: {
      dataType: 'track',
      name: 'HMS Victory Track',
      timestamps: [
        '2024-01-01T00:00:00Z',
        '2024-01-01T00:15:00Z',
        '2024-01-01T00:30:00Z',
        '2024-01-01T00:45:00Z'
      ]
    }
  },
  // Point feature
  {
    type: 'Feature',
    id: 'reference-point-1',
    geometry: {
      type: 'Point',
      coordinates: [-1.15, 52.15]
    },
    properties: {
      dataType: 'reference-point',
      name: 'Navigation Buoy',
      timestamp: '2024-01-01T00:30:00Z'
    }
  },
  // Multi-LineString track
  {
    type: 'Feature',
    id: 'patrol-route',
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [[-1.5, 52.0], [-1.6, 52.1]],
        [[-1.7, 52.2], [-1.8, 52.3]]
      ]
    },
    properties: {
      dataType: 'track',
      name: 'Patrol Route Alpha',
      timestamps: [
        '2024-01-01T01:00:00Z',
        '2024-01-01T01:15:00Z'
      ]
    }
  },
  // Annotation/Zone
  {
    type: 'Feature',
    id: 'search-zone',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-1.0, 52.0],
        [-1.2, 52.0],
        [-1.2, 52.2],
        [-1.0, 52.2],
        [-1.0, 52.0]
      ]]
    },
    properties: {
      dataType: 'zone',
      name: 'Search Area Bravo',
      color: '#FF0000',
      annotationType: 'area'
    }
  }
];

const meta: Meta<typeof ToolFilterDemo> = {
  title: 'Services/ToolFilterService',
  component: ToolFilterDemo,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Story for track analysis tool
export const TrackAnalyzer: Story = {
  args: {
    features: createSampleFeatures(),
    toolIndex: createMockToolIndex('track-analyzer', 'Analyzes vessel tracks for speed, bearing, and anomalies'),
    toolName: 'track-analyzer'
  },
};

// Story for point processing tool
export const PointProcessor: Story = {
  args: {
    features: createSampleFeatures(),
    toolIndex: createMockToolIndex('point-processor', 'Processes individual points for location validation'),
    toolName: 'point-processor'
  },
};

// Story for multi-feature tool
export const MultiFeatureCorrelator: Story = {
  args: {
    features: createSampleFeatures(),
    toolIndex: createMockToolIndex('multi-feature-correlator', 'Correlates multiple features for spatial-temporal analysis'),
    toolName: 'multi-feature-correlator'
  },
};

// Story for zone analysis tool
export const ZoneAnalyzer: Story = {
  args: {
    features: createSampleFeatures(),
    toolIndex: createMockToolIndex('zone-analyzer', 'Analyzes polygon zones and areas'),
    toolName: 'zone-analyzer'
  },
};

// Story with real data from large-sample.plot.json (if available)
const WithRealDataComponent: React.FC = () => {
    const [realFeatures, setRealFeatures] = useState<DebriefFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      // Try to load real data from large-sample.plot.json
      fetch('/large-sample.plot.json')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load sample data');
          }
          return response.json();
        })
        .then((data: DebriefFeatureCollection) => {
          setRealFeatures(data.features || []);
          setLoading(false);
        })
        .catch(err => {
          console.warn('Could not load real data, using sample data:', err);
          setRealFeatures(createSampleFeatures());
          setError('Using sample data (could not load large-sample.plot.json)');
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
            color: '#856404',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
        <ToolFilterDemo
          features={realFeatures.slice(0, 10)} // Limit to first 10 for performance
          toolIndex={createMockToolIndex('maritime-analyzer', 'Advanced maritime analysis tool for real operational data')}
          toolName='track-analyzer'
        />
      </div>
    );
};

export const WithRealData: Story = {
  render: () => <WithRealDataComponent />,
};

// Story demonstrating caching behavior
const CachingDemoComponent: React.FC = () => {
  const [features] = useState(createSampleFeatures());
  const [toolIndex] = useState(createMockToolIndex('caching-demo', 'Tool to demonstrate caching behavior'));

  return (
      <div style={{ padding: '20px' }}>
        <div style={{
          backgroundColor: '#e1f5fe',
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          <h3>Caching Demonstration</h3>
          <p>
            This demo shows how the ToolFilterService caches results for improved performance.
            Try selecting the same combination of features multiple times and observe the cache statistics.
          </p>
        </div>
        <ToolFilterDemo
          features={features}
          toolIndex={toolIndex}
          toolName='track-analyzer'
        />
      </div>
    );
};

export const CachingDemo: Story = {
  render: () => <CachingDemoComponent />,
};