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
} from './types/features/featurecollection';

// Re-export state types
export type { TimeState } from './types/states/timestate';
export type { ViewportState } from './types/states/viewportstate';
export type { SelectionState } from './types/states/selectionstate';
export type { EditorState } from './types/states/editorstate';
export type { CurrentState } from './types/states/currentstate';

// Re-export tool types
export type { Tool } from './types/tools/tool';
export type { ToolListResponse } from './types/tools/toollistresponse';
export type { ToolCallRequest } from './types/tools/toolcallrequest';
export type { ToolCallResponse } from './types/tools/toolcallresponse';
export type { JSONSchema } from './types/tools/jsonschema';
export type { ConstrainedFeature } from './types/tools/constrainedfeature';
// Note: Input.ts and Output.ts export specific interfaces, not generic Input/Output types