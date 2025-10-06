import type { Meta, StoryObj } from '@storybook/react';
import { Track } from './Track';
import { MapContainer, TileLayer } from 'react-leaflet';
import plot from '../../../../../apps/vs-code/workspace/large-sample.plot.json';
import { GeoJSONFeature } from '../MapComponent';
import { DebriefTrackFeature, TimeState } from '@debrief/shared-types';

const meta: Meta<typeof Track> = {
  title: 'Map/Track',
  component: Track,
  decorators: [
    (Story) => (
      <MapContainer center={[36.0, -5.0]} zoom={8} style={{ height: '500px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Story />
      </MapContainer>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const trackFeature = plot.features.find(
  (f) => f.properties?.dataType === 'track' && f.geometry.type === 'LineString'
) as GeoJSONFeature;

const timestamps = (trackFeature.properties as any)?.timestamps as string[];
const startTime = new Date(timestamps[0]).getTime();
const endTime = new Date(timestamps[timestamps.length - 1]).getTime();
const timeRange = endTime - startTime; // Total duration in milliseconds

// Create a continuous time control with reasonable granularity
const timeStepMinutes = 1; // 1 minute steps
const timeStepMs = timeStepMinutes * 60 * 1000;
const totalSteps = Math.floor(timeRange / timeStepMs);

const timeState: TimeState = {
  current: timestamps[0],
  start: new Date(startTime).toISOString(),
  end: new Date(endTime).toISOString(),
};

export const Default: Story = {
  args: {
    feature: trackFeature,
    selectedFeatureIds: [],
    onSelectionChange: (ids: (string | number)[]) => console.warn('Selection changed:', ids),
    timeState: timeState,
  },
  parameters: {
    chromatic: { disable: true },
  },
};

interface SelectionToggleArgs {
  feature: GeoJSONFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  timeState?: TimeState;
  'Selected'?: boolean;
}

export const Selected: StoryObj<SelectionToggleArgs> = {
  args: {
    feature: trackFeature,
    selectedFeatureIds: [],
    onSelectionChange: (ids: (string | number)[]) => console.warn('Selection changed:', ids),
    timeState: timeState,
    'Selected': true,
  },
  argTypes: {
    'Selected': {
      control: 'boolean',
      description: 'Toggle track selection state',
    },
  },
  render: (args) => {
    const selectedIds = args['Selected'] ? [trackFeature.id!] : [];
    return (
      <Track
        feature={args.feature as unknown as DebriefTrackFeature}
        selectedFeatureIds={selectedIds}
        onSelectionChange={args.onSelectionChange}
        timeState={args.timeState}
      />
    );
  },
  parameters: {
    chromatic: { disable: true },
  },
};

interface TimeControlArgs {
  feature: GeoJSONFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  timeState?: TimeState;
  'Current time'?: number; // This will be the step index (0 to totalSteps)
}

export const WithTimeControl: StoryObj<TimeControlArgs> = {
  args: {
    feature: trackFeature,
    selectedFeatureIds: [],
    onSelectionChange: (ids: (string | number)[]) => console.warn('Selection changed:', ids),
    'Current time': 0,
  },
  argTypes: {
    'Current time': {
      control: { 
        type: 'range',
        min: 0,
        max: totalSteps,
        step: 1
      },
      description: `Current time (${new Date(startTime).toISOString().replace('T', ' ').replace('Z', '')} to ${new Date(endTime).toISOString().replace('T', ' ').replace('Z', '')} in ${timeStepMinutes}-minute steps)`,
    },
    timeState: {
      table: { disable: true },
    },
  },
  render: (args) => {
    // Convert step index to continuous timestamp
    const stepIndex = args['Current time'] || 0;
    const currentTimestamp = startTime + (stepIndex * timeStepMs);
    const currentTimeState: TimeState = {
      current: new Date(currentTimestamp).toISOString(),
      start: new Date(startTime).toISOString(),
      end: new Date(endTime).toISOString(),
    };

    return (
      <div style={{ position: 'relative' }}>
        <Track
          feature={args.feature}
          selectedFeatureIds={args.selectedFeatureIds}
          onSelectionChange={args.onSelectionChange}
          timeState={currentTimeState}
        />
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            <div><strong>Current Time:</strong> {currentTimeState.current.replace('T', ' ').replace('Z', '')}</div>
            <div style={{ marginTop: '5px', fontSize: '10px' }}>
              Step: {stepIndex} / {totalSteps} | Offset: +{Math.round((currentTimestamp - startTime) / 60000)} min
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    chromatic: { disable: true },
    docs: {
      description: {
        story: 'Interactive story with time-based control. Use the "Time Offset" slider in the Controls panel to move the marker along the track over time. The slider uses an offset from the start time to handle large timestamp values.',
      },
    },
  },
};
