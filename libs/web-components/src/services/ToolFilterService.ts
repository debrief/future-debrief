import type { DebriefFeature } from '@debrief/shared-types';
import type { ToolIndexModel } from '@debrief/shared-types/src/types/tools/tool_index';
import type { Tool, JSONSchemaProperty } from '@debrief/shared-types/src/types/tools/tool';

/**
 * Result interface for the getApplicableTools method
 */
interface ToolFilterResult {
  /** Array of tools that are applicable to the selected features */
  tools: Tool[];
  /** Array of errors encountered during validation */
  errors: Error[];
  /** Array of warning messages for diagnostic purposes */
  warnings: string[];
}

/**
 * Cached validation result with timestamp for invalidation
 */
interface CachedResult {
  /** The cached validation result */
  result: ToolFilterResult;
  /** Timestamp when this result was cached */
  timestamp: number;
  /** Hash of the input parameters used to generate this result */
  inputHash: string;
}

/**
 * Validation result for a tool against features
 */
interface ToolValidationResult {
  isValid: boolean;
  warnings: string[];
  parameterAssignments?: Map<string, DebriefFeature>;
  parameterValidation?: { [paramName: string]: { canSatisfy: boolean; isRequired: boolean; matchingFeatureCount: number } };
  executionMode?: {
    mode: 'single' | 'multiple' | 'batch';
    description: string;
    parameterDetails?: { [paramName: string]: { expectsArray: boolean; matchingFeatureCount: number } };
  };
}

/**
 * ToolFilterService provides intelligent matching of available tools from the tool index
 * against currently selected features in the OutlineView component. This service uses
 * validation matrix logic to ensure tools receive exactly the feature types they require.
 */
export class ToolFilterService {
  private cache: Map<string, CachedResult> = new Map();
  private readonly cacheInvalidationTime = 60000; // 1 minute in milliseconds

