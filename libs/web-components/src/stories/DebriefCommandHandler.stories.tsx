/**
 * Storybook stories for DebriefCommandHandler service demonstration
 *
 * These stories provide interactive examples of all 12 DebriefCommand types,
 * showing before/after state changes and command processing results.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useCallback, useMemo } from 'react';
import { DebriefCommandHandler } from '../services/DebriefCommandHandler';
import { StateSetter } from '../services/types';
import {
  DebriefFeatureCollection,
  DebriefTrackFeature,
  DebriefPointFeature,
  DebriefAnnotationFeature,
} from '@debrief/shared-types';

// Sample maritime GeoJSON data
const createSampleFeatureCollection = (): DebriefFeatureCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'track-vessel-1',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-1.0, 50.0],
          [-1.1, 50.1],
          [-1.2, 50.2],
          [-1.3, 50.3],
        ],
      },
      properties: {
        dataType: 'track',
        name: 'HMS Example',
        description: 'Royal Navy frigate on patrol',
        timestamps: [
          '2024-01-01T12:00:00Z',
          '2024-01-01T12:15:00Z',
          '2024-01-01T12:30:00Z',
          '2024-01-01T12:45:00Z',
        ],
      },
    } as DebriefTrackFeature,
    {
      type: 'Feature',
      id: 'point-lighthouse-1',
      geometry: {
        type: 'Point',
        coordinates: [-1.15, 50.15],
      },
      properties: {
        dataType: 'reference-point',
        name: 'Portland Bill Lighthouse',
        description: 'Navigation reference point',
        time: '2024-01-01T12:00:00Z',
      },
    } as DebriefPointFeature,
    {
      type: 'Feature',
      id: 'annotation-zone-1',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.25, 50.05],
          [-1.05, 50.05],
          [-1.05, 50.25],
          [-1.25, 50.25],
          [-1.25, 50.05],
        ]],
      },
      properties: {
        dataType: 'annotation',
        annotationType: 'area',
        name: 'Restricted Area',
        text: 'Military Exercise Zone - No Entry',
        color: '#FF0000',
        time: '2024-01-01T12:00:00Z',
      },
    } as DebriefAnnotationFeature,
  ],
});

// Sample commands for each type
const sampleCommands = {
  addFeatures: {
    command: 'addFeatures' as const,
    payload: [
      {
        type: 'Feature' as const,
        id: 'new-merchant-vessel',
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [-0.8, 50.4],
            [-0.9, 50.5],
          ],
        },
        properties: {
          dataType: 'track' as const,
          name: 'MV Atlantic Trader',
          timestamps: [
            '2024-01-01T13:00:00Z',
            '2024-01-01T13:15:00Z',
          ],
        },
      },
    ],
  },

  updateFeatures: {
    command: 'updateFeatures' as const,
    payload: [
      {
        type: 'Feature' as const,
        id: 'track-vessel-1',
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [-1.0, 50.0],
            [-1.1, 50.1],
            [-1.2, 50.2],
            [-1.3, 50.3],
            [-1.4, 50.4], // New position added
          ],
        },
        properties: {
          dataType: 'track' as const,
          name: 'HMS Example (Updated)',
          description: 'Updated track with new position',
          timestamps: [
            '2024-01-01T12:00:00Z',
            '2024-01-01T12:15:00Z',
            '2024-01-01T12:30:00Z',
            '2024-01-01T12:45:00Z',
            '2024-01-01T13:00:00Z',
          ],
        },
      },
    ],
  },

  deleteFeatures: {
    command: 'deleteFeatures' as const,
    payload: ['point-lighthouse-1'],
  },

  setFeatureCollection: {
    command: 'setFeatureCollection' as const,
    payload: {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          id: 'new-collection-track',
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [-2.0, 51.0],
              [-2.1, 51.1],
            ],
          },
          properties: {
            dataType: 'track' as const,
            name: 'Replacement Fleet',
          },
        },
      ],
    },
  },

  setViewport: {
    command: 'setViewport' as const,
    payload: {
      zoom: 12,
      center: { lat: 50.15, lng: -1.15 },
      bounds: {
        north: 50.35,
        south: 49.95,
        east: -0.95,
        west: -1.35,
      },
    },
  },

  setSelection: {
    command: 'setSelection' as const,
    payload: {
      selectedFeatureIds: ['track-vessel-1', 'annotation-zone-1'],
    },
  },

  setTimeState: {
    command: 'setTimeState' as const,
    payload: {
      currentTime: '2024-01-01T12:30:00Z',
      startTime: '2024-01-01T12:00:00Z',
      endTime: '2024-01-01T13:00:00Z',
      isPlaying: true,
      playbackRate: 2.0,
    },
  },

  showText: {
    command: 'showText' as const,
    payload: 'Naval exercise in progress. All vessels maintain safe distance.',
  },

  showData: {
    command: 'showData' as const,
    payload: {
      shape: [3, 2],
      axes: [
        { name: 'vessel', values: ['HMS Example', 'MV Atlantic', 'SS Pacific'] },
        { name: 'measurement', values: ['speed', 'heading'] },
      ],
      values: [12.5, 45, 8.3, 270, 15.2, 180],
    },
  },

  showImage: {
    command: 'showImage' as const,
    payload: {
      mediaType: 'image/svg+xml',
      data: 'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzQwODBmZiIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1hcDwvdGV4dD4KPC9zdmc+',
      title: 'Maritime Chart Section',
    },
  },

  logMessage: {
    command: 'logMessage' as const,
    payload: {
      message: 'Radar contact established with vessel at bearing 45°',
      level: 'info',
      timestamp: new Date().toISOString(),
    },
  },

  composite: {
    command: 'composite' as const,
    payload: [
      {
        command: 'showText' as const,
        payload: 'Executing multi-step operation...',
      },
      {
        command: 'setSelection' as const,
        payload: { selectedFeatureIds: ['track-vessel-1'] },
      },
      {
        command: 'logMessage' as const,
        payload: 'Composite operation completed successfully',
      },
    ],
  },
};

// Interactive Story Component
const DebriefCommandHandlerDemo: React.FC = () => {
  const [featureCollection, setFeatureCollection] = useState<DebriefFeatureCollection>(
    createSampleFeatureCollection()
  );
  const [selectedCommand, setSelectedCommand] = useState<keyof typeof sampleCommands>('addFeatures');
  const [result, setResult] = useState<unknown>(null);
  const [stateChanges, setStateChanges] = useState<Record<string, unknown>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock StateSetter that captures state changes
  const stateSetter: StateSetter = useMemo(() => ({
    setViewportState: (state: unknown) => {
      setStateChanges((prev: Record<string, unknown>) => ({ ...prev, viewport: state }));
    },
    setSelectionState: (state: unknown) => {
      setStateChanges((prev: Record<string, unknown>) => ({ ...prev, selection: state }));
    },
    setTimeState: (state: unknown) => {
      setStateChanges((prev: Record<string, unknown>) => ({ ...prev, time: state }));
    },
    setEditorState: (state: unknown) => {
      setStateChanges((prev: Record<string, unknown>) => ({ ...prev, editor: state }));
    },
    showText: (message: string) => {
      setStateChanges((prev: Record<string, unknown>) => ({
        ...prev,
        textDisplays: [...((prev.textDisplays as string[]) || []), message]
      }));
    },
    showData: (data: unknown) => {
      setStateChanges((prev: Record<string, unknown>) => ({
        ...prev,
        dataDisplays: [...((prev.dataDisplays as unknown[]) || []), data]
      }));
    },
    showImage: (imageData: unknown) => {
      setStateChanges((prev: Record<string, unknown>) => ({
        ...prev,
        images: [...((prev.images as unknown[]) || []), imageData]
      }));
    },
    logMessage: (message: string, level = 'info') => {
      setStateChanges((prev: Record<string, unknown>) => ({
        ...prev,
        logs: [...((prev.logs as unknown[]) || []), { message, level, timestamp: new Date().toISOString() }]
      }));
    },
  }), []);

  const handler = useMemo(() => new DebriefCommandHandler(stateSetter), [stateSetter]);

  const executeCommand = useCallback(async () => {
    setIsProcessing(true);
    setResult(null);
    setStateChanges({});

    try {
      const command = sampleCommands[selectedCommand];
      const commandResult = await handler.processCommand(command, featureCollection);

      setResult(commandResult);

      // Update feature collection if it was modified
      if (commandResult.success && commandResult.featureCollection) {
        setFeatureCollection(commandResult.featureCollection);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCommand, featureCollection, handler]);

  const resetState = useCallback(() => {
    setFeatureCollection(createSampleFeatureCollection());
    setResult(null);
    setStateChanges({});
  }, []);

  const commandOptions = Object.keys(sampleCommands) as (keyof typeof sampleCommands)[];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>DebriefCommand Handler Interactive Demo</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current State Display</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4>Feature Collection ({featureCollection.features.length} features)</h4>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #ddd',
            }}>
              {JSON.stringify(featureCollection, null, 2)}
            </pre>
          </div>

          <div>
            <h4>State Changes</h4>
            {Object.keys(stateChanges).length === 0 ? (
              <p style={{ color: '#666' }}>No state changes yet</p>
            ) : (
              <pre style={{
                backgroundColor: '#e8f5e8',
                padding: '10px',
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid #4caf50',
              }}>
                {JSON.stringify(stateChanges, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Command Selection</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedCommand}
            onChange={(e) => setSelectedCommand(e.target.value as keyof typeof sampleCommands)}
            style={{ padding: '8px', fontSize: '14px', minWidth: '200px' }}
            disabled={isProcessing}
          >
            {commandOptions.map((cmd) => (
              <option key={cmd} value={cmd}>
                {cmd}
              </option>
            ))}
          </select>

          <button
            onClick={executeCommand}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#4080ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {isProcessing ? 'Processing...' : 'Execute Command'}
          </button>

          <button
            onClick={resetState}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Selected Command Payload</h3>
        <pre style={{
          backgroundColor: '#f0f8ff',
          padding: '10px',
          fontSize: '12px',
          border: '1px solid #4080ff',
          borderRadius: '4px',
        }}>
          {JSON.stringify(sampleCommands[selectedCommand], null, 2)}
        </pre>
      </div>

      {result && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Command Result</h3>
          <div style={{
            backgroundColor: (result as Record<string, unknown>).success ? '#e8f5e8' : '#ffe8e8',
            padding: '10px',
            border: `1px solid ${(result as Record<string, unknown>).success ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px',
          }}>
            <h4>Status: {(result as Record<string, unknown>).success ? '✅ Success' : '❌ Failed'}</h4>
            {(result as Record<string, unknown>).error && <p style={{ color: '#f44336' }}>Error: {(result as Record<string, unknown>).error as string}</p>}
            {(result as Record<string, unknown>).metadata && (
              <div>
                <p><strong>Operation Type:</strong> {((result as Record<string, unknown>).metadata as Record<string, unknown>).operationType as string}</p>
                {((result as Record<string, unknown>).metadata as Record<string, unknown>).featuresAffected !== undefined && (
                  <p><strong>Features Affected:</strong> {((result as Record<string, unknown>).metadata as Record<string, unknown>).featuresAffected as number}</p>
                )}
                {((result as Record<string, unknown>).metadata as Record<string, unknown>).commandsProcessed !== undefined && (
                  <p><strong>Commands Processed:</strong> {((result as Record<string, unknown>).metadata as Record<string, unknown>).commandsProcessed as number}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h3>Delta Visualization</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4>Before</h4>
            <ul style={{ fontSize: '14px' }}>
              <li>Features: {createSampleFeatureCollection().features.length}</li>
              <li>Tracks: {createSampleFeatureCollection().features.filter(f => f.properties?.dataType === 'track').length}</li>
              <li>Points: {createSampleFeatureCollection().features.filter(f => f.properties?.dataType === 'reference-point').length}</li>
              <li>Annotations: {createSampleFeatureCollection().features.filter(f => f.properties?.dataType === 'annotation').length}</li>
            </ul>
          </div>

          <div>
            <h4>After</h4>
            <ul style={{ fontSize: '14px' }}>
              <li>Features: {featureCollection.features.length}</li>
              <li>Tracks: {featureCollection.features.filter(f => f.properties?.dataType === 'track').length}</li>
              <li>Points: {featureCollection.features.filter(f => f.properties?.dataType === 'reference-point').length}</li>
              <li>Annotations: {featureCollection.features.filter(f => f.properties?.dataType === 'annotation').length}</li>
            </ul>

            {result && (result as Record<string, unknown>).metadata && (
              <p style={{
                color: (result as Record<string, unknown>).success ? '#4caf50' : '#f44336',
                fontWeight: 'bold',
                marginTop: '10px',
              }}>
                Change Summary: {((result as Record<string, unknown>).metadata as Record<string, unknown>).featuresAffected as number || 0} features affected
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Storybook configuration
const meta: Meta<typeof DebriefCommandHandlerDemo> = {
  title: 'Services/DebriefCommandHandler',
  component: DebriefCommandHandlerDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# DebriefCommand Handler Service

This interactive demo showcases the DebriefCommandHandler service, which processes all 12 types of DebriefCommands and updates plot state accordingly.

## Features Demonstrated

### Feature Management Commands
- **AddFeaturesCommand**: Add new maritime features to the map
- **UpdateFeaturesCommand**: Modify existing feature properties and geometry
- **DeleteFeaturesCommand**: Remove features by ID
- **SetFeatureCollectionCommand**: Replace entire feature collection

### State Management Commands
- **SetViewportCommand**: Update map viewport (zoom, center, bounds)
- **SetSelectionCommand**: Change selected features
- **SetTimeStateCommand**: Control time playback state

### User Interface Commands
- **ShowTextCommand**: Display text messages to user
- **ShowDataCommand**: Present structured data in tabular format
- **ShowImageCommand**: Show images with metadata

### System Commands
- **LogMessageCommand**: Log messages with different levels
- **CompositeCommand**: Execute multiple commands in sequence

## Usage

1. Select a command type from the dropdown
2. Review the command payload structure
3. Click "Execute Command" to process it
4. Observe the before/after changes in features and state
5. Use "Reset" to restore original state

The demo uses real maritime GeoJSON data including vessel tracks, navigation points, and restricted areas to demonstrate practical usage scenarios.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DebriefCommandHandlerDemo>;

export const Interactive: Story = {
  render: () => <DebriefCommandHandlerDemo />,
};

export const FeatureManagementCommands: Story = {
  render: () => <DebriefCommandHandlerDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates AddFeatures, UpdateFeatures, DeleteFeatures, and SetFeatureCollection commands with maritime data.',
      },
    },
  },
};

export const StateManagementCommands: Story = {
  render: () => <DebriefCommandHandlerDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Shows viewport, selection, and time state management commands.',
      },
    },
  },
};

export const UserInterfaceCommands: Story = {
  render: () => <DebriefCommandHandlerDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Illustrates text, data, and image display commands.',
      },
    },
  },
};

export const CompositeCommandExample: Story = {
  render: () => <DebriefCommandHandlerDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates composite command execution with multiple operations in sequence.',
      },
    },
  },
};