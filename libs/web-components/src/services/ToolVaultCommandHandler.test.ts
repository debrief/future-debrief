/**
 * Unit tests for ToolVaultCommandHandler service
 */

import { ToolVaultCommandHandler } from './ToolVaultCommandHandler';
import { StateSetter } from './types';
import {
  DebriefFeatureCollection,
  TimeState,
  ViewportState,
  SelectionState,
  DebriefTrackFeature,
  DebriefPointFeature,
} from '@debrief/shared-types';

// Mock StateSetter implementation
class MockStateSetter implements StateSetter {
  public viewportState?: ViewportState;
  public selectionState?: SelectionState;
  public timeState?: TimeState;
  public editorState?: unknown;
  public textMessages: string[] = [];
  public dataDisplays: unknown[] = [];
  public images: Array<{ mediaType: string; data: string; title?: string }> = [];
  public logMessages: Array<{ message: string; level?: string }> = [];

  setViewportState(state: ViewportState): void {
    this.viewportState = state;
  }

  setSelectionState(state: SelectionState): void {
    this.selectionState = state;
  }

  setTimeState(state: TimeState): void {
    this.timeState = state;
  }

  setEditorState(state: unknown): void {
    this.editorState = state;
  }

  showText(message: string): void {
    this.textMessages.push(message);
  }

  showData(data: unknown): void {
    this.dataDisplays.push(data);
  }

  showImage(imageData: { mediaType: string; data: string; title?: string }): void {
    this.images.push(imageData);
  }

  logMessage(message: string, level?: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logMessages.push({ message, level });
  }

  reset(): void {
    this.viewportState = undefined;
    this.selectionState = undefined;
    this.timeState = undefined;
    this.editorState = undefined;
    this.textMessages = [];
    this.dataDisplays = [];
    this.images = [];
    this.logMessages = [];
  }
}

// Sample test data
const createTestFeatureCollection = (): DebriefFeatureCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'track-1',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-1.0, 50.0],
          [-1.1, 50.1],
        ],
      },
      properties: {
        dataType: 'track',
        name: 'Test Track',
        timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T00:01:00Z'],
      },
    } as DebriefTrackFeature,
    {
      type: 'Feature',
      id: 'point-1',
      geometry: {
        type: 'Point',
        coordinates: [-1.0, 50.0],
      },
      properties: {
        dataType: 'reference-point',
        name: 'Test Point',
        time: '2024-01-01T00:00:00Z',
      },
    } as DebriefPointFeature,
  ],
});

const createTestViewportState = (): ViewportState => ({
  bounds: [-1.1, 49.9, -0.9, 50.1], // [west, south, east, north]
});

const createTestTimeState = (): TimeState => ({
  current: '2024-01-01T00:00:00Z',
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T01:00:00Z',
});

