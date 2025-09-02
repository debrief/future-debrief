import type { Meta, StoryObj } from '@storybook/react';
import { LightweightMap } from './LightweightMap';

const meta: Meta<typeof LightweightMap> = {
  title: 'Map/LightweightMap',
  component: LightweightMap,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A lightweight map component using React Leaflet with OpenStreetMap tiles.',
      },
    },
  },
  argTypes: {
    center: {
      description: 'Map center coordinates [latitude, longitude]',
      control: 'object',
    },
    zoom: {
      description: 'Map zoom level',
      control: { type: 'range', min: 1, max: 18, step: 1 },
    },
    onMapClick: { action: 'map-clicked' },
    showSampleMarkers: {
      description: 'Show sample markers on the map',
      control: 'boolean',
    },
    style: {
      description: 'CSS style object for the map container',
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample GeoJSON data
const sampleGeoJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'London Point',
        color: '#ff0000'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.09, 51.505]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Another London Point',
        color: '#00ff00'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.1, 51.51]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Sample Polygon',
        description: 'A rectangular area in London'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-0.08, 51.49],
          [-0.06, 51.49],
          [-0.06, 51.51],
          [-0.08, 51.51],
          [-0.08, 51.49]
        ]]
      }
    }
  ]
};

export const Default: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 13,
    style: { height: '500px', width: '100%' },
  },
};

export const WithSampleMarkers: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 13,
    showSampleMarkers: true,
    style: { height: '500px', width: '100%' },
  },
};

export const WithGeoJSON: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 13,
    geoJsonData: sampleGeoJSON,
    style: { height: '500px', width: '100%' },
  },
};

export const WithGeoJSONAndMarkers: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 13,
    geoJsonData: sampleGeoJSON,
    showSampleMarkers: true,
    style: { height: '500px', width: '100%' },
  },
};

export const DifferentLocation: Story = {
  args: {
    center: [40.7128, -74.0060], // New York City
    zoom: 12,
    showSampleMarkers: true,
    style: { height: '400px', width: '100%' },
  },
};

export const HighZoom: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 16,
    showSampleMarkers: true,
    style: { height: '400px', width: '100%' },
  },
};

export const LowZoom: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 8,
    showSampleMarkers: true,
    style: { height: '400px', width: '100%' },
  },
};

export const CustomSize: Story = {
  args: {
    center: [51.505, -0.09],
    zoom: 13,
    showSampleMarkers: true,
    style: { height: '300px', width: '600px', border: '2px solid #ccc', borderRadius: '8px' },
  },
};