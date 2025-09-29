/**
 * Tool Parameter Service - Headless service for automatic context/state injection
 *
 * This service analyzes tool schemas and identifies which parameters can be
 * automatically injected from the current editor state, eliminating the need
 * for hardcoded parameter mapping in UI components.
 */

import {
  TimeState,
  ViewportState,
  SelectionState,
  EditorState,
  DebriefFeatureCollection,
  DebriefFeature,
  DebriefTrackFeature
} from '@debrief/shared-types';

// Import existing Tool and JSONSchema types
import type { Tool, JSONSchemaProperty as BaseJSONSchemaProperty } from '@debrief/shared-types/src/types/tools/tool';

// Extend the base JSONSchemaProperty to include full JSON Schema features
export interface JSONSchemaProperty extends BaseJSONSchemaProperty {
  $ref?: string;
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
}

// Use the existing Tool interface as ToolSchema
export type ToolSchema = Tool;

// State provider interface for dependency injection
export interface StateProvider {
  getTimeState(): TimeState | null;
  getViewportState(): ViewportState | null;
  getSelectionState(): SelectionState | null;
  getEditorStateForProvider(editorId?: string): EditorState | null;
  getFeatureCollection(): DebriefFeatureCollection | null;
  getSelectedFeatures(): DebriefFeature[];
}

// Parameter analysis results
export interface ParameterAnalysis {
  parameterName: string;
  isAutoInjectable: boolean;
  injectionType?: 'ViewportState' | 'TimeState' | 'EditorState' | 'DebriefFeatureCollection' | 'DebriefTrackFeature' | 'SelectedFeatures' | 'FeatureArray';
  requiresUserInput: boolean;
  description?: string | null;
  defaultValue?: unknown;
}

export interface ToolParameterAnalysis {
  toolName: string;
  parameters: ParameterAnalysis[];
  autoInjectableCount: number;
  userInputCount: number;
}

export interface InjectedParameters {
  [parameterName: string]: unknown;
}

/**
 * Core service for analyzing tool schemas and injecting parameters
 */
export class ToolParameterService {
  constructor(private stateProvider: StateProvider) {}

  /**
   * Analyze a tool schema to identify auto-injectable vs user-input parameters
   */
  public analyzeToolParameters(schema: ToolSchema): ToolParameterAnalysis {
    const parameters: ParameterAnalysis[] = [];

    if (!schema.inputSchema?.properties) {
      return {
        toolName: schema.name,
        parameters,
        autoInjectableCount: 0,
        userInputCount: 0
      };
    }

    for (const [paramName, paramSchema] of Object.entries(schema.inputSchema.properties)) {
      const analysis = this.analyzeParameter(paramName, paramSchema);
      parameters.push(analysis);
    }

    const autoInjectableCount = parameters.filter(p => p.isAutoInjectable).length;
    const userInputCount = parameters.filter(p => p.requiresUserInput).length;

    return {
      toolName: schema.name,
      parameters,
      autoInjectableCount,
      userInputCount
    };
  }

  /**
   * Analyze a single parameter to determine if it can be auto-injected
   */
  private analyzeParameter(paramName: string, paramSchema: JSONSchemaProperty): ParameterAnalysis {
    const result: ParameterAnalysis = {
      parameterName: paramName,
      isAutoInjectable: false,
      requiresUserInput: true,
      description: paramSchema.description,
      defaultValue: paramSchema.default
    };

    // Check for ref-based injection patterns
    if (paramSchema.$ref) {
      const injectionType = this.mapRefToInjectionType(paramSchema.$ref);
      if (injectionType) {
        result.isAutoInjectable = true;
        result.injectionType = injectionType;
        result.requiresUserInput = false;
      }
    }

    // Check for array parameters with feature type refs
    if (paramSchema.type === 'array' && paramSchema.items) {
      if (this.isFeatureArrayParameter(paramSchema.items)) {
        result.isAutoInjectable = true;
        result.injectionType = 'SelectedFeatures';
        result.requiresUserInput = false;
      }
    }

    // Basic types require user input (unless they have defaults)
    if (paramSchema.type && ['string', 'number', 'integer', 'boolean'].includes(paramSchema.type)) {
      result.requiresUserInput = paramSchema.default === undefined;
    }

    return result;
  }

  /**
   * Map schema $ref values to injection types
   */
  private mapRefToInjectionType(ref: string): ParameterAnalysis['injectionType'] | null {
    const refMappings: Record<string, ParameterAnalysis['injectionType']> = {
      '#/$defs/ViewportState': 'ViewportState',
      '#/$defs/TimeState': 'TimeState',
      '#/$defs/EditorState': 'EditorState',
      '#/$defs/DebriefFeatureCollection': 'DebriefFeatureCollection',
      '#/$defs/DebriefTrackFeature': 'DebriefTrackFeature',
      // Handle other feature types that might be selected
      '#/$defs/DebriefPointFeature': 'SelectedFeatures',
      '#/$defs/DebriefAnnotationFeature': 'SelectedFeatures'
    };

    return refMappings[ref] || null;
  }

