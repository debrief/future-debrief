import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
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
  /** Callback when feature is selected/deselected */
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  /** Callback when map is clicked for adding new points */
  onMapClick?: (lat: number, lng: number) => void;
  /** Feature index to highlight */
  highlightFeatureIndex?: number;
  /** Array of feature indices to select */
  selectedFeatureIndices?: number[];
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

interface InteractiveGeoJSONProps {
  geoJsonData: GeoJSONFeatureCollection;
  selectedFeatureIndices: number[];
  selectedFeatureIds: (string | number)[];
  highlightFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
}

const InteractiveGeoJSON: React.FC<InteractiveGeoJSONProps> = ({
  geoJsonData,
  selectedFeatureIndices,
  selectedFeatureIds,
  highlightFeatureIndex,
  onSelectionChange
}) => {
  const map = useMap();
  const selectedFeaturesRef = useRef<Set<number>>(new Set());
  const featureLayersRef = useRef<Map<number, L.Layer>>(new Map());
  const highlightLayerRef = useRef<L.Layer | null>(null);

  // Parse selected indices from IDs
  const getSelectedIndices = useCallback(() => {
    const indices = new Set(selectedFeatureIndices);
    
    selectedFeatureIds.forEach(id => {
      const index = geoJsonData.features.findIndex(feature => feature.id === id);
      if (index >= 0) {
        indices.add(index);
      }
    });
    
    return Array.from(indices);
  }, [selectedFeatureIndices, selectedFeatureIds, geoJsonData]);

  // Update selection visual state
  const updateFeatureStyle = useCallback((featureIndex: number, isSelected: boolean) => {
    const layer = featureLayersRef.current.get(featureIndex);
    const feature = geoJsonData.features[featureIndex];
    
    if (!layer || !feature) return;

    if (feature.geometry.type === 'Point') {
      const baseColor = feature.properties?.color || '#00F';
      
      if (isSelected) {
        (layer as L.CircleMarker).setStyle({
          radius: 10,
          fillColor: baseColor,
          color: '#ff6b35',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.8
        });
      } else {
        (layer as L.CircleMarker).setStyle({
          radius: 8,
          fillColor: baseColor,
          color: baseColor,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7
        });
      }
    } else {
      const selectedStyle = {
        color: '#ff6b35',
        weight: 4,
        opacity: 1,
        fillColor: '#ff6b35',
        fillOpacity: 0.3
      };
      
      const defaultStyle = {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
        fillColor: '#3388ff',
        fillOpacity: 0.2
      };
      
      (layer as L.Path).setStyle(isSelected ? selectedStyle : defaultStyle);
    }
  }, [geoJsonData]);

  // Handle feature click for selection toggle
  const handleFeatureClick = useCallback((featureIndex: number) => {
    const selectedFeatures = selectedFeaturesRef.current;
    
    if (selectedFeatures.has(featureIndex)) {
      selectedFeatures.delete(featureIndex);
      updateFeatureStyle(featureIndex, false);
    } else {
      selectedFeatures.add(featureIndex);
      updateFeatureStyle(featureIndex, true);
    }

    if (onSelectionChange) {
      const selectedFeatureData = Array.from(selectedFeatures).map(index => geoJsonData.features[index]);
      onSelectionChange(selectedFeatureData, Array.from(selectedFeatures));
    }
  }, [geoJsonData, onSelectionChange, updateFeatureStyle]);

  // GeoJSON styling functions
  const geoJsonStyle = useCallback(() => ({
    color: '#3388ff',
    weight: 3,
    opacity: 0.8,
    fillOpacity: 0.2
  }), []);

  const pointToLayer = useCallback((feature: GeoJSON.Feature, latlng: L.LatLng) => {
    const color = feature.properties?.color || '#00F';
    
    return L.circleMarker(latlng, {
      radius: 8,
      fillColor: color,
      color: color,
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.7
    });
  }, []);

  const onEachFeature = useCallback((feature: GeoJSON.Feature, layer: L.Layer) => {
    // Store layer reference
    const index = geoJsonData.features.indexOf(feature as GeoJSONFeature);
    if (index >= 0) {
      featureLayersRef.current.set(index, layer);
    }

    // Bind popup with feature info
    if (feature.properties?.name) {
      layer.bindPopup(feature.properties.name);
    }

    // Add click handler for feature selection
    layer.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      handleFeatureClick(index);
    });
  }, [geoJsonData, handleFeatureClick]);

  // Update selection when props change
  useEffect(() => {
    const newIndices = getSelectedIndices();
    
    // Clear previous selection
    selectedFeaturesRef.current.forEach(index => {
      updateFeatureStyle(index, false);
    });
    selectedFeaturesRef.current.clear();
    
    // Apply new selection
    newIndices.forEach(index => {
      if (index >= 0 && index < geoJsonData.features.length) {
        selectedFeaturesRef.current.add(index);
        updateFeatureStyle(index, true);
      }
    });
  }, [selectedFeatureIndices, selectedFeatureIds, geoJsonData, getSelectedIndices, updateFeatureStyle]);

  // Handle highlight
  useEffect(() => {
    // Remove previous highlight
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (highlightFeatureIndex !== undefined && highlightFeatureIndex < geoJsonData.features.length) {
      const feature = geoJsonData.features[highlightFeatureIndex];
      
      const highlightedLayer = L.geoJSON(feature, {
        pointToLayer: (_geoJsonFeature: GeoJSON.Feature, latlng: L.LatLng) => {
          return L.circleMarker(latlng, {
            radius: 12,
            fillColor: '#ff7f00',
            color: '#ff4500',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.6
          });
        },
        style: () => ({
          color: '#ff4500',
          weight: 4,
          opacity: 0.9,
          fillColor: '#ff7f00',
          fillOpacity: 0.6
        })
      }).addTo(map);

      highlightLayerRef.current = highlightedLayer;

      // Pan to highlighted feature
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates;
        map.panTo([coords[1], coords[0]]);
      }
    }
  }, [highlightFeatureIndex, geoJsonData, map]);

  return (
    <GeoJSON
      key={JSON.stringify(geoJsonData)}
      data={geoJsonData}
      style={geoJsonStyle}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
};

