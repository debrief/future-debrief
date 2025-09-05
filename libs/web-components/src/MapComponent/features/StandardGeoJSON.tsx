import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { bindFeaturePopup } from '../utils/featureUtils';

interface StandardGeoJSONProps {
  feature: GeoJSONFeature;
  featureIndex: number;
  selectedFeatureIds: (string | number)[];
  revealFeatureIndex?: number;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  geoJsonData: { features: GeoJSONFeature[] };
}

export const StandardGeoJSON: React.FC<StandardGeoJSONProps> = ({ feature }) => {
  // Simple fallback using standard GeoJSON component
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
    return {
      color: props.stroke || '#3388ff',
      fillColor: props.fill || props.stroke || '#3388ff',
      fillOpacity: props['fill-opacity'] !== undefined ? props['fill-opacity'] : 0.2,
      weight: 3,
      opacity: 0.8
    };
  };

  const pointToLayer = (geoFeature: GeoJSON.Feature, latlng: L.LatLng) => {
    const props = geoFeature.properties;
    const markerColor = props?.['marker-color'] || props?.color || '#00F';
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
    bindFeaturePopup(layer, feature);
  };

  return (
    <GeoJSON
      key={`fallback-${feature.id || Math.random()}`}
      data={feature}
      style={geoJsonStyle}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
};