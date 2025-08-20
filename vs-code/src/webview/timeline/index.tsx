import React from 'react';
import { createRoot } from 'react-dom/client';
import TimelineApp from './TimelineApp';
import '../shared/styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TimelineApp />);
} else {
  console.error('Failed to find root element for Timeline webview');
}