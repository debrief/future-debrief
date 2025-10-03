import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TimeState, DebriefFeatureCollection, CurrentState, DebriefFeature } from '@debrief/shared-types';
import type { GlobalToolIndexModel } from '@debrief/shared-types/src/types/tools/global_tool_index';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool_list_response';
import { TimeController } from '../TimeController/TimeController';
import { OutlineViewParent } from '../OutlineViewParent/OutlineViewParent';
import { PropertiesView, Property } from '../PropertiesView/PropertiesView';
import { CurrentStateTable } from '../CurrentStateTable/CurrentStateTable';
import { HeadedPanel } from '../HeadedPanel/HeadedPanel';
import { TimeFormat } from '../TimeController/timeUtils';
import './DebriefActivity.css';

export interface DebriefActivityProps {
  // TimeController props
  timeState?: TimeState;
  timeFormat?: TimeFormat;
  onTimeChange?: (newTime: string) => void;
  onOpenSettings?: () => void;

  // OutlineViewParent props
  featureCollection: DebriefFeatureCollection | null;
  selectedFeatureIds?: string[];
  toolList: GlobalToolIndexModel | null;
  onSelectionChange?: (ids: string[]) => void;
  onCommandExecute?: (tool: Tool, selectedFeatures: DebriefFeature[]) => void;
  onFeatureVisibilityChange?: (id: string, visible: boolean) => void;
  onViewFeature?: (id: string) => void;
  onDeleteFeatures?: (ids: string[]) => void;
  onCollapseAll?: () => void;

  // PropertiesView props
  selectedFeatureProperties?: Property[];

  // CurrentStateTable props
  currentState: CurrentState | undefined;

  // General props
  className?: string;
}

export const DebriefActivity: React.FC<DebriefActivityProps> = ({
  // TimeController
  timeState,
  timeFormat = 'rn-short',
  onTimeChange,
  onOpenSettings,

  // OutlineViewParent
  featureCollection,
  selectedFeatureIds = [],
  toolList,
  onSelectionChange,
  onCommandExecute,
  onFeatureVisibilityChange,
  onViewFeature,
  onDeleteFeatures,
  onCollapseAll,

  // PropertiesView
  selectedFeatureProperties = [],

  // CurrentStateTable
  currentState,

  // General
  className = ''
}) => {
  // Memoize safe defaults to ensure stable references
  const defaultFeatureCollection = React.useMemo<DebriefFeatureCollection>(
    () => ({ type: 'FeatureCollection', features: [] }),
    []
  );

  const defaultToolList = React.useMemo<GlobalToolIndexModel>(
    () => ({ root: [], version: '1.0.0', description: 'No tools available' }),
    []
  );

  // Use provided values or memoized defaults
  const memoizedFeatureCollection = featureCollection || defaultFeatureCollection;
  const memoizedToolList = toolList || defaultToolList;

  // Memoize callbacks to prevent child re-renders
  const handleTimeChange = React.useCallback((newTime: string) => {
    onTimeChange?.(newTime);
  }, [onTimeChange]);

  const handleSelectionChange = React.useCallback((ids: string[]) => {
    onSelectionChange?.(ids);
  }, [onSelectionChange]);

  return (
    <div className={`debrief-activity ${className}`} data-testid="debrief-activity" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* TimeController - Fixed height, not resizable */}
      <div className="time-controller-panel" data-testid="time-controller-panel">
        <HeadedPanel title="Time Controller">
          <TimeController
            timeState={timeState}
            timeFormat={timeFormat}
            onTimeChange={handleTimeChange}
            onOpenSettings={onOpenSettings}
          />
        </HeadedPanel>
      </div>

      {/* Resizable panels using react-resizable-panels */}
      <PanelGroup direction="vertical" style={{ flex: 1 }}>
        <Panel defaultSize={33} minSize={10}>
          <HeadedPanel title="Outline">
            <OutlineViewParent
              featureCollection={memoizedFeatureCollection}
              selectedFeatureIds={selectedFeatureIds}
              toolList={memoizedToolList}
              onSelectionChange={handleSelectionChange}
              onCommandExecute={onCommandExecute}
              onFeatureVisibilityChange={onFeatureVisibilityChange}
              onViewFeature={onViewFeature}
              onDeleteFeatures={onDeleteFeatures}
              onCollapseAll={onCollapseAll}
            />
          </HeadedPanel>
        </Panel>
        <PanelResizeHandle style={{
          height: '4px',
          background: 'var(--vscode-panel-border, #ccc)',
          cursor: 'row-resize'
        }} />
        <Panel defaultSize={33} minSize={10}>
          <HeadedPanel title="Properties">
            <PropertiesView properties={selectedFeatureProperties} />
          </HeadedPanel>
        </Panel>
        <PanelResizeHandle style={{
          height: '4px',
          background: 'var(--vscode-panel-border, #ccc)',
          cursor: 'row-resize'
        }} />
        <Panel defaultSize={34} minSize={10}>
          <HeadedPanel title="Current State">
            <CurrentStateTable currentState={currentState} />
          </HeadedPanel>
        </Panel>
      </PanelGroup>
    </div>
  );
};
