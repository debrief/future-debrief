// React component exports for consumption by other React apps
export { TimeController } from './TimeController/TimeController';
export { PropertiesView } from './PropertiesView/PropertiesView';
export { MapComponent } from './MapComponent/MapComponent';

export { CurrentStateTable } from './CurrentStateTable/CurrentStateTable';
export { OutlineView } from './OutlineView/OutlineView';
export { ToolExecuteButton } from './ToolExecuteButton/ToolExecuteButton';
export { OutlineViewParent } from './OutlineViewParent/OutlineViewParent';
export { DebriefActivity } from './DebriefActivity/DebriefActivity';

// Service exports
export { ToolParameterService } from './services/toolParameterService';
export { ToolVaultCommandHandler } from './services/ToolVaultCommandHandler';

// Type exports
export type { TimeControllerProps } from './TimeController/TimeController';
export type { PropertiesViewProps, Property } from './PropertiesView/PropertiesView';
export type { MapComponentProps, GeoJSONFeature, GeoJSONFeatureCollection, MapState } from './MapComponent/MapComponent';
export type { OutlineViewProps } from './OutlineView/OutlineView';
export type { ToolExecuteButtonProps } from './ToolExecuteButton/ToolExecuteButton';
export type { OutlineViewParentProps } from './OutlineViewParent/OutlineViewParent';
export type { DebriefActivityProps } from './DebriefActivity/DebriefActivity';

// Service type exports
export type {
  StateProvider,
  ToolSchema,
  ParameterAnalysis,
  ToolParameterAnalysis,
  InjectedParameters,
  JSONSchemaProperty
} from './services/toolParameterService';

export type {
  StateSetter,
  CommandHandlerResult,
  CommandProcessor,
  CommandHandlerOptions
} from './services/types';

export type { SpecificCommand } from './services/ToolVaultCommandHandler';
