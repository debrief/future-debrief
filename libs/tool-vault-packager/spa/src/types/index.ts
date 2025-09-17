// Import types from generated shared-types
import type { JSONSchema, JSONSchemaProperty } from '../../../shared-types/src/types/JSONSchema';
import type { Tool } from '../../../shared-types/src/types/Tool';
import type { ToolListResponse } from '../../../shared-types/src/types/ToolListResponse';
import type { ToolCallRequest } from '../../../shared-types/src/types/ToolCallRequest';
import type { ToolCallResponse } from '../../../shared-types/src/types/ToolCallResponse';

// Re-export with legacy names for backward compatibility
export type MCPTool = Tool;
export type MCPToolListResponse = ToolListResponse;
export type MCPToolCallRequest = ToolCallRequest;
export type MCPToolCallResponse = ToolCallResponse;

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

// Import additional types from shared-types
import type { GlobalToolIndexModel } from '../../../shared-types/src/types/GlobalToolIndexModel';
import type { ToolIndexModel } from '../../../shared-types/src/types/ToolIndexModel';
import type { ToolFileReference } from '../../../shared-types/src/types/ToolFileReference';
import type { SampleInputReference } from '../../../shared-types/src/types/SampleInputReference';
import type { GitHistoryEntry } from '../../../shared-types/src/types/GitHistoryEntry';
import type { GitHistory } from '../../../shared-types/src/types/GitHistory';

// Re-export with legacy names for backward compatibility
export type GlobalIndex = GlobalToolIndexModel;
export type ToolIndex = ToolIndexModel;
export type FileReference = ToolFileReference;
export type InputFileReference = SampleInputReference;
export type GitCommit = GitHistoryEntry;
export { GitHistory };

export interface AppState {
  loading: boolean;
  error: string | null;
  tools: MCPTool[];
  selectedTool: MCPTool | null;
  toolIndex: ToolIndex | null;
  globalIndex: GlobalIndex | null;
}

export type TabType = 'info' | 'execute' | 'code';

export interface LoadingState {
  tools: boolean;
  toolIndex: boolean;
  execution: boolean;
}

export interface ExecutionResult {
  success: boolean;
  result: unknown;
  error?: string;
  timestamp: number;
}