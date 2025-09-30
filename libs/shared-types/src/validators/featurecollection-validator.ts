/**
 * Manual validators for FeatureCollection
 * These validators work with the generated types and provide additional validation logic
 */

import { DebriefFeatureCollection } from '../types/features/debrief_feature_collection';
import { validateTrackFeature } from './track-validator';
import { validatePointFeature } from './point-validator';
import { validateAnnotationFeature, validateAnnotationType, validateColorFormat } from './annotation-validator';

/**
 * Type-safe helper to check if a value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Type-safe helper to access object properties
 */
function getObjectProperty(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

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
export function validateFeatureCollection(collection: unknown): collection is DebriefFeatureCollection {
  if (!isObject(collection)) {
    return false;
  }
  
  // Check basic GeoJSON FeatureCollection structure
  if (getObjectProperty(collection, 'type') !== 'FeatureCollection') {
    return false;
  }
  
  const features = getObjectProperty(collection, 'features');
  if (!Array.isArray(features)) {
    return false;
  }
  
  // Validate bbox if present
  const bbox = getObjectProperty(collection, 'bbox');
  if (bbox !== undefined && (!Array.isArray(bbox) || !validateBbox(bbox))) {
    return false;
  }
  
  // Validate each feature has required id property
  for (const feature of features) {
    if (!isObject(feature)) {
      return false;
    }
    const id = getObjectProperty(feature, 'id');
    if (id === null || id === undefined) {
      return false; // id is required for all features
    }
  }
  
  return true;
}

/**
 * Determines the type of feature based on geometry and properties
 */
export function classifyFeature(feature: unknown): 'track' | 'point' | 'annotation' | 'unknown' {
  if (!isObject(feature)) {
    return 'unknown';
  }
  
  const geometry = getObjectProperty(feature, 'geometry');
  if (!isObject(geometry)) {
    return 'unknown';
  }
  
  const properties = getObjectProperty(feature, 'properties');
  const propertiesObj = isObject(properties) ? properties : {};
  
  // Skip validation for unsupported dataType values
  const dataType = getObjectProperty(propertiesObj, 'dataType');
  if (dataType === 'buoyfield' || dataType === 'backdrop' || dataType === 'metadata') {
    return 'unknown';
  }
  
  const geometryType = getObjectProperty(geometry, 'type');
  
  // Use dataType for classification if available
  if (typeof dataType === 'string') {
    switch (dataType) {
      case 'track':
        return 'track';
      case 'reference-point':
        return 'point';
      case 'zone':
        return 'annotation';
      default:
        // Invalid dataType values should still be validated based on geometry
        // Only 'buoyfield' and 'backdrop' should be skipped (handled above)
        break;
    }
  }
  
  // Fallback to geometry-based classification for backward compatibility
  // Track features: LineString or MultiLineString with optional timestamps
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    // If it has annotationType, it's an annotation, not a track
    const annotationType = getObjectProperty(propertiesObj, 'annotationType');
    if (annotationType !== undefined) {
      return 'annotation';
    }
    return 'track';
  }
  
  // Point features: Point geometry without annotationType
  if (geometryType === 'Point') {
    const annotationType = getObjectProperty(propertiesObj, 'annotationType');
    if (annotationType !== undefined) {
      return 'annotation';
    }
    return 'point';
  }
  
  // All other geometries are annotations
  if (typeof geometryType === 'string' && ['Polygon', 'MultiPoint', 'MultiPolygon'].indexOf(geometryType) !== -1) {
    return 'annotation';
  }
  
  return 'unknown';
}

/**
 * Validates individual feature based on its type
 */
export function validateFeatureByType(feature: unknown): boolean {
  const featureType = classifyFeature(feature);
  
  switch (featureType) {
    case 'track':
      return validateTrackFeature(feature);
    case 'point':
      return validatePointFeature(feature);
    case 'annotation':
      return validateAnnotationFeature(feature);
    case 'unknown':
      // Skip validation for unknown types (including buoyfield and backdrop)
      return true;
    default:
      return false;
  }
}

