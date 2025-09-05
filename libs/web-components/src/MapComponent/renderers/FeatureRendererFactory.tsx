import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { TrackRenderer, TrackRendererProps } from './TrackRenderer';
import { PointRenderer, PointRendererProps } from './PointRenderer';
import { ZoneRenderer, ZoneRendererProps } from './ZoneRenderer';
import { DebriefFeatureProps } from './DebriefFeature';

export interface FeatureRendererFactoryProps extends DebriefFeatureProps {
  /** Whether to filter visible features (default: true) */
  filterVisible?: boolean;
}

export const FeatureRendererFactory: React.FC<FeatureRendererFactoryProps> = ({
  feature,
  featureIndex,
  selectedFeatureIndices,
  selectedFeatureIds,
  highlightFeatureIndex,
  onSelectionChange,
  geoJsonData,
  filterVisible = true
}) => {
  // Filter out invisible features
  if (filterVisible && feature.properties?.visible === false) {
    return null;
  }

  const dataType = feature.properties?.dataType;

  // Route to specific renderer based on dataType
  switch (dataType) {
    case 'track':
      // Validate that it has the correct geometry for tracks
      if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
        return (
          <TrackRenderer
            feature={feature as TrackRendererProps['feature']}
            featureIndex={featureIndex}
            selectedFeatureIndices={selectedFeatureIndices}
            selectedFeatureIds={selectedFeatureIds}
            highlightFeatureIndex={highlightFeatureIndex}
            onSelectionChange={onSelectionChange}
            geoJsonData={geoJsonData}
          />
        );
      }
      break;
      
    case 'reference-point':
      // Validate that it has the correct geometry for points
      if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
        return (
          <PointRenderer
            feature={feature as PointRendererProps['feature']}
            featureIndex={featureIndex}
            selectedFeatureIndices={selectedFeatureIndices}
            selectedFeatureIds={selectedFeatureIds}
            highlightFeatureIndex={highlightFeatureIndex}
            onSelectionChange={onSelectionChange}
            geoJsonData={geoJsonData}
          />
        );
      }
      break;
      
    case 'zone':
      // Zone annotations can have any geometry type
      return (
        <ZoneRenderer
          feature={feature as ZoneRendererProps['feature']}
          featureIndex={featureIndex}
          selectedFeatureIndices={selectedFeatureIndices}
          selectedFeatureIds={selectedFeatureIds}
          highlightFeatureIndex={highlightFeatureIndex}
          onSelectionChange={onSelectionChange}
          geoJsonData={geoJsonData}
        />
      );
      
    // Handle special cases for unknown types that should still be rendered
    case 'buoyfield':
    case 'backdrop':
    default:
      // Fall back to standard GeoJSON rendering for unrecognized or invalid dataTypes
      return (
        <FallbackRenderer
          feature={feature}
          featureIndex={featureIndex}
          geoJsonData={geoJsonData}
        />
      );
  }

  // If dataType validation failed, fall back to standard rendering
  return (
    <FallbackRenderer
      feature={feature}
      featureIndex={featureIndex}
      geoJsonData={geoJsonData}
    />
  );
};

interface FallbackRendererProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  geoJsonData: { features: GeoJSONFeature[] };
}

const FallbackRenderer: React.FC<FallbackRendererProps> = ({
  feature,
  featureIndex,
  geoJsonData: _geoJsonData
}) => {
  // GeoJSON styling function matching original implementation
  const geoJsonStyle = (geoFeature?: GeoJSON.Feature) => {
    if (!geoFeature?.properties) {
      return {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.2
      };
    }

    const props = geoFeature.properties;
    const style: Record<string, unknown> = {};

    // Track lines - use stroke color
    if (props.stroke) {
      style.color = props.stroke;
    } else {
      style.color = '#3388ff';
    }

    // Zone shapes - handle stroke, fill, and fill-opacity
    if (props.fill) {
      style.fillColor = props.fill;
    }
    if (props['fill-opacity'] !== undefined) {
      style.fillOpacity = props['fill-opacity'];
    } else {
      style.fillOpacity = 0.2;
    }

    // Default weight and opacity
    style.weight = 3;
    style.opacity = 0.8;

    return style;
  };

  const pointToLayer = (geoFeature: GeoJSON.Feature, latlng: L.LatLng) => {
    const props = geoFeature.properties;
    const markerColor = props?.['marker-color'] || props?.color || '#00F';
    
    // Check if this is a buoyfield - use smaller 5px radius markers
    const isBuoyfield = props?.type === 'buoyfield' || props?.name?.toLowerCase().includes('buoy');
    const radius = isBuoyfield ? 5 : 8;
    
    return L.circleMarker(latlng, {
      radius: radius,
      fillColor: markerColor,
      color: markerColor,
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.7
    });
  };

  const onEachFeature = (geoFeature: GeoJSON.Feature, layer: L.Layer) => {
    // Bind popup with feature info
    if (geoFeature.properties?.name) {
      layer.bindPopup(geoFeature.properties.name);
    }
  };

  return (
    <GeoJSON
      key={`fallback-${featureIndex}`}
      data={feature}
      style={geoJsonStyle}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
};