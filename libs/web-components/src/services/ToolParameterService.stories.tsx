/**
 * Storybook stories for ToolParameterService demonstration
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useMemo } from 'react';
import {
  ToolParameterService,
  StateProvider,
  ToolSchema,
  ParameterAnalysis
} from '../services/toolParameterService';
import {
  TimeState,
  ViewportState,
  EditorState,
  DebriefFeatureCollection,
  DebriefFeature,
  DebriefTrackFeature
} from '@debrief/shared-types';

// Mock state data
const mockTimeState: TimeState = {
  current: '2024-01-01T12:00:00Z',
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T23:59:59Z'
};

const mockViewportState: ViewportState = {
  bounds: [-122.5, 37.7, -122.3, 37.9]
};

const mockTrackFeature: DebriefTrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-122.4, 37.8], [-122.35, 37.85]]
  },
  properties: {
    dataType: 'track',
    name: 'Test Track',
    timestamps: ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z']
  }
};

const mockFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [mockTrackFeature]
};

// Sample tool schemas for demonstration
const toolSchemas: ToolSchema[] = [
  {
    name: 'track_speed_filter',
    description: 'Filter track by speed',
    inputSchema: {
      type: 'object',
      properties: {
        track_feature: {
          $ref: '#/$defs/DebriefTrackFeature',
          description: 'Track feature to analyze'
        },
        min_speed: {
          type: 'number',
          description: 'Minimum speed threshold',
          default: 10.0
        }
      },
      required: ['track_feature']
    }
  },
  {
    name: 'viewport_grid_generator',
    description: 'Generate grid in viewport',
    inputSchema: {
      type: 'object',
      properties: {
        viewport_state: {
          $ref: '#/$defs/ViewportState',
          description: 'Current viewport bounds'
        },
        lat_interval: {
          type: 'number',
          description: 'Latitude interval'
        },
        lon_interval: {
          type: 'number',
          description: 'Longitude interval'
        }
      },
      required: ['viewport_state', 'lat_interval', 'lon_interval']
    }
  },
  {
    name: 'select_feature_start_time',
    description: 'Set time to feature start time',
    inputSchema: {
      type: 'object',
      properties: {
        features: {
          type: 'array',
          description: 'Array of features',
          items: {
            anyOf: [
              { $ref: '#/$defs/DebriefTrackFeature' },
              { $ref: '#/$defs/DebriefPointFeature' },
              { $ref: '#/$defs/DebriefAnnotationFeature' }
            ]
          }
        },
        current_time_state: {
          $ref: '#/$defs/TimeState',
          description: 'Current time state'
        }
      },
      required: ['features', 'current_time_state']
    }
  },
  {
    name: 'word_count',
    description: 'Count words in text',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to analyze'
        }
      },
      required: ['text']
    }
  }
];

// Mock state provider
class MockStateProvider implements StateProvider {
  constructor(
    private timeState: TimeState | null = mockTimeState,
    private viewportState: ViewportState | null = mockViewportState,
    private featureCollection: DebriefFeatureCollection | null = mockFeatureCollection,
    private selectedFeatures: DebriefFeature[] = [mockTrackFeature]
  ) {}

  getTimeState(): TimeState | null {
    return this.timeState;
  }

  getViewportState(): ViewportState | null {
    return this.viewportState;
  }

  getSelectionState() {
    return null;
  }

  getEditorState(): EditorState | null {
    return null;
  }

  getFeatureCollection(): DebriefFeatureCollection | null {
    return this.featureCollection;
  }

  getSelectedFeatures(): DebriefFeature[] {
    return this.selectedFeatures;
  }
}

// Component for parameter analysis visualization
interface ParameterAnalysisProps {
  analysis: ParameterAnalysis;
}

const ParameterAnalysisDisplay: React.FC<ParameterAnalysisProps> = ({ analysis }) => (
  <div
    style={{
      border: '1px solid #ddd',
      padding: '8px',
      margin: '4px 0',
      borderRadius: '4px',
      backgroundColor: analysis.isAutoInjectable ? '#e8f5e8' : '#fff5e8'
    }}
  >
    <div style={{ fontWeight: 'bold' }}>{analysis.parameterName}</div>
    <div style={{ fontSize: '0.9em', color: '#666' }}>{analysis.description}</div>
    <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
      <span style={{
        backgroundColor: analysis.isAutoInjectable ? '#4caf50' : '#ff9800',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '3px',
        marginRight: '8px'
      }}>
        {analysis.isAutoInjectable ? 'Auto-Injectable' : 'User Input'}
      </span>
      {analysis.injectionType && (
        <span style={{
          backgroundColor: '#2196f3',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px'
        }}>
          {analysis.injectionType}
        </span>
      )}
      {analysis.defaultValue !== undefined && (
        <span style={{
          backgroundColor: '#9c27b0',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          marginLeft: '4px'
        }}>
          Default: {JSON.stringify(analysis.defaultValue)}
        </span>
      )}
    </div>
  </div>
);

// Main demonstration component
interface ToolParameterServiceDemoProps {
  stateProvider: StateProvider;
  toolSchemas: ToolSchema[];
}

const ToolParameterServiceDemo: React.FC<ToolParameterServiceDemoProps> = ({
  stateProvider,
  toolSchemas
}) => {
  const [selectedTool, setSelectedTool] = useState<ToolSchema>(toolSchemas[0]);

  // Tool-specific default parameters
  const getDefaultUserParams = (toolName: string): Record<string, any> => {
    switch (toolName) {
      case 'viewport_grid_generator':
        return { lat_interval: 0.1, lon_interval: 0.1 };
      case 'word_count':
        return { text: 'Hello world example' };
      case 'track_speed_filter':
        return {}; // Uses default value from schema
      default:
        return {};
    }
  };

  const [userParams, setUserParams] = useState<Record<string, any>>(
    getDefaultUserParams(selectedTool.name)
  );

  // Reset user params when tool changes
  React.useEffect(() => {
    setUserParams(getDefaultUserParams(selectedTool.name));
  }, [selectedTool.name]);

  const service = useMemo(() => new ToolParameterService(stateProvider), [stateProvider]);

  const analysis = useMemo(() =>
    service.analyzeToolParameters(selectedTool),
    [service, selectedTool]
  );

  const injectedParams = useMemo(() =>
    service.injectParameters(selectedTool, [mockTrackFeature], userParams),
    [service, selectedTool, userParams]
  );

  const validation = useMemo(() =>
    service.validateParameterSatisfaction(selectedTool, [mockTrackFeature], userParams),
    [service, selectedTool, userParams]
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Tool Parameter Service Demonstration</h2>

      <div style={{ marginBottom: '24px' }}>
        <h3>Select Tool</h3>
        <select
          value={selectedTool.name}
          onChange={(e) => setSelectedTool(toolSchemas.find(t => t.name === e.target.value)!)}
          style={{ padding: '8px', fontSize: '14px', width: '100%' }}
        >
          {toolSchemas.map(tool => (
            <option key={tool.name} value={tool.name}>
              {tool.name} - {tool.description}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3>Parameter Analysis</h3>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <strong>Summary:</strong> {analysis.autoInjectableCount} auto-injectable, {analysis.userInputCount} require user input
        </div>
        {analysis.parameters.map((param, index) => (
          <ParameterAnalysisDisplay key={index} analysis={param} />
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3>User Input Parameters</h3>
        {analysis.parameters.filter(p => p.requiresUserInput).map(param => (
          <div key={param.parameterName} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              {param.parameterName}:
            </label>
            <input
              type={param.parameterName.includes('interval') ? 'number' : 'text'}
              value={userParams[param.parameterName] || ''}
              onChange={(e) => setUserParams(prev => ({
                ...prev,
                [param.parameterName]: param.parameterName.includes('interval')
                  ? parseFloat(e.target.value)
                  : e.target.value
              }))}
              style={{
                padding: '6px',
                fontSize: '14px',
                width: '100%',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder={param.description}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3>Injected Parameters</h3>
        <pre style={{
          backgroundColor: '#f8f8f8',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto'
        }}>
          {JSON.stringify(injectedParams, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3>Validation</h3>
        <div style={{
          backgroundColor: validation.canExecute ? '#e8f5e8' : '#ffe8e8',
          padding: '12px',
          borderRadius: '6px',
          border: `2px solid ${validation.canExecute ? '#4caf50' : '#f44336'}`
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {validation.canExecute ? '✅ Can Execute' : '❌ Cannot Execute'}
          </div>
          {validation.missingParams.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              Missing parameters: {validation.missingParams.join(', ')}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3>Available State</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <h4>Time State</h4>
            <pre style={{ fontSize: '11px', backgroundColor: '#f8f8f8', padding: '8px' }}>
              {JSON.stringify(stateProvider.getTimeState(), null, 2)}
            </pre>
          </div>
          <div>
            <h4>Viewport State</h4>
            <pre style={{ fontSize: '11px', backgroundColor: '#f8f8f8', padding: '8px' }}>
              {JSON.stringify(stateProvider.getViewportState(), null, 2)}
            </pre>
          </div>
          <div>
            <h4>Feature Collection</h4>
            <pre style={{ fontSize: '11px', backgroundColor: '#f8f8f8', padding: '8px' }}>
              Features: {stateProvider.getFeatureCollection()?.features?.length || 0}
            </pre>
          </div>
          <div>
            <h4>Selected Features</h4>
            <pre style={{ fontSize: '11px', backgroundColor: '#f8f8f8', padding: '8px' }}>
              Selected: {stateProvider.getSelectedFeatures().length}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof ToolParameterServiceDemo> = {
  title: 'Services/ToolParameterService',
  component: ToolParameterServiceDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
This story demonstrates the ToolParameterService, which automatically analyzes tool schemas
and injects context/state parameters based on \`$ref\` patterns in JSON schemas.

**Key Features:**
- **Automatic Parameter Detection**: Identifies which parameters can be auto-injected vs require user input
- **State Provider Integration**: Injects current editor state (time, viewport, features, etc.)
- **Schema-Driven**: Uses JSON schema \`$ref\` patterns to determine injection types
- **Validation**: Ensures all required parameters can be satisfied before execution

**Injection Patterns:**
- \`#/$defs/ViewportState\` → Current viewport bounds
- \`#/$defs/TimeState\` → Current time state
- \`#/$defs/DebriefTrackFeature\` → Selected track feature
- \`#/$defs/DebriefFeatureCollection\` → Complete feature collection
- Array with feature type refs → Selected features array
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof ToolParameterServiceDemo>;

export const BasicDemo: Story = {
  args: {
    stateProvider: new MockStateProvider(),
    toolSchemas: toolSchemas
  }
};

export const WithoutState: Story = {
  args: {
    stateProvider: new MockStateProvider(null, null, null, []),
    toolSchemas: toolSchemas
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates behavior when no state is available - shows validation failures for auto-injectable parameters.'
      }
    }
  }
};

export const UserInputOnly: Story = {
  args: {
    stateProvider: new MockStateProvider(),
    toolSchemas: [toolSchemas.find(t => t.name === 'word_count')!]
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a tool that requires only user input parameters (no auto-injection).'
      }
    }
  }
};

export const FullyAutoInjectable: Story = {
  args: {
    stateProvider: new MockStateProvider(),
    toolSchemas: [toolSchemas.find(t => t.name === 'select_feature_start_time')!]
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a tool that can be fully auto-injected without any user input.'
      }
    }
  }
};