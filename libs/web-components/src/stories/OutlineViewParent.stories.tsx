/**
 * Enhanced OutlineViewParent stories demonstrating tool parameter auto-injection
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { OutlineViewParent, OutlineViewParentProps } from '../OutlineViewParent/OutlineViewParent';
import { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types';

// Load test data from public directory
const toolList = require('../../.storybook/public/tool-index.json');

// Sample feature collection with maritime features
const sampleFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'track-001',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4094, 37.7849],
          [-122.3994, 37.7949],
          [-122.3894, 37.8049]
        ]
      },
      properties: {
        dataType: 'track',
        name: 'USS Enterprise',
        description: 'Naval vessel track',
        timestamps: [
          '2024-01-01T10:00:00Z',
          '2024-01-01T10:15:00Z',
          '2024-01-01T10:30:00Z',
          '2024-01-01T10:45:00Z'
        ],
        speeds: [15.2, 18.7, 12.3, 16.8],
        heading: [45, 90, 135, 180],
        visible: true
      }
    },
    {
      type: 'Feature',
      id: 'track-002',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.5194, 37.6749],
          [-122.5094, 37.6849],
          [-122.4994, 37.6949]
        ]
      },
      properties: {
        dataType: 'track',
        name: 'HMS Victory',
        description: 'Historical naval track',
        timestamps: [
          '2024-01-01T09:00:00Z',
          '2024-01-01T09:30:00Z',
          '2024-01-01T10:00:00Z'
        ],
        speeds: [8.5, 12.1, 9.8],
        heading: [270, 315, 0],
        visible: true
      }
    },
    {
      type: 'Feature',
      id: 'point-001',
      geometry: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749]
      },
      properties: {
        dataType: 'point',
        name: 'Lighthouse Alpha',
        description: 'Navigation marker',
        timestamp: '2024-01-01T10:00:00Z',
        visible: true
      }
    },
    {
      type: 'Feature',
      id: 'annotation-001',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.5, 37.7],
          [-122.3, 37.7],
          [-122.3, 37.9],
          [-122.5, 37.9],
          [-122.5, 37.7]
        ]]
      },
      properties: {
        dataType: 'annotation',
        name: 'Restricted Area',
        description: 'No entry zone',
        annotationType: 'zone',
        color: '#ff0000',
        visible: true
      }
    }
  ]
};

const meta: Meta<typeof OutlineViewParent> = {
  title: 'Components/OutlineViewParent',
  component: OutlineViewParent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Enhanced OutlineViewParent demonstrating automatic tool parameter injection.

**Key Features:**
- **Automatic Parameter Injection**: Tools automatically receive context from current state
- **Smart Tool Execution**: No more hardcoded parameter mapping in UI components
- **Schema-Driven Detection**: Uses tool schemas to determine which parameters can be auto-injected
- **Validation**: Ensures all required parameters are available before execution

**Tool Categories Demonstrated:**
- **Fully Auto-Injectable**: \`select_feature_start_time\`, \`toggle_first_feature_color\`
- **Mixed Parameters**: \`viewport_grid_generator\` (auto viewport + user intervals)
- **Track-Specific**: \`track_speed_filter\`, \`track_speed_filter_fast\`
- **Feature Arrays**: \`fit_to_selection\`

**Parameter Injection Patterns:**
- ViewportState → Current map bounds
- TimeState → Current time controller state
- DebriefTrackFeature → Selected track or first track
- DebriefFeatureCollection → Complete feature collection
- SelectedFeatures → Currently selected features
        `
      }
    }
  },
  argTypes: {
    onSelectionChange: { action: 'selection changed' },
    onCommandExecute: { action: 'command executed' },
    onFeatureVisibilityChange: { action: 'visibility changed' },
    onViewFeature: { action: 'view feature' },
    onDeleteFeatures: { action: 'delete features' },
    onCollapseAll: { action: 'collapse all' }
  }
};

export default meta;
type Story = StoryObj<typeof OutlineViewParent>;

export const WithAutoInjection: Story = {
  args: {
    featureCollection: sampleFeatureCollection,
    selectedFeatureIds: ['track-001'],
    toolList: toolList,
    enableSmartFiltering: true,
    showAllFeatures: false,
    showDescriptions: true
  },
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates the enhanced OutlineViewParent with automatic parameter injection.

**Selected Features**: USS Enterprise track is selected
**Available Tools**: All tools from tool-index.json with automatic parameter detection

**Try These Tools:**
1. **select_feature_start_time** - Fully auto-injectable (uses selected features + time state)
2. **track_speed_filter** - Mixed (auto track injection + user speed parameter)
3. **viewport_grid_generator** - Mixed (auto viewport + user intervals)
4. **toggle_first_feature_color** - Fully auto-injectable (uses feature collection)

The service automatically analyzes each tool's schema and injects appropriate parameters.
        `
      }
    }
  }
};

export const MultipleTracksSelected: Story = {
  args: {
    featureCollection: sampleFeatureCollection,
    selectedFeatureIds: ['track-001', 'track-002'],
    toolList: toolList,
    enableSmartFiltering: true,
    showAllFeatures: false,
    showDescriptions: true
  },
  parameters: {
    docs: {
      description: {
        story: `
Multiple tracks selected to demonstrate feature array injection.

**Selected Features**: Both USS Enterprise and HMS Victory tracks
**Demonstrates**: How tools that accept feature arrays automatically receive all selected features
        `
      }
    }
  }
};

export const NoSelection: Story = {
  args: {
    featureCollection: sampleFeatureCollection,
    selectedFeatureIds: [],
    toolList: toolList,
    enableSmartFiltering: true,
    showAllFeatures: true,
    showDescriptions: true
  },
  parameters: {
    docs: {
      description: {
        story: `
No features selected - demonstrates fallback behavior.

**Behavior**:
- Tools requiring track features will use the first track in the collection
- Tools requiring feature arrays will use empty arrays or fall back to collection features
- Validation will indicate when required parameters cannot be satisfied
        `
      }
    }
  }
};

export const TracksWithSpeedData: Story = {
  args: {
    featureCollection: sampleFeatureCollection,
    selectedFeatureIds: ['track-001'],
    toolList: toolList,
    enableSmartFiltering: true,
    showAllFeatures: false,
    showDescriptions: true
  },
  parameters: {
    docs: {
      description: {
        story: `
Focused on track-based tools with USS Enterprise selected.

**USS Enterprise Features**:
- Pre-calculated speeds array for \`track_speed_filter_fast\`
- Timestamp data for \`track_speed_filter\`
- LineString geometry with 4 coordinate points

**Recommended Tools to Test**:
1. **track_speed_filter_fast** - Uses pre-calculated speeds
2. **track_speed_filter** - Calculates speeds from coordinates
3. **fit_to_selection** - Fits viewport to track bounds
        `
      }
    }
  }
};

export const MinimalToolSet: Story = {
  args: {
    featureCollection: sampleFeatureCollection,
    selectedFeatureIds: ['track-001'],
    toolList: {
      tools: toolList.tools.filter((tool: any) =>
        ['track_speed_filter', 'viewport_grid_generator', 'select_feature_start_time'].includes(tool.name)
      ),
      version: toolList.version,
      description: 'Minimal tool set for demonstration'
    },
    enableSmartFiltering: true,
    showAllFeatures: false,
    showDescriptions: true
  },
  parameters: {
    docs: {
      description: {
        story: `
Reduced tool set focusing on core parameter injection patterns.

**Tools Included**:
- **track_speed_filter**: Auto track injection + user speed parameter
- **viewport_grid_generator**: Auto viewport injection + user intervals
- **select_feature_start_time**: Fully auto-injectable

This focused set clearly demonstrates the three main parameter injection patterns.
        `
      }
    }
  }
};