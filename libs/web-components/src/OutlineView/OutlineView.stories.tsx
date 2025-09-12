import type { Meta, StoryObj } from '@storybook/react'
import { OutlineView } from './OutlineView'
import type { DebriefFeatureCollection } from '@debrief/shared-types'

const meta: Meta<typeof OutlineView> = {
  title: 'Components/OutlineView',
  component: OutlineView,
}

export default meta

type Story = StoryObj<typeof OutlineView>

const emptyFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export const Empty: Story = {
  args: {
    featureCollection: emptyFeatureCollection,
    selectedFeatureIds: [],
    onSelectionChange: (ids) => console.log('Selection changed:', ids),
    onFeatureVisibilityChange: (id, visible) =>
      console.log(`Visibility changed for ${id}: ${visible}`),
    onDeleteFeatures: (ids) => console.log('Delete features:', ids),
    onCollapseAll: () => console.log('Collapse all'),
  },
}

import largeSample from '../../../../apps/vs-code/workspace/large-sample.plot.json'

const populatedFeatureCollection = largeSample as DebriefFeatureCollection

export const Populated: Story = {
  args: {
    ...Empty.args,
    featureCollection: populatedFeatureCollection,
  },
}