describe('ToolVaultCommandHandler', () => {
  let handler: ToolVaultCommandHandler;
  let mockStateSetter: MockStateSetter;
  let testFeatureCollection: DebriefFeatureCollection;

  beforeEach(() => {
    mockStateSetter = new MockStateSetter();
    handler = new ToolVaultCommandHandler(mockStateSetter);
    testFeatureCollection = createTestFeatureCollection();
  });

  describe('Feature Management Commands', () => {
    test('should handle addFeatures command', async () => {
      const newFeature: DebriefPointFeature = {
        type: 'Feature',
        id: 'new-point',
        geometry: {
          type: 'Point',
          coordinates: [-2.0, 51.0],
        },
        properties: {
          dataType: 'reference-point',
          name: 'New Point',
        },
      };

      const command = {
        command: 'addFeatures' as const,
        payload: [newFeature],
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(result.featureCollection?.features).toHaveLength(3);
      expect(result.featureCollection?.features[2]).toEqual(newFeature);
      expect(result.metadata?.featuresAffected).toBe(1);
      expect(result.metadata?.operationType).toBe('feature-update');
    });

    test('should handle updateFeatures command', async () => {
      const updatedFeature: DebriefTrackFeature = {
        ...testFeatureCollection.features[0] as DebriefTrackFeature,
        properties: {
          ...(testFeatureCollection.features[0].properties as any),
          name: 'Updated Track Name',
        },
      };

      const command = {
        command: 'updateFeatures' as const,
        payload: [updatedFeature],
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect((result.featureCollection?.features[0] as DebriefTrackFeature).properties?.name).toBe('Updated Track Name');
      expect(result.metadata?.featuresAffected).toBe(1);
    });

    test('should handle deleteFeatures command', async () => {
      const command = {
        command: 'deleteFeatures' as const,
        payload: ['track-1'],
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(result.featureCollection?.features).toHaveLength(1);
      expect(result.featureCollection?.features[0].id).toBe('point-1');
      expect(result.metadata?.featuresAffected).toBe(1);
    });

    test('should handle setFeatureCollection command', async () => {
      const newCollection: DebriefFeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      };

      const command = {
        command: 'setFeatureCollection' as const,
        payload: newCollection,
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(result.featureCollection?.features).toHaveLength(0);
      expect(result.metadata?.featuresAffected).toBe(0);
    });
  });

  describe('State Management Commands', () => {
    test('should handle setViewport command', async () => {
      const viewportState = createTestViewportState();

      const command = {
        command: 'setViewport' as const,
        payload: viewportState,
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.viewportState).toEqual(viewportState);
      expect(result.metadata?.operationType).toBe('state-update');
    });

    test('should handle setSelection command', async () => {
      const selectionState: SelectionState = {
        selectedIds: ['track-1'],
      };

      const command = {
        command: 'setSelection' as const,
        payload: selectionState,
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.selectionState).toEqual(selectionState);
      expect(result.metadata?.operationType).toBe('state-update');
    });

    test('should handle setTimeState command', async () => {
      const timeState = createTestTimeState();

      const command = {
        command: 'setTimeState' as const,
        payload: timeState,
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.timeState).toEqual(timeState);
      expect(result.metadata?.operationType).toBe('state-update');
    });
  });

  describe('User Interface Commands', () => {
    test('should handle showText command', async () => {
      const command = {
        command: 'showText' as const,
        payload: 'Hello, World!',
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.textMessages).toContain('Hello, World!');
      expect(result.metadata?.operationType).toBe('display');
    });

    test('should handle showData command', async () => {
      const testData = { values: [1, 2, 3], shape: [3] };

      const command = {
        command: 'showData' as const,
        payload: testData,
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.dataDisplays).toContain(testData);
      expect(result.metadata?.operationType).toBe('display');
    });

    test('should handle showImage command', async () => {
      const imagePayload = {
        mediaType: 'image/png' as const,
        data: 'base64-encoded-data',
        title: 'Test Image',
      };

      const command = {
        command: 'showImage' as const,
        payload: imagePayload,
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.images).toHaveLength(1);
      expect(mockStateSetter.images[0]).toEqual(imagePayload);
      expect(result.metadata?.operationType).toBe('display');
    });

    test('should handle showImage command with invalid payload', async () => {
      // Cast to test error handling with invalid payload
      const command = {
        command: 'showImage' as const,
        payload: 'invalid-payload',
      } as any;

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid image payload structure');
    });
  });

  describe('System Commands', () => {
    test('should handle logMessage command with string payload', async () => {
      const command = {
        command: 'logMessage' as const,
        payload: 'Debug message',
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.logMessages).toHaveLength(1);
      expect(mockStateSetter.logMessages[0].message).toBe('Debug message');
      expect(result.metadata?.operationType).toBe('display');
    });

    test('should handle logMessage command with structured payload', async () => {
      const command = {
        command: 'logMessage' as const,
        payload: {
          message: 'Error occurred',
          level: 'error' as const,
        },
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.logMessages).toHaveLength(1);
      expect(mockStateSetter.logMessages[0]).toEqual({
        message: 'Error occurred',
        level: 'error',
      });
    });

    test('should handle composite command', async () => {
      const commands = [
        {
          command: 'showText' as const,
          payload: 'First message',
        },
        {
          command: 'addFeatures' as const,
          payload: [
            {
              type: 'Feature' as const,
              id: 'composite-feature',
              geometry: {
                type: 'Point' as const,
                coordinates: [0, 0, 0] as [number, number, number],
              },
              properties: {
                dataType: 'reference-point' as const,
                name: 'Composite Point',
              },
            } as DebriefPointFeature,
          ],
        },
      ];

      const command = {
        command: 'composite' as const,
        payload: commands as any[], // Cast for composite command testing
      };

      const result = await handler.processCommand(command, testFeatureCollection);

      expect(result.success).toBe(true);
      expect(mockStateSetter.textMessages).toContain('First message');
      expect(result.featureCollection?.features).toHaveLength(3);
      expect(result.metadata?.operationType).toBe('composite');
      expect(result.metadata?.commandsProcessed).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid command structure', async () => {
      // Cast to test error handling with invalid command structure
      const invalidCommand = {
        invalidField: 'test',
      } as any;

      const result = await handler.processCommand(invalidCommand, testFeatureCollection);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid command structure');
    });

    test('should handle unsupported command type', async () => {
      // Cast to test error handling with unsupported command
      const unsupportedCommand = {
        command: 'unsupportedCommand' as const,
        payload: {},
      } as any;

      const result = await handler.processCommand(unsupportedCommand, testFeatureCollection);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported command type: unsupportedCommand');
    });

    test('should handle processing multiple commands with failure', async () => {
      const commands = [
        {
          command: 'showText' as const,
          payload: 'Success message',
        },
        {
          command: 'unsupportedCommand' as const,
          payload: {},
        } as any,
        {
          command: 'showText' as const,
          payload: 'This should not execute',
        },
      ];

      const results = await handler.processCommands(commands, testFeatureCollection);

      expect(results).toHaveLength(2); // Processing stops at first failure
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(mockStateSetter.textMessages).toHaveLength(1);
      expect(mockStateSetter.textMessages).toContain('Success message');
      expect(mockStateSetter.textMessages).not.toContain('This should not execute');
    });
  });

  describe('Feature Collection Immutability', () => {
    test('should not mutate original feature collection', async () => {
      const originalFeatureCount = testFeatureCollection.features.length;
      const originalFeature = testFeatureCollection.features[0];

      const command = {
        command: 'addFeatures' as const,
        payload: [
          {
            type: 'Feature' as const,
            id: 'new-feature',
            geometry: { type: 'Point' as const, coordinates: [0, 0, 0] as [number, number, number] },
            properties: { dataType: 'reference-point' as const },
          } as DebriefPointFeature,
        ],
      };

      await handler.processCommand(command, testFeatureCollection);

      // Original collection should remain unchanged
      expect(testFeatureCollection.features).toHaveLength(originalFeatureCount);
      expect(testFeatureCollection.features[0]).toEqual(originalFeature);
    });
  });
});