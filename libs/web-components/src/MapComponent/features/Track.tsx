import React from 'react';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getFeatureStyle } from '../utils/featureUtils';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { useFeatureHighlight } from '../hooks/useFeatureHighlight';

interface TrackProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  selectedFeatureIds: (string | number)[];
  revealFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  geoJsonData: { features: GeoJSONFeature[] };
}

export const Track: React.FC<TrackProps> = (props) => {
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