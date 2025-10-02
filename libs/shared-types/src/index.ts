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
  Features as DebriefFeaturesArray
} from './types/features/debrief_feature_collection';

// Re-export metadata types
export type { ViewportMetadataFeature } from './types/features/metadata_viewport';
export type { TimeMetadataFeature } from './types/features/metadata_time';
export type { SelectionMetadataFeature } from './types/features/metadata_selection';

// Re-export feature types
export type { DebriefBuoyfieldFeature } from './types/features/buoyfield';
export type { DebriefBackdropFeature } from './types/features/backdrop';

// Re-export state types
export type { TimeState } from './types/states/time_state';
export type { ViewportState } from './types/states/viewport_state';
export type { SelectionState } from './types/states/selection_state';
export type { EditorState } from './types/states/editor_state';
export type { CurrentState } from './types/states/current_state';

// Union type for any Debrief feature - extracted from the Features array type
export type { Features } from './types/features/debrief_feature_collection';
import type { Features as DebriefFeatures } from './types/features/debrief_feature_collection';
export type DebriefFeature = DebriefFeatures[number];
// Note: Input.ts and Output.ts export specific interfaces, not generic Input/Output types