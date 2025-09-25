import React from 'react';
import type { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types';
import type { ToolListResponse } from '@debrief/shared-types/src/types/tools/tool_list_response';
import { OutlineView, type OutlineViewProps } from '../OutlineView/OutlineView';
import { ToolExecuteButton, type SelectedCommand } from '../ToolExecuteButton/ToolExecuteButton';

export interface OutlineViewParentProps
  extends Omit<OutlineViewProps, 'selectedFeatureIds' | 'onSelectionChange' | 'toolbarItems'> {
  featureCollection: DebriefFeatureCollection;
  toolList: ToolListResponse;
  selectedFeatureIds?: string[];
  defaultSelectedFeatureIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onCommandExecute?: (command: SelectedCommand, selectedFeatures: DebriefFeature[]) => void;
  enableSmartFiltering?: boolean;
  showAllTools?: boolean;
  showToolDescriptions?: boolean;
  buttonText?: string;
  menuPosition?: 'bottom' | 'top';
  additionalToolbarContent?: React.ReactNode;
}

export const OutlineViewParent: React.FC<OutlineViewParentProps> = ({
  featureCollection,
  toolList,
  selectedFeatureIds,
  defaultSelectedFeatureIds,
  onSelectionChange,
  onCommandExecute,
  enableSmartFiltering = true,
  showAllTools = false,
  showToolDescriptions = true,
  buttonText = 'Execute Tools',
  menuPosition = 'bottom',
  additionalToolbarContent,
  ...outlineViewCallbacks
}) => {
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>(
    defaultSelectedFeatureIds ?? []
  );

  const isControlled = selectedFeatureIds !== undefined;
  const effectiveSelectedIds = isControlled ? selectedFeatureIds! : internalSelectedIds;

  React.useEffect(() => {
    if (!isControlled && defaultSelectedFeatureIds) {
      setInternalSelectedIds(defaultSelectedFeatureIds);
    }
  }, [defaultSelectedFeatureIds, isControlled]);

  const featureMap = React.useMemo(() => {
    const map = new Map<string, DebriefFeature>();
    for (const feature of featureCollection.features) {
      if (feature.id === undefined || feature.id === null) {
        continue;
      }
      map.set(String(feature.id), feature as DebriefFeature);
    }
    return map;
  }, [featureCollection]);

  const selectedFeatures = React.useMemo(() => {
    return effectiveSelectedIds
      .map((id) => featureMap.get(id))
      .filter((feature): feature is DebriefFeature => Boolean(feature));
  }, [effectiveSelectedIds, featureMap]);

  const hasTools = Boolean(toolList.tools?.length);
  const isExecuteDisabled = !hasTools || selectedFeatures.length === 0;

  const handleSelectionChange = React.useCallback(
    (ids: string[]) => {
      if (!isControlled) {
        setInternalSelectedIds(ids);
      }
      onSelectionChange?.(ids);
    },
    [isControlled, onSelectionChange]
  );

  const handleCommandExecute = React.useCallback(
    (command: SelectedCommand) => {
      console.log('[OutlineViewParent] Executing tool command:', command, 'Selected features:', selectedFeatures);
      onCommandExecute?.(command, selectedFeatures);
    },
    [onCommandExecute, selectedFeatures]
  );

  const toolbarItems = React.useMemo(() => {
    const items: React.ReactNode[] = [
      <ToolExecuteButton
        key="tool-execute"
        toolList={toolList}
        selectedFeatures={selectedFeatures}
        onCommandExecute={handleCommandExecute}
        disabled={isExecuteDisabled}
        buttonText={buttonText}
        menuPosition={menuPosition}
        enableSmartFiltering={enableSmartFiltering}
        showAll={showAllTools}
        showDescriptions={showToolDescriptions}
      />
    ];

    if (additionalToolbarContent) {
      items.push(<React.Fragment key="additional">{additionalToolbarContent}</React.Fragment>);
    }

    return items;
  }, [
    additionalToolbarContent,
    buttonText,
    enableSmartFiltering,
    handleCommandExecute,
    isExecuteDisabled,
    menuPosition,
    selectedFeatures,
    showAllTools,
    showToolDescriptions,
    toolList
  ]);

  return (
    <OutlineView
      featureCollection={featureCollection}
      selectedFeatureIds={effectiveSelectedIds}
      onSelectionChange={handleSelectionChange}
      toolbarItems={toolbarItems}
      {...outlineViewCallbacks}
    />
  );
};
