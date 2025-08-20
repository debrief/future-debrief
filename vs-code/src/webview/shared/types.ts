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