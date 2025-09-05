import React from 'react';
import { Meta, Story } from '@storybook/react';
import { Track } from './Track';
import { MapContainer, TileLayer } from 'react-leaflet';
import plot from '../../../../../../apps/vs-code/workspace/large-sample.plot.json';
import { GeoJSONFeature } from '../MapComponent';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';
import { useArgs } from '@storybook/preview-api';

export default {
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
} as Meta;

const trackFeature = plot.features.find(
  (f) => f.properties?.dataType === 'track' && f.geometry.type === 'LineString'
) as GeoJSONFeature;

const timestamps = trackFeature.properties?.times as string[];
const timeState: TimeState = {
  current: timestamps[0],
};

const Template: Story<TrackProps> = (args) => {
  const [{ timeState: currentTimeState }, updateArgs] = useArgs();

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTimestamp = timestamps[parseInt(e.target.value, 10)];
    updateArgs({ timeState: { ...currentTimeState, current: newTimestamp } });
  };

  return (
    <>
      <Track {...args} timeState={currentTimeState} />
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 1000, background: 'white', padding: '10px' }}>
        <input
          type="range"
          min="0"
          max={timestamps.length - 1}
          defaultValue="0"
          onChange={handleTimeChange}
          style={{ width: '100%' }}
        />
        <div>Current Time: {new Date(currentTimeState.current).toISOString()}</div>
      </div>
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  feature: trackFeature,
  selectedFeatureIds: [],
  onSelectionChange: (ids) => console.log('Selection changed:', ids),
  timeState: timeState,
};
