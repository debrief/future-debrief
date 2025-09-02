// Vanilla JS widget wrappers for VS Code webviews and non-React environments
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TimeController, TimeControllerProps } from './TimeController/TimeController';
import { PropertiesView, PropertiesViewProps } from './PropertiesView/PropertiesView';

// TimeController vanilla wrapper
export function createTimeController(container: HTMLElement, props: TimeControllerProps): { destroy: () => void } {
  const root = createRoot(container);
  root.render(createElement(TimeController, props));
  
  return {
    destroy: () => root.unmount()
  };
}

// PropertiesView vanilla wrapper
export function createPropertiesView(container: HTMLElement, props: PropertiesViewProps): { destroy: () => void } {
  const root = createRoot(container);
  root.render(createElement(PropertiesView, props));
  
  return {
    destroy: () => root.unmount()
  };
}