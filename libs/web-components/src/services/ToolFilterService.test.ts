import { ToolFilterService } from './ToolFilterService';
import type { DebriefFeature, TimeState, ViewportState, SelectionState, EditorState } from '@debrief/shared-types';
import type { ToolIndexModel } from '@debrief/shared-types/src/types/tools/tool_index';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool';

describe('ToolFilterService', () => {
  let toolFilterService: ToolFilterService;

  beforeEach(() => {
    toolFilterService = new ToolFilterService();
  });

  afterEach(() => {
    toolFilterService.clearCache();
  });

  // Mock data creation helpers
  const createMockTrackFeature = (id = 'track1'): DebriefFeature => ({
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1.0, 52.0],
        [-1.1, 52.1],
        [-1.2, 52.2]
      ]
    },
    properties: {
      dataType: 'track',
      name: 'Test Track',
      timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T00:01:00Z', '2024-01-01T00:02:00Z']
    }
  });

  const createMockPointFeature = (id = 'point1'): DebriefFeature => ({
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      coordinates: [-1.0, 52.0]
    },
    properties: {
      dataType: 'reference-point',
      name: 'Test Point',
      time: '2024-01-01T00:00:00Z'
    }
  });

  const createMockAnnotationFeature = (id = 'annotation1'): DebriefFeature => ({
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-1.0, 52.0],
        [-1.1, 52.0],
        [-1.1, 52.1],
        [-1.0, 52.1],
        [-1.0, 52.0]
      ]]
    },
    properties: {
      dataType: 'zone',
      name: 'Test Zone',
      fill: '#FF0000',
      stroke: '#000000'
    }
  });

  const createMockToolIndex = (toolName = 'test-tool'): ToolIndexModel => ({
    tool_name: toolName,
    description: 'A test tool for processing maritime features',
    files: {
      execute: {
        path: 'main.py',
        description: 'Main execution file',
        type: 'python'
      },
      source_code: {
        path: 'source.py',
        description: 'Source code file',
        type: 'python'
      },
      git_history: {
        path: 'history.json',
        description: 'Git history',
        type: 'json'
      }
    },
    stats: {
      sample_inputs_count: 3,
      git_commits_count: 15,
      source_code_length: 2500
    }
  });

  const createMockTool = (name = 'test-tool', requiredFeatures: string[] = ['any']): Tool => ({
    name,
    description: `Tool requiring: ${requiredFeatures.join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: requiredFeatures.reduce((props, feature) => {
        props[feature.toLowerCase()] = {
          type: 'object',
          description: `Input ${feature} feature`
        };
        return props;
      }, {} as any),
      required: requiredFeatures.map(f => f.toLowerCase())
    }
  });

  // Mock state objects
  const createMockTimeState = (): TimeState => ({
    current: '2024-01-01T12:00:00Z',
    start: '2024-01-01T10:00:00Z',
    end: '2024-01-01T14:00:00Z'
  });

  const createMockViewportState = (): ViewportState => ({
    bounds: [-10.0, 50.0, 2.0, 58.0]
  });

  const createMockSelectionState = (): SelectionState => ({
    selectedIds: ['track1', 'point1']
  });

  const createMockEditorState = (): EditorState => ({
    featureCollection: null,
    timeState: createMockTimeState(),
    viewportState: createMockViewportState(),
    selectionState: createMockSelectionState()
  });

  // Create tools with state parameters
  const createToolWithStateParams = (name: string, stateParamTypes: string[] = [], requiredStateParams: string[] = []): Tool => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Add regular feature parameters
    if (!stateParamTypes.length) {
      properties.features = {
        type: 'array',
        description: 'Array of features'
      };
    }

    // Add state parameters
    stateParamTypes.forEach(stateType => {
      const paramName = `${stateType.toLowerCase()}_param`;
      properties[paramName] = {
        type: 'object',
        description: `${stateType} for the tool`
      };

      if (requiredStateParams.includes(stateType)) {
        required.push(paramName);
      }
    });

    return {
      name,
      description: `Tool with state parameters: ${stateParamTypes.join(', ')}`,
      inputSchema: {
        type: 'object',
        properties,
        required
      }
    };
  };


  describe('getApplicableTools', () => {
    it('should return no tools when no features are selected', () => {
      const toolsData = { tools: [createMockTool('any-tool')] };
      const result = toolFilterService.getApplicableTools([], toolsData);

      expect(result.tools).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Tool "any-tool" has 1 unsatisfied required parameters');
    });

    it('should return applicable tools for single feature', () => {
      const trackFeature = createMockTrackFeature();
      const toolsData = { tools: [createMockTool('track-processor', ['features'])] };
      const result = toolFilterService.getApplicableTools([trackFeature], toolsData);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('track-processor');
      expect(result.errors).toHaveLength(0);
    });

    it('should return warning when no tools match selected features', () => {
      const pointFeature = createMockPointFeature();
      const toolsData = { tools: [createMockTool('polygon-only-tool', ['zone'])] };

      const result = toolFilterService.getApplicableTools([pointFeature], toolsData);

      expect(result.tools).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('unsatisfied required parameters'))).toBe(true);
    });

    it('should handle multiple features correctly', () => {
      const trackFeature = createMockTrackFeature();
      const pointFeature = createMockPointFeature();
      const tool: Tool = {
        name: 'multi-feature-tool',
        description: 'Tool that processes multiple features',
        inputSchema: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              description: 'Array of features to process'
            }
          },
          required: ['features']
        }
      };
      const toolsData = { tools: [tool] };

      const result = toolFilterService.getApplicableTools([trackFeature, pointFeature], toolsData);

      expect(result.tools).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully', () => {
      const features = [createMockTrackFeature()];
      const toolsData = { tools: [createMockTool('error-tool')] };

      // Mock an error in tool validation
      jest.spyOn(toolFilterService as any, 'validateToolForFeatures').mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = toolFilterService.getApplicableTools(features, toolsData);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Validation error');
    });
  });

  describe('caching functionality', () => {
    it('should cache results and return cached data on subsequent calls', () => {
      const feature = createMockTrackFeature();
      const toolsData = { tools: [createMockTool('cached-tool', ['features'])] };

      // Mock the actual filtering to track calls
      const performToolFilteringSpy = jest.spyOn(toolFilterService as any, 'performToolFiltering');

      // First call
      const result1 = toolFilterService.getApplicableTools([feature], toolsData);
      expect(performToolFilteringSpy).toHaveBeenCalledTimes(1);

      // Second call with same parameters
      const result2 = toolFilterService.getApplicableTools([feature], toolsData);
      expect(performToolFilteringSpy).toHaveBeenCalledTimes(1); // Should not be called again

      expect(result1).toEqual(result2);
    });

    it('should invalidate cache after timeout', (done) => {
      const feature = createMockTrackFeature();
      const toolsData = { tools: [createMockTool('timeout-tool', ['features'])] };

      // Create service with very short cache timeout for testing
      const shortTimeoutService = new ToolFilterService();
      (shortTimeoutService as any).cacheInvalidationTime = 10; // 10ms

      const performToolFilteringSpy = jest.spyOn(shortTimeoutService as any, 'performToolFiltering');

      // First call
      shortTimeoutService.getApplicableTools([feature], toolsData);
      expect(performToolFilteringSpy).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      setTimeout(() => {
        // Second call after timeout
        shortTimeoutService.getApplicableTools([feature], toolsData);
        expect(performToolFilteringSpy).toHaveBeenCalledTimes(2);
        done();
      }, 15);
    });

    it('should provide correct cache statistics', () => {
      const feature1 = createMockTrackFeature('track1');
      const feature2 = createMockPointFeature('point1');
      const toolsData = { tools: [createMockTool('tool1', ['features'])] };

      // Add some cache entries with different features to ensure different hashes
      toolFilterService.getApplicableTools([feature1], toolsData);
      toolFilterService.getApplicableTools([feature2], toolsData);

      const stats = toolFilterService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
    });

    it('should clear cache when requested', () => {
      const feature = createMockTrackFeature();
      const toolsData = { tools: [createMockTool('clear-test-tool', ['features'])] };

      toolFilterService.getApplicableTools([feature], toolsData);
      expect(toolFilterService.getCacheStats().size).toBe(1);

      toolFilterService.clearCache();
      expect(toolFilterService.getCacheStats().size).toBe(0);
    });

    it('should clear only expired cache entries', (done) => {
      const feature1 = createMockTrackFeature('track1');
      const feature2 = createMockTrackFeature('track2');
      const toolsData = { tools: [createMockTool('expired-test-tool', ['features'])] };

      // Create service with short timeout
      const shortTimeoutService = new ToolFilterService();
      (shortTimeoutService as any).cacheInvalidationTime = 50;

      // Add first entry
      shortTimeoutService.getApplicableTools([feature1], toolsData);

      setTimeout(() => {
        // Add second entry after first has expired
        shortTimeoutService.getApplicableTools([feature2], toolsData);

        const statsBeforeClearing = shortTimeoutService.getCacheStats();
        expect(statsBeforeClearing.size).toBe(2);
        expect(statsBeforeClearing.expiredEntries).toBe(1);

        // Clear expired entries
        shortTimeoutService.clearExpiredCache();

        const statsAfterClearing = shortTimeoutService.getCacheStats();
        expect(statsAfterClearing.size).toBe(1);
        expect(statsAfterClearing.validEntries).toBe(1);
        expect(statsAfterClearing.expiredEntries).toBe(0);

        done();
      }, 120);
    });
  });

  describe('feature-parameter compatibility', () => {

    it('should correctly identify Point feature compatibility', () => {
      const pointFeature = createMockPointFeature();

      const compatible = (toolFilterService as any).isFeatureCompatibleWithParameter(pointFeature, 'Point');
      expect(compatible).toBe(true);

      const notCompatible = (toolFilterService as any).isFeatureCompatibleWithParameter(pointFeature, 'LineString');
      expect(notCompatible).toBe(false);
    });

    it('should correctly identify LineString feature compatibility', () => {
      const trackFeature = createMockTrackFeature();

      const compatible = (toolFilterService as any).isFeatureCompatibleWithParameter(trackFeature, 'LineString');
      expect(compatible).toBe(true);

      const notCompatible = (toolFilterService as any).isFeatureCompatibleWithParameter(trackFeature, 'Point');
      expect(notCompatible).toBe(false);
    });

    it('should handle "any" parameter type', () => {
      const pointFeature = createMockPointFeature();
      const trackFeature = createMockTrackFeature();
      const annotationFeature = createMockAnnotationFeature();

      expect((toolFilterService as any).isFeatureCompatibleWithParameter(pointFeature, 'any')).toBe(true);
      expect((toolFilterService as any).isFeatureCompatibleWithParameter(trackFeature, 'any')).toBe(true);
      expect((toolFilterService as any).isFeatureCompatibleWithParameter(annotationFeature, 'any')).toBe(true);
    });

    it('should match based on dataType property', () => {
      const trackFeature = createMockTrackFeature();

      const compatible = (toolFilterService as any).isFeatureCompatibleWithParameter(trackFeature, 'track');
      expect(compatible).toBe(true);

      const notCompatible = (toolFilterService as any).isFeatureCompatibleWithParameter(trackFeature, 'reference-point');
      expect(notCompatible).toBe(false);
    });
  });

  describe('validation matrix creation', () => {
    it('should create correct validation matrix for single feature and requirement', () => {
      const features = [createMockPointFeature()];
      const requirements = ['Point'];

      const matrix = (toolFilterService as any).createValidationMatrix(features, requirements);

      expect(matrix).toHaveLength(1);
      expect(matrix[0]).toHaveLength(1);
      expect(matrix[0][0]).toBe(true);
    });

    it('should create correct validation matrix for multiple features and requirements', () => {
      const features = [createMockPointFeature(), createMockTrackFeature()];
      const requirements = ['Point', 'LineString'];

      const matrix = (toolFilterService as any).createValidationMatrix(features, requirements);

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[1]).toHaveLength(2);
      expect(matrix[0][0]).toBe(true);  // Point feature matches Point requirement
      expect(matrix[0][1]).toBe(false); // Point feature doesn't match LineString requirement
      expect(matrix[1][0]).toBe(false); // Track feature doesn't match Point requirement
      expect(matrix[1][1]).toBe(true);  // Track feature matches LineString requirement
    });
  });

  describe('perfect assignment algorithm', () => {
    it('should find assignment for single requirement', () => {
      const features = [createMockPointFeature(), createMockTrackFeature()];
      const requirements = ['Point'];
      const matrix = [[true, false], [false, false]]; // Only first feature matches

      const assignment = (toolFilterService as any).findPerfectAssignment(matrix, features, requirements);

      expect(assignment).not.toBeNull();
      expect(assignment.size).toBe(1);
      expect(assignment.has('param_0_Point')).toBe(true);
    });

    it('should return null when no valid assignment exists', () => {
      const features = [createMockPointFeature()];
      const requirements = ['LineString'];
      const matrix = [[false]]; // No matches

      const assignment = (toolFilterService as any).findPerfectAssignment(matrix, features, requirements);

      expect(assignment).toBeNull();
    });

    it('should return null when not enough features for requirements', () => {
      const features = [createMockPointFeature()];
      const requirements = ['Point', 'LineString'];
      const matrix = [[true, false]]; // Only one feature for two requirements

      const assignment = (toolFilterService as any).findPerfectAssignment(matrix, features, requirements);

      expect(assignment).toBeNull();
    });

    it('should find assignment for multiple requirements', () => {
      const features = [createMockPointFeature(), createMockTrackFeature()];
      const requirements = ['Point', 'LineString'];
      const matrix = [[true, false], [false, true]]; // Perfect match

      const assignment = (toolFilterService as any).findPerfectAssignment(matrix, features, requirements);

      expect(assignment).not.toBeNull();
      expect(assignment.size).toBe(2);
      expect(assignment.has('param_0_Point')).toBe(true);
      expect(assignment.has('param_1_LineString')).toBe(true);
    });
  });

  describe('tool parameter requirement parsing', () => {
    it('should parse parameter requirements from tool schema descriptions', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {
            trackData: {
              type: 'object',
              description: 'Input track feature for analysis'
            },
            pointData: {
              type: 'object',
              description: 'Input point feature for reference'
            }
          }
        }
      };

      const requirements = (toolFilterService as any).parseToolParameterRequirements(tool);

      expect(requirements).toContain('LineString'); // from 'track' in description
      expect(requirements).toContain('Point'); // from 'point' in description
    });

    it('should default to "any" when no specific requirements found', () => {
      const tool: Tool = {
        name: 'generic-tool',
        description: 'Generic tool',
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Generic data input'
            }
          }
        }
      };

      const requirements = (toolFilterService as any).parseToolParameterRequirements(tool);

      expect(requirements).toContain('any');
    });

    it('should handle malformed schema gracefully', () => {
      const tool: Tool = {
        name: 'malformed-tool',
        description: 'Tool with malformed schema',
        inputSchema: null as any
      };

      const requirements = (toolFilterService as any).parseToolParameterRequirements(tool);

      expect(requirements).toContain('any');
    });
  });

  describe('input hashing', () => {
    it('should generate consistent hashes for same input', () => {
      const features = [createMockPointFeature()];
      const toolsData = { tools: [createMockTool('test-tool', ['features'])] };

      const hash1 = (toolFilterService as any).generateInputHash(features, toolsData);
      const hash2 = (toolFilterService as any).generateInputHash(features, toolsData);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const features1 = [createMockPointFeature()];
      const features2 = [createMockTrackFeature()];
      const toolsData = { tools: [createMockTool('test-tool', ['features'])] };

      const hash1 = (toolFilterService as any).generateInputHash(features1, toolsData);
      const hash2 = (toolFilterService as any).generateInputHash(features2, toolsData);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('error handling', () => {
    it('should handle null or undefined features gracefully', () => {
      const toolsData = { tools: [createMockTool('test-tool', ['features'])] };

      expect(() => {
        toolFilterService.getApplicableTools(null as any, toolsData);
      }).not.toThrow();

      expect(() => {
        toolFilterService.getApplicableTools(undefined as any, toolsData);
      }).not.toThrow();
    });

    it('should handle malformed features gracefully', () => {
      const malformedFeature = {
        type: 'Feature',
        // Missing required properties
      } as any;
      const toolsData = { tools: [createMockTool('test-tool', ['features'])] };

      const result = toolFilterService.getApplicableTools([malformedFeature], toolsData);

      // Should not throw, may contain warnings or errors
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should handle invalid tools data gracefully', () => {
      const features = [createMockPointFeature()];
      const invalidToolsData = {} as any;

      expect(() => {
        toolFilterService.getApplicableTools(features, invalidToolsData);
      }).not.toThrow();
    });

    it('should activate tools with no required parameters when features are selected and show parameter validation', () => {
      const fitToSelectionTool: Tool = {
        name: 'fit_to_selection',
        description: 'Calculate bounds of features and set viewport to fit them.',
        inputSchema: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              description: 'Array of Debrief features to calculate bounds for'
            },
            padding: {
              type: 'number',
              description: 'Additional padding around bounds as percentage'
            }
          },
          required: [] // No required parameters
        }
      };

      const toolsData = { tools: [fitToSelectionTool] };
      const multipleFeatures = [createMockTrackFeature('track1'), createMockTrackFeature('track2')];

      const validation = toolFilterService.validateToolForFeatures(fitToSelectionTool, multipleFeatures);
      const result = toolFilterService.getApplicableTools(multipleFeatures, toolsData);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('fit_to_selection');

      // Verify validation shows tool is compatible with features parameter satisfied
      expect(validation.isValid).toBe(true);
      expect(validation.parameterValidation?.features?.canSatisfy).toBe(true);
      expect(validation.parameterValidation?.features?.matchingFeatureCount).toBe(2);
    });

    it('should activate tools with no required parameters when zero features are selected', () => {
      // Any tool with no required parameters should work with zero features
      const noRequiredParamsTool: Tool = {
        name: 'generic_zero_feature_tool',
        description: 'A tool that can work without any features selected.',
        inputSchema: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              description: 'Array of Debrief features to calculate bounds for'
            },
            padding: {
              type: 'number',
              description: 'Additional padding around bounds as percentage'
            }
          },
          required: [] // No required parameters
        }
      };

      const toolsData = { tools: [noRequiredParamsTool] };
      const emptyFeatures: any[] = [];

      const validation = toolFilterService.validateToolForFeatures(noRequiredParamsTool, emptyFeatures);
      const result = toolFilterService.getApplicableTools(emptyFeatures, toolsData);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('generic_zero_feature_tool');

      // Verify validation shows tool is compatible
      expect(validation.isValid).toBe(true);
      // Optional: verify parameter-level validation if present
      if (validation.parameterValidation?.features) {
        expect(validation.parameterValidation.features.canSatisfy).toBe(true);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle realistic maritime analysis scenario', () => {
      const vesselTrack = createMockTrackFeature('vessel-track');
      const referencePoint = createMockPointFeature('reference-buoy');
      const searchZone = createMockAnnotationFeature('search-area');

      const features = [vesselTrack, referencePoint, searchZone];
      const tool: Tool = {
        name: 'maritime-analyzer',
        description: 'Analyzes maritime features',
        inputSchema: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              description: 'Maritime features to analyze'
            }
          },
          required: ['features']
        }
      };
      const toolsData = { tools: [tool] };

      const result = toolFilterService.getApplicableTools(features, toolsData);

      expect(result.tools).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.tools[0].name).toBe('maritime-analyzer');
    });

    it('should provide meaningful warnings for complex scenarios', () => {
      const features = [
        createMockTrackFeature('track1'),
        createMockTrackFeature('track2'),
        createMockPointFeature('point1')
      ];

      // Tool that accepts generic features - will match all selected features
      const tool: Tool = {
        name: 'selective-tool',
        description: 'Tool for processing selected features',
        inputSchema: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              description: 'Features to process'
            }
          },
          required: ['features']
        }
      };
      const toolsData = { tools: [tool] };
      const result = toolFilterService.getApplicableTools(features, toolsData);

      expect(result.tools).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('State Parameter Detection and Injection', () => {
    beforeEach(() => {
      toolFilterService = new ToolFilterService();
    });

    describe('detectStateParameter', () => {
      it('should detect TimeState parameters by name pattern', () => {
        const tool: Tool = {
          name: 'time-tool',
          description: 'Tool with time state',
          inputSchema: {
            type: 'object',
            properties: {
              time_state: {
                type: 'object',
                description: 'Current time state'
              }
            },
            required: ['time_state']
          }
        };

        // Test the detection function directly first
        const detectionResult = toolFilterService.detectStateParameter('time_state', {
          type: 'object',
          description: 'Current time state'
        });
        expect(detectionResult.isStateParam).toBe(true);
        expect(detectionResult.stateType).toBe('TimeState');

        // Then test through validation
        const validation = toolFilterService.validateToolForFeatures(tool, []);
        expect(validation.parameterValidation?.time_state?.isStateParameter).toBe(true);
        expect(validation.parameterValidation?.time_state?.note).toBe('Will be provided by parent code');
      });

      it('should detect ViewportState parameters by description', () => {
        const tool: Tool = {
          name: 'viewport-tool',
          description: 'Tool with viewport',
          inputSchema: {
            type: 'object',
            properties: {
              viewport_data: {
                type: 'object',
                description: 'map bounds for the viewport'
              }
            },
            required: ['viewport_data']
          }
        };

        const validation = toolFilterService.validateToolForFeatures(tool, []);
        expect(validation.parameterValidation?.viewport_data?.isStateParameter).toBe(true);
        expect(validation.parameterValidation?.viewport_data?.note).toBe('Will be provided by parent code');
      });

      it('should detect SelectionState parameters', () => {
        const tool: Tool = {
          name: 'selection-tool',
          description: 'Tool with selection',
          inputSchema: {
            type: 'object',
            properties: {
              current_selection: {
                type: 'object',
                description: 'selected features data'
              }
            },
            required: ['current_selection']
          }
        };

        const validation = toolFilterService.validateToolForFeatures(tool, []);
        expect(validation.parameterValidation?.current_selection?.isStateParameter).toBe(true);
        expect(validation.parameterValidation?.current_selection?.note).toBe('Will be provided by parent code');
      });

      it('should detect EditorState parameters', () => {
        const tool: Tool = {
          name: 'editor-tool',
          description: 'Tool with editor state',
          inputSchema: {
            type: 'object',
            properties: {
              editor_state: {
                type: 'object',
                description: 'current state of the editor'
              }
            },
            required: ['editor_state']
          }
        };

        const validation = toolFilterService.validateToolForFeatures(tool, []);
        expect(validation.parameterValidation?.editor_state?.isStateParameter).toBe(true);
        expect(validation.parameterValidation?.editor_state?.note).toBe('Will be provided by parent code');
      });

      it('should not detect non-state parameters as auto-injectable', () => {
        const tool: Tool = {
          name: 'regular-tool',
          description: 'Tool with regular params',
          inputSchema: {
            type: 'object',
            properties: {
              features: {
                type: 'array',
                description: 'array of features'
              },
              config: {
                type: 'object',
                description: 'configuration options'
              }
            },
            required: ['features']
          }
        };

        const validation = toolFilterService.validateToolForFeatures(tool, []);
        expect(validation.parameterValidation?.features?.isStateParameter).toBe(false);
        expect(validation.parameterValidation?.config?.isStateParameter).toBe(false);
      });
    });


  });
});
