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
} from './types/FeatureCollection';

// Re-export state types
export type { TimeState } from './types/TimeState';
export type { ViewportState } from './types/ViewportState';
export type { SelectionState } from './types/SelectionState';
export type { EditorState } from './types/EditorState';
export type { CurrentState } from './types/CurrentState';

// Import types for union
import type {
  DebriefTrackFeature,
  DebriefPointFeature,
  DebriefAnnotationFeature
} from './types/FeatureCollection';

// Union type for any Debrief feature
export type DebriefFeature = DebriefTrackFeature | DebriefPointFeature | DebriefAnnotationFeature;
// Note: Input.ts and Output.ts export specific interfaces, not generic Input/Output types