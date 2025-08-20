import React from 'react';
import { createRoot } from 'react-dom/client';
import OutlineApp from './OutlineApp';
import '../shared/styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OutlineApp />);
} else {
  console.error('Failed to find root element for Outline webview');
}