import React from 'react'
import {
  VscodeTree,
  VscodeTreeItem,
  VscodeToolbarContainer,
  VscodeToolbarButton,
  VscodeIcon
} from '@vscode-elements/react-elements'
import type { DebriefFeatureCollection, Features } from '@debrief/shared-types'
import { VscTreeSelectEvent } from '@vscode-elements/elements/dist/vscode-tree/vscode-tree'

// Type alias for convenience
type DebriefFeature = Features[number]

export interface OutlineViewProps {
  featureCollection: DebriefFeatureCollection
  selectedFeatureIds: string[]
  onSelectionChange: (ids: string[]) => void
  onFeatureVisibilityChange?: (id: string, visible: boolean) => void
  onViewFeature?: (featureId: string) => void
  onDeleteFeatures?: (ids: string[]) => void
  onCollapseAll?: () => void
  toolbarItems?: React.ReactNode[]
  onContextMenu?: (featureId: string, mouseX: number, mouseY: number) => void
  contextMenuOpen?: boolean
  contextMenuPosition?: { x: number; y: number }
  contextMenuContent?: React.ReactNode
}

// Group features by their dataType
const groupFeaturesByType = (features: Features) => {
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
  onSelectionChange,
  onFeatureVisibilityChange,
  onViewFeature,
  onDeleteFeatures: _onDeleteFeatures,
  onCollapseAll: _onCollapseAll,
  toolbarItems = [],
  onContextMenu,
  contextMenuOpen = false,
  contextMenuPosition,
  contextMenuContent,
}) => {
  const groupedFeatures = React.useMemo(
    () => groupFeaturesByType(featureCollection.features),
    [featureCollection.features]
  )

  // Track which group tree items we've initialized
  // This ensures we only set the initial open state once
  const initializedGroupsRef = React.useRef<Set<string>>(new Set())

  // Get the first group type for initial open state
  const groupTypes = Object.keys(groupedFeatures)
  const firstGroupType = groupTypes[0]

  // Calculate visibility state based on selected features using feature.properties.visible
  const getVisibilityState = (): VisibilityState => {
    if (selectedFeatureIds.length === 0) return VisibilityState.AllVisible
    
    const selectedFeatures = featureCollection.features.filter(f =>
      selectedFeatureIds.includes(String(f.id))
    )
    const hiddenCount = selectedFeatures.filter(f =>
      f.properties && 'visible' in f.properties && f.properties.visible === false
    ).length
    
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
    const selectedItems = extractSelectedItems(event.detail as unknown)
    const selectedIds = Array.from(new Set(selectedItems
      .map(extractIdFromItem)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)))

    onSelectionChange(selectedIds)
  }

  // TODO: we should use proper typing to handle the array selection.  It _Should_
  // be the same in storybook and vs-extension.
  const extractSelectedItems = (detail: unknown): unknown[] => {
    if (!detail) {
      return []
    }

    if (Array.isArray(detail)) {
      return detail
    }

    if (typeof detail === 'object') {
      const maybeSelectedItems = (detail as { selectedItems?: unknown }).selectedItems
      if (Array.isArray(maybeSelectedItems)) {
        return maybeSelectedItems
      }
    }

    return []
  }

  const extractIdFromItem = (item: unknown): string | null => {
    if (!item) {
      return null
    }

    if (typeof item === 'object') {
      const candidate = item as { id?: string | number | null; value?: string | number | null; dataset?: Record<string, unknown>; getAttribute?: (name: string) => string | null }

      if (candidate.id !== undefined && candidate.id !== null) {
        return String(candidate.id)
      }

      if (candidate.value !== undefined && candidate.value !== null) {
        return String(candidate.value)
      }

      if (typeof candidate.dataset === 'object') {
        const datasetId = candidate.dataset?.id
        if (typeof datasetId === 'string' && datasetId.length > 0) {
          return datasetId
        }
      }

      if (typeof candidate.getAttribute === 'function') {
        const attrId = candidate.getAttribute('id') || candidate.getAttribute('data-id')
        if (attrId) {
          return attrId
        }
      }
    }

    return null
  }

  function featureIsVisible(feature: DebriefFeature): boolean {
    return !feature.properties || !('visible' in feature.properties) || feature.properties.visible !== false
  }

  return (<div
    data-testid="outline-view"
    style={{
      border: '1px solid var(--vscode-editorWidget-border)',
      borderRadius: '4px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--vscode-editor-background, #1e1e1e)'
    }}
  >
      <VscodeToolbarContainer>
        <VscodeToolbarButton 
          onClick={handleVisibilityToggle}
          style={{ opacity: selectedFeatureIds.length === 0 ? 0.5 : 1 }}
        >
          <VscodeIcon name={getVisibilityIcon()} />
          Hide/Reveal
        </VscodeToolbarButton>
        
        {/* Removed Delete and Collapse buttons to save space for ExecuteToolButton */}

        {toolbarItems.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toolbarItems.map((item, index) => (
              <React.Fragment key={index}>{item}</React.Fragment>
            ))}
          </div>
        )}
      </VscodeToolbarContainer>
      <VscodeTree data-testid="outline-view-tree" multiSelect onVscTreeSelect={handleSelection} >
        {(Object.entries(groupedFeatures) as [string, DebriefFeature[]][]).map(([type, features]) => (
          <VscodeTreeItem
            key={type}
            ref={(el: HTMLElement | null) => {
              if (el && !initializedGroupsRef.current.has(type)) {
                // Set initial open state only on first mount
                // Only the first group is expanded by default
                const isFirstGroup = type === firstGroupType;
                (el as unknown as { open: boolean }).open = isFirstGroup;
                initializedGroupsRef.current.add(type);
              }
            }}
          >
            <span>{type}</span>
            {features.map((feature: DebriefFeature) => (
              <VscodeTreeItem
                key={String(feature.id)}
                id={String(feature.id)}
                selected={selectedFeatureIds.includes(String(feature.id))}
                onContextMenu={(e: React.MouseEvent) => {
                  if (onContextMenu) {
                    e.preventDefault();
                    onContextMenu(String(feature.id), e.clientX, e.clientY);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <VscodeIcon name={featureIsVisible(feature) ? "eye" : "eye-closed"} />
                  <span style={{ opacity: featureIsVisible(feature) ? 1 : 0.5 }}>
                    {(feature.properties && 'name' in feature.properties && typeof feature.properties.name === 'string') ? feature.properties.name : 'Unnamed'}
                  </span>
                  {onViewFeature && (
                    <VscodeToolbarButton
                      onClick={(e) => {
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
      {contextMenuOpen && contextMenuPosition && contextMenuContent && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
            zIndex: 10000,
          }}
        >
          {contextMenuContent}
        </div>
      )}
    </div>
  )
}
