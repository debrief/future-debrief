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
    showAll: {
      control: 'boolean',
      description: 'When true, shows all tools regardless of filtering. When false, shows only applicable tools.',
    },
    showDescriptions: {
      control: 'boolean',
      description: 'When true, shows tool descriptions in dropdown. When false, shows only names.',
    },
    onCommandExecute: { action: 'command-execute' },
  },
};

export default meta;

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
            "default": 10.0,
            "examples": [5.0, 10.0, 15.0, 20.0],
            "minimum": 0.0
          }
        },
        "required": ["track_feature"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/track_speed_filter/tool.json"
    },
    {
      "name": "track_speed_filter_fast",
      "description": "Filter track timestamps using pre-calculated speeds array for fast processing.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "track_feature": {
            "description": "A Track feature conforming to shared-types Track schema, with additional required 'speeds' array in properties",
            "examples": [{
              "geometry": { "coordinates": [[0, 0], [0.01, 0.01], [0.02, 0.02]], "type": "LineString" },
              "id": "track_fast_001",
              "properties": {
                "dataType": "track",
                "timestamps": ["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z", "2023-01-01T10:02:00Z"],
                "speeds": [15.2, 18.7, 12.3],
                "name": "High Speed Track",
                "description": "Track with pre-calculated speeds"
              },
              "type": "Feature"
            }]
          },
          "min_speed": {
            "type": "number",
            "description": "Minimum speed threshold in knots",
            "default": 10.0,
            "examples": [5.0, 10.0, 15.0, 20.0],
            "minimum": 0.0
          }
        },
        "required": ["track_feature"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/track_speed_filter_fast/tool.json"
    },
    {
      "name": "toggle_first_feature_color",
      "description": "Toggle the color property of the first feature in a GeoJSON FeatureCollection.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "feature_collection": {
            "description": "A GeoJSON FeatureCollection object conforming to the Debrief FeatureCollection schema",
            "examples": [{
              "features": [{
                "geometry": { "coordinates": [0, 0], "type": "Point" },
                "id": "feature_001",
                "properties": { "color": "red", "dataType": "point" },
                "type": "Feature"
              }],
              "type": "FeatureCollection"
            }]
          }
        },
        "required": ["feature_collection"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/toggle_first_feature_color/tool.json"
    },
    {
      "name": "word_count",
      "description": "Count the number of words in a given block of text.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "The input text block to count words from",
            "examples": ["Hello world", "This is a longer text with multiple words to count", "", "Single"],
            "minLength": 0
          }
        },
        "required": ["text"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/word_count/tool.json"
    },
    {
      "name": "viewport_grid_generator",
      "description": "Generate a grid of points within a viewport area at specified intervals.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "viewport_state": {
            "description": "Viewport state containing bounds as [west, south, east, north] in decimal degrees",
            "examples": [
              { "bounds": [-1.0, -1.0, 1.0, 1.0] },
              { "bounds": [-122.5, 37.7, -122.3, 37.9] },
              { "bounds": [0.0, 50.0, 2.0, 52.0] }
            ]
          },
          "lat_interval": {
            "type": "number",
            "description": "Latitude interval between grid points in decimal degrees",
            "examples": [0.1, 0.5, 1.0],
            "exclusiveMinimum": 0.0
          },
          "lon_interval": {
            "type": "number",
            "description": "Longitude interval between grid points in decimal degrees",
            "examples": [0.1, 0.5, 1.0],
            "exclusiveMinimum": 0.0
          }
        },
        "required": ["viewport_state", "lat_interval", "lon_interval"],
        "additionalProperties": false
      },
      "tool_url": "/api/tools/viewport_grid_generator/tool.json"
    },
    {
      "name": "fit_to_selection",
      "description": "Calculate bounds of features and set viewport to fit them.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "features": {
            "type": "array",
            "description": "Array of Debrief features to calculate bounds for",
            "examples": [[{
              "geometry": { "coordinates": [[0, 0], [1, 1]], "type": "LineString" },
              "id": "track-001",
              "properties": { "dataType": "track" },
              "type": "Feature"
            }]],
            "items": {
              "anyOf": [
                { "$ref": "#/$defs/DebriefTrackFeature" },
                { "$ref": "#/$defs/DebriefPointFeature" },
                { "$ref": "#/$defs/DebriefAnnotationFeature" }
              ]
            }
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
const mockTrackFeature: DebriefFeature = {
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
};

const mockPointFeature: DebriefFeature = {
  type: 'Feature',
  id: 'point-001',
  geometry: {
    type: 'Point',
    coordinates: [0.5, 0.5]
  },
  properties: {
    dataType: 'reference-point',
    name: 'Reference Point',
    time: '2023-01-01T10:00:00Z'
  }
};

const mockZoneFeature: DebriefFeature = {
  type: 'Feature',
  id: 'zone-001',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
  },
  properties: {
    dataType: 'zone',
    name: 'Test Zone'
  }
};

