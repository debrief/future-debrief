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
  DebriefFeatureCollection,
  DebriefFeature 
} from '../derived/typescript/featurecollection';

// Re-export state types
export type { TimeState } from '../derived/typescript/timestate';
export type { ViewportState } from '../derived/typescript/viewportstate';
export type { SelectionState } from '../derived/typescript/selectionstate';
export type { EditorState } from '../derived/typescript/editorstate';
export type { CurrentState } from '../derived/typescript/currentstate';