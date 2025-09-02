// Vanilla JS widget wrappers for VS Code webviews and non-React environments
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TimeController, TimeControllerProps } from './TimeController/TimeController';
import { PropertiesView, PropertiesViewProps } from './PropertiesView/PropertiesView';
import { MapComponent, MapComponentProps } from './MapComponent/MapComponent';

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

// MapComponent vanilla wrapper
export function createMapComponent(container: HTMLElement, props: MapComponentProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<MapComponentProps>) => void;
} {
  const root = createRoot(container);
  let currentProps = { ...props };
  
  const renderComponent = (componentProps: MapComponentProps) => {
    root.render(createElement(MapComponent, componentProps));
  };
  
  renderComponent(currentProps);
  
  return {
    destroy: () => root.unmount(),
    updateProps: (newProps: Partial<MapComponentProps>) => {
      currentProps = { ...currentProps, ...newProps };
      renderComponent(currentProps);
    }
  };
}


// Expose functions globally for VS Code webviews and other environments
if (typeof window !== 'undefined') {
  // Direct global assignment for backward compatibility
  (window as any).createTimeController = createTimeController;
  (window as any).createPropertiesView = createPropertiesView;
  (window as any).createMapComponent = createMapComponent;
  
  // Also create a namespace for the IIFE build
  (window as any).DebriefWebComponents = {
    createTimeController,
    createPropertiesView,
    createMapComponent
  };
}