  /**
   * Primary API method to get applicable tools for the given features
   * @param features Array of selected Debrief features
   * @param toolsData Object containing tools array with real tool schemas
   * @returns Object containing applicable tools, errors, and warnings
   */
  getApplicableTools(features: DebriefFeature[], toolsData: { tools: Tool[] }): ToolFilterResult {
    // Handle null/undefined features gracefully
    const safeFeatures = features || [];

    const inputHash = this.generateInputHash(safeFeatures, toolsData);
    const cacheKey = `${inputHash}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.result;
    }

    // Generate fresh result
    const result = this.performToolFiltering(safeFeatures, toolsData);

    // Cache the result
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      inputHash
    });

    return result;
  }

  /**
   * Performs the actual tool filtering logic
   */
  private performToolFiltering(features: DebriefFeature[], toolsData: { tools: Tool[] }): ToolFilterResult {
    const result: ToolFilterResult = {
      tools: [],
      errors: [],
      warnings: []
    };

    try {
      // Use real tools from the tools data
      for (const tool of toolsData.tools) {
        try {
          const validationResult = this.validateToolForFeatures(tool, features);

          if (validationResult.isValid) {
            result.tools.push(tool);

            if (validationResult.warnings.length > 0) {
              result.warnings.push(...validationResult.warnings);
            }
          } else {
            if (validationResult.warnings.length > 0) {
              result.warnings.push(...validationResult.warnings);
            }
          }
        } catch (error) {
          result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Add diagnostic information
      if (features.length === 0) {
        result.warnings.push('No features selected - showing all available tools');
      }

      if (result.tools.length === 0 && features.length > 0) {
        result.warnings.push(`No tools found that can process the ${features.length} selected feature(s)`);
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    return result;
  }

  /**
   * Extract tools from the tool index structure
   * This is a temporary implementation - the actual structure may differ
   */
  private extractToolsFromIndex(toolIndex: ToolIndexModel): Tool[] {
    // For now, create a mock tool based on the tool index information
    // In reality, this would extract actual Tool objects from the toolIndex
    const mockTool: Tool = {
      name: toolIndex.tool_name,
      description: toolIndex.description,
      inputSchema: {
        type: 'object',
        properties: {
          features: {
            type: 'array',
            description: 'Array of maritime features'
          }
        },
        required: ['features']
      }
    };

    return [mockTool];
  }


  /**
   * Validates if a tool can be applied to the given features
   * Public for story access to detailed validation results
   */
  validateToolForFeatures(tool: Tool, features: DebriefFeature[]): ToolValidationResult {
    const result: ToolValidationResult = {
      isValid: false,
      warnings: []
    };

    try {
      // If no features selected, no tools are enabled
      if (features.length === 0) {
        result.isValid = false;
        result.warnings.push(`No features selected for tool "${tool.name}"`);
        return result;
      }

      // If tool has no input schema or no properties, it's compatible with anything
      if (!tool.inputSchema?.properties) {
        result.isValid = true;
        return result;
      }

      const required = tool.inputSchema.required || [];

      // If no required parameters, tool is compatible
      if (required.length === 0) {
        result.isValid = true;
        return result;
      }

      // Check if all required parameters can be satisfied and analyze execution mode
      let requiredMatched = 0;
      const properties = tool.inputSchema.properties;
      const parameterDetails: { [paramName: string]: { expectsArray: boolean; matchingFeatureCount: number } } = {};
      const parameterValidation: { [paramName: string]: { canSatisfy: boolean; isRequired: boolean; matchingFeatureCount: number } } = {};
      let hasFeatureParameters = false;
      let multipleExecutions = false;
      let batchExecution = false;

      for (const paramName of required) {
        const paramSchema = properties[paramName] as JSONSchemaProperty;
        const description = paramSchema?.description || '';
        const expectsArray = paramSchema?.type === 'array';

        // Determine if this parameter can be satisfied by selected features
        let canSatisfy = false;
        let matchingFeatureCount = 0;

        // Check if this parameter expects a FeatureCollection (batch execution)
        const expectsFeatureCollection = paramName.toLowerCase().includes('feature_collection') ||
                                         paramName.toLowerCase().includes('featurecollection') ||
                                         description.toLowerCase().includes('featurecollection');

        // Pattern matching for feature types - be more specific to avoid false matches
        if (expectsFeatureCollection) {
          // FeatureCollection parameter - accepts any features as a single collection
          matchingFeatureCount = features.length;
          canSatisfy = features.length > 0;
          hasFeatureParameters = true;
          // Force batch execution for FeatureCollection parameters regardless of multiple features
          if (matchingFeatureCount > 0) {
            batchExecution = true;
          }
        } else if ((paramName.includes('track') && !paramName.includes('_')) || description.toLowerCase().includes('track feature')) {
          matchingFeatureCount = features.filter(f => f.properties?.dataType === 'track').length;
          canSatisfy = matchingFeatureCount > 0;
          hasFeatureParameters = true;
        } else if ((paramName.includes('point') && !paramName.includes('_')) || description.toLowerCase().includes('point feature')) {
          matchingFeatureCount = features.filter(f => f.properties?.dataType === 'reference-point').length;
          canSatisfy = matchingFeatureCount > 0;
          hasFeatureParameters = true;
        } else if ((paramName.includes('zone') || paramName.includes('polygon')) || description.toLowerCase().includes('zone feature')) {
          matchingFeatureCount = features.filter(f => f.properties?.dataType === 'zone').length;
          canSatisfy = matchingFeatureCount > 0;
          hasFeatureParameters = true;
        } else if (paramName.includes('feature') || description.toLowerCase().includes('features') ||
                   (description.toLowerCase().includes('feature') && !description.toLowerCase().includes('grid points'))) {
          // Generic feature parameter - accepts any feature type
          matchingFeatureCount = features.length;
          canSatisfy = features.length > 0;
          hasFeatureParameters = true;
        } else {
          // Configuration parameter - cannot be satisfied by feature selection
          canSatisfy = false;
          matchingFeatureCount = 0;
        }

        // Record parameter details
        parameterDetails[paramName] = { expectsArray, matchingFeatureCount };

        // Record parameter validation status
        parameterValidation[paramName] = {
          canSatisfy,
          isRequired: true, // This loop only processes required parameters
          matchingFeatureCount
        };

        // Determine execution mode based on parameter requirements
        // (Note: FeatureCollection parameters set batchExecution = true above)
        if (hasFeatureParameters && matchingFeatureCount > 1 && !expectsFeatureCollection) {
          if (expectsArray) {
            batchExecution = true;
          } else {
            multipleExecutions = true;
          }
        }

        if (canSatisfy) {
          requiredMatched++;
        }
      }

      // Also process optional parameters for validation display
      if (properties) {
        Object.keys(properties).forEach(paramName => {
          if (!required.includes(paramName)) {
            // This is an optional parameter
            const paramSchema = properties[paramName] as JSONSchemaProperty;
            const description = paramSchema?.description || '';
            let canSatisfy = false;
            let matchingFeatureCount = 0;

            // Use the same logic as for required parameters to determine if it can be satisfied
            const expectsFeatureCollection = paramName.toLowerCase().includes('feature_collection') ||
                                             paramName.toLowerCase().includes('featurecollection') ||
                                             description.toLowerCase().includes('featurecollection');

            if (expectsFeatureCollection) {
              matchingFeatureCount = features.length;
              canSatisfy = features.length > 0;
            } else if ((paramName.includes('track') && !paramName.includes('_')) || description.toLowerCase().includes('track feature')) {
              matchingFeatureCount = features.filter(f => f.properties?.dataType === 'track').length;
              canSatisfy = matchingFeatureCount > 0;
            } else if ((paramName.includes('point') && !paramName.includes('_')) || description.toLowerCase().includes('point feature')) {
              matchingFeatureCount = features.filter(f => f.properties?.dataType === 'reference-point').length;
              canSatisfy = matchingFeatureCount > 0;
            } else if ((paramName.includes('zone') || paramName.includes('polygon')) || description.toLowerCase().includes('zone feature')) {
              matchingFeatureCount = features.filter(f => f.properties?.dataType === 'zone').length;
              canSatisfy = matchingFeatureCount > 0;
            } else if (paramName.includes('feature') || description.toLowerCase().includes('features') ||
                       (description.toLowerCase().includes('feature') && !description.toLowerCase().includes('grid points'))) {
              matchingFeatureCount = features.length;
              canSatisfy = features.length > 0;
            } else {
              canSatisfy = false;
              matchingFeatureCount = 0;
            }

            parameterValidation[paramName] = {
              canSatisfy,
              isRequired: false,
              matchingFeatureCount
            };
          }
        });
      }

      // Tool is valid only if all required parameters can be satisfied
      result.isValid = requiredMatched === required.length;

      if (!result.isValid) {
        result.warnings.push(`Tool "${tool.name}" has ${required.length - requiredMatched} unsatisfied required parameters`);
      }

      // Determine execution mode and description
      if (result.isValid && hasFeatureParameters) {
        let mode: 'single' | 'multiple' | 'batch' = 'single';
        let description = 'Tool will execute once';

        if (batchExecution && multipleExecutions) {
          mode = 'batch';
          description = 'Tool will execute in batch mode for array parameters and multiple times for single parameters';
        } else if (batchExecution) {
          mode = 'batch';
          description = `Tool will execute once with ${features.length} features in batch`;
        } else if (multipleExecutions) {
          mode = 'multiple';
          const executionCount = Math.max(...Object.values(parameterDetails).map(p => p.matchingFeatureCount));
          description = `Tool will execute ${executionCount} times (once per matching feature)`;
        }

        result.executionMode = {
          mode,
          description,
          parameterDetails
        };
      }

      // Add parameter validation results
      result.parameterValidation = parameterValidation;

    } catch (error) {
      result.isValid = false;
      result.warnings.push(`Error validating tool "${tool.name}": ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Parse tool input schema to extract parameter type requirements
   */
  private parseToolParameterRequirements(tool: Tool): string[] {
    const requirements: string[] = [];

    try {
      // Basic parsing of JSON schema to extract geometry type requirements
      if (tool.inputSchema?.properties) {
        Object.entries(tool.inputSchema.properties).forEach(([_paramName, paramSchema]) => {
          if (typeof paramSchema === 'object' && paramSchema !== null) {
            // Look for geometry type hints in the parameter schema
            if ('description' in paramSchema && typeof paramSchema.description === 'string') {
              const desc = paramSchema.description.toLowerCase();
              if (desc.includes('point')) {
                requirements.push('Point');
              } else if (desc.includes('linestring') || desc.includes('track')) {
                requirements.push('LineString');
              } else if (desc.includes('polygon')) {
                requirements.push('Polygon');
              }
            }
          }
        });
      }

      // Default to accepting any feature if no specific requirements found
      if (requirements.length === 0) {
        requirements.push('any');
      }

    } catch {
      // If parsing fails, assume tool accepts any input
      requirements.push('any');
    }

    return requirements;
  }

  /**
   * Create validation matrix mapping features to parameter requirements
   */
  private createValidationMatrix(features: DebriefFeature[], requirements: string[]): boolean[][] {
    const matrix: boolean[][] = [];

    for (let i = 0; i < features.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < requirements.length; j++) {
        matrix[i][j] = this.isFeatureCompatibleWithParameter(features[i], requirements[j]);
      }
    }

    return matrix;
  }

