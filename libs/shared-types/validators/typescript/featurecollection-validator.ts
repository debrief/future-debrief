/**
 * Manual validators for FeatureCollection
 * These validators work with the generated types and provide additional validation logic
 */

import { DebriefFeatureCollection } from '../../derived/typescript/featurecollection';
import { validateTrackFeature } from './track-validator';
import { validatePointFeature } from './point-validator';
import { validateAnnotationFeature } from './annotation-validator';

/**
 * Validates bounding box format
 */
export function validateBbox(bbox: number[]): boolean {
  // Must be either 2D bbox [minX, minY, maxX, maxY] or 3D bbox [minX, minY, minZ, maxX, maxY, maxZ]
  if (bbox.length !== 4 && bbox.length !== 6) {
    return false;
  }
  
  // Check all values are numbers
  if (!bbox.every(val => typeof val === 'number' && isFinite(val))) {
    return false;
  }
  
  // For 2D bbox: minX <= maxX and minY <= maxY
  if (bbox.length === 4) {
    const [minX, minY, maxX, maxY] = bbox;
    return minX <= maxX && minY <= maxY;
  }
  
  // For 3D bbox: minX <= maxX, minY <= maxY, minZ <= maxZ
  if (bbox.length === 6) {
    const [minX, minY, minZ, maxX, maxY, maxZ] = bbox;
    return minX <= maxX && minY <= maxY && minZ <= maxZ;
  }
  
  return false;
}

/**
 * Validates that feature collection has required properties and valid structure
 */
export function validateFeatureCollection(collection: any): collection is DebriefFeatureCollection {
  if (!collection || typeof collection !== 'object') {
    return false;
  }
  
  // Check basic GeoJSON FeatureCollection structure
  if (collection.type !== 'FeatureCollection') {
    return false;
  }
  
  if (!Array.isArray(collection.features)) {
    return false;
  }
  
  // Validate bbox if present
  if (collection.bbox && !validateBbox(collection.bbox)) {
    return false;
  }
  
  // Validate each feature has required id property
  for (const feature of collection.features) {
    if (!feature.id && feature.id !== 0) {
      return false; // id is required for all features
    }
  }
  
  return true;
}

/**
 * Determines the type of feature based on geometry and properties
 */
export function classifyFeature(feature: any): 'track' | 'point' | 'annotation' | 'unknown' {
  if (!feature || !feature.geometry) {
    return 'unknown';
  }
  
  const geometryType = feature.geometry.type;
  const properties = feature.properties || {};
  
  // Track features: LineString or MultiLineString with optional timestamps
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    // If it has annotationType, it's an annotation, not a track
    if (properties.annotationType) {
      return 'annotation';
    }
    return 'track';
  }
  
  // Point features: Point geometry without annotationType
  if (geometryType === 'Point') {
    if (properties.annotationType) {
      return 'annotation';
    }
    return 'point';
  }
  
  // All other geometries are annotations
  if (['Polygon', 'MultiPoint', 'MultiPolygon'].includes(geometryType)) {
    return 'annotation';
  }
  
  return 'unknown';
}

/**
 * Validates individual feature based on its type
 */
export function validateFeatureByType(feature: any): boolean {
  const featureType = classifyFeature(feature);
  
  switch (featureType) {
    case 'track':
      return validateTrackFeature(feature);
    case 'point':
      return validatePointFeature(feature);
    case 'annotation':
      return validateAnnotationFeature(feature);
    default:
      return false;
  }
}

/**
 * Validates that date string or Date object is valid
 */
export function isValidDate(dateValue: any): boolean {
  if (dateValue instanceof Date) {
    return !isNaN(dateValue.getTime());
  }
  
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return !isNaN(parsed.getTime()) && dateValue.includes('T'); // Expect ISO format
  }
  
  return false;
}

/**
 * Validates feature collection properties
 */
export function validateFeatureCollectionProperties(properties: any): boolean {
  if (!properties || typeof properties !== 'object') {
    return true; // properties are optional
  }
  
  // Validate time properties if present
  if (properties.created && !isValidDate(properties.created)) {
    return false;
  }
  
  if (properties.modified && !isValidDate(properties.modified)) {
    return false;
  }
  
  // If both created and modified are present, created should be <= modified
  if (properties.created && properties.modified) {
    const created = new Date(properties.created);
    const modified = new Date(properties.modified);
    if (created > modified) {
      return false;
    }
  }
  
  return true;
}

/**
 * Gets feature counts by type
 */
export function getFeatureCounts(collection: DebriefFeatureCollection): {
  tracks: number;
  points: number;
  annotations: number;
  unknown: number;
  total: number;
} {
  const counts = {
    tracks: 0,
    points: 0,
    annotations: 0,
    unknown: 0,
    total: collection.features.length
  };
  
  collection.features.forEach(feature => {
    const type = classifyFeature(feature);
    switch (type) {
      case 'track':
        counts.tracks++;
        break;
      case 'point':
        counts.points++;
        break;
      case 'annotation':
        counts.annotations++;
        break;
      default:
        counts.unknown++;
        break;
    }
  });
  
  return counts;
}

/**
 * Comprehensive feature collection validation
 */
export function validateFeatureCollectionComprehensive(collection: any): {
  isValid: boolean;
  errors: string[];
  featureCounts?: ReturnType<typeof getFeatureCounts>;
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!validateFeatureCollection(collection)) {
    errors.push('Invalid feature collection structure');
    return { isValid: false, errors };
  }
  
  // Properties validation
  if (!validateFeatureCollectionProperties(collection.properties)) {
    errors.push('Invalid feature collection properties');
  }
  
  // Validate bbox if present
  if (collection.bbox && !validateBbox(collection.bbox)) {
    errors.push('Invalid bounding box format');
  }
  
  // Validate each feature
  const featureErrors: string[] = [];
  collection.features.forEach((feature: any, index: number) => {
    if (!validateFeatureByType(feature)) {
      featureErrors.push(`Feature at index ${index} is invalid`);
    }
  });
  
  errors.push(...featureErrors);
  
  // Get feature counts for analysis
  const featureCounts = errors.length === 0 ? getFeatureCounts(collection) : undefined;
  
  return {
    isValid: errors.length === 0,
    errors,
    featureCounts
  };
}