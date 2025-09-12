import React from 'react'
import {
  VscTree,
  VscTreeItem,
  VscToolbar,
  VscToolbarButton,
} from '@vscode-elements/react-elements'
import type { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types'

// Define the props for the OutlineView component
export interface OutlineViewProps {
  featureCollection: DebriefFeatureCollection
  selectedFeatureIds: string[]
  onSelectionChange: (ids: string[]) => void
  onFeatureVisibilityChange: (id: string, visible: boolean) => void
  onDeleteFeatures: (ids: string[]) => void
  onCollapseAll: () => void
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

export const OutlineView: React.FC<OutlineViewProps> = ({
  featureCollection,
  selectedFeatureIds,
  onSelectionChange,
  onFeatureVisibilityChange,
  onDeleteFeatures,
  onCollapseAll,
}) => {
  const groupedFeatures = groupFeaturesByType(featureCollection.features)

  const handleSelection = (event: any) => {
    // For simplicity, this is a placeholder.
    // A real implementation would need to inspect the event details
    // to determine which items are selected.
    console.log('Selection changed', event)
  }

  return (
    <div className="outline-view">
      <VscToolbar>
        <VscToolbarButton>Hide/Reveal</VscToolbarButton>
        <VscToolbarButton onClick={() => onDeleteFeatures(selectedFeatureIds)}>
          Delete
        </VscToolbarButton>
        <VscToolbarButton onClick={onCollapseAll}>Collapse</VscToolbarButton>
      </VscToolbar>
      <VscTree onSelect={handleSelection}>
        {Object.entries(groupedFeatures).map(([type, features]) => (
          <VscTreeItem key={type} text={type}>
            {features.map((feature) => (
              <VscTreeItem key={feature.id} text={feature.properties?.name || 'Unnamed'}>
                {/* Individual feature actions can be placed here */}
              </VscTreeItem>
            ))}
          </VscTreeItem>
        ))}
      </VscTree>
    </div>
  )
}
