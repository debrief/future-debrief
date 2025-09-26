import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToolExecuteButton } from './ToolExecuteButton';
import { OutlineView } from '../OutlineView/OutlineView';
import { ToolFilterService } from '../services/ToolFilterService';
import type { ToolListResponse } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { DebriefFeature, DebriefFeatureCollection } from '@debrief/shared-types';

const meta: Meta<typeof ToolExecuteButton> = {
  title: 'ToolExecuteButton',
  component: ToolExecuteButton,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    buttonText: {
      control: 'text',
    },
    menuPosition: {
      control: { type: 'select' },
      options: ['bottom', 'top'],
    },
    enableSmartFiltering: {
      control: 'boolean',
    },
    onCommandExecute: { action: 'command-execute' },
  },
};

export default meta;
type Story = StoryObj<typeof ToolExecuteButton>;

// Load tool data from the existing tool-index.json for realistic testing
const toolIndexData: ToolListResponse = {
  "tools": [
    {
      "name": "track_speed_filter",
      "description": "Find timestamps where track speed equals or exceeds a minimum threshold.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "track_feature": {
            "description": "A GeoJSON track feature conforming to DebriefTrackFeature schema with LineString or MultiLineString geometry",
            "examples": [{
              "geometry": { "coordinates": [[0, 0], [0.01, 0.01], [0.02, 0.02]], "type": "LineString" },
              "id": "track_001",
              "properties": {
                "dataType": "track",
                "timestamps": ["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z", "2023-01-01T10:02:00Z"],
                "name": "Sample Track",
                "description": "Test track for speed analysis"
              },
              "type": "Feature"
            }]
          },
          "min_speed": {
            "type": "number",
            "description": "Minimum speed threshold in knots",
            "default": 10,
            "examples": [5, 10, 15]
          }
        },
        "required": ["track_feature"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/track_speed_filter/tool.json"
    },
    {
      "name": "point_in_zone",
      "description": "Check if a point lies within a zone polygon.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "point_feature": {
            "description": "A GeoJSON point feature with Point geometry",
            "examples": [{
              "geometry": { "coordinates": [0.5, 0.5], "type": "Point" },
              "id": "point_001",
              "properties": { "dataType": "reference-point", "name": "Test Point" },
              "type": "Feature"
            }]
          },
          "zone_feature": {
            "description": "A GeoJSON zone feature with Polygon geometry",
            "examples": [{
              "geometry": { "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], "type": "Polygon" },
              "id": "zone_001",
              "properties": { "dataType": "zone", "name": "Test Zone" },
              "type": "Feature"
            }]
          }
        },
        "required": ["point_feature", "zone_feature"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/point_in_zone/tool.json"
    },
    {
      "name": "word_count",
      "description": "Count words in text input.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "Text to count words in",
            "examples": ["Hello world", "This is a test"]
          }
        },
        "required": ["text"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/word_count/tool.json"
    },
    {
      "name": "fit_to_selection",
      "description": "Fit the map view to encompass all selected features or all data if nothing is selected.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "selected_features": {
            "type": "array",
            "items": {
              "description": "Any GeoJSON feature"
            },
            "description": "Array of selected features to fit to. If empty, fits to all data.",
            "default": []
          },
          "padding": {
            "type": "number",
            "description": "Additional padding around bounds as percentage (0.1 = 10%)",
            "default": 0.1,
            "examples": [0.1, 0.05, 0.2]
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/fit_to_selection/tool.json"
    }
  ],
  "version": "1.0.0",
  "description": "ToolVault packaged tools"
};

