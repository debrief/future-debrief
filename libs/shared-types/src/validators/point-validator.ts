/**
 * Manual validators for Point features
 * These validators work with the generated types and provide additional validation logic
 */

import { DebriefPointFeature } from '../types/FeatureCollection';

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
 * Validates that point has valid time properties
 * Either single time OR time range (start/end) should be provided, not both
 */
export function validateTimeProperties(feature: DebriefPointFeature): boolean {
  const { time, timeStart, timeEnd } = feature.properties;
  
  // Either single time OR time range (start/end) should be provided, not both
  if (time && (timeStart || timeEnd)) {
    return false; // Cannot have both single time and time range
  }
  
  // If time range is provided, both start and end should be present
  if ((timeStart && !timeEnd) || (!timeStart && timeEnd)) {
    return false; // Time range requires both start and end
  }
  
  // If timeStart and timeEnd are provided, start should be before end
  if (timeStart && timeEnd) {
    const start = new Date(timeStart);
    const end = new Date(timeEnd);
    if (start >= end) {
      return false; // Start time must be before end time
    }
  }
  
  return true;
}

/**
 * Validates that point feature has required properties and valid structure
 */
export function validatePointFeature(feature: unknown): feature is DebriefPointFeature {
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
  
  if (getObjectProperty(geometry, 'type') !== 'Point') {
    return false;
  }
  
  const coordinates = getObjectProperty(geometry, 'coordinates');
  if (!Array.isArray(coordinates)) {
    return false;
  }
  
  // Validate coordinates [lon, lat] or [lon, lat, elevation]
  if (coordinates.length < 2 || coordinates.length > 3) {
    return false;
  }
  
  if (!coordinates.every((coord: unknown) => typeof coord === 'number')) {
    return false;
  }
  
  // Check properties
  const properties = getObjectProperty(feature, 'properties');
  if (!isObject(properties)) {
    return false;
  }
  
  // Check required dataType discriminator
  if (getObjectProperty(properties, 'dataType') !== 'reference-point') {
    return false;
  }
  
  // Validate time properties if present
  return validateTimeProperties(feature as unknown as DebriefPointFeature);
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
 * Validates coordinate values are within valid geographic ranges
 */
export function validateGeographicCoordinates(coordinates: number[]): boolean {
  const [lon, lat, elevation] = coordinates;
  
  // Longitude: -180 to 180
  if (lon < -180 || lon > 180) {
    return false;
  }
  
  // Latitude: -90 to 90
  if (lat < -90 || lat > 90) {
    return false;
  }
  
  // Elevation is optional, but if present should be reasonable
  if (elevation !== undefined) {
    // Allow elevation from -11000m (deepest ocean) to 9000m (highest mountains)
    if (elevation < -11000 || elevation > 9000) {
      return false;
    }
  }
  
  return true;
}

/**
 * Comprehensive point feature validation
 */
export function validatePointFeatureComprehensive(feature: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!validatePointFeature(feature)) {
    errors.push('Invalid point feature structure');
    return { isValid: false, errors };
  }
  
  const validatedFeature = feature as DebriefPointFeature;
  
  // Geographic coordinate validation
  if (!validateGeographicCoordinates(validatedFeature.geometry.coordinates)) {
    errors.push('Coordinates are outside valid geographic ranges');
  }
  
  // Time property validation
  if (!validateTimeProperties(validatedFeature)) {
    errors.push('Invalid time properties configuration');
  }
  
  // Individual date validation
  const { time, timeStart, timeEnd } = validatedFeature.properties;
  if (time && !isValidDate(time)) {
    errors.push('Invalid time format');
  }
  if (timeStart && !isValidDate(timeStart)) {
    errors.push('Invalid timeStart format');
  }
  if (timeEnd && !isValidDate(timeEnd)) {
    errors.push('Invalid timeEnd format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}