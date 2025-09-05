import React from 'react';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getFeatureStyle } from '../utils/featureUtils';

interface TrackProps {
  feature: GeoJSONFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
}

export const Track: React.FC<TrackProps> = (props) => {
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

  const style = getFeatureStyle(feature, isSelected);
  
  // Type guard and extract coordinates for LineString/MultiLineString
  if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
    return null;
  }
  
  const coordinates = feature.geometry.type === 'LineString' 
    ? (feature.geometry.coordinates as number[][]).map(coord => [coord[1], coord[0]] as [number, number])
    : (feature.geometry.coordinates as number[][][]).map((lineString: number[][]) => 
        lineString.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
      );

  const handlePathRef = (ref: L.Polyline | null) => {
    if (ref) {
      bindEventHandlers(ref);
    }
  };

  if (feature.geometry.type === 'MultiLineString') {
    return (
      <>
        {(coordinates as [number, number][][]).map((lineCoords, index) => (
          <Polyline
            key={index}
            ref={index === 0 ? handlePathRef : undefined}
            positions={lineCoords}
            pathOptions={style}
          />
        ))}
      </>
    );
  }

  return (
    <Polyline
      ref={handlePathRef}
      positions={coordinates as [number, number][]}
      pathOptions={style}
    />
  );
};