// Automated vanilla JS wrapper system for VS Code webviews
// This file replaces the manual vanilla.ts implementation with React-based wrappers

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MapComponent, MapComponentProps, GeoJSONFeature, MapState } from './MapComponent/MapComponent';
import { TimeController, TimeControllerProps } from './TimeController/TimeController';
import { PropertiesView, PropertiesViewProps } from './PropertiesView/PropertiesView';
import { CurrentStateTable, StateFieldRow } from './CurrentStateTable/CurrentStateTable';
import { CurrentState } from '@debrief/shared-types/derived/typescript/currentstate';
import './vanilla.css';

// Re-export types for compatibility
export type { GeoJSONFeature, MapState, TimeControllerProps, PropertiesViewProps, StateFieldRow };

// Wrapper interfaces - maintain API compatibility with manual vanilla.ts
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface VanillaMapComponentProps {
  geoJsonData?: string | GeoJSONFeatureCollection;
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedFeatureIds?: (string | number)[];
  showAddButton?: boolean;
  onAddClick?: () => void;
  onMapStateChange?: (state: MapState) => void;
  initialMapState?: MapState;
}

export interface VanillaCurrentStateTableProps {
  currentState?: CurrentState;
}

// Base wrapper class for React component lifecycle management
abstract class ReactComponentWrapper<TProps> {
  protected root: Root | null = null;
  protected container: HTMLElement;
  protected currentProps: TProps;

  constructor(container: HTMLElement, props: TProps) {
    this.container = container;
    this.currentProps = props;
    this.initialize();
  }

  private initialize(): void {
    this.root = createRoot(this.container);
    this.render();
  }

  protected abstract renderComponent(): React.ReactElement;

  private render(): void {
    if (this.root) {
      this.root.render(this.renderComponent());
    }
  }

  public updateProps(newProps: Partial<TProps>): void {
    this.currentProps = { ...this.currentProps, ...newProps };
    this.render();
  }

  public destroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.container.innerHTML = '';
  }
}

// MapComponent wrapper
class VanillaMapComponentWrapper extends ReactComponentWrapper<VanillaMapComponentProps> {
  protected renderComponent(): React.ReactElement {
    return React.createElement(MapComponent, this.currentProps as MapComponentProps);
  }
}

// TimeController wrapper
class VanillaTimeControllerWrapper extends ReactComponentWrapper<TimeControllerProps> {
  protected renderComponent(): React.ReactElement {
    return React.createElement(TimeController, this.currentProps);
  }
}

// PropertiesView wrapper
class VanillaPropertiesViewWrapper extends ReactComponentWrapper<PropertiesViewProps> {
  protected renderComponent(): React.ReactElement {
    return React.createElement(PropertiesView, this.currentProps);
  }
}

// CurrentStateTable wrapper
class VanillaCurrentStateTableWrapper extends ReactComponentWrapper<VanillaCurrentStateTableProps> {
  constructor(container: HTMLElement, props: VanillaCurrentStateTableProps) {
    super(container, props);
  }

  protected renderComponent(): React.ReactElement {
    return React.createElement(CurrentStateTable, {
      currentState: this.currentProps.currentState
    });
  }

  public setData(_data: StateFieldRow[]): void {
    // Legacy method - convert data to currentState format if needed
    // For now, this is a no-op as the new API expects CurrentState objects
    console.warn('setData is deprecated. Use setCurrentState with CurrentState objects instead.');
  }

  public setCurrentState(currentState: CurrentState): void {
    this.updateProps({ currentState });
  }
}

// Factory functions - maintain exact API compatibility with manual vanilla.ts
export function createMapComponent(container: HTMLElement, props: VanillaMapComponentProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<VanillaMapComponentProps>) => void;
} {
  const wrapper = new VanillaMapComponentWrapper(container, props);
  
  return {
    destroy: () => wrapper.destroy(),
    updateProps: (newProps: Partial<VanillaMapComponentProps>) => wrapper.updateProps(newProps)
  };
}

export function createTimeController(container: HTMLElement, props: TimeControllerProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<TimeControllerProps>) => void;
} {
  const wrapper = new VanillaTimeControllerWrapper(container, props);
  
  return {
    destroy: () => wrapper.destroy(),
    updateProps: (newProps: Partial<TimeControllerProps>) => wrapper.updateProps(newProps)
  };
}

export function createPropertiesView(container: HTMLElement, props: PropertiesViewProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<PropertiesViewProps>) => void;
} {
  const wrapper = new VanillaPropertiesViewWrapper(container, props);
  
  return {
    destroy: () => wrapper.destroy(),
    updateProps: (newProps: Partial<PropertiesViewProps>) => wrapper.updateProps(newProps)
  };
}

export function createCurrentStateTable(container: HTMLElement, props: VanillaCurrentStateTableProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<VanillaCurrentStateTableProps>) => void;
  setData: (data: StateFieldRow[]) => void;
  setCurrentState: (currentState: CurrentState) => void;
} {
  const wrapper = new VanillaCurrentStateTableWrapper(container, props);
  
  return {
    destroy: () => wrapper.destroy(),
    updateProps: (newProps: Partial<VanillaCurrentStateTableProps>) => wrapper.updateProps(newProps),
    setData: (data: StateFieldRow[]) => wrapper.setData(data),
    setCurrentState: (currentState: CurrentState) => wrapper.setCurrentState(currentState)
  };
}

// Custom element for CurrentStateTable - maintain compatibility
class CurrentStateTableElement extends HTMLElement {
  private wrapper: VanillaCurrentStateTableWrapper | null = null;

  connectedCallback() {
    const props: VanillaCurrentStateTableProps = {};
    this.wrapper = new VanillaCurrentStateTableWrapper(this, props);
  }

  disconnectedCallback() {
    if (this.wrapper) {
      this.wrapper.destroy();
      this.wrapper = null;
    }
  }

  setData(data: StateFieldRow[]) {
    if (this.wrapper) {
      this.wrapper.setData(data);
    }
  }

  setCurrentState(currentState: CurrentState) {
    if (this.wrapper) {
      this.wrapper.setCurrentState(currentState);
    }
  }

  set data(value: StateFieldRow[]) {
    this.setData(value);
  }

  set currentState(value: CurrentState) {
    this.setCurrentState(value);
  }
}

// Register custom element - maintain compatibility
if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('current-state-table')) {
    window.customElements.define('current-state-table', CurrentStateTableElement);
  }
}

// Global exposure for VS Code webviews - maintain exact API compatibility
if (typeof window !== 'undefined') {
  if (!window.DebriefWebComponents) {
    window.DebriefWebComponents = {
      createTimeController,
      createPropertiesView,
      createMapComponent,
      createCurrentStateTable
    };
  } else {
    Object.assign(window.DebriefWebComponents, {
      createTimeController,
      createPropertiesView,
      createMapComponent,
      createCurrentStateTable
    });
  }
}

// Window interface extensions - maintain compatibility
declare global {
  interface Window {
    DebriefWebComponents?: {
      createTimeController: typeof createTimeController;
      createPropertiesView: typeof createPropertiesView;
      createMapComponent: typeof createMapComponent;
      createCurrentStateTable: typeof createCurrentStateTable;
    };
  }
}