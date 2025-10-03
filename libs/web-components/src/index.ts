// React component exports for consumption by other React apps
export { TimeController } from './TimeController/TimeController';
export { PropertiesView } from './PropertiesView/PropertiesView';
export { MapComponent } from './MapComponent/MapComponent';

export { CurrentStateTable } from './CurrentStateTable/CurrentStateTable';
export { OutlineView } from './OutlineView/OutlineView';
export { OutlineContextMenu } from './OutlineView/OutlineContextMenu';
export { ToolExecuteButton } from './ToolExecuteButton/ToolExecuteButton';
export { OutlineViewParent } from './OutlineViewParent/OutlineViewParent';
export { HeadedPanel } from './HeadedPanel/HeadedPanel';
export { ActivityBar, ActivityPanel } from './ActivityBar/ActivityBar';
export { DebriefActivity } from './DebriefActivity/DebriefActivity';
export { ToolExecutionProvider, useToolExecution } from './contexts/ToolExecutionContext';

// Service exports
export { ToolParameterService } from './services/toolParameterService';
export { ToolVaultCommandHandler } from './services/ToolVaultCommandHandler';

// Type exports
export type { TimeControllerProps } from './TimeController/TimeController';
export type { PropertiesViewProps, Property } from './PropertiesView/PropertiesView';
export type { MapComponentProps, GeoJSONFeature, GeoJSONFeatureCollection, MapState } from './MapComponent/MapComponent';
export type { OutlineViewProps } from './OutlineView/OutlineView';
export type { OutlineContextMenuProps } from './OutlineView/OutlineContextMenu';
export type { ToolExecuteButtonProps } from './ToolExecuteButton/ToolExecuteButton';
export type { OutlineViewParentProps } from './OutlineViewParent/OutlineViewParent';
export type { HeadedPanelProps } from './HeadedPanel/HeadedPanel';
export type { ActivityBarProps, ActivityPanelProps } from './ActivityBar/ActivityBar';
export type { DebriefActivityProps } from './DebriefActivity/DebriefActivity';
export type { ToolExecutionContextValue, ToolExecutionProviderProps, ToolWithCategory } from './contexts/ToolExecutionContext';

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
