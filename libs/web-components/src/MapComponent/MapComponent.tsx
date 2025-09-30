import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { DebriefFeatures } from './DebriefFeatures';
import { isFeatureVisible } from './utils/featureUtils';
import { calculateFeatureBounds } from './utils/boundsUtils';
import { TimeState } from '@debrief/shared-types';
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
  /** Array of feature IDs to select */
  selectedFeatureIds?: (string | number)[];
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
  /** Current time state */
  timeState?: TimeState;
}

// Helper components for React Leaflet integration
interface MapEventsHandlerProps {
  onMapStateChange?: (state: MapState) => void;
  mapRef?: React.MutableRefObject<L.Map | null>;
}

const MapEventsHandler: React.FC<MapEventsHandlerProps> = ({ onMapStateChange, mapRef }) => {
  const map = useMap();

  // Store map reference for external access
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  useMapEvents({
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
  selectedFeatureIds = [],
  onZoomToSelection: _onZoomToSelection,
  onMapStateChange,
  initialMapState,
  className = '',
  mapId: _mapId = 'map',
  timeState,
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


  // Apply initialMapState when it changes (for view restoration)
  useEffect(() => {
    if (initialMapState && mapRef.current) {
      mapRef.current.setView(
        initialMapState.center,
        initialMapState.zoom,
        { animate: false }
      );
    }
  }, [initialMapState]);

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
          onMapStateChange={onMapStateChange}
          mapRef={mapRef}
        />
        
        {currentData && (
          <DebriefFeatures
            geoJsonData={currentData}
            selectedFeatureIds={selectedFeatureIds}
            onSelectionChange={onSelectionChange}
            timeState={timeState}
          />
        )}
      </MapContainer>
    </div>
  );
};