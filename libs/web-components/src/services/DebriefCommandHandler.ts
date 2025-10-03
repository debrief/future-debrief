/**
 * DebriefCommand Handler Service - Central command processing for plot state updates
 *
 * This service bridges the gap between Tool Vault tool execution and Debrief plot state management,
 * providing a standardized interface for processing all 12 DebriefCommand types and applying
 * their effects to FeatureCollections and document state.
 */

import {
  DebriefFeatureCollection,
  TimeState,
} from '@debrief/shared-types';

// Import individual command types from shared-types
import { AddFeaturesCommand } from '@debrief/shared-types/derived/typescript/tools/add_features_command';
import { UpdateFeaturesCommand } from '@debrief/shared-types/derived/typescript/tools/update_features_command';
import { DeleteFeaturesCommand } from '@debrief/shared-types/derived/typescript/tools/delete_features_command';
import { SetFeatureCollectionCommand } from '@debrief/shared-types/derived/typescript/tools/set_feature_collection_command';
import { SetViewportCommand } from '@debrief/shared-types/derived/typescript/tools/set_viewport_command';
import { SetSelectionCommand } from '@debrief/shared-types/derived/typescript/tools/set_selection_command';
import { ShowTextCommand } from '@debrief/shared-types/derived/typescript/tools/show_text_command';
import { ShowDataCommand } from '@debrief/shared-types/derived/typescript/tools/show_data_command';
import { ShowImageCommand } from '@debrief/shared-types/derived/typescript/tools/show_image_command';
import { LogMessageCommand } from '@debrief/shared-types/derived/typescript/tools/log_message_command';

// Base DebriefCommand type
import { DebriefCommand } from '@debrief/shared-types/derived/typescript/tools/tool_call_response';

import {
  StateSetter,
  CommandHandlerResult,
  CommandProcessor,
  CommandHandlerOptions,
} from './types';

// Union type for all specific command types
export type SpecificCommand =
  | AddFeaturesCommand
  | UpdateFeaturesCommand
  | DeleteFeaturesCommand
  | SetFeatureCollectionCommand
  | SetViewportCommand
  | SetSelectionCommand
  | SetTimeStateCommand
  | ShowTextCommand
  | ShowDataCommand
  | ShowImageCommand
  | LogMessageCommand
  | CompositeCommand;

// CompositeCommand interface (not yet generated, so defining locally)
interface CompositeCommand {
  command: 'composite';
  payload: DebriefCommand[];
}

// SetTimeStateCommand interface (seems missing from generated types)
interface SetTimeStateCommand {
  command: 'setTimeState';
  payload: TimeState;
}

/**
 * Main service class for processing DebriefCommands
 */
export class DebriefCommandHandler {
  private processors: Map<string, CommandProcessor> = new Map();
  private options: CommandHandlerOptions;

  constructor(
    private stateSetter: StateSetter,
    options: CommandHandlerOptions = {}
  ) {
    this.options = {
      enableRollback: false,
      maxCompositeDepth: 10,
      validateFeatures: true,
      ...options,
    };

    // Register command processors
    this.registerProcessors();
  }

