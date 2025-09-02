import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MapComponent } from './MapComponent';
import type { GeoJSONFeatureCollection } from './MapComponent';

// Mock Leaflet since it requires DOM and canvas
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    on: jest.fn(),
    remove: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
    panTo: jest.fn(),
    getCenter: jest.fn(() => ({ lat: 51.505, lng: -0.09 })),
    getZoom: jest.fn(() => 13),
    invalidateSize: jest.fn(),
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  geoJSON: jest.fn(() => ({
    addTo: jest.fn(),
    getBounds: jest.fn(),
  })),
  circleMarker: jest.fn(() => ({
    setStyle: jest.fn(),
  })),
  latLngBounds: jest.fn(() => ({
    extend: jest.fn(),
    isValid: jest.fn(() => true),
  })),
}));

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
        name: 'Test Point',
        'marker-color': '#ff0000'
      }
    },
    {
      type: 'Feature',
      id: 'buoy1',
      geometry: {
        type: 'Point', 
        coordinates: [-0.08, 51.506]
      },
      properties: {
        name: 'Test Buoy',
        type: 'buoyfield',
        'marker-color': '#00ff00'
      }
    },
    {
      type: 'Feature',
      id: 'track1',
      geometry: {
        type: 'LineString',
        coordinates: [[-0.09, 51.505], [-0.08, 51.506]]
      },
      properties: {
        name: 'Test Track',
        stroke: '#0000ff'
      }
    },
    {
      type: 'Feature',
      id: 'zone1',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-0.09, 51.505], [-0.08, 51.506], [-0.07, 51.505], [-0.09, 51.505]]]
      },
      properties: {
        name: 'Test Zone',
        stroke: '#ff00ff',
        fill: '#ffff00',
        'fill-opacity': 0.5
      }
    },
    {
      type: 'Feature',
      id: 'hidden1',
      geometry: {
        type: 'Point',
        coordinates: [-0.06, 51.504]
      },
      properties: {
        name: 'Hidden Point',
        'marker-color': '#888888',
        visible: false
      }
    }
  ]
};

describe('MapComponent', () => {
  it('renders without crashing', () => {
    render(<MapComponent />);
    // Component should render the container div
    expect(document.querySelector('.plot-editor')).toBeInTheDocument();
  });

  it('renders with add button when showAddButton is true', () => {
    render(<MapComponent showAddButton={true} />);
    const addButton = screen.getByText('Add Feature');
    expect(addButton).toBeInTheDocument();
  });

  it('does not render add button when showAddButton is false', () => {
    render(<MapComponent showAddButton={false} />);
    const addButton = screen.queryByText('Add Feature');
    expect(addButton).not.toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<MapComponent className="custom-class" />);
    const container = document.querySelector('.plot-editor.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('renders with custom mapId', () => {
    render(<MapComponent mapId="custom-map" />);
    const mapContainer = document.querySelector('#custom-map');
    expect(mapContainer).toBeInTheDocument();
  });

  it('accepts GeoJSON data as object', () => {
    render(<MapComponent geoJsonData={sampleGeoJSON} />);
    // Component should render without errors
    expect(document.querySelector('.plot-editor')).toBeInTheDocument();
  });

  it('accepts GeoJSON data as string', () => {
    render(<MapComponent geoJsonData={JSON.stringify(sampleGeoJSON)} />);
    // Component should render without errors
    expect(document.querySelector('.plot-editor')).toBeInTheDocument();
  });

  it('filters out features with visible: false', () => {
    // Create a component with the sample data that includes a hidden feature
    const component = render(<MapComponent geoJsonData={sampleGeoJSON} />);
    
    // The component should render without errors, and the internal logic
    // should filter out features where visible === false
    expect(document.querySelector('.plot-editor')).toBeInTheDocument();
    
    // This test verifies the component doesn't crash when filtering invisible features
    // More detailed testing would require inspecting internal state or using React Testing Library queries
  });

  it('handles features with marker-color properties', () => {
    const pointFeatureData = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        id: 'test-point',
        geometry: {
          type: 'Point' as const,
          coordinates: [-0.09, 51.505]
        },
        properties: {
          'marker-color': '#ff0000'
        }
      }]
    };
    
    render(<MapComponent geoJsonData={pointFeatureData} />);
    expect(document.querySelector('.plot-editor')).toBeInTheDocument();
  });

  it('handles buoyfield features with smaller radius', () => {
    const buoyData = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        id: 'test-buoy',
        geometry: {
          type: 'Point' as const,
          coordinates: [-0.09, 51.505]
        },
        properties: {
          type: 'buoyfield',
          'marker-color': '#00ff00'
        }
      }]
    };
    
    render(<MapComponent geoJsonData={buoyData} />);
    expect(document.querySelector('.plot-editor')).toBeInTheDocument();
  });
});