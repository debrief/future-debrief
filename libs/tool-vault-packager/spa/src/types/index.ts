interface JSONSchemaProperty {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
  default?: unknown;
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

export interface MCPToolListResponse {
  tools: MCPTool[];
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPContentBlock {
  type: string;
  text?: string;
  data?: unknown;
}

export interface MCPToolCallResponse {
  content: MCPContentBlock[];
  isError?: boolean;
}

export interface GlobalIndex {
  tools: MCPTool[];
  version: string;
  description: string;
  packageInfo?: {
    buildDate: string;
    commit: string;
    author: string;
  };
}

export interface FileReference {
  path: string;
  description: string;
  type: 'python' | 'html' | 'json';
}

export interface InputFileReference extends FileReference {
  name: string;
}

export interface ToolIndex {
  tool_name: string;
  description: string;
  files: {
    execute: FileReference;
    source_code: FileReference;
    git_history: FileReference;
    inputs: InputFileReference[];
  };
  stats: {
    sample_inputs_count: number;
    git_commits_count: number;
    source_code_length: number;
  };
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitHistory {
  commits: GitCommit[];
}

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