/**
 * Validates that date string or Date object is valid
 */
export function isValidDate(dateValue: unknown): boolean {
  if (dateValue instanceof Date) {
    return !isNaN(dateValue.getTime());
  }
  
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return !isNaN(parsed.getTime()) && dateValue.indexOf('T') !== -1; // Expect ISO format
  }
  
  return false;
}

/**
 * Validates feature collection properties
 */
export function validateFeatureCollectionProperties(properties: unknown): boolean {
  if (!isObject(properties)) {
    return true; // properties are optional
  }
  
  // Validate time properties if present
  const created = getObjectProperty(properties, 'created');
  if (created !== undefined && !isValidDate(created)) {
    return false;
  }
  
  const modified = getObjectProperty(properties, 'modified');
  if (modified !== undefined && !isValidDate(modified)) {
    return false;
  }
  
  // If both created and modified are present, created should be <= modified
  if (created !== undefined && modified !== undefined) {
    const createdDate = new Date(created as string | Date);
    const modifiedDate = new Date(modified as string | Date);
    if (createdDate > modifiedDate) {
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
 * Enhanced validation result with detailed feature information
 */
export interface FeatureValidationResult {
  isValid: boolean;
  errors: string[];
  featureCounts?: ReturnType<typeof getFeatureCounts>;
  featureErrors?: FeatureError[];
}

/**
 * Detailed error information for a specific feature
 */
export interface FeatureError {
  index: number;
  featureId?: string | number;
  featureType: 'track' | 'point' | 'annotation' | 'unknown';
  errors: string[];
}

/**
 * Get feature identifier for error reporting
 */
function getFeatureIdentifier(feature: unknown, index: number): string {
  if (!isObject(feature)) {
    return `index ${index} (no id)`;
  }
  const id = getObjectProperty(feature, 'id');
  if (id !== undefined && id !== null) {
    return `index ${index} (id: "${id}")`;
  }
  return `index ${index} (no id)`;
}

/**
 * Validates individual feature with detailed error reporting
 */
export function validateFeatureDetailed(feature: unknown, index: number): FeatureError | null {
  const featureType = classifyFeature(feature);
  const errors: string[] = [];
  
  // Basic structure validation
  if (!isObject(feature)) {
    errors.push('Feature is not an object');
  } else {
    const featureType = getObjectProperty(feature, 'type');
    if (featureType !== 'Feature') {
      errors.push(`Invalid feature type: "${featureType}" (expected "Feature")`);
    }
    
    const id = getObjectProperty(feature, 'id');
    if (id === null || id === undefined) {
      errors.push('Missing required "id" property');
    }
    
    const geometry = getObjectProperty(feature, 'geometry');
    if (!isObject(geometry)) {
      errors.push('Missing or invalid geometry object');
    }
    
    const properties = getObjectProperty(feature, 'properties');
    if (!isObject(properties)) {
      errors.push('Missing or invalid properties object');
    }
  }
  
  // Type-specific validation
  if (errors.length === 0 && isObject(feature)) {
    let isValidByType = false;
    const geometry = getObjectProperty(feature, 'geometry');
    const properties = getObjectProperty(feature, 'properties');
    
    switch (featureType) {
      case 'track':
        isValidByType = validateTrackFeature(feature);
        if (!isValidByType) {
          errors.push('Failed track-specific validation');
          // Add more specific track validation errors
          if (isObject(geometry)) {
            const geometryType = getObjectProperty(geometry, 'type');
            if (typeof geometryType === 'string' && ['LineString', 'MultiLineString'].indexOf(geometryType) === -1) {
              errors.push(`Track must have LineString or MultiLineString geometry, got "${geometryType}"`);
            }
          }
          if (isObject(properties)) {
            const dataType = getObjectProperty(properties, 'dataType');
            if (!dataType) {
              errors.push('Track features must have dataType: "track" in properties');
            }
          }
        }
        break;
        
      case 'point':
        isValidByType = validatePointFeature(feature);
        if (!isValidByType) {
          errors.push('Failed point-specific validation');
          // Add more specific point validation errors
          if (isObject(geometry)) {
            const geometryType = getObjectProperty(geometry, 'type');
            if (geometryType !== 'Point') {
              errors.push(`Point feature must have Point geometry, got "${geometryType}"`);
            }
          }
          if (isObject(properties)) {
            const dataType = getObjectProperty(properties, 'dataType');
            if (!dataType) {
              errors.push('Point features must have dataType: "reference-point" in properties');
            }
            const time = getObjectProperty(properties, 'time');
            const timeStart = getObjectProperty(properties, 'timeStart');
            const timeEnd = getObjectProperty(properties, 'timeEnd');
            if (time && (timeStart || timeEnd)) {
              errors.push('Cannot have both single time and time range (timeStart/timeEnd)');
            }
            if ((timeStart && !timeEnd) || (!timeStart && timeEnd)) {
              errors.push('Time range requires both timeStart and timeEnd');
            }
          }
        }
        break;
        
      case 'annotation':
        isValidByType = validateAnnotationFeature(feature);
        if (!isValidByType) {
          errors.push('Failed annotation-specific validation');
          // Add more specific annotation validation errors
          if (isObject(properties)) {
            const dataType = getObjectProperty(properties, 'dataType');
            if (!dataType) {
              errors.push('Annotation features must have dataType: "zone" in properties');
            }
            const annotationType = getObjectProperty(properties, 'annotationType');
            if (typeof annotationType === 'string' && !validateAnnotationType(annotationType)) {
              errors.push(`Invalid annotation type: "${annotationType}"`);
            }
            const color = getObjectProperty(properties, 'color');
            if (typeof color === 'string' && !validateColorFormat(color)) {
              errors.push(`Invalid color format: "${color}" (expected #RRGGBB)`);
            }
          }
        }
        break;
        
      default:
        // Don't add errors for unknown types - they are valid but not validated
        // This includes buoyfield and backdrop dataTypes
        break;
    }
  }
  
  if (errors.length === 0) {
    return null;
  }
  
  const featureId = isObject(feature) ? getObjectProperty(feature, 'id') : undefined;
  return {
    index,
    featureId: typeof featureId === 'string' || typeof featureId === 'number' ? featureId : undefined,
    featureType,
    errors
  };
}

/**
 * Comprehensive feature collection validation with enhanced error reporting
 */
export function validateFeatureCollectionComprehensive(collection: unknown): FeatureValidationResult {
  const errors: string[] = [];
  const featureErrors: FeatureError[] = [];
  
  // Basic validation
  if (!validateFeatureCollection(collection)) {
    errors.push('Invalid feature collection structure');
    return { isValid: false, errors };
  }
  
  const collectionObj = collection as DebriefFeatureCollection;
  
  // Properties validation
  if (!validateFeatureCollectionProperties(collectionObj.properties)) {
    errors.push('Invalid feature collection properties');
  }
  
  // Validate bbox if present
  if (collectionObj.bbox && !validateBbox(collectionObj.bbox)) {
    errors.push('Invalid bounding box format');
  }
  
  // Validate each feature with detailed error reporting
  collectionObj.features.forEach((feature: unknown, index: number) => {
    const featureError = validateFeatureDetailed(feature, index);
    if (featureError) {
      featureErrors.push(featureError);
      // Add summary error message
      const identifier = getFeatureIdentifier(feature, index);
      errors.push(`Feature at ${identifier} is invalid (${featureError.errors.length} error${featureError.errors.length > 1 ? 's' : ''})`);
    }
  });
  
  // Get feature counts for analysis
  const featureCounts = errors.length === 0 ? getFeatureCounts(collectionObj) : undefined;
  
  return {
    isValid: errors.length === 0,
    errors,
    featureCounts,
    featureErrors: featureErrors.length > 0 ? featureErrors : undefined
  };
}