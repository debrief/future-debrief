import React from 'react';
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
