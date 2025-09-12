import React from 'react'
import {
  VscodeTree,
  VscodeTreeItem,
  VscodeToolbarContainer,
  VscodeToolbarButton,
  VscodeSingleSelect,
  VscodeOption,
  VscodeIcon
} from '@vscode-elements/react-elements'
import type { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types'
import { VscTreeSelectEvent } from '@vscode-elements/elements/dist/vscode-tree/vscode-tree'

// Tool interface for future implementation
export interface ToolIndex {
  id: string
  name: string
  description?: string
}

// Enhanced props interface matching issue requirements
export interface OutlineViewProps {
  featureCollection: DebriefFeatureCollection
  selectedFeatureIds: string[]
  toolIndex?: ToolIndex[] // Optional for future implementation
  onSelectionChange: (ids: string[]) => void
  onFeatureVisibilityChange?: (id: string, visible: boolean) => void
  onExecuteTool?: (toolId: string, featureIds: string[]) => void
  onViewFeature?: (featureId: string) => void
  onDeleteFeatures?: (ids: string[]) => void
  onCollapseAll?: () => void
}

// Group features by their dataType
const groupFeaturesByType = (features: DebriefFeature[]) => {
  return features.reduce((acc, feature) => {
    const type = feature.properties?.dataType || 'unknown'
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(feature)
    return acc
  }, {} as Record<string, DebriefFeature[]>)
}

// Tri-state visibility enum
enum VisibilityState {
  AllVisible = 'all-visible',
  SomeVisible = 'some-visible', 
  NoneVisible = 'none-visible'
}

export const OutlineView: React.FC<OutlineViewProps> = ({
  featureCollection,
  selectedFeatureIds,
  toolIndex = [],
  onSelectionChange: _onSelectionChange,
  onFeatureVisibilityChange,
  onExecuteTool,
  onViewFeature,
  onDeleteFeatures,
  onCollapseAll,
}) => {
  const groupedFeatures = groupFeaturesByType(featureCollection.features)

  // Calculate visibility state based on selected features using feature.properties.visible
  const getVisibilityState = (): VisibilityState => {
    if (selectedFeatureIds.length === 0) return VisibilityState.AllVisible
    
    const selectedFeatures = featureCollection.features.filter(f => 
      selectedFeatureIds.includes(String(f.id))
    )
    const hiddenCount = selectedFeatures.filter(f => f.properties?.visible === false).length
    
    if (hiddenCount === 0) return VisibilityState.AllVisible
    if (hiddenCount === selectedFeatures.length) return VisibilityState.NoneVisible
    return VisibilityState.SomeVisible
  }

  const handleVisibilityToggle = () => {
    if (selectedFeatureIds.length === 0 || !onFeatureVisibilityChange) return
    
    const currentState = getVisibilityState()
    
    switch (currentState) {
      case VisibilityState.AllVisible:
        // Hide all selected
        selectedFeatureIds.forEach(id => {
          onFeatureVisibilityChange(id, false)
        })
        break
      case VisibilityState.SomeVisible:
      case VisibilityState.NoneVisible:
        // Show all selected
        selectedFeatureIds.forEach(id => {
          onFeatureVisibilityChange(id, true)
        })
        break
    }
  }

  const getVisibilityIcon = () => {
    const state = getVisibilityState()
    switch (state) {
      case VisibilityState.AllVisible:
        return 'eye'
      case VisibilityState.NoneVisible:
        return 'eye-closed'
      case VisibilityState.SomeVisible:
        return 'circle-slash'
    }
  }

  const handleSelection = (event: VscTreeSelectEvent) => {
    // For simplicity, this is a placeholder.
    // A real implementation would need to inspect the event details
    // to determine which items are selected.
    const selectedItems = event.detail as unknown as Array<{id: string | null}>
    const selectedIds = selectedItems.map(item => item.id).filter(id => id) as string[]
    _onSelectionChange(selectedIds)
  }

  function featureIsVisible(feature: DebriefFeature): boolean {
    return feature.properties?.visible !== false
  }

  return (<div style={{ border: '1px solid var(--vscode-editorWidget-border)', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <VscodeToolbarContainer>
        <VscodeToolbarButton 
          onClick={handleVisibilityToggle}
          style={{ opacity: selectedFeatureIds.length === 0 ? 0.5 : 1 }}
        >
          <VscodeIcon name={getVisibilityIcon()} />
          Hide/Reveal
        </VscodeToolbarButton>
        
        {/* Conditional Execute dropdown - currently deferred */}
        {toolIndex && toolIndex.length > 0 && (
          <VscodeSingleSelect 
            style={{ opacity: selectedFeatureIds.length === 0 ? 0.5 : 1, pointerEvents: selectedFeatureIds.length === 0 ? 'none' : 'auto' }}
            onChange={(event) => {
              const toolId = (event.target as HTMLSelectElement).value
              if (toolId && onExecuteTool && selectedFeatureIds.length > 0) {
                onExecuteTool(toolId, selectedFeatureIds)
              }
            }}
          >
            <VscodeOption value="">Execute...</VscodeOption>
            {toolIndex.map(tool => (
              <VscodeOption key={tool.id} value={tool.id}>
                {tool.name}
              </VscodeOption>
            ))}
          </VscodeSingleSelect>
        )}
        
        {onDeleteFeatures && (
          <VscodeToolbarButton 
            onClick={() => selectedFeatureIds.length > 0 && onDeleteFeatures(selectedFeatureIds)}
            style={{ opacity: selectedFeatureIds.length === 0 ? 0.5 : 1 }}
          >
            <VscodeIcon name="trash" />
            Delete
          </VscodeToolbarButton>
        )}
        
        {onCollapseAll && (
          <VscodeToolbarButton onClick={onCollapseAll}>
            <VscodeIcon name="collapse-all" />
            Collapse
          </VscodeToolbarButton>
        )}
      </VscodeToolbarContainer>
      <VscodeTree multiSelect onVscTreeSelect={handleSelection} >
        {(Object.entries(groupedFeatures) as [string, DebriefFeature[]][]).map(([type, features]) => (
          <VscodeTreeItem key={type}>
            <span>{type}</span>
            {features.map((feature: DebriefFeature) => (
              <VscodeTreeItem key={String(feature.id)} id={String(feature.id)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <VscodeIcon name={featureIsVisible(feature) ? "eye" : "eye-closed"} />
                  <span style={{ opacity: featureIsVisible(feature) ? 1 : 0.5 }}>
                    {feature.properties?.name || 'Unnamed'}
                  </span>
                  {onViewFeature && (
                    <VscodeToolbarButton 
                      onChange={(e) => {
                        e.stopPropagation() // Prevent tree item selection
                        onViewFeature(String(feature.id))
                      }}
                      style={{ marginLeft: 'auto', fontSize: '12px', padding: '2px 4px' }}
                    >
                      <VscodeIcon name="zoom-in" />
                    </VscodeToolbarButton>
                  )}
                </div>
              </VscodeTreeItem>
            ))}
          </VscodeTreeItem>
        ))}
      </VscodeTree>
    </div>
  )
}
