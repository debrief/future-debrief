import React from 'react';
import { CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { DebriefFeatureProps, useFeatureLayerManager, useFeatureHighlight } from './DebriefFeature';

export interface PointRendererProps extends DebriefFeatureProps {
  feature: GeoJSONFeature & {
    geometry: {
      type: 'Point' | 'MultiPoint';
      coordinates: number[] | number[][];
    };
    properties: {
      dataType?: 'reference-point';
      color?: string;
      'marker-color'?: string;
      [key: string]: unknown;
    };
  };
}

export const PointRenderer: React.FC<PointRendererProps> = ({
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

  // Get point coordinates for React-Leaflet CircleMarker
  const getPointCoordinates = (): L.LatLngExpression[] => {
    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates as number[];
      return [[coords[1], coords[0]]];
    } else if (feature.geometry.type === 'MultiPoint') {
      return (feature.geometry.coordinates as number[][]).map(coord => [coord[1], coord[0]]);
    }
    return [];
  };

  // Get styling for point markers
  const getPointStyle = () => {
    const props = feature.properties || {};
    const markerColor = props['marker-color'] || props.color || '#00F';
    
    // Check if this is a buoyfield - use smaller 5px radius markers
    const isBuoyfield = props.type === 'buoyfield' || props.name?.toLowerCase().includes('buoy');
    const radius = isBuoyfield ? 5 : 8;
    
    return {
      radius: radius,
      fillColor: markerColor,
      color: markerColor,
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.7
    };
  };

  const coordinates = getPointCoordinates();
  const style = getPointStyle();

  // Handle layer registration for the first (or only) point
  const handleMarkerRef = (marker: L.CircleMarker | null) => {
    if (marker) {
      layerManager.addLayer(featureIndex, marker);
    } else {
      layerManager.removeLayer(featureIndex);
    }
  };

  if (coordinates.length === 0) return null;

  return (
    <>
      {coordinates.map((coord, pointIndex) => (
        <CircleMarker
          key={`${featureIndex}-${pointIndex}`}
          ref={pointIndex === 0 ? handleMarkerRef : undefined} // Only register the first point for click handling
          center={coord}
          radius={style.radius}
          pathOptions={style}
        />
      ))}
    </>
  );
};