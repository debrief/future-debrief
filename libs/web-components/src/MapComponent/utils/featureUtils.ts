import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';

/**
 * Centralized utilities for feature property handling and styling
 */

export const getFeatureColor = (feature: GeoJSONFeature): string => {
  const props = feature.properties;
  return props?.marker_color || props?.color || props?.stroke || '#3388ff';
};

export const getFeatureFillColor = (feature: GeoJSONFeature): string => {
  const props = feature.properties;
  return props?.fill || getFeatureColor(feature);
};

export const getFeatureFillOpacity = (feature: GeoJSONFeature): number => {
  const props = feature.properties;
  return props?.['fill-opacity'] !== undefined ? props['fill-opacity'] : 0.2;
};

export const isBuoyfield = (feature: GeoJSONFeature): boolean => {
  const props = feature.properties;
  return props?.type === 'buoyfield' || props?.name?.toLowerCase().includes('buoy');
};

export const getPointRadius = (feature: GeoJSONFeature): number => {
  return isBuoyfield(feature) ? 5 : 8;
};

export const getFeatureStyle = (feature: GeoJSONFeature, isSelected = false) => {
  const strokeColor = getFeatureColor(feature);
  const fillColor = getFeatureFillColor(feature);
  const fillOpacity = getFeatureFillOpacity(feature);

  if (isSelected) {
    return {
      color: strokeColor,  // Keep original color
      weight: 4,
      opacity: 1,
      fillColor: fillColor,
      fillOpacity: Math.min(fillOpacity + 0.2, 0.8),
      className: 'selected-feature'
    };
  }

  return {
    color: strokeColor,
    weight: 3,
    opacity: 0.8,
    fillColor: fillColor,
    fillOpacity: fillOpacity
  };
};

export const getPointStyle = (feature: GeoJSONFeature, isSelected = false) => {
  const baseColor = getFeatureColor(feature);
  const baseRadius = getPointRadius(feature);
  
  if (isSelected) {
    return {
      radius: baseRadius + 2,
      fillColor: baseColor,
      color: '#ffffff',
      weight: 5,
      opacity: 1,
      fillOpacity: 0.9,
      className: 'selected-feature'
    };
  }

  return {
    radius: baseRadius,
    fillColor: baseColor,
    color: baseColor,
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.7,
    className: ''
  };
};

export const bindFeaturePopup = (layer: L.Layer, feature: GeoJSONFeature): void => {
  if (feature.properties?.name) {
    layer.bindPopup(feature.properties.name);
  }
};

export const isFeatureVisible = (feature: GeoJSONFeature): boolean => {
  return feature.properties?.visible !== false;
};