export const MapComponent: React.FC<MapComponentProps> = ({
  geoJsonData,
  onSelectionChange,
  onMapClick,
  highlightFeatureIndex,
  selectedFeatureIndices = [],
  selectedFeatureIds = [],
  showAddButton = false,
  onAddClick,
  onZoomToSelection,
  onMapStateChange,
  initialMapState,
  className = '',
  mapId = 'map'
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

  // Update parsed data when input changes
  useEffect(() => {
    const parsedData = parseGeoJsonData(geoJsonData);
    setCurrentData(parsedData);
  }, [geoJsonData, parseGeoJsonData]);

  // Handle zoom to selection
  const handleZoomToSelection = useCallback(() => {
    if (!currentData || !mapRef.current) return;
    
    const selectedIndices = [...selectedFeatureIndices];
    selectedFeatureIds.forEach(id => {
      const index = currentData.features.findIndex(feature => feature.id === id);
      if (index >= 0) {
        selectedIndices.push(index);
      }
    });
    
    if (selectedIndices.length === 0) return;
    
    const selectedFeatures = selectedIndices.map(index => currentData.features[index]).filter(Boolean);
    
    if (selectedFeatures.length === 0) return;
    
    // Create bounds from selected features
    const bounds = L.latLngBounds([]);
    selectedFeatures.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates;
        bounds.extend([coords[1], coords[0]]);
      }
      // TODO: Add support for other geometry types if needed
    });
    
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [currentData, selectedFeatureIndices, selectedFeatureIds]);

  // Expose zoom to selection functionality through callback
  useEffect(() => {
    if (onZoomToSelection) {
      // Replace the callback with our implementation
      // Note: This is a pattern to expose internal functionality
      (onZoomToSelection as any).current = handleZoomToSelection;
    }
  }, [onZoomToSelection, handleZoomToSelection]);

  // Default map center and zoom
  const center: [number, number] = initialMapState?.center || [51.505, -0.09];
  const zoom = initialMapState?.zoom || 13;

  return (
    <div id={mapId} className={`plot-editor ${className}`}>
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
          <InteractiveGeoJSON
            geoJsonData={currentData}
            selectedFeatureIndices={selectedFeatureIndices}
            selectedFeatureIds={selectedFeatureIds}
            highlightFeatureIndex={highlightFeatureIndex}
            onSelectionChange={onSelectionChange}
          />
        )}
      </MapContainer>
    </div>
  );
};