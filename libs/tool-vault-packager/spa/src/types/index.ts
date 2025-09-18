// Import types from generated shared-types
import type { JSONSchema, JSONSchemaProperty } from '../../../../shared-types/src/types/JSONSchema';
import type { Tool } from '../../../../shared-types/src/types/Tool';
import type { ToolListResponse } from '../../../../shared-types/src/types/ToolListResponse';
import type { ToolCallRequest } from '../../../../shared-types/src/types/ToolCallRequest';
import type { ToolCallResponse } from '../../../../shared-types/src/types/ToolCallResponse';
import type { GlobalToolIndexModel } from '../../../../shared-types/src/types/GlobalToolIndexModel';
import type { ToolIndexModel } from '../../../../shared-types/src/types/ToolIndexModel';
import type { ToolFileReference } from '../../../../shared-types/src/types/ToolFileReference';
import type { SampleInputReference } from '../../../../shared-types/src/types/SampleInputReference';
import type { GitHistoryEntry } from '../../../../shared-types/src/types/GitHistoryEntry';
import type { GitHistory } from '../../../../shared-types/src/types/GitHistory';

// Export shared-types directly
export type { JSONSchema, JSONSchemaProperty };
export type { Tool, ToolListResponse, ToolCallRequest, ToolCallResponse };
export type { GlobalToolIndexModel, ToolIndexModel, ToolFileReference, SampleInputReference, GitHistoryEntry, GitHistory };

export interface ToolVaultRootResponse {
  name: string;
  version: string;
  status: string;
  tools_count: number;
  endpoints?: {
    tools?: string;
    call?: string;
  };
}

export interface AppState {
  loading: boolean;
  error: string | null;
  tools: Tool[];
  selectedTool: Tool | null;
  toolIndex: ToolIndexModel | null;
  globalIndex: GlobalToolIndexModel | null;
}

export type TabType = 'info' | 'execute' | 'code';

export interface LoadingState {
  tools: boolean;
  toolIndex: boolean;
  execution: boolean;
}

// Local interface for SPA internal use (different from server format)
export interface SPAToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  result: unknown;
  error?: string;
  timestamp: number;
}