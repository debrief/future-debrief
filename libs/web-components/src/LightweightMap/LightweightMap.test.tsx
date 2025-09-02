import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LightweightMap } from './LightweightMap';

// Mock React Leaflet components since they require DOM and canvas
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
  GeoJSON: (props: any) => <div data-testid="geojson" {...props} />,
  Marker: ({ children, ...props }: any) => (
    <div data-testid="marker" {...props}>
      {children}
    </div>
  ),
  Popup: ({ children, ...props }: any) => (
    <div data-testid="popup" {...props}>
      {children}
    </div>
  ),
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  icon: jest.fn(() => ({})),
  Marker: {
    prototype: {
      options: { icon: null },
    },
  },
  circleMarker: jest.fn(),
}));

const sampleGeoJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Test Point' },
      geometry: {
        type: 'Point',
        coordinates: [-0.09, 51.505],
      },
    },
  ],
};

describe('LightweightMap', () => {
  it('renders without crashing', () => {
    render(<LightweightMap />);
    expect(document.querySelector('[data-testid="map-container"]')).toBeInTheDocument();
  });

  it('renders with custom center and zoom', () => {
    render(<LightweightMap center={[40.7128, -74.0060]} zoom={10} />);
    const mapContainer = document.querySelector('[data-testid="map-container"]');
    expect(mapContainer).toBeInTheDocument();
  });

  it('renders with custom style', () => {
    const customStyle = { height: '600px', width: '800px' };
    render(<LightweightMap style={customStyle} />);
    const mapContainer = document.querySelector('[data-testid="map-container"]');
    expect(mapContainer).toBeInTheDocument();
  });

  it('renders with GeoJSON data', () => {
    render(<LightweightMap geoJsonData={sampleGeoJSON} />);
    expect(document.querySelector('[data-testid="geojson"]')).toBeInTheDocument();
  });

  it('renders with sample markers when enabled', () => {
    render(<LightweightMap showSampleMarkers={true} />);
    const markers = document.querySelectorAll('[data-testid="marker"]');
    expect(markers).toHaveLength(2); // Two sample markers
  });

  it('does not render sample markers when disabled', () => {
    render(<LightweightMap showSampleMarkers={false} />);
    const markers = document.querySelectorAll('[data-testid="marker"]');
    expect(markers).toHaveLength(0);
  });

  it('applies custom className', () => {
    render(<LightweightMap className="custom-map-class" />);
    expect(document.querySelector('.custom-map-class')).toBeInTheDocument();
  });

  it('renders tile layer', () => {
    render(<LightweightMap />);
    expect(document.querySelector('[data-testid="tile-layer"]')).toBeInTheDocument();
  });
});