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

// Essential base types for validators (defined here since generated types are excluded)
export type Position = [number, number] | [number, number, number];
export type Bbox = [number, number, number, number] | [number, number, number, number, number, number];
export type Properties = { [key: string]: any; } | null;

// GeoJSON geometry interfaces
export interface Point {
  type: "Point";
  coordinates: Position;
}

export interface LineString {
  type: "LineString";
  coordinates: Position[];
}

export interface Polygon {
  type: "Polygon";
  coordinates: Position[][];
}

export interface MultiPoint {
  type: "MultiPoint";
  coordinates: Position[];
}

export interface MultiLineString {
  type: "MultiLineString";
  coordinates: Position[][];
}

export interface MultiPolygon {
  type: "MultiPolygon";
  coordinates: Position[][][];
}

export interface GeometryCollection {
  type: "GeometryCollection";
  geometries: Geometry[];
}

export type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon | GeometryCollection;

// Feature types for validators
export type FeatureId = string | number;

interface DebriefFeatureBase<PropertiesType extends Record<string, unknown>> {
  type: "Feature";
  id: FeatureId;
  geometry: Geometry;
  properties: PropertiesType;
  bbox?: Bbox;
  [key: string]: unknown;
}

export interface TrackProperties extends Record<string, unknown> {
  dataType: "track";
  timestamps?: (string | number)[];
  name?: string;
  description?: string;
  visible?: boolean;
}

export type DebriefTrackFeature = DebriefFeatureBase<TrackProperties>;

export interface PointProperties extends Record<string, unknown> {
  dataType: "reference-point";
  time?: string;
  timeStart?: string;
  timeEnd?: string;
  name?: string;
  description?: string;
  visible?: boolean;
}

export type DebriefPointFeature = DebriefFeatureBase<PointProperties>;

export type AnnotationType = "label" | "area" | "measurement" | "comment" | "boundary";

export interface AnnotationProperties extends Record<string, unknown> {
  dataType: "zone";
  annotationType?: AnnotationType;
  text?: string;
  color?: string;
  time?: string;
  name?: string;
  description?: string;
  visible?: boolean;
}

export type DebriefAnnotationFeature = DebriefFeatureBase<AnnotationProperties>;

export type DebriefFeature = DebriefTrackFeature | DebriefPointFeature | DebriefAnnotationFeature;

export interface DebriefFeatureCollection {
  type: "FeatureCollection";
  features: DebriefFeature[];
  bbox?: Bbox;
  properties?: Properties;
}

// Editor and application state types
export interface TimeState {
  current: string;
  start: string;
  end: string;
}

export interface ViewportState {
  bounds: [number, number, number, number];
}

export interface SelectionState {
  selectedIds: Array<string | number>;
}

export interface EditorState {
  featureCollection?: DebriefFeatureCollection | null;
  timeState?: TimeState | null;
  viewportState?: ViewportState | null;
  selectionState?: SelectionState | null;
}

export interface CurrentState {
  editorId: string;
  filename: string;
  editorState: EditorState;
  historyCount: number;
}

