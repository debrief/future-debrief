import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OutlineViewParent } from './OutlineViewParent';
import type { DebriefFeature, DebriefFeatureCollection } from '@debrief/shared-types';
import type { ToolListResponse } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { SelectedCommand } from '../ToolExecuteButton/ToolExecuteButton';

const meta: Meta<typeof OutlineViewParent> = {
  title: 'Components/OutlineViewParent',
  component: OutlineViewParent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The **OutlineViewParent** component combines the maritime OutlineView tree with the ToolExecuteButton action menu.

Use this composite when you need to:
- React to selection changes in OutlineView and feed them directly into tool execution
- Surface tool availability derived from maritime feature selection
- Prepare for VS Code integration by logging tool execution payloads to the console

For basic outline-only scenarios continue using **OutlineView**. For scenarios that need tool orchestration in the webview, switch to **OutlineViewParent** so tool coordination lives in a dedicated integration layer.
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof OutlineViewParent>;

const maritimeFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'track-alpha',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-4.82, 55.94],
          [-4.86, 55.97],
          [-4.9, 56.0]
        ]
      },
      properties: {
        dataType: 'track',
        name: 'Alpha Patrol Track',
        timestamps: [
          '2024-03-18T08:00:00Z',
          '2024-03-18T08:05:00Z',
          '2024-03-18T08:10:00Z'
        ],
        visible: true
      }
    },
    {
      type: 'Feature',
      id: 'track-bravo',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-4.95, 55.92],
          [-4.97, 55.95],
          [-5.01, 55.99]
        ]
      },
      properties: {
        dataType: 'track',
        name: 'Bravo Escort Track',
        timestamps: [
          '2024-03-18T08:15:00Z',
          '2024-03-18T08:20:00Z',
          '2024-03-18T08:25:00Z'
        ]
      }
    },
    {
      type: 'Feature',
      id: 'point-harbour',
      geometry: {
        type: 'Point',
        coordinates: [-4.88, 55.93]
      },
      properties: {
        dataType: 'reference-point',
        name: 'Harbour Entrance'
      }
    },
    {
      type: 'Feature',
      id: 'zone-patrol',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-4.94, 55.91],
            [-4.84, 55.91],
            [-4.84, 55.99],
            [-4.94, 55.99],
            [-4.94, 55.91]
          ]
        ]
      },
      properties: {
        dataType: 'zone',
        name: 'Patrol Box',
        visible: true
      }
    }
  ]
};

const maritimeToolList: ToolListResponse = {
  version: '1.0.0',
  description: 'Sample maritime tool catalogue',
  tools: [
    {
      name: 'track_speed_filter',
      description: 'Highlight track segments that exceed a speed threshold.',
      inputSchema: {
        type: 'object',
        properties: {
          track_feature: {
            description: 'Track feature to analyse',
            examples: ['track-alpha']
          },
          min_speed: {
            type: 'number',
            description: 'Minimum speed in knots',
            default: 12
          }
        },
        required: ['track_feature'],
        additionalProperties: false
      },
      tool_url: '/api/tools/track_speed_filter/tool.json'
    },
    {
      name: 'point_in_zone',
      description: 'Check whether a point lies inside a patrol zone polygon.',
      inputSchema: {
        type: 'object',
        properties: {
          point_feature: {
            description: 'Reference point to test'
          },
          zone_feature: {
            description: 'Zone polygon defining the allowed area'
          }
        },
        required: ['point_feature', 'zone_feature'],
        additionalProperties: false
      },
      tool_url: '/api/tools/point_in_zone/tool.json'
    },
    {
      name: 'merge_tracks',
      description: 'Combine multiple patrol tracks into a consolidated route.',
      inputSchema: {
        type: 'object',
        properties: {
          primary_track: {
            description: 'Primary track to retain metadata from'
          },
          secondary_track: {
            description: 'Additional track to merge'
          }
        },
        required: ['primary_track', 'secondary_track'],
        additionalProperties: false
      },
      tool_url: '/api/tools/merge_tracks/tool.json'
    }
  ]
};

interface OutlineViewParentDemoProps {
  initialSelection?: string[];
  initialSmartFiltering?: boolean;
  initialShowAllTools?: boolean;
  initialShowDescriptions?: boolean;
  activeToolNames?: string[];
}

