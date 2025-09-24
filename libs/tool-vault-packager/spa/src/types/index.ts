// Import types from generated shared-types
import type {
  JSONSchema,
  JSONSchemaProperty,
} from '@debrief/shared-types/src/types/tools/json_schema';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool';
import type { ToolListResponse } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { ToolCallRequest } from '@debrief/shared-types/src/types/tools/tool_call_request';
import type { ToolCallResponse } from '@debrief/shared-types/src/types/tools/tool_call_response';
import type { GlobalToolIndexModel } from '@debrief/shared-types/src/types/tools/global_tool_index';
import type { ToolIndexModel } from '@debrief/shared-types/src/types/tools/tool_index';
import type { ToolFileReference } from '@debrief/shared-types/src/types/tools/tool_file_reference';
import type { SampleInputReference } from '@debrief/shared-types/src/types/tools/sample_input_reference';
import type { GitHistoryEntry } from '@debrief/shared-types/src/types/tools/git_history_entry';
import type { GitHistory } from '@debrief/shared-types/src/types/tools/git_history';

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

export type TabType = 'info' | 'execute' | 'code' | 'schemas';

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
