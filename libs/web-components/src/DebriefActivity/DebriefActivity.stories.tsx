import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DebriefActivity } from './DebriefActivity';
import type { DebriefActivityProps } from './DebriefActivity';

// Import VS Code Elements styles
import '@vscode-elements/elements/dist/vscode-table';
import '@vscode-elements/elements/dist/vscode-tree';
import '@vscode-elements/elements/dist/bundled';

const meta: Meta<typeof DebriefActivity> = {
  title: 'Components/DebriefActivity',
  component: DebriefActivity,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DebriefActivity>;

const mockTimeState = {
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T12:00:00Z',
  current: '2024-01-01T06:00:00Z',
};

const mockFeatureCollection = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'track-1',
      geometry: {
        type: 'LineString' as const,
        coordinates: [[0, 0], [1, 1]],
      },
      properties: {
        name: 'Track 1',
        visible: true,
      },
    },
  ],
};

const mockToolList = {
  root: [],
  version: '1.0.0',
  description: 'Sample tools',
};

const mockCurrentState = {
  editorId: 'editor-1',
  filename: 'test.plot.json',
  editorState: {
    timeState: mockTimeState,
    featureCollection: mockFeatureCollection,
    selectionState: { selectedIds: [] },
    viewportState: { bounds: [0, 0, 1, 1], zoom: 10 },
  },
  historyCount: 5,
};

export const Default: Story = {
  args: {
    timeState: mockTimeState,
    featureCollection: mockFeatureCollection,
    selectedFeatureIds: [],
    toolList: mockToolList,
    currentState: mockCurrentState,
    selectedFeatureProperties: [],
    onTimeChange: (time: string) => console.warn('Time changed:', time),
    onSelectionChange: (ids: string[]) => console.warn('Selection changed:', ids),
  } as DebriefActivityProps,
};

export const WithLargeSample: Story = {
  render: () => {
    const [largeSampleData, setLargeSampleData] = React.useState<any>(null);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [currentTime, setCurrentTime] = React.useState('2024-11-14T22:00:00Z');

    React.useEffect(() => {
      fetch('/large-sample.plot.json')
        .then(res => res.json())
        .then(data => setLargeSampleData(data))
        .catch(err => console.error('Failed to load large-sample.plot.json:', err));
    }, []);

    if (!largeSampleData) {
      return <div style={{ padding: '20px', color: 'white' }}>Loading large sample data...</div>;
    }

    const timeState = {
      start: '2024-11-14T21:16:53.662Z',
      end: '2024-11-14T23:29:53.662Z',
      current: currentTime,
    };

    const currentState = {
      editorId: 'editor-1',
      filename: 'large-sample.plot.json',
      editorState: {
        timeState,
        featureCollection: largeSampleData,
        selectionState: { selectedIds },
        viewportState: { bounds: [0, 0, 1, 1], zoom: 10 },
      },
      historyCount: 0,
    };

    const selectedFeatureProperties = selectedIds.length > 0
      ? largeSampleData.features
          .filter((f: any) => selectedIds.includes(String(f.id)))
          .flatMap((f: any) =>
            Object.entries(f.properties || {}).map(([key, value]) => ({
              key,
              value: String(value),
            }))
          )
      : [];

    return (
      <DebriefActivity
        timeState={timeState}
        featureCollection={largeSampleData}
        selectedFeatureIds={selectedIds}
        toolList={mockToolList}
        currentState={currentState}
        selectedFeatureProperties={selectedFeatureProperties}
        onTimeChange={(time: string) => {
          console.warn('Time changed:', time);
          setCurrentTime(time);
        }}
        onSelectionChange={(ids: string[]) => {
          console.warn('Selection changed:', ids);
          setSelectedIds(ids);
        }}
      />
    );
  },
};
