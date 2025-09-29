/**
 * Tests for ToolParameterService
 */

// Using global Jest functions
import {
  ToolParameterService,
  StateProvider,
  ToolSchema
} from './toolParameterService';
import {
  TimeState,
  ViewportState,
  SelectionState,
  EditorState,
  DebriefFeatureCollection,
  DebriefFeature,
  DebriefTrackFeature
} from '@debrief/shared-types';

// Mock state provider
class MockStateProvider implements StateProvider {
  constructor(
    private timeState: TimeState | null = null,
    private viewportState: ViewportState | null = null,
    private selectionState: SelectionState | null = null,
    private editorState: EditorState | null = null,
    private featureCollection: DebriefFeatureCollection | null = null,
    private selectedFeatures: DebriefFeature[] = []
  ) {}

  getTimeState(): TimeState | null {
    return this.timeState;
  }

  getViewportState(): ViewportState | null {
    return this.viewportState;
  }

  getSelectionState(): SelectionState | null {
    return this.selectionState;
  }

  getEditorStateForProvider(editorId?: string): EditorState | null {
    return this.editorState;
  }

  getFeatureCollection(): DebriefFeatureCollection | null {
    return this.featureCollection;
  }

  getSelectedFeatures(): DebriefFeature[] {
    return this.selectedFeatures;
  }
}

// Sample tool schemas for testing
const trackSpeedFilterSchema: ToolSchema = {
  name: 'track_speed_filter',
  description: 'Filter track by speed',
  inputSchema: {
    type: 'object',
    properties: {
      track_feature: {
        $ref: '#/$defs/DebriefTrackFeature',
        description: 'Track feature to analyze'
      },
      min_speed: {
        type: 'number',
        description: 'Minimum speed threshold',
        default: 10.0
      }
    },
    required: ['track_feature']
  }
};

const viewportGridSchema: ToolSchema = {
  name: 'viewport_grid_generator',
  description: 'Generate grid in viewport',
  inputSchema: {
    type: 'object',
    properties: {
      viewport_state: {
        $ref: '#/$defs/ViewportState',
        description: 'Current viewport bounds'
      },
      lat_interval: {
        type: 'number',
        description: 'Latitude interval'
      },
      lon_interval: {
        type: 'number',
        description: 'Longitude interval'
      }
    },
    required: ['viewport_state', 'lat_interval', 'lon_interval']
  }
};

const selectFeatureTimeSchema: ToolSchema = {
  name: 'select_feature_start_time',
  description: 'Set time to feature start time',
  inputSchema: {
    type: 'object',
    properties: {
      features: {
        type: 'array',
        description: 'Array of features',
        items: {
          anyOf: [
            { $ref: '#/$defs/DebriefTrackFeature' },
            { $ref: '#/$defs/DebriefPointFeature' },
            { $ref: '#/$defs/DebriefAnnotationFeature' }
          ]
        }
      },
      current_time_state: {
        $ref: '#/$defs/TimeState',
        description: 'Current time state'
      }
    },
    required: ['features', 'current_time_state']
  }
};

const featureCollectionSchema: ToolSchema = {
  name: 'toggle_first_feature_color',
  description: 'Toggle first feature color',
  inputSchema: {
    type: 'object',
    properties: {
      feature_collection: {
        $ref: '#/$defs/DebriefFeatureCollection',
        description: 'Feature collection to modify'
      }
    },
    required: ['feature_collection']
  }
};

const wordCountSchema: ToolSchema = {
  name: 'word_count',
  description: 'Count words in text',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to analyze'
      }
    },
    required: ['text']
  }
};

// Sample data
const mockTimeState: TimeState = {
  current: '2024-01-01T12:00:00Z',
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T23:59:59Z'
};

const mockViewportState: ViewportState = {
  bounds: [-122.5, 37.7, -122.3, 37.9]
};

const mockTrackFeature: DebriefTrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[0, 0], [1, 1]]
  },
  properties: {
    dataType: 'track',
    name: 'Test Track',
    timestamps: ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z']
  }
};

const mockFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [mockTrackFeature]
};