// Empty tool list for testing edge cases
const emptyToolList: ToolListResponse = {
  tools: [],
  version: "1.0.0",
  description: "Empty tool collection"
};

// Single tool for minimal testing
const singleToolList: ToolListResponse = {
  tools: [toolIndexData.tools[3]], // word_count tool - no required feature parameters
  version: "1.0.0",
  description: "Single tool collection"
};

type Story = StoryObj<typeof ToolExecuteButton>;

// Story 1: Default State (Phase 1)
export const DefaultPhase1: Story = {
  args: {
    toolList: toolIndexData,
    selectedFeatures: [],
    onCommandExecute: (command) => console.log('Command executed:', command),
    enableSmartFiltering: false,
  },
};

// Story 2: Empty Tools
export const EmptyTools: Story = {
  args: {
    toolList: emptyToolList,
    selectedFeatures: [],
    onCommandExecute: (command) => console.log('Command executed:', command),
  },
};

// Story 3: Single Tool
export const SingleTool: Story = {
  args: {
    toolList: singleToolList,
    selectedFeatures: [],
    onCommandExecute: (command) => console.log('Command executed:', command),
  },
};

// Story 4: Real Data (Phase 1)
export const RealDataPhase1 = () => (
  <ToolExecuteButton
    toolList={toolIndexData}
    selectedFeatures={[mockTrackFeature, mockPointFeature]}
    onCommandExecute={(command) => console.log('Command executed:', command)}
    enableSmartFiltering={false}
    buttonText="Run Tools"
  />
);

// Story 5: Smart Filtering Enabled
export const SmartFilteringEnabled = () => (
  <ToolExecuteButton
    toolList={toolIndexData}
    selectedFeatures={[mockTrackFeature]}
    onCommandExecute={(command) => console.log('Command executed:', command)}
    enableSmartFiltering={true}
    buttonText="Execute Filtered Tools"
  />
);

// Story 6: Mixed Feature Selection
export const MixedFeatureSelection = () => (
  <ToolExecuteButton
    toolList={toolIndexData}
    selectedFeatures={[mockTrackFeature, mockPointFeature, mockZoneFeature]}
    onCommandExecute={(command) => console.log('Command executed:', command)}
    enableSmartFiltering={true}
  />
);

// Story 7: No Features Selected (Phase 2)
export const NoFeaturesSelectedPhase2 = () => (
  <ToolExecuteButton
    toolList={toolIndexData}
    selectedFeatures={[]}
    onCommandExecute={(command) => console.log('Command executed:', command)}
    enableSmartFiltering={true}
    buttonText="Smart Filter Tools"
  />
);

// Story 8: Filter Warnings Demo - features that don't match any tool requirements
export const FilterWarningsDemo = () => {
  const incompatibleFeature: DebriefFeature = {
    type: 'Feature',
    id: 'incompatible-001',
    geometry: {
      type: 'Point',
      coordinates: [0, 0]
    },
    properties: {
      dataType: 'annotation', // This might not match tool requirements perfectly
      name: 'Incompatible Feature'
    }
  };

  return (
    <ToolExecuteButton
      toolList={toolIndexData}
      selectedFeatures={[incompatibleFeature]}
      onCommandExecute={(command) => console.log('Command executed:', command)}
      enableSmartFiltering={true}
      buttonText="Filter with Warnings"
    />
  );
};

