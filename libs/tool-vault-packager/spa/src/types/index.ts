// Import types from base-types (stable interface)
import type {
  JSONSchema,
  ToolFileReference,
  ToolStatsModel,
  ToolFilesCollection
} from '@debrief/shared-types/src/types/base-types';

// Define missing types locally until generation is fixed
export interface JSONSchemaProperty {
  type: string;
  description?: string;
  [key: string]: any;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

export interface ToolListResponse {
  tools: Tool[];
  version: string;
  description?: string;
}

export interface ToolCallRequest {
  name: string;
  arguments: any;
}

export interface ToolCallResponse {
  result: any;
  isError: boolean;
}

export interface GlobalToolIndexModel {
  tools: any;
  version: string;
  description?: string;
  packageInfo: any;
}

export interface ToolIndexModel {
  tool_name: string;
  description: string;
  files: ToolFilesCollection;
  stats: ToolStatsModel;
}

export interface SampleInputReference {
  path: string;
  description?: string;
  name: string;
}

export interface GitHistoryEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitHistory {
  commits: GitHistoryEntry[];
}

// Export shared-types directly
export type { JSONSchema };
export type { ToolFileReference };

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