  /**
   * Check if a parameter represents an array of features
   */
  private isFeatureArrayParameter(itemsSchema: JSONSchemaProperty): boolean {
    // Check for anyOf containing feature type refs
    if (itemsSchema.anyOf) {
      return itemsSchema.anyOf.some(option =>
        option.$ref && (
          option.$ref.includes('DebriefTrackFeature') ||
          option.$ref.includes('DebriefPointFeature') ||
          option.$ref.includes('DebriefAnnotationFeature')
        )
      );
    }

    // Check for oneOf containing feature type refs
    if (itemsSchema.oneOf) {
      return itemsSchema.oneOf.some(option =>
        option.$ref && (
          option.$ref.includes('DebriefTrackFeature') ||
          option.$ref.includes('DebriefPointFeature') ||
          option.$ref.includes('DebriefAnnotationFeature')
        )
      );
    }

    // Check direct ref to feature types
    if (itemsSchema.$ref) {
      return itemsSchema.$ref.includes('DebriefTrackFeature') ||
             itemsSchema.$ref.includes('DebriefPointFeature') ||
             itemsSchema.$ref.includes('DebriefAnnotationFeature');
    }

    return false;
  }

  /**
   * Inject auto-injectable parameters for a tool
   */
  public injectParameters(
    schema: ToolSchema,
    selectedFeatures: DebriefFeature[] = [],
    additionalParams: Record<string, unknown> = {}
  ): InjectedParameters {
    const analysis = this.analyzeToolParameters(schema);
    const injectedParams: InjectedParameters = { ...additionalParams };

    for (const param of analysis.parameters) {
      if (param.isAutoInjectable && param.injectionType) {
        const injectedValue = this.getInjectedValue(param.injectionType, selectedFeatures);
        injectedParams[param.parameterName] = injectedValue;
      }
    }

    return injectedParams;
  }

  /**
   * Get the actual value to inject based on injection type
   */
  private getInjectedValue(
    injectionType: NonNullable<ParameterAnalysis['injectionType']>,
    selectedFeatures: DebriefFeature[]
  ): unknown {
    switch (injectionType) {
      case 'ViewportState':
        return this.stateProvider.getViewportState();

      case 'TimeState':
        return this.stateProvider.getTimeState();

      case 'EditorState':
        return this.stateProvider.getEditorStateForProvider();

      case 'DebriefFeatureCollection': {
        // If we have selected features, create a collection with only those
        if (selectedFeatures.length > 0) {
          const baseCollection = this.stateProvider.getFeatureCollection();
          const result = {
            type: 'FeatureCollection' as const,
            features: selectedFeatures,
            ...({} as Record<string, unknown>)
          };

          // Preserve any collection-level metadata if it exists
          if (baseCollection && typeof baseCollection === 'object') {
            for (const [key, value] of Object.entries(baseCollection)) {
              if (key !== 'features' && key !== 'type') {
                (result as Record<string, unknown>)[key] = value;
              }
            }
          }

          return result;
        }

        // Fallback to full collection if no selection
        return this.stateProvider.getFeatureCollection();
      }

      case 'DebriefTrackFeature': {
        // Return the first selected track feature, or first track in collection
        const trackFeature = selectedFeatures.find(f =>
          f.properties?.dataType === 'track'
        ) as DebriefTrackFeature | undefined;

        if (trackFeature) return trackFeature;

        // Fallback: find first track in feature collection
        const featureCollection = this.stateProvider.getFeatureCollection();
        return featureCollection?.features?.find(f =>
          f.properties?.dataType === 'track'
        ) || null;
      }

      case 'SelectedFeatures':
      case 'FeatureArray':
        return selectedFeatures.length > 0 ? selectedFeatures : this.stateProvider.getSelectedFeatures();

      default:
        return null;
    }
  }

  /**
   * Check if a tool requires any user input parameters
   */
  public requiresUserInput(schema: ToolSchema): boolean {
    const analysis = this.analyzeToolParameters(schema);
    return analysis.userInputCount > 0;
  }

  /**
   * Get only the parameters that require user input
   */
  public getUserInputParameters(schema: ToolSchema): ParameterAnalysis[] {
    const analysis = this.analyzeToolParameters(schema);
    return analysis.parameters.filter(p => p.requiresUserInput);
  }

  /**
   * Validate that all required parameters can be satisfied
   */
  public validateParameterSatisfaction(
    schema: ToolSchema,
    selectedFeatures: DebriefFeature[] = [],
    userParams: Record<string, unknown> = {}
  ): { canExecute: boolean; missingParams: string[] } {
    const analysis = this.analyzeToolParameters(schema);
    const missingParams: string[] = [];

    for (const param of analysis.parameters) {
      if (schema.inputSchema.required?.includes(param.parameterName)) {
        // Check if user provided a value for this parameter
        const hasUserProvidedValue = param.parameterName in userParams;

        // If user provided a value, parameter is satisfied regardless of injection capability
        if (hasUserProvidedValue) {
          continue;
        }

        // If no user value, check if parameter can be auto-injected
        if (param.isAutoInjectable && param.injectionType) {
          const injectedValue = this.getInjectedValue(param.injectionType, selectedFeatures);
          if (injectedValue === null) {
            missingParams.push(param.parameterName);
          }
        }
        // If no user value and not auto-injectable, parameter is missing
        else {
          missingParams.push(param.parameterName);
        }
      }
    }

    return {
      canExecute: missingParams.length === 0,
      missingParams
    };
  }
}

