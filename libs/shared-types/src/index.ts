/**
 * TypeScript Validators for Debrief Shared Types
 * Manual validators that work with generated types
 */

// Track validators
export {
  validateTimestampsLength,
  validateTrackFeature,
  validateLineStringCoordinates,
  validateMultiLineStringCoordinates,
  validateTrackFeatureComprehensive
} from './validators/track-validator';

// Point validators
export {
  validateTimeProperties,
  validatePointFeature,
  isValidDate as isValidPointDate,
  validateGeographicCoordinates,
  validatePointFeatureComprehensive
} from './validators/point-validator';

// Annotation validators
export {
  validateColorFormat,
  validateAnnotationType,
  validateAnnotationFeature,
  validateGeometryCoordinates,
  validateAnnotationFeatureComprehensive
} from './validators/annotation-validator';

// FeatureCollection validators
export {
  validateBbox,
  validateFeatureCollection,
  classifyFeature,
  validateFeatureByType,
  validateFeatureCollectionProperties,
  getFeatureCounts,
  validateFeatureCollectionComprehensive
} from './validators/featurecollection-validator';

// Re-export types for convenience
export type { 
  DebriefTrackFeature, 
  DebriefPointFeature, 
  DebriefAnnotationFeature, 
  DebriefFeatureCollection 
} from './types/featurecollection';