  /**
   * Process a DebriefCommand and update plot state
   */
  public async processCommand(
    command: SpecificCommand,
    featureCollection: DebriefFeatureCollection
  ): Promise<CommandHandlerResult> {
    try {
      // Type guard to ensure command structure
      if (!this.isValidCommand(command)) {
        return {
          success: false,
          error: 'Invalid command structure',
        };
      }

      const processor = this.processors.get(command.command as string);
      if (!processor) {
        return {
          success: false,
          error: `Unsupported command type: ${command.command || 'unknown'}`,
        };
      }

      return await processor.process(command, featureCollection, this.stateSetter);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process multiple commands in sequence
   */
  public async processCommands(
    commands: SpecificCommand[],
    initialFeatureCollection: DebriefFeatureCollection
  ): Promise<CommandHandlerResult[]> {
    const results: CommandHandlerResult[] = [];
    let currentFeatureCollection = initialFeatureCollection;

    for (const command of commands) {
      const result = await this.processCommand(command, currentFeatureCollection);
      results.push(result);

      // Update feature collection for next command if features were modified
      if (result.success && result.featureCollection) {
        currentFeatureCollection = result.featureCollection;
      }

      // Stop processing if a command fails (unless rollback is enabled)
      if (!result.success && !this.options.enableRollback) {
        break;
      }
    }

    return results;
  }

  /**
   * Check if command has valid structure
   */
  private isValidCommand(command: SpecificCommand): command is SpecificCommand {
    // With typed input, we can trust the command structure
    return (
      typeof command === 'object' &&
      command !== null &&
      'command' in command &&
      'payload' in command &&
      typeof command.command === 'string'
    );
  }

  /**
   * Register all command processors
   */
  private registerProcessors(): void {
    // Feature Management Commands
    this.processors.set('addFeatures', new AddFeaturesProcessor());
    this.processors.set('updateFeatures', new UpdateFeaturesProcessor());
    this.processors.set('deleteFeatures', new DeleteFeaturesProcessor());
    this.processors.set('setFeatureCollection', new SetFeatureCollectionProcessor());

    // State Management Commands
    this.processors.set('setViewport', new SetViewportProcessor());
    this.processors.set('setSelection', new SetSelectionProcessor());
    this.processors.set('setTimeState', new SetTimeStateProcessor());

    // User Interface Commands
    this.processors.set('showText', new ShowTextProcessor());
    this.processors.set('showData', new ShowDataProcessor());
    this.processors.set('showImage', new ShowImageProcessor());

    // System Commands
    this.processors.set('logMessage', new LogMessageProcessor());
    this.processors.set('composite', new CompositeProcessor(this));
  }
}

/**
 * Processor for AddFeaturesCommand
 */
class AddFeaturesProcessor implements CommandProcessor<AddFeaturesCommand> {
  canHandle(command: unknown): command is AddFeaturesCommand {
    return (command as SpecificCommand)?.command === 'addFeatures';
  }

  process(
    command: AddFeaturesCommand,
    featureCollection: DebriefFeatureCollection,
    _stateSetter: StateSetter
  ): CommandHandlerResult {
    const newFeatures = Array.isArray(command.payload) ? command.payload : [];

    const updatedCollection: DebriefFeatureCollection = {
      ...featureCollection,
      features: [...featureCollection.features, ...newFeatures],
    };

    return {
      success: true,
      featureCollection: updatedCollection,
      metadata: {
        featuresAffected: newFeatures.length,
        operationType: 'feature-update',
      },
    };
  }
}

/**
 * Processor for UpdateFeaturesCommand
 */
class UpdateFeaturesProcessor implements CommandProcessor<UpdateFeaturesCommand> {
  canHandle(command: unknown): command is UpdateFeaturesCommand {
    return (command as SpecificCommand)?.command === 'updateFeatures';
  }

  process(
    command: UpdateFeaturesCommand,
    featureCollection: DebriefFeatureCollection,
    _stateSetter: StateSetter
  ): CommandHandlerResult {
    const updatedFeatures = Array.isArray(command.payload) ? command.payload : [];
    let updatedCount = 0;

    const updatedCollection: DebriefFeatureCollection = {
      ...featureCollection,
      features: featureCollection.features.map((feature) => {
        const update = updatedFeatures.find((f) => f.id === feature.id);
        if (update) {
          updatedCount++;
          return update;
        }
        return feature;
      }),
    };

    return {
      success: true,
      featureCollection: updatedCollection,
      metadata: {
        featuresAffected: updatedCount,
        operationType: 'feature-update',
      },
    };
  }
}

/**
 * Processor for DeleteFeaturesCommand
 */
class DeleteFeaturesProcessor implements CommandProcessor<DeleteFeaturesCommand> {
  canHandle(command: unknown): command is DeleteFeaturesCommand {
    return (command as SpecificCommand)?.command === 'deleteFeatures';
  }

  process(
    command: DeleteFeaturesCommand,
    featureCollection: DebriefFeatureCollection,
    _stateSetter: StateSetter
  ): CommandHandlerResult {
    const idsToDelete = Array.isArray(command.payload) ? command.payload : [];
    const initialCount = featureCollection.features.length;

    const updatedCollection: DebriefFeatureCollection = {
      ...featureCollection,
      features: featureCollection.features.filter(
        (feature) => !idsToDelete.includes(String(feature.id))
      ),
    };

    const deletedCount = initialCount - updatedCollection.features.length;

    return {
      success: true,
      featureCollection: updatedCollection,
      metadata: {
        featuresAffected: deletedCount,
        operationType: 'feature-update',
      },
    };
  }
}

/**
 * Processor for SetFeatureCollectionCommand
 */
class SetFeatureCollectionProcessor implements CommandProcessor<SetFeatureCollectionCommand> {
  canHandle(command: unknown): command is SetFeatureCollectionCommand {
    return (command as SpecificCommand)?.command === 'setFeatureCollection';
  }

  process(
    command: SetFeatureCollectionCommand,
    _featureCollection: DebriefFeatureCollection,
    _stateSetter: StateSetter
  ): CommandHandlerResult {
    const newCollection = command.payload;

    return {
      success: true,
      featureCollection: newCollection,
      metadata: {
        featuresAffected: newCollection.features.length,
        operationType: 'feature-update',
      },
    };
  }
}

/**
 * Processor for SetViewportCommand
 */
class SetViewportProcessor implements CommandProcessor<SetViewportCommand> {
  canHandle(command: unknown): command is SetViewportCommand {
    return (command as SpecificCommand)?.command === 'setViewport';
  }

  process(
    command: SetViewportCommand,
    _featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): CommandHandlerResult {
    stateSetter.setViewportState(command.payload);

    return {
      success: true,
      metadata: {
        operationType: 'state-update',
      },
    };
  }
}

/**
 * Processor for SetSelectionCommand
 */
class SetSelectionProcessor implements CommandProcessor<SetSelectionCommand> {
  canHandle(command: unknown): command is SetSelectionCommand {
    return (command as SpecificCommand)?.command === 'setSelection';
  }

  process(
    command: SetSelectionCommand,
    _featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): CommandHandlerResult {
    stateSetter.setSelectionState(command.payload);

    return {
      success: true,
      metadata: {
        operationType: 'state-update',
      },
    };
  }
}

/**
 * Processor for SetTimeStateCommand
 */
class SetTimeStateProcessor implements CommandProcessor<SetTimeStateCommand> {
  canHandle(command: unknown): command is SetTimeStateCommand {
    return (command as SpecificCommand)?.command === 'setTimeState';
  }

  process(
    command: SetTimeStateCommand,
    _featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): CommandHandlerResult {
    stateSetter.setTimeState(command.payload);

    return {
      success: true,
      metadata: {
        operationType: 'state-update',
      },
    };
  }
}

/**
 * Processor for ShowTextCommand
 */
class ShowTextProcessor implements CommandProcessor<ShowTextCommand> {
  canHandle(command: unknown): command is ShowTextCommand {
    return (command as SpecificCommand)?.command === 'showText';
  }

  process(
    command: ShowTextCommand,
    _featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): CommandHandlerResult {
    const message = typeof command.payload === 'string' ? command.payload : String(command.payload);
    stateSetter.showText(message);

    return {
      success: true,
      metadata: {
        operationType: 'display',
      },
    };
  }
}

/**
 * Processor for ShowDataCommand
 */
class ShowDataProcessor implements CommandProcessor<ShowDataCommand> {
  canHandle(command: unknown): command is ShowDataCommand {
    return (command as SpecificCommand)?.command === 'showData';
  }

  process(
    command: ShowDataCommand,
    _featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): CommandHandlerResult {
    stateSetter.showData(command.payload);

    return {
      success: true,
      metadata: {
        operationType: 'display',
      },
    };
  }
}

/**
 * Processor for ShowImageCommand
 */
class ShowImageProcessor implements CommandProcessor<ShowImageCommand> {
  canHandle(command: unknown): command is ShowImageCommand {
    return (command as SpecificCommand)?.command === 'showImage';
  }

  process(
    command: ShowImageCommand,
    _featureCollection: DebriefFeatureCollection,
    stateSetter: StateSetter
  ): CommandHandlerResult {
    const payload = command.payload;
    if (typeof payload === 'object' && payload !== null && 'data' in payload && 'mediaType' in payload) {
      stateSetter.showImage({
        data: String(payload.data),
        mediaType: String(payload.mediaType),
        title: 'title' in payload ? String(payload.title) : undefined,
      });

      return {
        success: true,
        metadata: {
          operationType: 'display',
        },
      };
    }

    return {
      success: false,
      error: 'Invalid image payload structure',
    };
  }
}

/**
 * Processor for LogMessageCommand
 */
class LogMessageProcessor implements CommandProcessor<LogMessageCommand> {
  canHandle(command: unknown): command is LogMessageCommand {
    return (command as SpecificCommand)?.command === 'logMessage';
  }

  process(
    command: LogMessageCommand,
    _featureCollection: DebriefFeatureCollection,
    _stateSetter: StateSetter
  ): CommandHandlerResult {
    const payload = command.payload;

    if (typeof payload === 'string') {
      _stateSetter.logMessage(payload);
    } else if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const level = 'level' in payload ? String(payload.level) as 'debug' | 'info' | 'warn' | 'error' : 'info';
      _stateSetter.logMessage(String(payload.message), level);
    } else {
      _stateSetter.logMessage(String(payload));
    }

    return {
      success: true,
      metadata: {
        operationType: 'display',
      },
    };
  }
}

/**
 * Processor for CompositeCommand (recursive command processing)
 */
class CompositeProcessor implements CommandProcessor<CompositeCommand> {
  constructor(private handler: DebriefCommandHandler) {}

