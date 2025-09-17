/**
 * Manual validators for Annotation features
 * These validators work with the generated types and provide additional validation logic
 */

import { DebriefAnnotationFeature } from '../types/FeatureCollection';

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
 * Validates color format (hex color)
 */
export function validateColorFormat(color: string): boolean {
  const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
  return hexColorRegex.test(color);
}

/**
 * Validates annotation type
 */
export function validateAnnotationType(annotationType: string): boolean {
  const validTypes = ['label', 'area', 'measurement', 'comment', 'boundary'];
  return validTypes.indexOf(annotationType) !== -1;
}

/**
 * Validates that annotation feature has required properties and valid structure
 */
export function validateAnnotationFeature(feature: unknown): feature is DebriefAnnotationFeature {
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
  
  const validGeometryTypes = [
    'Point', 'LineString', 'Polygon', 
    'MultiPoint', 'MultiLineString', 'MultiPolygon'
  ];
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
  if (getObjectProperty(properties, 'dataType') !== 'zone') {
    return false;
  }
  
  // Validate specific annotation properties
  const annotationType = getObjectProperty(properties, 'annotationType');
  if (annotationType !== undefined && typeof annotationType === 'string' && !validateAnnotationType(annotationType)) {
    return false;
  }
  
  const color = getObjectProperty(properties, 'color');
  if (color !== undefined && typeof color === 'string' && !validateColorFormat(color)) {
    return false;
  }
  
  return true;
}

/**
 * Validates Point geometry coordinates
 */
export function validatePointCoordinates(coordinates: unknown): boolean {
  return Array.isArray(coordinates) && 
         coordinates.length >= 2 && 
         coordinates.length <= 3 &&
         coordinates.every(coord => typeof coord === 'number');
}

/**
 * Validates LineString geometry coordinates
 */
export function validateLineStringCoordinates(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return false;
  }
  return coordinates.every(coord => validatePointCoordinates(coord));
}

/**
 * Validates Polygon geometry coordinates
 */
export function validatePolygonCoordinates(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates) || coordinates.length < 1) {
    return false;
  }
  
  // Each ring must be a closed LineString (first and last points equal)
  return coordinates.every(ring => {
    if (!Array.isArray(ring) || ring.length < 4) {
      return false; // Polygon ring must have at least 4 points (closed)
    }
    
    // Check all coordinates are valid
    if (!ring.every(coord => validatePointCoordinates(coord))) {
      return false;
    }
    
    // Check if ring is closed (first and last points are equal)
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first.length === last.length && 
           first.every((val: number, i: number) => val === last[i]);
  });
}

/**
 * Validates MultiPoint geometry coordinates
 */
export function validateMultiPointCoordinates(coordinates: unknown): boolean {
  return Array.isArray(coordinates) &&
         coordinates.every(coord => validatePointCoordinates(coord));
}

/**
 * Validates MultiLineString geometry coordinates
 */
export function validateMultiLineStringCoordinates(coordinates: unknown): boolean {
  return Array.isArray(coordinates) &&
         coordinates.every(lineString => validateLineStringCoordinates(lineString));
}

/**
 * Validates MultiPolygon geometry coordinates
 */
export function validateMultiPolygonCoordinates(coordinates: unknown): boolean {
  return Array.isArray(coordinates) &&
         coordinates.every(polygon => validatePolygonCoordinates(polygon));
}

/**
 * Validates geometry coordinates based on type
 */
export function validateGeometryCoordinates(geometry: any): boolean {
  switch (geometry.type) {
    case 'Point':
      return validatePointCoordinates(geometry.coordinates);
    case 'LineString':
      return validateLineStringCoordinates(geometry.coordinates);
    case 'Polygon':
      return validatePolygonCoordinates(geometry.coordinates);
    case 'MultiPoint':
      return validateMultiPointCoordinates(geometry.coordinates);
    case 'MultiLineString':
      return validateMultiLineStringCoordinates(geometry.coordinates);
    case 'MultiPolygon':
      return validateMultiPolygonCoordinates(geometry.coordinates);
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
 * Comprehensive annotation feature validation
 */
export function validateAnnotationFeatureComprehensive(feature: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!validateAnnotationFeature(feature)) {
    errors.push('Invalid annotation feature structure');
    return { isValid: false, errors };
  }
  
  const validatedFeature = feature as DebriefAnnotationFeature;
  
  // Detailed geometry validation
  if (!validateGeometryCoordinates(validatedFeature.geometry)) {
    errors.push('Invalid geometry coordinates');
  }
  
  const props = validatedFeature.properties;
  
  // Color validation
  if (props.color && !validateColorFormat(props.color)) {
    errors.push('Invalid color format (must be #RRGGBB)');
  }
  
  // Annotation type validation
  if (props.annotationType && !validateAnnotationType(props.annotationType)) {
    errors.push('Invalid annotation type');
  }
  
  // Time validation
  if (props.time && !isValidDate(props.time)) {
    errors.push('Invalid time format');
  }
  
  // Text validation for certain annotation types
  if (props.annotationType === 'label' && (!props.text || props.text.trim().length === 0)) {
    errors.push('Label annotations must have non-empty text');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}