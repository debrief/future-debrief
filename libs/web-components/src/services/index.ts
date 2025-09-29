/**
 * Services-only exports for non-React environments (like VS Code extension)
 * This avoids JSX compilation issues when importing from VS Code app
 */

// Service exports
export { ToolParameterService } from './toolParameterService';
export { ToolVaultCommandHandler } from './ToolVaultCommandHandler';

// Service type exports
export type {
  StateProvider,
  ToolSchema,
  ParameterAnalysis,
  ToolParameterAnalysis,
  InjectedParameters,
  JSONSchemaProperty
} from './toolParameterService';

export type {
  StateSetter,
  CommandHandlerResult,
  CommandProcessor,
  CommandHandlerOptions
} from './types';

export type { SpecificCommand } from './ToolVaultCommandHandler';