import React from 'react';
import { Polygon } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getFeatureStyle } from '../utils/featureUtils';
import { Track } from './Track';
import { Point } from './Point';

interface ZoneProps {
  feature: GeoJSONFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
}

export const Zone: React.FC<ZoneProps> = (props) => {
  const { feature, selectedFeatureIds, onSelectionChange } = props;
  
  // Return early if zone is not visible
  if (feature.properties?.visible === false) {
    return null;
  }
  
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

  // Handle different geometry types for zones
  if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
    return <Point {...props} />;
  }
  
  if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
    return <Track {...props} />;
  }

  // Type guard and handle Polygon/MultiPolygon
  if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
    return null;
  }
  
  const coordinates = feature.geometry.type === 'Polygon'
    ? [(feature.geometry.coordinates as number[][][]).map((ring: number[][]) => 
        ring.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
      )]
    : (feature.geometry.coordinates as number[][][][]).map((polygon: number[][][]) =>
        polygon.map((ring: number[][]) => 
          ring.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
        )
      );

  const handlePolygonRef = (ref: L.Polygon | null) => {
    if (ref) {
      bindEventHandlers(ref);
    }
  };

  return (
    <>
      {coordinates.map((polygonCoords: [number, number][][], index: number) => (
        <Polygon
          key={index}
          ref={index === 0 ? handlePolygonRef : undefined}
          positions={polygonCoords}
          pathOptions={style}
        />
      ))}
    </>
  );
};