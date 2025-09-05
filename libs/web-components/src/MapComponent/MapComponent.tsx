import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DebriefFeatures } from './DebriefFeatures';
import { isFeatureVisible } from './utils/featureUtils';
import { calculateFeatureBounds } from './utils/boundsUtils';
import './MapComponent.css';
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

export interface GeoJSONFeature extends GeoJSON.Feature {
  id?: string | number;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface MapState {
  center: [number, number];
  zoom: number;
}

export interface MapComponentProps {
  /** GeoJSON data as string or parsed object */
  geoJsonData?: string | GeoJSONFeatureCollection;
  /** Callback when feature selection changes */
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  /** Callback when map is clicked for adding new points */
  onMapClick?: (lat: number, lng: number) => void;
  /** Array of feature IDs to select */
  selectedFeatureIds?: (string | number)[];
  /** Whether to show the add button */
  showAddButton?: boolean;
  /** Callback when add button is clicked */
  onAddClick?: () => void;
  /** Callback when zoom to selection is requested */
  onZoomToSelection?: () => void;
  /** Callback when map state changes (for persistence) */
  onMapStateChange?: (state: MapState) => void;
  /** Initial map state to restore */
  initialMapState?: MapState;
  /** CSS class name for styling */
  className?: string;
  /** Container ID for the map */
  mapId?: string;
}

// Helper components for React Leaflet integration
interface MapEventsHandlerProps {
  onMapClick?: (lat: number, lng: number) => void;
  onMapStateChange?: (state: MapState) => void;
  mapRef?: React.MutableRefObject<L.Map | null>;
}

const MapEventsHandler: React.FC<MapEventsHandlerProps> = ({ onMapClick, onMapStateChange, mapRef }) => {
  const map = useMap();

  // Store map reference for external access
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    moveend: () => {
      if (onMapStateChange) {
        const center = map.getCenter();
        onMapStateChange({
          center: [center.lat, center.lng],
          zoom: map.getZoom()
        });
      }
    },
    zoomend: () => {
      if (onMapStateChange) {
        const center = map.getCenter();
        onMapStateChange({
          center: [center.lat, center.lng],
          zoom: map.getZoom()
        });
      }
    }
  });

  return null;
};


export const MapComponent: React.FC<MapComponentProps> = ({
  geoJsonData,
  onSelectionChange,
  onMapClick,
  selectedFeatureIds = [],
  showAddButton = false,
  onAddClick,
  onZoomToSelection: _onZoomToSelection,
  onMapStateChange,
  initialMapState,
  className = '',
  mapId: _mapId = 'map'
}) => {
  const [currentData, setCurrentData] = useState<GeoJSONFeatureCollection | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Parse GeoJSON data
  const parseGeoJsonData = useCallback((data: string | GeoJSONFeatureCollection | undefined): GeoJSONFeatureCollection | null => {
    if (!data) return null;

    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        return parsed;
      }
    } catch (error) {
      console.error('Error parsing GeoJSON data:', error);
    }
    return null;
  }, []);

  // Filter features based on visibility and update parsed data when input changes
  useEffect(() => {
    const parsedData = parseGeoJsonData(geoJsonData);
    if (parsedData) {
      // Filter out features with properties.visible === false
      const visibleFeatures = parsedData.features.filter(isFeatureVisible);
      
      setCurrentData({
        ...parsedData,
        features: visibleFeatures
      });
    } else {
      setCurrentData(null);
    }
  }, [geoJsonData, parseGeoJsonData]);

  // Handle zoom to selection - currently disabled
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleZoomToSelection = useCallback(() => {
    if (!currentData || !mapRef.current) return;
    
    const selectedIndices: number[] = [];
    selectedFeatureIds.forEach(id => {
      const index = currentData.features.findIndex(feature => feature.id === id);
      if (index >= 0) {
        selectedIndices.push(index);
      }
    });
    
    if (selectedIndices.length === 0) return;
    
    const selectedFeatures = selectedIndices.map(index => currentData.features[index]).filter(Boolean);
    
    if (selectedFeatures.length === 0) return;
    
    // Use helper function to calculate bounds
    const { bounds, hasValidGeometry } = calculateFeatureBounds(selectedFeatures);
    
    if (hasValidGeometry && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [currentData, selectedFeatureIds]);

  // Auto fit bounds when no initial viewport and data is loaded
  useEffect(() => {
    if (!initialMapState && currentData && currentData.features.length > 0 && mapRef.current) {
      // Use helper function to calculate bounds
      const { bounds, hasValidGeometry } = calculateFeatureBounds(currentData.features);

      if (hasValidGeometry && bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [currentData, initialMapState]);

  // Expose zoom to selection functionality through callback
  // TODO: Fix this pattern - currently disabled due to type incompatibility
  // useEffect(() => {
  //   if (_onZoomToSelection) {
  //     // Replace the callback with our implementation
  //     // Note: This is a pattern to expose internal functionality
  //     (_onZoomToSelection as { current: typeof handleZoomToSelection }).current = handleZoomToSelection;
  //   }
  // }, [_onZoomToSelection, handleZoomToSelection]);

  // Default map center and zoom
  const center: [number, number] = initialMapState?.center || [51.505, -0.09];
  const zoom = initialMapState?.zoom || 13;

  return (
    <div id={_mapId} className={`plot-editor ${className}`}>
      {showAddButton && (
        <div className="controls">
          <button className="add-button" onClick={onAddClick}>
            Add Feature
          </button>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ flex: 1, minHeight: '400px' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <MapEventsHandler
          onMapClick={onMapClick}
          onMapStateChange={onMapStateChange}
          mapRef={mapRef}
        />
        
        {currentData && (
          <DebriefFeatures
            geoJsonData={currentData}
            selectedFeatureIds={selectedFeatureIds}
            onSelectionChange={onSelectionChange}
          />
        )}
      </MapContainer>
    </div>
  );
};