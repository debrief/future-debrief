import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TimeState, DebriefFeatureCollection, CurrentState, DebriefFeature } from '@debrief/shared-types';
import type { GlobalToolIndexModel } from '@debrief/shared-types/src/types/tools/global_tool_index';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool_list_response';
import { TimeController } from '../TimeController/TimeController';
import { OutlineViewParent } from '../OutlineViewParent/OutlineViewParent';
import { PropertiesView, Property } from '../PropertiesView/PropertiesView';
import { CurrentStateTable } from '../CurrentStateTable/CurrentStateTable';
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
  useResizablePanels?: boolean; // Flag to enable VscodeSplitLayout (for VS Code)
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
  const safeFeatureCollection: DebriefFeatureCollection = featureCollection || { type: 'FeatureCollection', features: [] };
  const safeToolList: GlobalToolIndexModel = toolList || { root: [], version: '1.0.0', description: 'No tools available' };

  return (
    <div className={`debrief-activity ${className}`} data-testid="debrief-activity" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* TimeController - Fixed height, not resizable */}
      <div className="time-controller-panel" data-testid="time-controller-panel">
        <TimeController
          timeState={timeState}
          timeFormat={timeFormat}
          onTimeChange={onTimeChange}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Resizable panels using react-resizable-panels */}
      <PanelGroup direction="vertical" style={{ flex: 1 }}>
        <Panel defaultSize={33} minSize={10}>
          <OutlineViewParent
            featureCollection={safeFeatureCollection}
            selectedFeatureIds={selectedFeatureIds}
            toolList={safeToolList}
            onSelectionChange={onSelectionChange}
            onCommandExecute={onCommandExecute}
            onFeatureVisibilityChange={onFeatureVisibilityChange}
            onViewFeature={onViewFeature}
            onDeleteFeatures={onDeleteFeatures}
            onCollapseAll={onCollapseAll}
          />
        </Panel>
        <PanelResizeHandle style={{
          height: '4px',
          background: 'var(--vscode-panel-border, #ccc)',
          cursor: 'row-resize'
        }} />
        <Panel defaultSize={33} minSize={10}>
          <PropertiesView properties={selectedFeatureProperties} />
        </Panel>
        <PanelResizeHandle style={{
          height: '4px',
          background: 'var(--vscode-panel-border, #ccc)',
          cursor: 'row-resize'
        }} />
        <Panel defaultSize={34} minSize={10}>
          <CurrentStateTable currentState={currentState} />
        </Panel>
      </PanelGroup>
    </div>
  );
};
