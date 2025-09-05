import type { Meta, StoryObj } from '@storybook/react';
import { MapComponent } from './MapComponent';
import type { GeoJSONFeatureCollection } from './MapComponent';

const meta: Meta<typeof MapComponent> = {
  title: 'Map/MapComponent',
  component: MapComponent,
  parameters: {
    layout: 'fullscreen',
    // Exclude all MapComponent stories from Chromatic visual testing
    // Maps are prone to rendering inconsistencies due to tile loading timing
    chromatic: { disable: true },
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
        name: 'Regular Point',
        'marker-color': '#ff0000'
      }
    },
    {
      type: 'Feature',
      id: 'buoy1',
      geometry: {
        type: 'Point',
        coordinates: [-0.1, 51.51]
      },
      properties: {
        name: 'Buoy Marker',
        type: 'buoyfield',
        'marker-color': '#00ff00'
      }
    },
    {
      type: 'Feature',
      id: 'track1',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.12, 51.50],
          [-0.11, 51.505],
          [-0.105, 51.51],
          [-0.095, 51.515]
        ]
      },
      properties: {
        name: 'Ship Track',
        stroke: '#0066cc',
        'stroke-width': 3
      }
    },
    {
      type: 'Feature',
      id: 'zone1',
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
        name: 'Exclusion Zone',
        stroke: '#ff6600',
        fill: '#ffcc99',
        'fill-opacity': 0.4
      }
    },
    {
      type: 'Feature',
      id: 'hidden-point',
      geometry: {
        type: 'Point',
        coordinates: [-0.07, 51.495]
      },
      properties: {
        name: 'Hidden Point (not rendered)',
        'marker-color': '#888888',
        visible: false
      }
    },
    {
      type: 'Feature',
      id: 'zone2',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-0.13, 51.495],
          [-0.11, 51.495],
          [-0.11, 51.505],
          [-0.13, 51.505],
          [-0.13, 51.495]
        ]]
      },
      properties: {
        name: 'Semi-Transparent Zone',
        stroke: '#9933cc',
        fill: '#cc99ff',
        'fill-opacity': 0.2
      }
    },
    {
      type: 'Feature',
      id: 'buoy2',
      geometry: {
        type: 'Point',
        coordinates: [-0.085, 51.520]
      },
      properties: {
        name: 'Navigation Buoy',
        type: 'buoyfield',
        'marker-color': '#ffff00'
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
    revealFeatureIndex: 0,
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

// Stories showcasing new property-based rendering features
export const BuoyfieldsAndTracks: Story = {
  name: 'Buoyfields and Tracks',
  args: {
    geoJsonData: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'track-blue',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-0.15, 51.48],
              [-0.12, 51.485],
              [-0.10, 51.49],
              [-0.08, 51.495]
            ]
          },
          properties: {
            name: 'Blue Ship Track',
            stroke: '#0066ff'
          }
        },
        {
          type: 'Feature',
          id: 'track-red',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-0.05, 51.50],
              [-0.07, 51.51],
              [-0.09, 51.52],
              [-0.11, 51.525]
            ]
          },
          properties: {
            name: 'Red Ship Track',
            stroke: '#ff3333'
          }
        },
        {
          type: 'Feature',
          id: 'buoy-green',
          geometry: {
            type: 'Point',
            coordinates: [-0.08, 51.505]
          },
          properties: {
            name: 'Green Buoy',
            type: 'buoyfield',
            'marker-color': '#00cc00'
          }
        },
        {
          type: 'Feature',
          id: 'buoy-red',
          geometry: {
            type: 'Point',
            coordinates: [-0.12, 51.515]
          },
          properties: {
            name: 'Red Buoy',
            type: 'buoyfield',
            'marker-color': '#cc0000'
          }
        }
      ]
    },
    showAddButton: true,
  },
};

export const ZonesWithOpacity: Story = {
  name: 'Zones with Fill Opacity',
  args: {
    geoJsonData: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'zone-opaque',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-0.15, 51.48],
              [-0.10, 51.48],
              [-0.10, 51.50],
              [-0.15, 51.50],
              [-0.15, 51.48]
            ]]
          },
          properties: {
            name: 'Opaque Red Zone',
            stroke: '#cc0000',
            fill: '#ff6666',
            'fill-opacity': 0.8
          }
        },
        {
          type: 'Feature',
          id: 'zone-semi',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-0.08, 51.51],
              [-0.05, 51.51],
              [-0.05, 51.53],
              [-0.08, 51.53],
              [-0.08, 51.51]
            ]]
          },
          properties: {
            name: 'Semi-Transparent Blue Zone',
            stroke: '#0066cc',
            fill: '#3399ff',
            'fill-opacity': 0.3
          }
        },
        {
          type: 'Feature',
          id: 'zone-transparent',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-0.12, 51.52],
              [-0.09, 51.52],
              [-0.09, 51.525],
              [-0.12, 51.525],
              [-0.12, 51.52]
            ]]
          },
          properties: {
            name: 'Very Transparent Yellow Zone',
            stroke: '#ffcc00',
            fill: '#ffff66',
            'fill-opacity': 0.1
          }
        }
      ]
    },
    showAddButton: true,
  },
};

export const VisibilityFiltering: Story = {
  name: 'Visibility Filtering (some hidden)',
  args: {
    geoJsonData: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'visible-point',
          geometry: {
            type: 'Point',
            coordinates: [-0.09, 51.505]
          },
          properties: {
            name: 'Visible Point',
            'marker-color': '#00ff00',
            visible: true
          }
        },
        {
          type: 'Feature',
          id: 'hidden-point',
          geometry: {
            type: 'Point',
            coordinates: [-0.10, 51.505]
          },
          properties: {
            name: 'Hidden Point (not shown)',
            'marker-color': '#ff0000',
            visible: false
          }
        },
        {
          type: 'Feature',
          id: 'default-visible',
          geometry: {
            type: 'Point',
            coordinates: [-0.08, 51.505]
          },
          properties: {
            name: 'Default Visible (no visible property)',
            'marker-color': '#0066ff'
          }
        },
        {
          type: 'Feature',
          id: 'hidden-zone',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-0.11, 51.50],
              [-0.09, 51.50],
              [-0.09, 51.51],
              [-0.11, 51.51],
              [-0.11, 51.50]
            ]]
          },
          properties: {
            name: 'Hidden Zone (not shown)',
            stroke: '#ff6600',
            fill: '#ffcc99',
            'fill-opacity': 0.5,
            visible: false
          }
        }
      ]
    },
    showAddButton: true,
  },
};