import React from 'react';
import { Polygon } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getFeatureStyle } from '../utils/featureUtils';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { useFeatureHighlight } from '../hooks/useFeatureHighlight';
import { Track } from './Track';
import { Point } from './Point';

interface ZoneProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  selectedFeatureIds: (string | number)[];
  revealFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  geoJsonData: { features: GeoJSONFeature[] };
}

export const Zone: React.FC<ZoneProps> = (props) => {
  const { feature, featureIndex, selectedFeatureIds, onSelectionChange, geoJsonData, revealFeatureIndex } = props;
  
  // Convert selectedFeatureIds to selectedIndices for backward compatibility
  const selectedFeatureIndices = selectedFeatureIds.map(id => 
    geoJsonData.features.findIndex(f => f.id === id)
  ).filter(index => index !== -1);
  
  const { isSelected, bindEventHandlers } = useFeatureSelection(
    feature, featureIndex, selectedFeatureIndices, onSelectionChange, geoJsonData
  );
  
  useFeatureHighlight(feature, featureIndex, revealFeatureIndex);

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