import React from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
// Note: Consumer applications need to import 'leaflet/dist/leaflet.css' separately

// Fix for default markers in React Leaflet
// Use CDN URLs to avoid bundling issues with PNG files
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface LightweightMapProps {
  /** Map center coordinates [latitude, longitude] */
  center?: [number, number];
  /** Map zoom level */
  zoom?: number;
  /** GeoJSON data to display */
  geoJsonData?: GeoJSON.GeoJSON;
  /** CSS class name for styling */
  className?: string;
  /** Map container style */
  style?: React.CSSProperties;
  /** Callback when map is clicked */
  onMapClick?: (lat: number, lng: number) => void;
  /** Show sample markers */
  showSampleMarkers?: boolean;
}

export const LightweightMap: React.FC<LightweightMapProps> = ({
  center = [51.505, -0.09],
  zoom = 13,
  geoJsonData,
  className = '',
  style = { height: '400px', width: '100%' },
  onMapClick,
  showSampleMarkers = false
}) => {
  // Map click handler - will be implemented later
  // const handleMapClick = (e: L.LeafletMouseEvent) => {
  //   if (onMapClick) {
  //     onMapClick(e.latlng.lat, e.latlng.lng);
  //   }
  // };

  const geoJsonStyle = {
    color: '#3388ff',
    weight: 3,
    opacity: 0.8,
    fillOpacity: 0.2
  };

  const pointToLayer = (feature: GeoJSON.Feature, latlng: L.LatLng) => {
    const color = feature.properties?.color || '#00F';
    
    return L.circleMarker(latlng, {
      radius: 8,
      fillColor: color,
      color: color,
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.7
    });
  };

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (feature.properties?.name) {
      layer.bindPopup(feature.properties.name);
    }
  };

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={style}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {geoJsonData && (
          <GeoJSON
            data={geoJsonData}
            style={geoJsonStyle}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        )}
        
        {showSampleMarkers && (
          <>
            <Marker position={[center[0] + 0.01, center[1] + 0.01]}>
              <Popup>
                Sample marker 1<br />
                Located near the map center
              </Popup>
            </Marker>
            <Marker position={[center[0] - 0.01, center[1] - 0.01]}>
              <Popup>
                Sample marker 2<br />
                Another sample location
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
};