import { useCallback } from 'react';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { bindFeaturePopup } from '../utils/featureUtils';

export const useFeatureSelection = (
  feature: GeoJSONFeature,
  featureIndex: number,
  selectedIndices: number[],
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void,
  geoJsonData?: { features: GeoJSONFeature[] }
) => {
  const isSelected = selectedIndices.indexOf(featureIndex) !== -1;
  
  const handleClick = useCallback((e: L.LeafletMouseEvent) => {
    e.originalEvent.preventDefault();
    
    if (!onSelectionChange || !geoJsonData) return;
    
    const newSelectedIndices = isSelected 
      ? selectedIndices.filter(idx => idx !== featureIndex)
      : [...selectedIndices, featureIndex];
    
    const selectedFeatures = newSelectedIndices.map(idx => geoJsonData.features[idx]);
    onSelectionChange(selectedFeatures, newSelectedIndices);
  }, [isSelected, featureIndex, selectedIndices, onSelectionChange, geoJsonData]);

  const bindEventHandlers = useCallback((layer: L.Layer) => {
    bindFeaturePopup(layer, feature);
    layer.on('click', handleClick);
  }, [feature, handleClick]);

  return { isSelected, bindEventHandlers };
};