import React from 'react';
import { CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getPointStyle } from '../utils/featureUtils';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { useFeatureHighlight } from '../hooks/useFeatureHighlight';

interface PointMarkerProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  selectedFeatureIndices: number[];
  selectedFeatureIds: (string | number)[];
  highlightFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  geoJsonData: { features: GeoJSONFeature[] };
}

export const PointMarker: React.FC<PointMarkerProps> = (props) => {
  const { feature, featureIndex, selectedFeatureIndices, onSelectionChange, geoJsonData, highlightFeatureIndex } = props;
  const { isSelected, bindEventHandlers } = useFeatureSelection(
    feature, featureIndex, selectedFeatureIndices, onSelectionChange, geoJsonData
  );
  
  useFeatureHighlight(feature, featureIndex, highlightFeatureIndex);

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