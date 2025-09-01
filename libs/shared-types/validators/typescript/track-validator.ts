/**
 * Manual validators for Track features
 * These validators work with the generated types and provide additional validation logic
 */

import { TrackFeature } from '../../derived/typescript/track';

/**
 * Validates that timestamps array length matches coordinate points count
 * This is the critical cross-field validation not covered by JSON Schema
 */
export function validateTimestampsLength(feature: TrackFeature): boolean {
  if (!feature.properties.timestamps) {
    return true; // timestamps are optional
  }
  
  const coordinates = feature.geometry.coordinates;
  
  // Handle LineString geometry
  if (feature.geometry.type === "LineString") {
    return feature.properties.timestamps.length === coordinates.length;
  }
  
  // Handle MultiLineString geometry
  if (feature.geometry.type === "MultiLineString") {
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
export function validateTrackFeature(feature: any): feature is TrackFeature {
  if (!feature || typeof feature !== 'object') {
    return false;
  }
  
  // Check basic GeoJSON structure
  if (feature.type !== 'Feature') {
    return false;
  }
  
  if (!feature.id && feature.id !== 0) {
    return false; // id is required (can be 0 but not null/undefined)
  }
  
  // Check geometry
  if (!feature.geometry || typeof feature.geometry !== 'object') {
    return false;
  }
  
  const validGeometryTypes = ['LineString', 'MultiLineString'];
  if (!validGeometryTypes.includes(feature.geometry.type)) {
    return false;
  }
  
  if (!Array.isArray(feature.geometry.coordinates)) {
    return false;
  }
  
  // Check properties
  if (!feature.properties || typeof feature.properties !== 'object') {
    return false;
  }
  
  // Validate timestamps if present
  if (feature.properties.timestamps) {
    if (!Array.isArray(feature.properties.timestamps)) {
      return false;
    }
    
    // Check each timestamp is a valid date string or Date object
    for (const timestamp of feature.properties.timestamps) {
      if (typeof timestamp === 'string') {
        if (isNaN(Date.parse(timestamp))) {
          return false;
        }
      } else if (!(timestamp instanceof Date)) {
        return false;
      }
    }
    
    // Apply timestamps length validation
    if (!validateTimestampsLength(feature as TrackFeature)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates coordinate structure for LineString
 */
export function validateLineStringCoordinates(coordinates: any): boolean {
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
export function validateMultiLineStringCoordinates(coordinates: any): boolean {
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
export function validateTrackFeatureComprehensive(feature: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!validateTrackFeature(feature)) {
    errors.push('Invalid track feature structure');
    return { isValid: false, errors };
  }
  
  // Detailed coordinate validation
  if (feature.geometry.type === 'LineString') {
    if (!validateLineStringCoordinates(feature.geometry.coordinates)) {
      errors.push('Invalid LineString coordinates');
    }
  } else if (feature.geometry.type === 'MultiLineString') {
    if (!validateMultiLineStringCoordinates(feature.geometry.coordinates)) {
      errors.push('Invalid MultiLineString coordinates');
    }
  }
  
  // Timestamps validation
  if (!validateTimestampsLength(feature)) {
    errors.push('Timestamps array length does not match coordinate points count');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}