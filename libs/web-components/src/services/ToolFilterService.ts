import type { DebriefFeature } from '@debrief/shared-types';
import type { ToolIndexModel } from '@debrief/shared-types/src/types/tools/tool_index';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool';

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
   * @param toolIndex Tool index containing available tools
   * @returns Object containing applicable tools, errors, and warnings
   */
  getApplicableTools(features: DebriefFeature[], toolIndex: ToolIndexModel): ToolFilterResult {
    // Handle null/undefined features gracefully
    const safeFeatures = features || [];

    const inputHash = this.generateInputHash(safeFeatures, toolIndex);
    const cacheKey = `${inputHash}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.result;
    }

    // Generate fresh result
    const result = this.performToolFiltering(safeFeatures, toolIndex);

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
  private performToolFiltering(features: DebriefFeature[], toolIndex: ToolIndexModel): ToolFilterResult {
    const result: ToolFilterResult = {
      tools: [],
      errors: [],
      warnings: []
    };

    try {
      // For now, we need to create a mock tool array from the tool index
      // In a real implementation, this would come from the toolIndex structure
      const mockTools: Tool[] = this.extractToolsFromIndex(toolIndex);

      for (const tool of mockTools) {
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
   */
  private validateToolForFeatures(tool: Tool, features: DebriefFeature[]): ToolValidationResult {
    const result: ToolValidationResult = {
      isValid: false,
      warnings: []
    };

    try {
      // Parse tool input schema to understand parameter requirements
      const parameterRequirements = this.parseToolParameterRequirements(tool);

      if (parameterRequirements.length === 0 || parameterRequirements.includes('any')) {
        // Tool accepts any input or has no specific requirements
        result.isValid = true;
        result.warnings.push(`Tool "${tool.name}" has no specific feature requirements`);
        return result;
      }

      // If no features are selected, tool can't be applied (unless it accepts 'any')
      if (features.length === 0) {
        result.isValid = false;
        result.warnings.push(`Tool "${tool.name}" requires features but none are selected`);
        return result;
      }

      // Create validation matrix
      const validationMatrix = this.createValidationMatrix(features, parameterRequirements);

      // Check for perfect assignment
      const assignment = this.findPerfectAssignment(validationMatrix, features, parameterRequirements);

      if (assignment) {
        result.isValid = true;
        result.parameterAssignments = assignment;

        if (features.length > parameterRequirements.length) {
          result.warnings.push(`Tool "${tool.name}" only uses ${parameterRequirements.length} of ${features.length} selected features`);
        }
      } else {
        result.isValid = false;
        result.warnings.push(`Tool "${tool.name}" requires ${parameterRequirements.join(', ')} but selected features don't match`);
      }

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
  private generateInputHash(features: DebriefFeature[], toolIndex: ToolIndexModel): string {
    const featureHash = features.map(f => {
      const id = 'id' in f ? f.id : 'unknown';
      const geometryType = f.geometry?.type || 'unknown';
      return `${id}_${geometryType}`;
    }).join('|');

    const toolHash = `${toolIndex.tool_name}_${toolIndex.description}`;

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