// Mock GeoJSON features for testing
const mockFeatures: DebriefFeature[] = [
  {
    type: 'Feature',
    id: 'track-001',
    geometry: {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1], [2, 2]]
    },
    properties: {
      dataType: 'track',
      name: 'Sample Track',
      timestamps: ['2023-01-01T10:00:00Z', '2023-01-01T10:01:00Z', '2023-01-01T10:02:00Z']
    }
  },
  {
    type: 'Feature',
    id: 'point-001',
    geometry: {
      type: 'Point',
      coordinates: [0.5, 0.5]
    },
    properties: {
      dataType: 'reference-point',
      name: 'Reference Point A',
      time: '2023-01-01T10:00:00Z'
    }
  },
  {
    type: 'Feature',
    id: 'point-002',
    geometry: {
      type: 'Point',
      coordinates: [1.5, 1.5]
    },
    properties: {
      dataType: 'reference-point',
      name: 'Reference Point B',
      time: '2023-01-01T11:00:00Z'
    }
  },
  {
    type: 'Feature',
    id: 'zone-001',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    },
    properties: {
      dataType: 'zone',
      name: 'Test Zone Alpha'
    }
  },
  {
    type: 'Feature',
    id: 'zone-002',
    geometry: {
      type: 'Polygon',
      coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]]
    },
    properties: {
      dataType: 'zone',
      name: 'Test Zone Beta'
    }
  }
];

