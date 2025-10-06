import React from 'react';
import { ActivityBar, ActivityPanel, PanelState } from '../ActivityBar/ActivityBar';
import { TimeController, TimeControllerProps } from '../TimeController/TimeController';
import { OutlineViewParent } from '../OutlineViewParent/OutlineViewParent';
import { PropertiesView, PropertiesViewProps } from '../PropertiesView/PropertiesView';
import { CurrentStateTable } from '../CurrentStateTable/CurrentStateTable';
import { CurrentState, DebriefFeatureCollection } from '@debrief/shared-types';
import type { GlobalToolIndexModel } from '@debrief/shared-types/src/types/tools/global_tool_index';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { DebriefFeature } from '@debrief/shared-types';

/**
 * DebriefActivity - Composite component that combines all activity panels
 *
 * This component wraps ActivityBar and composes the individual panels:
 * - TimeController
 * - OutlineViewParent (with tool execution UI)
 * - PropertiesView
 * - CurrentStateTable
 */
export interface DebriefActivityProps {
  // TimeController props
  timeState?: TimeControllerProps['timeState'];
  timeFormat?: TimeControllerProps['timeFormat'];
  onTimeChange?: TimeControllerProps['onTimeChange'];
  onOpenSettings?: TimeControllerProps['onOpenSettings'];

  // OutlineViewParent props
  featureCollection?: DebriefFeatureCollection;
  selectedFeatureIds?: string[];
  toolList?: GlobalToolIndexModel;
  onSelectionChange?: (ids: string[]) => void;
  onCommandExecute?: (tool: Tool, selectedFeatures: DebriefFeature[]) => void;
  onFeatureVisibilityChange?: (id: string, visible: boolean) => void;
  onViewFeature?: (featureId: string) => void;
  onDeleteFeatures?: (ids: string[]) => void;
  onCollapseAll?: () => void;

  // PropertiesView props
  selectedFeatureProperties?: PropertiesViewProps['properties'];

  // CurrentStateTable props
  currentState?: CurrentState;

  // ActivityBar state persistence props
  initialPanelStates?: PanelState[];
  onPanelStatesChange?: (states: PanelState[]) => void;
}

export const DebriefActivity: React.FC<DebriefActivityProps> = ({
  // TimeController props
  timeState,
  timeFormat,
  onTimeChange,
  onOpenSettings,

  // OutlineViewParent props
  featureCollection,
  selectedFeatureIds,
  toolList,
  onSelectionChange,
  onCommandExecute,
  onFeatureVisibilityChange,
  onViewFeature,
  onDeleteFeatures,
  onCollapseAll,

  // PropertiesView props
  selectedFeatureProperties,

  // CurrentStateTable props
  currentState,

  // ActivityBar state persistence props
  initialPanelStates,
  onPanelStatesChange
}) => {
  // Provide defaults for required OutlineViewParent props
  const defaultFeatureCollection: DebriefFeatureCollection = { type: 'FeatureCollection', features: [] };
  const defaultToolList: GlobalToolIndexModel = {
    root: [],
    version: '1.0.0',
    description: 'Tool index not available'
  };

  return (
    <ActivityBar
      initialPanelStates={initialPanelStates}
      onPanelStatesChange={onPanelStatesChange}
    >
      <ActivityPanel title="Time Controller" collapsible={true} resizable={false}>
        <TimeController
          timeState={timeState}
          timeFormat={timeFormat}
          onTimeChange={onTimeChange}
          onOpenSettings={onOpenSettings}
        />
      </ActivityPanel>

      <ActivityPanel title="Outline" collapsible={true} resizable={true}>
        <OutlineViewParent
          featureCollection={featureCollection || defaultFeatureCollection}
          toolList={toolList || defaultToolList}
          selectedFeatureIds={selectedFeatureIds}
          onSelectionChange={onSelectionChange}
          onCommandExecute={onCommandExecute}
          onFeatureVisibilityChange={onFeatureVisibilityChange}
          onViewFeature={onViewFeature}
          onDeleteFeatures={onDeleteFeatures}
          onCollapseAll={onCollapseAll}
        />
      </ActivityPanel>

      <ActivityPanel title="Properties" collapsible={true} resizable={true}>
        <PropertiesView
          properties={selectedFeatureProperties || []}
        />
      </ActivityPanel>

      <ActivityPanel title="Current State" collapsible={true} resizable={true}>
        <CurrentStateTable currentState={currentState} />
      </ActivityPanel>
    </ActivityBar>
  );
};