const OutlineViewParentDemo: React.FC<OutlineViewParentDemoProps> = ({
  initialSelection = [],
  initialSmartFiltering = true,
  initialShowAllTools = false,
  initialShowDescriptions = true,
  activeToolNames
}) => {
  const availableToolNames = React.useMemo(
    () => maritimeToolList.tools?.map((tool) => tool.name) ?? [],
    []
  );

  const [selection, setSelection] = React.useState<string[]>(initialSelection);
  const [enableSmartFiltering, setEnableSmartFiltering] = React.useState(initialSmartFiltering);
  const [showAllTools, setShowAllTools] = React.useState(initialShowAllTools);
  const [showDescriptions, setShowDescriptions] = React.useState(initialShowDescriptions);
  const [activeTools, setActiveTools] = React.useState<string[]>(
    activeToolNames ?? availableToolNames
  );
  const [lastCommandSummary, setLastCommandSummary] = React.useState<string | null>(null);

  const filteredToolList = React.useMemo<ToolListResponse>(() => {
    if (activeTools.length === availableToolNames.length) {
      return maritimeToolList;
    }

    return {
      ...maritimeToolList,
      tools: maritimeToolList.tools?.filter((tool) => activeTools.includes(tool.name)) ?? []
    };
  }, [activeTools, availableToolNames.length]);

  const handleToolToggle = (toolName: string) => {
    setActiveTools((current) =>
      current.includes(toolName)
        ? current.filter((name) => name !== toolName)
        : [...current, toolName]
    );
  };

  const handleCommandExecute = React.useCallback(
    (command: SelectedCommand, features: DebriefFeature[]) => {
      setLastCommandSummary(`${command.tool.name} executed on ${features.length} feature(s)`);
    },
    []
  );

  return (
    <div style={{ display: 'flex', gap: '24px', height: '600px', alignItems: 'stretch' }}>
      <div
        style={{
          flex: '0 0 360px',
          minHeight: 0,
          backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
          color: 'var(--vscode-editor-foreground, #cccccc)',
          borderRadius: '8px',
          border: '1px solid var(--vscode-editorWidget-border, #3c3c3c)',
          overflow: 'hidden'
        }}
      >
        <OutlineViewParent
          featureCollection={maritimeFeatureCollection}
          toolList={filteredToolList}
          selectedFeatureIds={selection}
          onSelectionChange={setSelection}
          onCommandExecute={handleCommandExecute}
          enableSmartFiltering={enableSmartFiltering}
          showAllTools={showAllTools}
          showToolDescriptions={showDescriptions}
          additionalToolbarContent={
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              {selection.length} selected
            </span>
          }
        />
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: '#f5f5f7',
          borderRadius: '8px',
          border: '1px solid #d0d0d5',
          padding: '16px',
          overflow: 'auto'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Mock State Controller</h3>
        <p style={{ marginBottom: '16px', color: '#505050' }}>
          This panel simulates the external state manager that would normally live in the VS Code
          extension. Adjust the toggles to see how OutlineViewParent reacts. After executing a
          tool, inspect the **browser console** for the detailed payload logged by the component.
        </p>

        <section style={{ marginBottom: '20px' }}>
          <h4>Selection State</h4>
          <p>Active selection: {selection.length} feature(s)</p>
          {selection.length > 0 ? (
            <ul>
              {selection.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#777' }}>No features selected</p>
          )}
          <button
            type="button"
            style={{
              border: '1px solid #b0b0b5',
              background: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => setSelection([])}
          >
            Clear selection
          </button>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h4>Tool Configuration</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
            <label>
              <input
                type="checkbox"
                checked={enableSmartFiltering}
                onChange={(event) => setEnableSmartFiltering(event.target.checked)}
              />{' '}
              Enable smart filtering
            </label>
            <label>
              <input
                type="checkbox"
                checked={showAllTools}
                onChange={(event) => setShowAllTools(event.target.checked)}
              />{' '}
              Show all tools
            </label>
            <label>
              <input
                type="checkbox"
                checked={showDescriptions}
                onChange={(event) => setShowDescriptions(event.target.checked)}
              />{' '}
              Show tool descriptions
            </label>
          </div>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h4>Active Tools</h4>
          <p style={{ marginTop: 0, color: '#777' }}>
            Toggle tools to simulate conditional availability based on mission context.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {availableToolNames.map((toolName) => (
              <label key={toolName}>
                <input
                  type="checkbox"
                  checked={activeTools.includes(toolName)}
                  onChange={() => handleToolToggle(toolName)}
                />{' '}
                {toolName}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h4>Last Command</h4>
          {lastCommandSummary ? (
            <code style={{ display: 'inline-block', padding: '4px 8px', background: '#fff', borderRadius: '4px' }}>
              {lastCommandSummary}
            </code>
          ) : (
            <p style={{ color: '#777' }}>Execute a tool to populate this summary.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export const DefaultIntegration: Story = {
  render: () => <OutlineViewParentDemo />
};

export const SingleToolScenario: Story = {
  render: () => (
    <OutlineViewParentDemo
      activeToolNames={['track_speed_filter']}
      initialSmartFiltering={false}
      initialShowDescriptions={false}
    />
  )
};

export const ConditionalAvailability: Story = {
  render: () => (
    <OutlineViewParentDemo
      initialSelection={['point-harbour']}
      initialShowAllTools={false}
      activeToolNames={['point_in_zone', 'merge_tracks']}
    />
  )
};
