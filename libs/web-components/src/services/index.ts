/**
 * Services-only exports for non-React environments (like VS Code extension)
 * This avoids JSX compilation issues when importing from VS Code app
 */

// Service exports
export { ToolParameterService } from './toolParameterService';

// Service type exports
export type {
  StateProvider,
  ToolSchema,
  ParameterAnalysis,
  ToolParameterAnalysis,
  InjectedParameters,
  JSONSchemaProperty
} from './toolParameterService';