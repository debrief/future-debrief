import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Track } from './Track';
import { MapContainer, TileLayer } from 'react-leaflet';
import plot from '../../../../../apps/vs-code/workspace/large-sample.plot.json';
import { GeoJSONFeature } from '../MapComponent';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';

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

const timestamps = trackFeature.properties?.times as string[];
const timeState: TimeState = {
  current: timestamps[0],
};

export const Default: Story = {
  args: {
    feature: trackFeature,
    selectedFeatureIds: [],
    onSelectionChange: (ids: (string | number)[]) => console.warn('Selection changed:', ids),
    timeState: timeState,
  },
};

const InteractiveTimeTrack: React.FC = () => {
  const [timeIndex, setTimeIndex] = useState(0);
  
  const currentTimeState: TimeState = {
    current: timestamps[timeIndex],
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeIndex(parseInt(e.target.value, 10));
  };

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer center={[36.0, -5.0]} zoom={8} style={{ height: '500px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Track
          feature={trackFeature}
          selectedFeatureIds={[]}
          onSelectionChange={(ids: (string | number)[]) => console.warn('Selection changed:', ids)}
          timeState={currentTimeState}
        />
      </MapContainer>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Time Control
        </div>
        <input
          type="range"
          min="0"
          max={timestamps.length - 1}
          value={timeIndex}
          onChange={handleTimeChange}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
          <div>Index: {timeIndex} / {timestamps.length - 1}</div>
          <div>Time: {new Date(currentTimeState.current).toLocaleTimeString()}</div>
        </div>
        <div style={{ marginTop: '5px', fontSize: '11px', color: '#999' }}>
          {new Date(currentTimeState.current).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export const InteractiveTimeControl: Story = {
  render: () => <InteractiveTimeTrack />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive story with time slider control to see the marker move along the track over time. Use the slider in the story to control the time and watch the marker move along the track.',
      },
    },
  },
};
