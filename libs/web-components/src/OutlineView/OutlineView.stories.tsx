import type { Meta, StoryObj } from '@storybook/react'
import { OutlineView } from './OutlineView'
import type { DebriefFeatureCollection } from '@debrief/shared-types'

const meta: Meta<typeof OutlineView> = {
  title: 'Components/OutlineView',
  component: OutlineView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
The OutlineView component provides a hierarchical tree view of features in a FeatureCollection with an embedded toolbar.

**Key Features:**
- **Tri-state hide/reveal toggle** - Shows different icons based on visibility state
- **Conditional execute dropdown** - Appears when toolIndex is provided (currently deferred)
- **Delete functionality** - Remove selected features
- **Collapse all** - Collapse tree view
- **View item buttons** - Individual view buttons for each feature
- **Grouped by dataType** - Features are organized by their dataType property

The component branches tree items based on feature dataType and includes view buttons for individual features.
        `,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1e1e1e' },
        { name: 'light', value: '#ffffff' }
      ]
    }
  },
  decorators: [
    (Story) => (
      <div style={{ 
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        color: 'var(--vscode-editor-foreground, #cccccc)',
        padding: '16px',
        minHeight: '400px',
        fontFamily: 'var(--vscode-font-family, "Segoe UI", system-ui, sans-serif)',
        fontSize: 'var(--vscode-font-size, 13px)'
      }}>
        <Story />
      </div>
    )
  ],
  argTypes: {
    featureCollection: {
      description: 'The DebriefFeatureCollection to display',
    },
    selectedFeatureIds: {
      description: 'Array of selected feature IDs',
    },
    toolIndex: {
      description: 'Optional array of tools for execute dropdown (currently deferred)',
    },
    onSelectionChange: { action: 'selection-changed' },
    onFeatureVisibilityChange: { action: 'visibility-changed' },
    onExecuteTool: { action: 'tool-executed' },
    onViewFeature: { action: 'view-feature' },
    onDeleteFeatures: { action: 'delete-features' },
    onCollapseAll: { action: 'collapse-all' },
  },
}

export default meta
type Story = StoryObj<typeof OutlineView>

const emptyFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

/**
 * Empty state showing the OutlineView with no features.
 * Toolbar buttons should be disabled when no features are present.
 */
export const Empty: Story = {
  args: {
    featureCollection: emptyFeatureCollection,
    selectedFeatureIds: [],
    onSelectionChange: (ids) => console.warn('Selection changed:', ids),
    onFeatureVisibilityChange: (id, visible) => console.warn('Visibility changed:', id, visible),
    onViewFeature: (id) => console.warn('View feature:', id),
    onDeleteFeatures: (ids) => console.warn('Delete features:', ids),
    onCollapseAll: () => console.warn('Collapse all'),
  },
}

import largeSample from '../../../../apps/vs-code/workspace/large-sample.plot.json'

const populatedFeatureCollection = largeSample as unknown as DebriefFeatureCollection

/**
 * Populated state using the large sample data from VS Code workspace.
 * Shows the hierarchical tree structure with real feature data.
 */
export const Populated: Story = {
  args: {
    featureCollection: populatedFeatureCollection,
    selectedFeatureIds: [],
    onSelectionChange: (ids) => console.log('Selection changed:', ids),
    onFeatureVisibilityChange: (id, visible) => console.log('Visibility changed:', id, visible),
    onViewFeature: (id) => console.log('View feature:', id),
    onDeleteFeatures: (ids) => console.log('Delete features:', ids),
    onCollapseAll: () => console.log('Collapse all'),
  },
}

/**
 * State with some features selected, showing how toolbar buttons become enabled.
 * The hide/reveal button shows different icons based on visibility state.
 */
export const WithSelection: Story = {
  args: {
    featureCollection: populatedFeatureCollection,
    selectedFeatureIds: populatedFeatureCollection.features.slice(0, 2).map(f => String(f.id)),
    onSelectionChange: (ids) => console.log('Selection changed:', ids),
    onFeatureVisibilityChange: (id, visible) => console.log('Visibility changed:', id, visible),
    onViewFeature: (id) => console.log('View feature:', id),
    onDeleteFeatures: (ids) => console.log('Delete features:', ids),
    onCollapseAll: () => console.log('Collapse all'),
  },
}

/**
 * Future state with tools available in the execute dropdown.
 * Currently deferred but shows how the component would work with toolIndex.
 */
export const WithTools: Story = {
  args: {
    featureCollection: populatedFeatureCollection,
    selectedFeatureIds: [String(populatedFeatureCollection.features[0]?.id)].filter(Boolean),
    toolIndex: [
      { id: 'export-csv', name: 'Export to CSV', description: 'Export selected features as CSV' },
      { id: 'calculate-distance', name: 'Calculate Distance', description: 'Calculate total distance' },
      { id: 'merge-tracks', name: 'Merge Tracks', description: 'Merge selected tracks' },
    ],
    onSelectionChange: (ids) => console.log('Selection changed:', ids),
    onFeatureVisibilityChange: (id, visible) => console.log('Visibility changed:', id, visible),
    onExecuteTool: (toolId, featureIds) => console.log('Tool executed:', toolId, 'on features:', featureIds),
    onViewFeature: (id) => console.log('View feature:', id),
    onDeleteFeatures: (ids) => console.log('Delete features:', ids),
    onCollapseAll: () => console.log('Collapse all'),
  },
}
