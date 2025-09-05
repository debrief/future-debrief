import React from 'react';
import { Polygon } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getFeatureStyle } from '../utils/featureUtils';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { useFeatureHighlight } from '../hooks/useFeatureHighlight';
import { TrackPolyline } from './TrackPolyline';
import { PointMarker } from './PointMarker';

interface ZonePolygonProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  selectedFeatureIndices: number[];
  selectedFeatureIds: (string | number)[];
  highlightFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  geoJsonData: { features: GeoJSONFeature[] };
}

export const ZonePolygon: React.FC<ZonePolygonProps> = (props) => {
  const { feature, featureIndex, selectedFeatureIndices, onSelectionChange, geoJsonData, highlightFeatureIndex } = props;
  const { isSelected, bindEventHandlers } = useFeatureSelection(
    feature, featureIndex, selectedFeatureIndices, onSelectionChange, geoJsonData
  );
  
  useFeatureHighlight(feature, featureIndex, highlightFeatureIndex);

  const style = getFeatureStyle(feature, isSelected);

  // Handle different geometry types for zones
  if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
    return <PointMarker {...props} />;
  }
  
  if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
    return <TrackPolyline {...props} />;
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