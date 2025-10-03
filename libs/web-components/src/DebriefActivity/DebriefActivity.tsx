import React from 'react';
import { ActivityBar, ActivityPanel } from '../ActivityBar/ActivityBar';
import { TimeController, TimeControllerProps } from '../TimeController/TimeController';
import { OutlineView, OutlineViewProps } from '../OutlineView/OutlineView';
import { PropertiesView, PropertiesViewProps } from '../PropertiesView/PropertiesView';
import { CurrentStateTable } from '../CurrentStateTable/CurrentStateTable';
import { CurrentState } from '@debrief/shared-types';

/**
 * DebriefActivity - Composite component that combines all activity panels
 *
 * This component wraps ActivityBar and composes the individual panels:
 * - TimeController
 * - OutlineView
 * - PropertiesView
 * - CurrentStateTable
 */
export interface DebriefActivityProps {
  // TimeController props
  timeState?: TimeControllerProps['timeState'];
  timeFormat?: TimeControllerProps['timeFormat'];
  onTimeChange?: TimeControllerProps['onTimeChange'];
  onOpenSettings?: TimeControllerProps['onOpenSettings'];

  // OutlineView props
  featureCollection?: { type: 'FeatureCollection'; features: unknown[] };
  selectedFeatureIds?: string[];
  toolList?: unknown; // Not used by OutlineView, kept for backwards compatibility
  onSelectionChange?: (ids: string[]) => void;
  onCommandExecute?: (tool: unknown, selectedFeatures: unknown[]) => void; // Not used by OutlineView
  onFeatureVisibilityChange?: (id: string, visible: boolean) => void;
  onViewFeature?: (featureId: string) => void;
  onDeleteFeatures?: (ids: string[]) => void;
  onCollapseAll?: () => void;

  // PropertiesView props
  selectedFeatureProperties?: PropertiesViewProps['properties'];

  // CurrentStateTable props
  currentState?: CurrentState;
}

export const DebriefActivity: React.FC<DebriefActivityProps> = ({
  // TimeController props
  timeState,
  timeFormat,
  onTimeChange,
  onOpenSettings,

  // OutlineView props
  featureCollection,
  selectedFeatureIds = [],
  onSelectionChange = () => {},
  onFeatureVisibilityChange,
  onViewFeature,
  onDeleteFeatures,
  onCollapseAll,

  // PropertiesView props
  selectedFeatureProperties,

  // CurrentStateTable props
  currentState
}) => {
  // Provide defaults for required OutlineView props
  const defaultFeatureCollection = { type: 'FeatureCollection' as const, features: [] };

  return (
    <ActivityBar>
      <ActivityPanel title="Time Controller" collapsible={true} resizable={false}>
        <TimeController
          timeState={timeState}
          timeFormat={timeFormat}
          onTimeChange={onTimeChange}
          onOpenSettings={onOpenSettings}
        />
      </ActivityPanel>

      <ActivityPanel title="Outline" collapsible={true} resizable={true}>
        <OutlineView
          featureCollection={featureCollection as OutlineViewProps['featureCollection'] || defaultFeatureCollection}
          selectedFeatureIds={selectedFeatureIds}
          onSelectionChange={onSelectionChange}
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
