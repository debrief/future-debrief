/**
 * Manual validators for Track features
 * These validators work with the generated types and provide additional validation logic
 */

import type { DebriefTrackFeature } from '../index';

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
 * Validates that timestamps array length matches coordinate points count
 * This is the critical cross-field validation not covered by JSON Schema
 */
export function validateTimestampsLength(feature: DebriefTrackFeature): boolean {
  if (!feature.properties || !feature.properties.timestamps) {
    return true; // timestamps are optional
  }

  if (!feature.geometry) return false;

  // Handle LineString geometry
  if (feature.geometry.type === "LineString") {
    const coordinates = (feature.geometry as any).coordinates;
    return feature.properties.timestamps.length === coordinates.length;
  }

  // Handle MultiLineString geometry
  if (feature.geometry.type === "MultiLineString") {
    const coordinates = (feature.geometry as any).coordinates;
    // Calculate total points across all LineStrings
    const totalPoints = (coordinates as Array<Array<number[]>>)
      .reduce((sum, lineString) => sum + lineString.length, 0);
    return feature.properties.timestamps.length === totalPoints;
  }
  
  return false;
}

/**
 * Validates that track feature has required properties and valid structure
 */
export function validateTrackFeature(feature: unknown): feature is DebriefTrackFeature {
  if (!isObject(feature)) {
    return false;
  }
  
  // Check basic GeoJSON structure
  if (getObjectProperty(feature, 'type') !== 'Feature') {
    return false;
  }
  
  const id = getObjectProperty(feature, 'id');
  if (id === null || id === undefined) {
    return false; // id is required (can be 0 but not null/undefined)
  }
  
  // Check geometry
  const geometry = getObjectProperty(feature, 'geometry');
  if (!isObject(geometry)) {
    return false;
  }
  
  const validGeometryTypes = ['LineString', 'MultiLineString'];
  const geometryType = getObjectProperty(geometry, 'type');
  if (typeof geometryType !== 'string' || validGeometryTypes.indexOf(geometryType) === -1) {
    return false;
  }
  
  const coordinates = getObjectProperty(geometry, 'coordinates');
  if (!Array.isArray(coordinates)) {
    return false;
  }
  
  // Check properties
  const properties = getObjectProperty(feature, 'properties');
  if (!isObject(properties)) {
    return false;
  }
  
  // Check required dataType discriminator
  if (getObjectProperty(properties, 'dataType') !== 'track') {
    return false;
  }
  
  // Validate timestamps if present
  const timestamps = getObjectProperty(properties, 'timestamps');
  if (timestamps !== undefined) {
    if (!Array.isArray(timestamps)) {
      return false;
    }
    
    // Check each timestamp is a valid date string or Date object
    for (const timestamp of timestamps) {
      if (typeof timestamp === 'string') {
        if (isNaN(Date.parse(timestamp))) {
          return false;
        }
      } else if (!(timestamp instanceof Date)) {
        return false;
      }
    }
    
    // Apply timestamps length validation
    if (!validateTimestampsLength(feature as unknown as DebriefTrackFeature)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates coordinate structure for LineString
 */
export function validateLineStringCoordinates(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates)) {
    return false;
  }
  
  if (coordinates.length < 2) {
    return false; // LineString must have at least 2 points
  }
  
  return coordinates.every(coord => 
    Array.isArray(coord) && 
    coord.length >= 2 && 
    coord.length <= 3 &&
    coord.every(val => typeof val === 'number')
  );
}

/**
 * Validates coordinate structure for MultiLineString
 */
export function validateMultiLineStringCoordinates(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates)) {
    return false;
  }
  
  if (coordinates.length < 1) {
    return false; // MultiLineString must have at least 1 LineString
  }
  
  return coordinates.every(lineString => validateLineStringCoordinates(lineString));
}

/**
 * Comprehensive track feature validation
 */
export function validateTrackFeatureComprehensive(feature: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!validateTrackFeature(feature)) {
    errors.push('Invalid track feature structure');
    return { isValid: false, errors };
  }
  
  const validatedFeature = feature as DebriefTrackFeature;
  
  // Detailed coordinate validation
  if (!validatedFeature.geometry) {
    errors.push('Geometry is required');
  } else if (validatedFeature.geometry.type === 'LineString') {
    if (!validateLineStringCoordinates(validatedFeature.geometry.coordinates)) {
      errors.push('Invalid LineString coordinates');
    }
  } else if (validatedFeature.geometry.type === 'MultiLineString') {
    if (!validateMultiLineStringCoordinates(validatedFeature.geometry.coordinates)) {
      errors.push('Invalid MultiLineString coordinates');
    }
  }
  
  // Timestamps validation
  if (!validateTimestampsLength(validatedFeature)) {
    errors.push('Timestamps array length does not match coordinate points count');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}