import React from 'react';
import { CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getPointStyle } from '../utils/featureUtils';

interface PointProps {
  feature: GeoJSONFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
}

export const Point: React.FC<PointProps> = (props) => {
  const { feature, selectedFeatureIds, onSelectionChange } = props;
  
  // Check if this feature is selected by ID
  const isSelected = selectedFeatureIds.some(id => feature.id === id);
  
  // Simple event handler for selection
  const bindEventHandlers = (layer: L.Layer) => {
    // Bind popup if feature has name
    if (feature.properties?.name) {
      layer.bindPopup(feature.properties.name);
    }
    
    // Add click handler for selection
    layer.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      
      if (!onSelectionChange) return;
      
      const featureId = feature.id !== undefined ? feature.id : Math.random();
      let newSelectedIds: (string | number)[];
      
      if (isSelected) {
        // Remove from selection
        newSelectedIds = selectedFeatureIds.filter(id => id !== feature.id);
      } else {
        // Add to selection
        newSelectedIds = [...selectedFeatureIds, featureId];
      }
      
      onSelectionChange(newSelectedIds);
    });
  };

  const style = getPointStyle(feature, isSelected);
  
  // Type guard and extract coordinates for Point/MultiPoint
  if (feature.geometry.type !== 'Point' && feature.geometry.type !== 'MultiPoint') {
    return null;
  }
  
  const coordinates = feature.geometry.type === 'Point'
    ? [[(feature.geometry.coordinates as number[])[1], (feature.geometry.coordinates as number[])[0]] as [number, number]]
    : (feature.geometry.coordinates as number[][]).map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

  const handleMarkerRef = (ref: L.CircleMarker | null) => {
    if (ref) {
      bindEventHandlers(ref);
    }
  };

  return (
    <>
      {coordinates.map((coord: [number, number], index: number) => (
        <CircleMarker
          key={index}
          ref={index === 0 ? handleMarkerRef : undefined}
          center={coord}
          radius={style.radius}
          pathOptions={{
            fillColor: style.fillColor,
            color: style.color,
            weight: style.weight,
            opacity: style.opacity,
            fillOpacity: style.fillOpacity
          }}
        />
      ))}
    </>
  );
};