// Interaction Demo with Phase 2 Logic
export const InteractionDemo = () => {
  const [enableSmartFiltering, setEnableSmartFiltering] = React.useState(true);
  const [selectedFeatureIds, setSelectedFeatureIds] = React.useState<string[]>(['track-001']); // Start with one feature selected

  // Get selected features based on IDs
  const selectedFeatures = React.useMemo(() => {
    return mockFeatures.filter(feature =>
      selectedFeatureIds.includes(String(feature.id))
    );
  }, [selectedFeatureIds]);

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatureIds(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
      {/* Left side - Feature selection */}
      <div style={{ flex: '1', border: '1px solid #ccc', borderRadius: '4px', padding: '15px' }}>
        <h3>Sample Features</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Select features to test filtering behavior:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mockFeatures.map(feature => (
            <label key={feature.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={selectedFeatureIds.includes(String(feature.id))}
                onChange={() => handleFeatureToggle(String(feature.id))}
              />
              <span style={{ fontWeight: 'bold' }}>{feature.properties?.name}</span>
              <span style={{ color: '#666', fontSize: '12px' }}>({feature.properties?.dataType})</span>
            </label>
          ))}
        </div>

        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#f8f8f8',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Selected:</strong> {selectedFeatures.length} feature(s)
          {selectedFeatures.length > 0 && (
            <ul style={{ margin: '5px 0 0 0', paddingLeft: '15px' }}>
              {selectedFeatures.map(feature => (
                <li key={feature.id}>{feature.properties?.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right side - ToolExecuteButton controls */}
      <div style={{ flex: '1', border: '1px solid #ccc', borderRadius: '4px', padding: '15px' }}>
        <h3>Interactive ToolExecuteButton Demo</h3>
        <p style={{ marginBottom: '20px', fontSize: '14px' }}>
          This demonstrates the ToolExecuteButton with Phase 2 smart filtering capabilities and all toggles.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={enableSmartFiltering}
                onChange={(e) => setEnableSmartFiltering(e.target.checked)}
              />
              Enable Smart Filtering
            </label>
          </div>

          <ToolExecuteButton
            toolList={toolIndexData}
            selectedFeatures={selectedFeatures}
            onCommandExecute={(command) => console.warn('Command executed:', command)}
            enableSmartFiltering={enableSmartFiltering}
            buttonText="Execute Tools"
          />
        </div>

        <div style={{
          background: '#f0f0f0',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Features demonstrated:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li><strong>Feature Selection:</strong> Check/uncheck features to see filtering effects</li>
            <li><strong>Smart Filtering:</strong> Toggle Phase 1 vs Phase 2 behavior</li>
            <li><strong>Internal Toggle Buttons:</strong> Use the 🔍 and 📝 icons in the dropdown to control filtering and descriptions</li>
            <li><strong>Search Box:</strong> Filter tools by name or description (appears when dropdown opens)</li>
            <li><strong>Live Updates:</strong> Toggle buttons update the dropdown immediately without closing it</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Interactive story that demonstrates dynamic behavior between OutlineView and ToolExecuteButton
export const InteractiveWithOutlineView = () => {
  const [plotData, setPlotData] = React.useState<DebriefFeatureCollection | null>(null);
  const [toolData, setToolData] = React.useState<ToolListResponse | null>(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load data on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [plotResponse, toolsResponse] = await Promise.all([
          fetch('/large-sample.plot.json'),
          fetch('/tool-index.json')
        ]);

        if (!plotResponse.ok) throw new Error(`Failed to load plot data: ${plotResponse.statusText}`);
        if (!toolsResponse.ok) throw new Error(`Failed to load tools data: ${toolsResponse.statusText}`);

        const plotJson = await plotResponse.json();
        const toolsJson = await toolsResponse.json();

        setPlotData(plotJson);
        setToolData(toolsJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get selected features based on IDs
  const selectedFeatures = React.useMemo(() => {
    if (!plotData || !selectedFeatureIds.length) return [];

    return plotData.features.filter(feature =>
      selectedFeatureIds.includes(String(feature.id))
    ) as DebriefFeature[];
  }, [plotData, selectedFeatureIds]);

  // Get tool counts for display
  const totalToolCount = React.useMemo(() => {
    return toolData?.tools?.length || 0;
  }, [toolData]);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>Loading Interactive Demo...</h3>
        <p>Loading plot data and tool definitions...</p>
      </div>
    );
  }

  if (error || !plotData || !toolData) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>Error Loading Data</h3>
        <p>Failed to load required data files: {error}</p>
        <p>Make sure large-sample.plot.json and tool-index.json are available in the public folder.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px', height: '600px' }}>
      {/* Left side - OutlineView */}
      <div style={{ flex: '1', border: '1px solid #ccc', borderRadius: '4px', padding: '10px' }}>
        <h3>Feature Selection (OutlineView)</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          Select features to see how the ToolExecuteButton updates
        </p>
        <div style={{
          height: '500px',
          overflow: 'auto',
          backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
          color: 'var(--vscode-editor-foreground, #cccccc)',
          fontFamily: 'var(--vscode-font-family, "Segoe UI", system-ui, sans-serif)',
          borderRadius: '4px'
        }}>
          <OutlineView
            featureCollection={plotData}
            selectedFeatureIds={selectedFeatureIds}
            onSelectionChange={setSelectedFeatureIds}
            onFeatureVisibilityChange={(id, visible) =>
              console.warn('Visibility changed:', id, visible)
            }
            onViewFeature={(id) => console.warn('View feature:', id)}
            onDeleteFeatures={(ids) => console.warn('Delete features:', ids)}
            onCollapseAll={() => console.warn('Collapse all')}
          />
        </div>
      </div>

      {/* Right side - ToolExecuteButton with status */}
      <div style={{ flex: '1', border: '1px solid #ccc', borderRadius: '4px', padding: '10px' }}>
        <h3>Dynamic Tool Execution</h3>

        {/* Status display */}
        <div style={{
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <p><strong>Selected Features:</strong> {selectedFeatures.length}</p>
          {selectedFeatures.length > 0 && (
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              {selectedFeatures.slice(0, 5).map(feature => (
                <li key={feature.id}>
                  {feature.properties?.name || feature.id} ({feature.properties?.dataType})
                </li>
              ))}
              {selectedFeatures.length > 5 && (
                <li>... and {selectedFeatures.length - 5} more</li>
              )}
            </ul>
          )}
        </div>

        {/* Tool execution */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {totalToolCount} tools available (use toggle buttons in dropdown to control display)
            </span>
          </div>
          <ToolExecuteButton
            toolList={toolData}
            selectedFeatures={selectedFeatures}
            onCommandExecute={(command) => console.warn('Command executed:', command)}
            enableSmartFiltering={true}
            buttonText={`Execute Tools (${totalToolCount} available)`}
          />
        </div>

        {/* Instructions */}
        <div style={{
          background: '#e8f4fd',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Instructions:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Select/deselect features in the OutlineView</li>
            <li>Click the ToolExecuteButton to open the dropdown</li>
            <li>Use the 🔍 toggle button to switch between all tools vs applicable tools</li>
            <li>Use the 📝 toggle button to hide/show tool descriptions</li>
            <li>Use the search box in the dropdown to filter tools by name or description</li>
            <li>Try selecting different combinations (tracks vs points vs zones)</li>
            <li>Check the browser console to see command execution</li>
          </ul>
        </div>
      </div>
    </div>
  );
};