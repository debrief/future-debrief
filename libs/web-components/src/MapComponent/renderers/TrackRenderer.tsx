import React from 'react';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { DebriefFeatureProps, useFeatureLayerManager, useFeatureHighlight } from './DebriefFeature';

export interface TrackRendererProps extends DebriefFeatureProps {
  feature: GeoJSONFeature & {
    geometry: {
      type: 'LineString' | 'MultiLineString';
      coordinates: number[][][] | number[][];
    };
    properties: {
      dataType?: 'track';
      stroke?: string;
      [key: string]: unknown;
    };
  };
}

export const TrackRenderer: React.FC<TrackRendererProps> = ({
  feature,
  featureIndex,
  selectedFeatureIndices,
  selectedFeatureIds,
  highlightFeatureIndex,
  onSelectionChange,
  geoJsonData
}) => {
  const layerManager = useFeatureLayerManager(
    geoJsonData,
    selectedFeatureIndices,
    selectedFeatureIds,
    onSelectionChange
  );

  useFeatureHighlight(feature, featureIndex, highlightFeatureIndex);

  // Prepare coordinates for React-Leaflet Polyline
  const getTrackCoordinates = (): L.LatLngExpression[][] | L.LatLngExpression[] => {
    if (feature.geometry.type === 'LineString') {
      return (feature.geometry.coordinates as number[][]).map(coord => [coord[1], coord[0]] as L.LatLngExpression);
    } else if (feature.geometry.type === 'MultiLineString') {
      return (feature.geometry.coordinates as number[][][]).map(line =>
        line.map(coord => [coord[1], coord[0]] as L.LatLngExpression)
      );
    }
    return [];
  };

  // Get styling from feature properties
  const getTrackStyle = () => {
    const props = feature.properties || {};
    const strokeColor = props.stroke || '#3388ff';
    
    return {
      color: strokeColor,
      weight: 3,
      opacity: 0.8
    };
  };

  const coordinates = getTrackCoordinates();
  const style = getTrackStyle();

  // Handle layer registration
  const handlePathRef = (path: L.Polyline | null) => {
    if (path) {
      layerManager.addLayer(featureIndex, path);
    } else {
      layerManager.removeLayer(featureIndex);
    }
  };

  if (feature.geometry.type === 'LineString') {
    return (
      <Polyline
        ref={handlePathRef}
        positions={coordinates as L.LatLngExpression[]}
        pathOptions={style}
      />
    );
  } else if (feature.geometry.type === 'MultiLineString') {
    // For MultiLineString, render multiple Polylines
    return (
      <>
        {(coordinates as L.LatLngExpression[][]).map((lineCoords, lineIndex) => (
          <Polyline
            key={`${featureIndex}-${lineIndex}`}
            ref={lineIndex === 0 ? handlePathRef : undefined} // Only register the first line for click handling
            positions={lineCoords}
            pathOptions={style}
          />
        ))}
      </>
    );
  }

  return null;
};