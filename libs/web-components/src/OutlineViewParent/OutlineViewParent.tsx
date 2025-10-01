import React from 'react';
import type { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types';
import type { GlobalToolIndexModel } from '@debrief/shared-types/src/types/tools/global_tool_index';
import { OutlineView, type OutlineViewProps } from '../OutlineView/OutlineView';
import { ToolExecuteButton } from '../ToolExecuteButton/ToolExecuteButton';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool_list_response';

export interface OutlineViewParentProps
  extends Omit<OutlineViewProps, 'selectedFeatureIds' | 'onSelectionChange' | 'toolbarItems'> {
  featureCollection: DebriefFeatureCollection;
  toolList: GlobalToolIndexModel;
  selectedFeatureIds?: string[];
  defaultSelectedFeatureIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onCommandExecute?: (tool: Tool, selectedFeatures: DebriefFeature[]) => void;
  enableSmartFiltering?: boolean;
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

  const hasTools = Boolean(toolList.root?.length);
  const toolCount = toolList.root?.length || 0;
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
    (tool: Tool) => {
      console.log('[OutlineViewParent] Executing tool command:', tool, 'Selected features:', selectedFeatures);
      onCommandExecute?.(tool, selectedFeatures);
    },
    [onCommandExecute, selectedFeatures]
  );

  const toolbarItems = React.useMemo(() => {
    // Show tool count in button text when disabled due to no tools
    const effectiveButtonText = !hasTools ? `${toolCount} tools present` : buttonText;

    const items: React.ReactNode[] = [
      <ToolExecuteButton
        key="tool-execute"
        toolList={toolList}
        selectedFeatures={selectedFeatures}
        onCommandExecute={handleCommandExecute}
        disabled={isExecuteDisabled}
        buttonText={effectiveButtonText}
        menuPosition={menuPosition}
        enableSmartFiltering={enableSmartFiltering}
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
    hasTools,
    isExecuteDisabled,
    menuPosition,
    selectedFeatures,
    toolCount,
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
