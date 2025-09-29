/**
 * Service-specific TypeScript interfaces for ToolVaultCommandHandler
 */

import {
  TimeState,
  ViewportState,
  SelectionState,
  EditorState,
  DebriefFeatureCollection
} from '@debrief/shared-types';

/**
 * State setter interface for dependency injection into ToolVaultCommandHandler
 * Provides a unified interface for document state updates
 */
export interface StateSetter {
  /** Update viewport state (zoom, center, bounds) */
  setViewportState(state: ViewportState): void;

  /** Update feature selection state */
  setSelectionState(state: SelectionState): void;

  /** Update time controller state */
  setTimeState(state: TimeState): void;

  /** Update editor document state */
  setEditorState(state: EditorState): void;

  /** Display text message to user */
  showText(message: string): void;

  /** Display structured data to user */
  showData(data: unknown): void;

  /** Display image to user */
  showImage(imageData: { mediaType: string; data: string; title?: string }): void;

  /** Log message with specified level */
  logMessage(message: string, level?: 'debug' | 'info' | 'warn' | 'error'): void;
}

/**
 * Result of a command handler operation
 */
export interface CommandHandlerResult {
  /** Whether the command was successfully processed */
  success: boolean;

  /** Updated feature collection (if features were modified) */
  featureCollection?: DebriefFeatureCollection;

  /** Error message if processing failed */
  error?: string;

  /** Additional metadata about the operation */
  metadata?: {
    /** Number of features affected */
    featuresAffected?: number;

    /** Type of operation performed */
    operationType?: 'feature-update' | 'state-update' | 'display' | 'composite';

    /** Commands processed (for composite commands) */
    commandsProcessed?: number;
  };
}

/**
 * Interface for individual command processors
 */
export interface CommandProcessor<TCommand = unknown> {
  /** Check if this processor can handle the given command */
  canHandle(command: unknown): command is TCommand;

  /** Process the command and return result */
  process(
    command: TCommand,
    featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): Promise<CommandHandlerResult> | CommandHandlerResult;
}

/**
 * Configuration options for the ToolVaultCommandHandler
 */
export interface CommandHandlerOptions {
  /** Enable rollback capability for failed composite commands */
  enableRollback?: boolean;

  /** Maximum recursion depth for composite commands */
  maxCompositeDepth?: number;

  /** Validate feature collection after each operation */
  validateFeatures?: boolean;
}