  canHandle(command: unknown): command is CompositeCommand {
    return (command as SpecificCommand)?.command === 'composite';
  }

  async process(
    command: CompositeCommand,
    featureCollection: DebriefFeatureCollection,
    _stateSetter: StateSetter
  ): Promise<CommandHandlerResult> {
    const commands = Array.isArray(command.payload) ? command.payload : [];
    // Convert DebriefCommand[] to SpecificCommand[] by casting
    const specificCommands = commands as SpecificCommand[];
    const results = await this.handler.processCommands(specificCommands, featureCollection);

    const successCount = results.filter((r) => r.success).length;
    const totalFeatures = results.reduce((sum, r) => sum + (r.metadata?.featuresAffected || 0), 0);

    // Get final feature collection from last successful result
    const finalCollection = results
      .reverse()
      .find((r) => r.success && r.featureCollection)?.featureCollection || featureCollection;

    return {
      success: successCount === results.length,
      featureCollection: finalCollection,
      error: successCount < results.length ? 'Some commands in composite failed' : undefined,
      metadata: {
        operationType: 'composite',
        commandsProcessed: successCount,
        featuresAffected: totalFeatures,
      },
    };
  }
}

// Export service and types
export type { StateSetter, CommandHandlerResult, CommandProcessor, CommandHandlerOptions };