  /**
   * Type guard to check if a feature is compatible with a parameter requirement
   */
  private isFeatureCompatibleWithParameter(feature: DebriefFeature, parameterType: string): boolean {
    if (parameterType === 'any') {
      return true;
    }

    // Use discriminated union type checking
    const geometryType = feature.geometry?.type;

    switch (parameterType) {
      case 'Point':
        return geometryType === 'Point';

      case 'LineString':
        return geometryType === 'LineString' || geometryType === 'MultiLineString';

      case 'Polygon':
        return geometryType === 'Polygon' || geometryType === 'MultiPolygon';

      default:
        // Check if parameter type matches the feature's dataType property
        if ('properties' in feature && feature.properties && typeof feature.properties === 'object') {
          const properties = feature.properties as Record<string, unknown>;
          if ('dataType' in properties) {
            return properties.dataType === parameterType.toLowerCase();
          }
        }
        return false;
    }
  }

  /**
   * Find perfect assignment where each parameter gets exactly one compatible feature
   */
  private findPerfectAssignment(
    matrix: boolean[][],
    features: DebriefFeature[],
    requirements: string[]
  ): Map<string, DebriefFeature> | null {

    if (requirements.length > features.length) {
      return null; // Not enough features to satisfy all requirements
    }

    // Simple greedy assignment for single requirement
    if (requirements.length === 1) {
      for (let i = 0; i < features.length; i++) {
        if (matrix[i][0]) {
          const assignment = new Map<string, DebriefFeature>();
          assignment.set(`param_0_${requirements[0]}`, features[i]);
          return assignment;
        }
      }
      return null;
    }

    // For multiple requirements, try to find a valid assignment
    // This is a simplified implementation - could be enhanced with proper matching algorithms
    const assignment = new Map<string, DebriefFeature>();
    const usedFeatures = new Set<number>();

    for (let reqIndex = 0; reqIndex < requirements.length; reqIndex++) {
      let assigned = false;

      for (let featIndex = 0; featIndex < features.length; featIndex++) {
        if (!usedFeatures.has(featIndex) && matrix[featIndex][reqIndex]) {
          assignment.set(`param_${reqIndex}_${requirements[reqIndex]}`, features[featIndex]);
          usedFeatures.add(featIndex);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        return null; // Could not assign this requirement
      }
    }

    return assignment;
  }

  /**
   * Generate a hash of the input parameters for caching
   */
  private generateInputHash(features: DebriefFeature[], toolsData: { tools: Tool[] }): string {
    const featureHash = features.map(f => {
      const id = 'id' in f ? f.id : 'unknown';
      const geometryType = f.geometry?.type || 'unknown';
      return `${id}_${geometryType}`;
    }).join('|');

    const toolHash = (toolsData?.tools || []).map(t => t.name).sort().join(',');

    return `${featureHash}__${toolHash}`;
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(cached: CachedResult): boolean {
    const age = Date.now() - cached.timestamp;
    return age < this.cacheInvalidationTime;
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    for (const [key, cached] of this.cache.entries()) {
      if (!this.isCacheValid(cached)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; validEntries: number; expiredEntries: number } {
    let validEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.cache.values()) {
      if (this.isCacheValid(cached)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      size: this.cache.size,
      validEntries,
      expiredEntries
    };
  }
}

// Export a singleton instance for convenient usage
export const toolFilterService = new ToolFilterService();