// Story 9: Menu Position Tests - Top
export const MenuPositionTop = () => (
  <div style={{ marginTop: '200px', padding: '20px' }}>
    <p>Menu opens upward (top positioning)</p>
    <ToolExecuteButton
      toolList={toolIndexData}
      selectedFeatures={[mockTrackFeature]}
      onCommandExecute={(command) => console.log('Command executed:', command)}
      menuPosition="top"
      buttonText="Menu Opens Up"
    />
  </div>
);

// Story 10: Menu Position Tests - Bottom (default)
export const MenuPositionBottom = () => (
  <div style={{ padding: '20px' }}>
    <p>Menu opens downward (bottom positioning - default)</p>
    <ToolExecuteButton
      toolList={toolIndexData}
      selectedFeatures={[mockTrackFeature]}
      onCommandExecute={(command) => console.log('Command executed:', command)}
      menuPosition="bottom"
      buttonText="Menu Opens Down"
    />
  </div>
);

// Story 11: Disabled State
export const DisabledState = () => (
  <ToolExecuteButton
    toolList={toolIndexData}
    selectedFeatures={[mockTrackFeature]}
    onCommandExecute={(command) => console.log('Command executed:', command)}
    disabled={true}
    buttonText="Disabled Button"
  />
);

// Story 12: Interaction Demo - Shows difference between Phase 1 and Phase 2
export const InteractionDemo = () => {
  const [enableSmartFiltering, setEnableSmartFiltering] = React.useState(false);
  const [selectedFeatures, setSelectedFeatures] = React.useState<DebriefFeature[]>([]);

  const handleFeatureToggle = (feature: DebriefFeature, checked: boolean) => {
    setSelectedFeatures(prev =>
      checked
        ? [...prev, feature]
        : prev.filter(f => f.id !== feature.id)
    );
  };

  const availableFeatures = [mockTrackFeature, mockPointFeature, mockZoneFeature];

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>Interactive Demo: Phase 1 vs Phase 2 Filtering</h3>

      <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <input
            type="checkbox"
            checked={enableSmartFiltering}
            onChange={(e) => setEnableSmartFiltering(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Enable Smart Filtering (Phase 2)
        </label>

        <div>
          <strong>Selected Features:</strong>
          <div style={{ marginTop: '8px' }}>
            {availableFeatures.map((feature) => (
              <label key={feature.id} style={{ display: 'block', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  checked={selectedFeatures.some(f => f.id === feature.id)}
                  onChange={(e) => handleFeatureToggle(feature, e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                {feature.properties?.name} ({feature.properties?.dataType})
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <strong>Current Mode:</strong> {enableSmartFiltering ? 'Phase 2 (Smart Filtering)' : 'Phase 1 (Show All)'}
        <br />
        <strong>Selected Features:</strong> {selectedFeatures.length} feature(s)
      </div>

      <ToolExecuteButton
        toolList={toolIndexData}
        selectedFeatures={selectedFeatures}
        onCommandExecute={(command) => console.log('Command executed:', command)}
        enableSmartFiltering={enableSmartFiltering}
        buttonText={enableSmartFiltering ? 'Smart Filter Tools' : 'All Tools'}
      />

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <strong>Instructions:</strong>
        <ul>
          <li>Toggle &quot;Enable Smart Filtering&quot; to switch between Phase 1 and Phase 2</li>
          <li>Select different features to see how Phase 2 filtering changes available tools</li>
          <li>Phase 1 shows all tools regardless of selected features</li>
          <li>Phase 2 uses ToolFilterService to show only applicable tools</li>
          <li>Check the Actions panel to see command execution events</li>
        </ul>
      </div>
    </div>
  );
};

// Story 13: VS Code Theming Integration
export const VSCodeTheming = () => (
  <div style={{ padding: '20px', background: 'var(--vscode-editor-background, #1e1e1e)', minHeight: '400px' }}>
    <h3 style={{ color: 'var(--vscode-editor-foreground, #cccccc)', marginBottom: '16px' }}>VS Code Theming Integration</h3>
    <p style={{ color: 'var(--vscode-descriptionForeground, #cccccc)', marginBottom: '20px' }}>
      ToolExecuteButton automatically adapts to VS Code themes using CSS variables.
      The component provides consistent styling that matches VS Code&apos;s UI patterns.
    </p>

    <div style={{ marginBottom: '20px' }}>
      <ToolExecuteButton
        toolList={toolIndexData}
        selectedFeatures={[mockTrackFeature]}
        onCommandExecute={(command) => console.log('Command executed:', command)}
        buttonText="VS Code Styled Button"
      />
    </div>

    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground, #cccccc)' }}>
      <strong>VS Code Integration Features:</strong>
      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
        <li>Automatic theme adaptation (dark/light modes)</li>
        <li>Consistent button styling with VS Code UI</li>
        <li>Dropdown menu with VS Code list styling</li>
        <li>Focus states and accessibility support</li>
        <li>High contrast mode support</li>
      </ul>
    </div>
  </div>
);

// Story 14: Error Handling Demo
export const ErrorHandlingDemo = () => {
  // Malformed tool list to test error handling
  const malformedToolList = {
    tools: [
      {
        name: "malformed_tool",
        description: "A tool with missing properties for testing",
        // Missing inputSchema - should be handled gracefully
      }
    ],
    version: "1.0.0"
  } as ToolListResponse; // Type assertion to bypass TypeScript checking for demo

  return (
    <div style={{ padding: '20px' }}>
      <h3>Error Handling Demo</h3>
      <p>This demonstrates how the component handles malformed tool data:</p>
      <ToolExecuteButton
        toolList={malformedToolList}
        selectedFeatures={[mockTrackFeature]}
        onCommandExecute={(command) => console.log('Command executed:', command)}
        enableSmartFiltering={true}
        buttonText="Handle Errors"
      />
    </div>
  );
};

// Interactive story that demonstrates dynamic behavior between OutlineView and ToolExecuteButton
export const InteractiveWithOutlineView = () => {
  const [plotData, setPlotData] = React.useState<DebriefFeatureCollection | null>(null);
  const [toolData, setToolData] = React.useState<ToolListResponse | null>(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = React.useState<string[]>([]);
  const [showAll, setShowAll] = React.useState(false); // Start with filtered view
  const [showDescriptions, setShowDescriptions] = React.useState(true); // Start with descriptions shown
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
  const { availableToolCount, totalToolCount } = React.useMemo(() => {
    if (!toolData) return { availableToolCount: 0, totalToolCount: 0 };

    const total = toolData.tools?.length || 0;

    try {
      const toolFilterService = new ToolFilterService();
      const toolsData = { tools: toolData.tools };
      // Always call the filter service, even with empty selectedFeatures
      // Some tools (like fit-to-selection) are applicable with no selection
      const result = toolFilterService.getApplicableTools(selectedFeatures, toolsData);
      return {
        availableToolCount: result.tools.length, // Filtered count - tools applicable to current selection
        totalToolCount: total // All tools
      };
    } catch {
      return { availableToolCount: 0, totalToolCount: total }; // On error, no tools are applicable
    }
  }, [toolData, selectedFeatures]);

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
              console.log('Visibility changed:', id, visible)
            }
            onViewFeature={(id) => console.log('View feature:', id)}
            onDeleteFeatures={(ids) => console.log('Delete features:', ids)}
            onCollapseAll={() => console.log('Collapse all')}
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

        {/* Toggle and tool execution */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showDescriptions}
                onChange={(e) => setShowDescriptions(e.target.checked)}
              />
              Show descriptions
            </label>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {showAll
                ? `Showing all ${totalToolCount} tools`
                : `Showing ${availableToolCount} applicable tools`
              }
            </span>
          </div>
          <ToolExecuteButton
            toolList={toolData}
            selectedFeatures={selectedFeatures}
            onCommandExecute={(command) => console.log('Command executed:', command)}
            enableSmartFiltering={true}
            showAll={showAll}
            showDescriptions={showDescriptions}
            buttonText={`Execute Tools (${showAll ? totalToolCount : availableToolCount} available)`}
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
            <li>Toggle "Show all" to switch between all tools vs applicable tools</li>
            <li>Toggle "Show descriptions" to hide/show tool descriptions in dropdown</li>
            <li>Use the search box in the dropdown to filter tools by name or description</li>
            <li>Watch the button update its available tool count dynamically</li>
            <li>Try selecting different combinations (tracks vs points vs zones)</li>
            <li>Check the browser console to see command execution</li>
          </ul>
        </div>
      </div>
    </div>
  );
};