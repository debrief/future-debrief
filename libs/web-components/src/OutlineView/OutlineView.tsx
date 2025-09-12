import React, { useState } from 'react'
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
  const [hiddenFeatures, setHiddenFeatures] = useState<Set<string>>(new Set())
  
  const groupedFeatures = groupFeaturesByType(featureCollection.features)

  // Calculate visibility state based on selected features
  const getVisibilityState = (): VisibilityState => {
    if (selectedFeatureIds.length === 0) return VisibilityState.AllVisible
    
    const selectedHiddenCount = selectedFeatureIds.filter(id => hiddenFeatures.has(id)).length
    
    if (selectedHiddenCount === 0) return VisibilityState.AllVisible
    if (selectedHiddenCount === selectedFeatureIds.length) return VisibilityState.NoneVisible
    return VisibilityState.SomeVisible
  }

  const handleVisibilityToggle = () => {
    if (selectedFeatureIds.length === 0) return
    
    const currentState = getVisibilityState()
    const newHidden = new Set(hiddenFeatures)
    
    switch (currentState) {
      case VisibilityState.AllVisible:
        // Hide all selected
        selectedFeatureIds.forEach(id => newHidden.add(id))
        break
      case VisibilityState.SomeVisible:
      case VisibilityState.NoneVisible:
        // Show all selected
        selectedFeatureIds.forEach(id => newHidden.delete(id))
        break
    }
    
    setHiddenFeatures(newHidden)
    
    // Notify parent of visibility changes
    if (onFeatureVisibilityChange) {
      selectedFeatureIds.forEach(id => {
        onFeatureVisibilityChange(id, !newHidden.has(id))
      })
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

  const handleSelection = (event: React.SyntheticEvent, source: string) => {
    // For simplicity, this is a placeholder.
    // A real implementation would need to inspect the event details
    // to determine which items are selected.
    console.warn('Selection changed', event, source)
  }

  return (
    <div className="outline-view">
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
      <VscodeTree onSelect={(event) => handleSelection(event, 'tree')}>
        {(Object.entries(groupedFeatures) as [string, DebriefFeature[]][]).map(([type, features]) => (
          <VscodeTreeItem key={type}>
            <span>{type}</span>
            {features.map((feature: DebriefFeature) => (
              <VscodeTreeItem onSelect={(event) => handleSelection(event, 'tree-item')} key={String(feature.id)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ opacity: hiddenFeatures.has(String(feature.id)) ? 0.5 : 1 }}>
                    {feature.properties?.name || 'Unnamed'}
                  </span>
                  {onViewFeature && (
                    <VscodeToolbarButton 
                      onClick={(e) => {
                        handleSelection(e, 'view-button')
                        e.stopPropagation() // Prevent tree item selection
                        onViewFeature(String(feature.id))
                      }}
                      style={{ marginLeft: 'auto', fontSize: '12px', padding: '2px 4px' }}
                    >
                      <VscodeIcon name="eye" />
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
