import { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';

export interface DebriefFeatureProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  selectedFeatureIndices: number[];
  selectedFeatureIds: (string | number)[];
  highlightFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  geoJsonData: { features: GeoJSONFeature[] };
}

export interface FeatureLayerManager {
  addLayer: (index: number, layer: L.Layer) => void;
  removeLayer: (index: number) => void;
  getLayer: (index: number) => L.Layer | undefined;
  updateFeatureStyle: (index: number, isSelected: boolean) => void;
  handleFeatureClick: (index: number) => void;
}

export const useFeatureLayerManager = (
  geoJsonData: { features: GeoJSONFeature[] },
  selectedFeatureIndices: number[],
  selectedFeatureIds: (string | number)[],
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void
): FeatureLayerManager => {
  const featureLayersRef = useRef<Map<number, L.Layer>>(new Map());
  const selectedFeaturesRef = useRef<Set<number>>(new Set());

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

  const updateFeatureStyle = useCallback((featureIndex: number, isSelected: boolean) => {
    const layer = featureLayersRef.current.get(featureIndex);
    const feature = geoJsonData.features[featureIndex];
    
    if (!layer || !feature) return;

    if (feature.geometry.type === 'Point') {
      const baseColor = feature.properties?.['marker-color'] || feature.properties?.color || '#00F';
      const isBuoyfield = feature.properties?.type === 'buoyfield' || 
                         feature.properties?.name?.toLowerCase().includes('buoy');
      const baseRadius = isBuoyfield ? 5 : 8;
      
      if (isSelected) {
        (layer as L.CircleMarker).setStyle({
          radius: baseRadius + 2,
          fillColor: baseColor,
          color: '#ffffff',
          weight: 5,
          opacity: 1,
          fillOpacity: 0.9,
          className: 'selected-feature'
        });
      } else {
        (layer as L.CircleMarker).setStyle({
          radius: baseRadius,
          fillColor: baseColor,
          color: baseColor,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7,
          className: ''
        });
      }
    } else {
      const props = feature.properties || {};
      const strokeColor = props.stroke || '#3388ff';
      const fillColor = props.fill || strokeColor;
      const fillOpacity = props['fill-opacity'] !== undefined ? props['fill-opacity'] : 0.2;
      
      const selectedStyle = {
        color: '#ffffff',
        weight: 5,
        opacity: 1,
        fillColor: fillColor,
        fillOpacity: Math.min(fillOpacity + 0.2, 0.8),
        className: 'selected-feature'
      };
      
      const defaultStyle = {
        color: strokeColor,
        weight: 3,
        opacity: 0.8,
        fillColor: fillColor,
        fillOpacity: fillOpacity
      };
      
      (layer as L.Path).setStyle(isSelected ? selectedStyle : defaultStyle);
    }
  }, [geoJsonData]);

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

  const addLayer = useCallback((index: number, layer: L.Layer) => {
    featureLayersRef.current.set(index, layer);
    
    // Bind popup if feature has name
    const feature = geoJsonData.features[index];
    if (feature.properties?.name) {
      layer.bindPopup(feature.properties.name);
    }

    // Add click handler
    layer.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      handleFeatureClick(index);
    });
  }, [geoJsonData, handleFeatureClick]);

  const removeLayer = useCallback((index: number) => {
    featureLayersRef.current.delete(index);
  }, []);

  const getLayer = useCallback((index: number) => {
    return featureLayersRef.current.get(index);
  }, []);

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

  return {
    addLayer,
    removeLayer,
    getLayer,
    updateFeatureStyle,
    handleFeatureClick
  };
};

export const useFeatureHighlight = (
  feature: GeoJSONFeature,
  featureIndex: number,
  highlightFeatureIndex?: number
) => {
  const map = useMap();
  const highlightLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    // Remove previous highlight
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (highlightFeatureIndex === featureIndex) {
      const highlightedLayer = L.geoJSON(feature, {
        pointToLayer: (_geoJsonFeature: GeoJSON.Feature, latlng: L.LatLng) => {
          const isBuoyfield = feature.properties?.type === 'buoyfield' || 
                             feature.properties?.name?.toLowerCase().includes('buoy');
          const radius = isBuoyfield ? 7 : 12;
          
          return L.circleMarker(latlng, {
            radius: radius,
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
  }, [highlightFeatureIndex, featureIndex, feature, map]);

  return null;
};