describe('ToolParameterService', () => {
  let service: ToolParameterService;
  let mockStateProvider: MockStateProvider;

  beforeEach(() => {
    mockStateProvider = new MockStateProvider(
      mockTimeState,
      mockViewportState,
      null,
      null,
      mockFeatureCollection,
      [mockTrackFeature]
    );
    service = new ToolParameterService(mockStateProvider);
  });

  describe('analyzeToolParameters', () => {
    it('should identify auto-injectable parameters with refs', () => {
      const analysis = service.analyzeToolParameters(trackSpeedFilterSchema);

      expect(analysis.toolName).toBe('track_speed_filter');
      expect(analysis.parameters).toHaveLength(2);
      expect(analysis.autoInjectableCount).toBe(1);
      expect(analysis.userInputCount).toBe(0); // min_speed has default

      const trackParam = analysis.parameters.find(p => p.parameterName === 'track_feature');
      expect(trackParam).toBeDefined();
      expect(trackParam?.isAutoInjectable).toBe(true);
      expect(trackParam?.injectionType).toBe('DebriefTrackFeature');
      expect(trackParam?.requiresUserInput).toBe(false);

      const speedParam = analysis.parameters.find(p => p.parameterName === 'min_speed');
      expect(speedParam).toBeDefined();
      expect(speedParam?.isAutoInjectable).toBe(false);
      expect(speedParam?.requiresUserInput).toBe(false); // has default
    });

    it('should identify viewport state injection', () => {
      const analysis = service.analyzeToolParameters(viewportGridSchema);

      expect(analysis.autoInjectableCount).toBe(1);
      expect(analysis.userInputCount).toBe(2);

      const viewportParam = analysis.parameters.find(p => p.parameterName === 'viewport_state');
      expect(viewportParam?.isAutoInjectable).toBe(true);
      expect(viewportParam?.injectionType).toBe('ViewportState');
    });

    it('should identify feature array parameters', () => {
      const analysis = service.analyzeToolParameters(selectFeatureTimeSchema);

      expect(analysis.autoInjectableCount).toBe(2);
      expect(analysis.userInputCount).toBe(0);

      const featuresParam = analysis.parameters.find(p => p.parameterName === 'features');
      expect(featuresParam?.isAutoInjectable).toBe(true);
      expect(featuresParam?.injectionType).toBe('SelectedFeatures');

      const timeParam = analysis.parameters.find(p => p.parameterName === 'current_time_state');
      expect(timeParam?.isAutoInjectable).toBe(true);
      expect(timeParam?.injectionType).toBe('TimeState');
    });

    it('should identify feature collection injection', () => {
      const analysis = service.analyzeToolParameters(featureCollectionSchema);

      expect(analysis.autoInjectableCount).toBe(1);
      expect(analysis.userInputCount).toBe(0);

      const fcParam = analysis.parameters.find(p => p.parameterName === 'feature_collection');
      expect(fcParam?.isAutoInjectable).toBe(true);
      expect(fcParam?.injectionType).toBe('DebriefFeatureCollection');
    });

    it('should require user input for basic types without defaults', () => {
      const analysis = service.analyzeToolParameters(wordCountSchema);

      expect(analysis.autoInjectableCount).toBe(0);
      expect(analysis.userInputCount).toBe(1);

      const textParam = analysis.parameters.find(p => p.parameterName === 'text');
      expect(textParam?.isAutoInjectable).toBe(false);
      expect(textParam?.requiresUserInput).toBe(true);
    });
  });

  describe('injectParameters', () => {
    it('should inject viewport state', () => {
      const injected = service.injectParameters(viewportGridSchema, [], {
        lat_interval: 0.1,
        lon_interval: 0.1
      });

      expect(injected.viewport_state).toEqual(mockViewportState);
      expect(injected.lat_interval).toBe(0.1);
      expect(injected.lon_interval).toBe(0.1);
    });

    it('should inject track feature from selected features', () => {
      const injected = service.injectParameters(trackSpeedFilterSchema, [mockTrackFeature]);

      expect(injected.track_feature).toEqual(mockTrackFeature);
    });

    it('should inject time state', () => {
      const injected = service.injectParameters(selectFeatureTimeSchema, [mockTrackFeature]);

      expect(injected.current_time_state).toEqual(mockTimeState);
      expect(injected.features).toEqual([mockTrackFeature]);
    });

    it('should inject feature collection', () => {
      const injected = service.injectParameters(featureCollectionSchema);

      expect(injected.feature_collection).toEqual(mockFeatureCollection);
    });

    it('should not inject parameters for basic types', () => {
      const injected = service.injectParameters(wordCountSchema, [], { text: 'hello world' });

      expect(injected.text).toBe('hello world');
      expect(Object.keys(injected)).toHaveLength(1);
    });

    it('should fallback to feature collection for track feature when no selection', () => {
      const injected = service.injectParameters(trackSpeedFilterSchema, []);

      expect(injected.track_feature).toEqual(mockTrackFeature);
    });
  });

  describe('requiresUserInput', () => {
    it('should return false for fully auto-injectable tools', () => {
      expect(service.requiresUserInput(featureCollectionSchema)).toBe(false);
    });

    it('should return true for tools requiring user input', () => {
      expect(service.requiresUserInput(wordCountSchema)).toBe(true);
      expect(service.requiresUserInput(viewportGridSchema)).toBe(true);
    });

    it('should return false for tools with defaults', () => {
      expect(service.requiresUserInput(trackSpeedFilterSchema)).toBe(false);
    });
  });

  describe('getUserInputParameters', () => {
    it('should return only user input parameters', () => {
      const userParams = service.getUserInputParameters(viewportGridSchema);

      expect(userParams).toHaveLength(2);
      expect(userParams.map(p => p.parameterName)).toEqual(['lat_interval', 'lon_interval']);
    });

    it('should return empty array for fully auto-injectable tools', () => {
      const userParams = service.getUserInputParameters(featureCollectionSchema);

      expect(userParams).toHaveLength(0);
    });
  });

  describe('validateParameterSatisfaction', () => {
    it('should validate successful parameter satisfaction', () => {
      const validation = service.validateParameterSatisfaction(
        viewportGridSchema,
        [],
        { lat_interval: 0.1, lon_interval: 0.1 }
      );

      expect(validation.canExecute).toBe(true);
      expect(validation.missingParams).toHaveLength(0);
    });

    it('should identify missing user parameters', () => {
      const validation = service.validateParameterSatisfaction(viewportGridSchema, [], {});

      expect(validation.canExecute).toBe(false);
      expect(validation.missingParams).toEqual(['lat_interval', 'lon_interval']);
    });

    it('should identify missing auto-injectable parameters', () => {
      const emptyStateProvider = new MockStateProvider();
      const emptyService = new ToolParameterService(emptyStateProvider);

      const validation = emptyService.validateParameterSatisfaction(
        featureCollectionSchema,
        [],
        {}
      );

      expect(validation.canExecute).toBe(false);
      expect(validation.missingParams).toEqual(['feature_collection']);
    });

    it('should handle mixed parameter types', () => {
      const validation = service.validateParameterSatisfaction(
        selectFeatureTimeSchema,
        [mockTrackFeature],
        {}
      );

      expect(validation.canExecute).toBe(true);
      expect(validation.missingParams).toHaveLength(0);
    });

    it('should accept user-provided values for auto-injectable parameters when state is unavailable', () => {
      // Test the PR feedback scenario: user provides explicit values for auto-injectable params
      const emptyStateProvider = new MockStateProvider(null, null, null, null, null, []); // No state available
      const emptyService = new ToolParameterService(emptyStateProvider);

      // User provides explicit viewport_state even though it's normally auto-injectable
      const userProvidedViewport = { bounds: [-180, -90, 180, 90] };
      const validation = emptyService.validateParameterSatisfaction(
        viewportGridSchema,
        [],
        {
          viewport_state: userProvidedViewport,
          lat_interval: 0.1,
          lon_interval: 0.1
        }
      );

      expect(validation.canExecute).toBe(true);
      expect(validation.missingParams).toHaveLength(0);
    });

    it('should prioritize user-provided values over auto-injection', () => {
      // User provides a viewport_state that differs from what would be auto-injected
      const userProvidedViewport = { bounds: [-180, -90, 180, 90] };
      const validation = service.validateParameterSatisfaction(
        viewportGridSchema,
        [],
        {
          viewport_state: userProvidedViewport, // User override
          lat_interval: 0.1,
          lon_interval: 0.1
        }
      );

      expect(validation.canExecute).toBe(true);
      expect(validation.missingParams).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema', () => {
      const emptySchema: ToolSchema = {
        name: 'empty_tool',
        description: 'Empty tool',
        inputSchema: {
          type: 'object'
        }
      };

      const analysis = service.analyzeToolParameters(emptySchema);
      expect(analysis.parameters).toHaveLength(0);
      expect(analysis.autoInjectableCount).toBe(0);
      expect(analysis.userInputCount).toBe(0);
    });

    it('should handle unknown ref types', () => {
      const unknownRefSchema: ToolSchema = {
        name: 'unknown_ref_tool',
        description: 'Tool with unknown ref',
        inputSchema: {
          type: 'object',
          properties: {
            unknown_param: {
              ref: '#/$defs/UnknownType',
              description: 'Unknown parameter type'
            }
          }
        }
      };

      const analysis = service.analyzeToolParameters(unknownRefSchema);
      const param = analysis.parameters[0];

      expect(param.isAutoInjectable).toBe(false);
      expect(param.requiresUserInput).toBe(true);
    });

    it('should handle null state provider values', () => {
      const nullStateProvider = new MockStateProvider();
      const nullService = new ToolParameterService(nullStateProvider);

      const injected = nullService.injectParameters(viewportGridSchema);

      expect(injected.viewport_state).toBeNull();
    });
  });

});