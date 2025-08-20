// Shared message types for webview communication
export interface WebviewMessage {
  type: string;
  payload?: any;
}

export interface ThemeInfo {
  kind: number; // 1 = Light, 2 = Dark, 3 = High Contrast Dark, 4 = High Contrast Light
}

export interface WebviewState {
  theme: ThemeInfo;
  data?: any;
}

// Enhanced types for postMessage pipeline

// Editor state information
export interface EditorState {
  activeFile?: string;
  selection?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  visibleRanges?: Array<{
    start: { line: number; character: number };
    end: { line: number; character: number };
  }>;
  cursorPosition?: { line: number; character: number };
}

// File change information
export interface FileChange {
  uri: string;
  type: 'created' | 'changed' | 'deleted';
}

// Structured message interface for sidebar communication
export interface SidebarMessage {
  command: 'theme-changed' | 'editor-state-update' | 'file-change' | 'selection-change' | 'update-data' | 'webview-ready' | 'error';
  value?: any;
  timestamp?: number;
  source?: 'extension' | 'outline' | 'timeline';
}

// Specific message payloads
export interface ThemeChangedPayload {
  theme: ThemeInfo;
}

export interface EditorStateUpdatePayload {
  editorState: EditorState;
}

export interface FileChangePayload {
  changes: FileChange[];
}

export interface SelectionChangePayload {
  selection: EditorState['selection'];
  activeFile?: string;
}

// Error handling
export interface ErrorPayload {
  message: string;
  type: 'validation' | 'communication' | 'unknown';
  source?: string;
}

// Utility functions for message validation and creation
export class MessageUtils {
  static validateSidebarMessage(message: any): message is SidebarMessage {
    return message && 
           typeof message === 'object' && 
           typeof message.command === 'string' &&
           ['theme-changed', 'editor-state-update', 'file-change', 'selection-change', 'update-data', 'webview-ready', 'error'].includes(message.command);
  }

  static createSidebarMessage(command: SidebarMessage['command'], value?: any, source?: SidebarMessage['source']): SidebarMessage {
    return {
      command,
      value,
      timestamp: Date.now(),
      source
    };
  }

  static createErrorMessage(message: string, type: ErrorPayload['type'] = 'unknown', source?: string): SidebarMessage {
    return MessageUtils.createSidebarMessage('error', {
      message,
      type,
      source
    } as ErrorPayload, 'extension');
  }
}