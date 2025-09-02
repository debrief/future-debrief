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
        color: '#ff0000'
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
});