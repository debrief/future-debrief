import type { Meta, StoryObj } from '@storybook/react';
import { MapComponent } from './MapComponent';
import type { GeoJSONFeatureCollection } from './MapComponent';

const meta: Meta<typeof MapComponent> = {
  title: 'Map/MapComponent',
  component: MapComponent,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onSelectionChange: { action: 'selection-changed' },
    onMapClick: { action: 'map-clicked' },
    onAddClick: { action: 'add-clicked' },
    onZoomToSelection: { action: 'zoom-to-selection' },
    onMapStateChange: { action: 'map-state-changed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleGeoJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'point1',
      geometry: {
        type: 'Point',
        coordinates: [-0.09, 51.505]
      },
      properties: {
        name: 'London Point',
        color: '#ff0000'
      }
    },
    {
      type: 'Feature',
      id: 'point2',
      geometry: {
        type: 'Point',
        coordinates: [-0.1, 51.51]
      },
      properties: {
        name: 'Another London Point',
        color: '#00ff00'
      }
    },
    {
      type: 'Feature',
      id: 'polygon1',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-0.08, 51.49],
          [-0.06, 51.49],
          [-0.06, 51.51],
          [-0.08, 51.51],
          [-0.08, 51.49]
        ]]
      },
      properties: {
        name: 'Sample Polygon'
      }
    }
  ]
};

export const Default: Story = {
  args: {
    geoJsonData: sampleGeoJSON,
    showAddButton: true,
  },
};

export const WithStringData: Story = {
  args: {
    geoJsonData: JSON.stringify(sampleGeoJSON),
    showAddButton: true,
  },
};

export const WithHighlight: Story = {
  args: {
    geoJsonData: sampleGeoJSON,
    highlightFeatureIndex: 0,
    showAddButton: true,
  },
};

export const WithSelection: Story = {
  args: {
    geoJsonData: sampleGeoJSON,
    selectedFeatureIndices: [0, 2],
    showAddButton: true,
  },
};

export const WithSelectedIds: Story = {
  args: {
    geoJsonData: sampleGeoJSON,
    selectedFeatureIds: ['point1', 'polygon1'],
    showAddButton: true,
  },
};

export const NoAddButton: Story = {
  args: {
    geoJsonData: sampleGeoJSON,
    showAddButton: false,
  },
};

export const EmptyMap: Story = {
  args: {
    showAddButton: true,
  },
};