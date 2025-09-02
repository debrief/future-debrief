// Vanilla JS widget wrappers for VS Code webviews and non-React environments
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TimeController, TimeControllerProps } from './TimeController/TimeController';
import { PropertiesView, PropertiesViewProps } from './PropertiesView/PropertiesView';
import { MapComponent, MapComponentProps } from './MapComponent/MapComponent';
import { LightweightMap, LightweightMapProps } from './LightweightMap/LightweightMap';

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

// LightweightMap vanilla wrapper
export function createLightweightMap(container: HTMLElement, props: LightweightMapProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<LightweightMapProps>) => void;
} {
  const root = createRoot(container);
  let currentProps = { ...props };
  
  const renderComponent = (componentProps: LightweightMapProps) => {
    root.render(createElement(LightweightMap, componentProps));
  };
  
  renderComponent(currentProps);
  
  return {
    destroy: () => root.unmount(),
    updateProps: (newProps: Partial<LightweightMapProps>) => {
      currentProps = { ...currentProps, ...newProps };
      renderComponent(currentProps);
    }
  };
}