// Pure vanilla JS implementation for VS Code webviews and non-React environments
// This creates actual vanilla JavaScript components without any React dependencies

import L from 'leaflet';
import './vanilla.css';

// Define interfaces for type safety
interface GeoJSONFeature extends GeoJSON.Feature {
  id?: string | number;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface MapState {
  center: [number, number];
  zoom: number;
}

interface MapComponentProps {
  geoJsonData?: string | GeoJSONFeatureCollection;
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
  onMapClick?: (lat: number, lng: number) => void;
  highlightFeatureIndex?: number;
  selectedFeatureIndices?: number[];
  selectedFeatureIds?: (string | number)[];
  showAddButton?: boolean;
  onAddClick?: () => void;
  onMapStateChange?: (state: MapState) => void;
  initialMapState?: MapState;
}

interface TimeControllerProps {
  // Placeholder - implement when needed
  [key: string]: unknown;
}

interface PropertiesViewProps {
  // Placeholder - implement when needed
  [key: string]: unknown;
}

interface StateFieldRow {
  field: string;
  value: string;
}

interface CurrentStateTableProps {
  data: StateFieldRow[];
}

// Configure default Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Calculate bounds from GeoJSON features
 */
function calculateFeatureBounds(features: GeoJSONFeature[]): { bounds: L.LatLngBounds; hasValidGeometry: boolean } {
  const bounds = L.latLngBounds([]);
  let hasValidGeometry = false;

  features.forEach(feature => {
    if (!feature.geometry) return;

    try {
      switch (feature.geometry.type) {
        case 'Point': {
          const coords = feature.geometry.coordinates as [number, number];
          bounds.extend([coords[1], coords[0]]);
          hasValidGeometry = true;
          break;
        }
        case 'LineString': {
          const lineCoords = feature.geometry.coordinates as [number, number][];
          lineCoords.forEach(coord => bounds.extend([coord[1], coord[0]]));
          hasValidGeometry = true;
          break;
        }
        case 'MultiLineString': {
          const multiLineCoords = feature.geometry.coordinates as [number, number][][];
          multiLineCoords.forEach(line => 
            line.forEach(coord => bounds.extend([coord[1], coord[0]]))
          );
          hasValidGeometry = true;
          break;
        }
        case 'Polygon': {
          const polyCoords = feature.geometry.coordinates as [number, number][][];
          if (polyCoords.length > 0) {
            polyCoords[0].forEach(coord => bounds.extend([coord[1], coord[0]]));
            hasValidGeometry = true;
          }
          break;
        }
        case 'MultiPolygon': {
          const multiPolyCoords = feature.geometry.coordinates as [number, number][][][];
          multiPolyCoords.forEach(polygon => {
            if (polygon.length > 0) {
              polygon[0].forEach(coord => bounds.extend([coord[1], coord[0]]));
            }
          });
          hasValidGeometry = true;
          break;
        }
        case 'MultiPoint': {
          const multiPointCoords = feature.geometry.coordinates as [number, number][];
          multiPointCoords.forEach(coord => bounds.extend([coord[1], coord[0]]));
          hasValidGeometry = true;
          break;
        }
      }
    } catch (error) {
      console.warn('Error processing feature geometry for bounds:', error);
    }
  });

  return { bounds, hasValidGeometry };
}

class VanillaMapComponent {
  private map: L.Map;
  private container: HTMLElement;
  private props: MapComponentProps;
  private currentData: GeoJSONFeatureCollection | null = null;
  private selectedFeatures: Set<number> = new Set();
  private featureLayers: Map<number, L.Layer> = new Map();
  private geoJsonLayer: L.GeoJSON | null = null;
  private highlightLayer: L.Layer | null = null;

  constructor(container: HTMLElement, props: MapComponentProps) {
    this.container = container;
    this.props = props;

    // Create map container structure
    this.createMapStructure();

    // Initialize Leaflet map
    const center: [number, number] = props.initialMapState?.center || [51.505, -0.09];
    const zoom = props.initialMapState?.zoom || 13;

    this.map = L.map(this.container.querySelector('.map-instance') as HTMLElement, {
      center,
      zoom
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Set up event handlers
    this.setupEventHandlers();

    // Load initial data
    if (props.geoJsonData) {
      this.updateGeoJsonData(props.geoJsonData);
    }
  }

  private createMapStructure(): void {
    this.container.innerHTML = '';
    this.container.className = 'plot-editor';

    if (this.props.showAddButton) {
      const controls = document.createElement('div');
      controls.className = 'controls';
      
      const addButton = document.createElement('button');
      addButton.className = 'add-button';
      addButton.textContent = 'Add Feature';
      addButton.onclick = () => {
        if (this.props.onAddClick) {
          this.props.onAddClick();
        }
      };
      
      controls.appendChild(addButton);
      this.container.appendChild(controls);
    }

    const mapDiv = document.createElement('div');
    mapDiv.className = 'map-instance';
    mapDiv.style.flex = '1';
    mapDiv.style.minHeight = '400px';
    this.container.appendChild(mapDiv);
  }

  private setupEventHandlers(): void {
    // Map click handler
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.props.onMapClick) {
        this.props.onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Map state change handlers
    const handleMapStateChange = () => {
      if (this.props.onMapStateChange) {
        const center = this.map.getCenter();
        this.props.onMapStateChange({
          center: [center.lat, center.lng],
          zoom: this.map.getZoom()
        });
      }
    };

    this.map.on('moveend', handleMapStateChange);
    this.map.on('zoomend', handleMapStateChange);
  }

  private parseGeoJsonData(data: string | GeoJSONFeatureCollection | undefined): GeoJSONFeatureCollection | null {
    if (!data) return null;

    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        return parsed;
      }
    } catch (error) {
      console.error('Error parsing GeoJSON data:', error);
    }
    return null;
  }

  private updateGeoJsonData(geoJsonData: string | GeoJSONFeatureCollection | undefined): void {
    const parsedData = this.parseGeoJsonData(geoJsonData);
    if (parsedData) {
      // Filter out features with properties.visible === false
      const visibleFeatures = parsedData.features.filter(feature => {
        const visible = feature.properties?.visible;
        return visible !== false;
      });
      
      this.currentData = {
        ...parsedData,
        features: visibleFeatures
      };
      
      this.renderGeoJson();
    } else {
      this.currentData = null;
      this.clearGeoJson();
    }
  }

  private clearGeoJson(): void {
    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }
    this.featureLayers.clear();
    this.selectedFeatures.clear();
  }

  private renderGeoJson(): void {
    if (!this.currentData) return;

    this.clearGeoJson();

    this.geoJsonLayer = L.geoJSON(this.currentData, {
      style: (feature) => this.getFeatureStyle(feature),
      pointToLayer: (feature, latlng) => this.createPointLayer(feature, latlng),
      onEachFeature: (feature, layer) => this.setupFeatureLayer(feature, layer)
    }).addTo(this.map);

    // Auto fit bounds if no initial state provided
    if (!this.props.initialMapState && this.currentData.features.length > 0) {
      const { bounds, hasValidGeometry } = calculateFeatureBounds(this.currentData.features);
      if (hasValidGeometry && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }

  private getFeatureStyle(feature?: GeoJSON.Feature): L.PathOptions {
    if (!feature?.properties) {
      return {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.2
      };
    }

    const props = feature.properties;
    const style: L.PathOptions = {};

    if (props.stroke) {
      style.color = props.stroke;
    } else {
      style.color = '#3388ff';
    }

    if (props.fill) {
      style.fillColor = props.fill;
    }
    
    if (props['fill-opacity'] !== undefined) {
      style.fillOpacity = props['fill-opacity'];
    } else {
      style.fillOpacity = 0.2;
    }

    style.weight = 3;
    style.opacity = 0.8;

    return style;
  }

  private createPointLayer(feature: GeoJSON.Feature, latlng: L.LatLng): L.CircleMarker {
    const props = feature.properties;
    const markerColor = props?.['marker-color'] || props?.color || '#00F';
    
    const isBuoyfield = props?.type === 'buoyfield' || props?.name?.toLowerCase().includes('buoy');
    const radius = isBuoyfield ? 5 : 8;
    
    return L.circleMarker(latlng, {
      radius: radius,
      fillColor: markerColor,
      color: markerColor,
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.7
    });
  }

  private setupFeatureLayer(feature: GeoJSON.Feature, layer: L.Layer): void {
    if (!this.currentData) return;

    const index = this.currentData.features.indexOf(feature as GeoJSONFeature);
    if (index >= 0) {
      this.featureLayers.set(index, layer);
    }

    // Bind popup
    if (feature.properties?.name) {
      layer.bindPopup(feature.properties.name);
    }

    // Add click handler
    layer.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      this.handleFeatureClick(index);
    });
  }

  private handleFeatureClick(featureIndex: number): void {
    if (!this.currentData) return;

    if (this.selectedFeatures.has(featureIndex)) {
      this.selectedFeatures.delete(featureIndex);
      this.updateFeatureStyle(featureIndex, false);
    } else {
      this.selectedFeatures.add(featureIndex);
      this.updateFeatureStyle(featureIndex, true);
    }

    if (this.props.onSelectionChange) {
      const selectedFeatureData = Array.from(this.selectedFeatures)
        .map(index => this.currentData!.features[index]);
      this.props.onSelectionChange(selectedFeatureData, Array.from(this.selectedFeatures));
    }
  }

  private updateFeatureStyle(featureIndex: number, isSelected: boolean): void {
    if (!this.currentData) return;
    
    const layer = this.featureLayers.get(featureIndex);
    const feature = this.currentData.features[featureIndex];
    
    if (!layer || !feature) return;

    if (feature.geometry.type === 'Point') {
      const baseColor = feature.properties?.['marker-color'] || feature.properties?.color || '#00F';
      const isBuoyfield = feature.properties?.type === 'buoyfield' || feature.properties?.name?.toLowerCase().includes('buoy');
      const baseRadius = isBuoyfield ? 5 : 8;
      
      if (isSelected) {
        (layer as L.CircleMarker).setStyle({
          radius: baseRadius + 2,
          fillColor: baseColor,
          color: '#ffffff',
          weight: 5,
          opacity: 1,
          fillOpacity: 0.9
        });
      } else {
        (layer as L.CircleMarker).setStyle({
          radius: baseRadius,
          fillColor: baseColor,
          color: baseColor,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7
        });
      }
    } else {
      const props = feature.properties || {};
      const strokeColor = props.stroke || '#3388ff';
      const fillColor = props.fill || strokeColor;
      const fillOpacity = props['fill-opacity'] !== undefined ? props['fill-opacity'] : 0.2;
      
      const selectedStyle = {
        color: '#ffffff',
        weight: 5,
        opacity: 1,
        fillColor: fillColor,
        fillOpacity: Math.min(fillOpacity + 0.2, 0.8)
      };
      
      const defaultStyle = {
        color: strokeColor,
        weight: 3,
        opacity: 0.8,
        fillColor: fillColor,
        fillOpacity: fillOpacity
      };
      
      (layer as L.Path).setStyle(isSelected ? selectedStyle : defaultStyle);
    }
  }

  private updateSelection(selectedFeatureIds: (string | number)[], selectedFeatureIndices: number[]): void {
    if (!this.currentData) return;

    // Clear previous selection
    this.selectedFeatures.forEach(index => {
      this.updateFeatureStyle(index, false);
    });
    this.selectedFeatures.clear();
    
    // Add indices
    selectedFeatureIndices.forEach(index => {
      if (index >= 0 && index < this.currentData!.features.length) {
        this.selectedFeatures.add(index);
        this.updateFeatureStyle(index, true);
      }
    });

    // Add selections by ID
    selectedFeatureIds.forEach(id => {
      const index = this.currentData!.features.findIndex(feature => feature.id === id);
      if (index >= 0) {
        this.selectedFeatures.add(index);
        this.updateFeatureStyle(index, true);
      }
    });
  }

  private updateHighlight(highlightFeatureIndex?: number): void {
    if (!this.currentData) return;

    // Remove previous highlight
    if (this.highlightLayer) {
      this.map.removeLayer(this.highlightLayer);
      this.highlightLayer = null;
    }

    if (highlightFeatureIndex !== undefined && highlightFeatureIndex < this.currentData.features.length) {
      const feature = this.currentData.features[highlightFeatureIndex];
      
      this.highlightLayer = L.geoJSON(feature, {
        pointToLayer: (_geoJsonFeature: GeoJSON.Feature, latlng: L.LatLng) => {
          const isBuoyfield = feature.properties?.type === 'buoyfield' || feature.properties?.name?.toLowerCase().includes('buoy');
          const radius = isBuoyfield ? 7 : 12;
          
          return L.circleMarker(latlng, {
            radius: radius,
            fillColor: '#ff7f00',
            color: '#ff4500',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.6
          });
        },
        style: () => ({
          color: '#ff4500',
          weight: 4,
          opacity: 0.9,
          fillColor: '#ff7f00',
          fillOpacity: 0.6
        })
      }).addTo(this.map);

      // Pan to highlighted feature
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates as [number, number];
        this.map.panTo([coords[1], coords[0]]);
      }
    }
  }

  private updateMapState(mapState?: MapState): void {
    if (mapState) {
      this.map.setView(mapState.center, mapState.zoom);
    }
  }

  public updateProps(newProps: Partial<MapComponentProps>): void {
    this.props = { ...this.props, ...newProps };

    if (newProps.geoJsonData !== undefined) {
      this.updateGeoJsonData(newProps.geoJsonData);
    }

    if (newProps.selectedFeatureIds !== undefined || newProps.selectedFeatureIndices !== undefined) {
      this.updateSelection(
        newProps.selectedFeatureIds || this.props.selectedFeatureIds || [],
        newProps.selectedFeatureIndices || this.props.selectedFeatureIndices || []
      );
    }

    if (newProps.highlightFeatureIndex !== undefined) {
      this.updateHighlight(newProps.highlightFeatureIndex);
    }

    if (newProps.initialMapState !== undefined) {
      this.updateMapState(newProps.initialMapState);
    }
  }

  public destroy(): void {
    if (this.map) {
      this.map.remove();
    }
    this.container.innerHTML = '';
  }
}

// Vanilla wrapper functions
export function createMapComponent(container: HTMLElement, props: MapComponentProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<MapComponentProps>) => void;
} {
  const component = new VanillaMapComponent(container, props);
  
  return {
    destroy: () => component.destroy(),
    updateProps: (newProps: Partial<MapComponentProps>) => component.updateProps(newProps)
  };
}

// Placeholder functions for other components (implement when needed)
export function createTimeController(container: HTMLElement, _props: TimeControllerProps): { destroy: () => void } {
  container.innerHTML = '<div>Time Controller - Not implemented in vanilla version</div>';
  return {
    destroy: () => { container.innerHTML = ''; }
  };
}

export function createPropertiesView(container: HTMLElement, _props: PropertiesViewProps): { destroy: () => void } {
  container.innerHTML = '<div>Properties View - Not implemented in vanilla version</div>';
  return {
    destroy: () => { container.innerHTML = ''; }
  };
}

class VanillaCurrentStateTable {
  private container: HTMLElement;
  private data: StateFieldRow[] = [];
  private highlighted: { [key: string]: boolean } = {};
  private prevData: StateFieldRow[] = [];

  constructor(container: HTMLElement, props: CurrentStateTableProps) {
    this.container = container;
    this.data = props.data || [];
    this.render();
  }

  private render(): void {
    // Check for changes and highlight them
    const newHighlights: { [key: string]: boolean } = {};
    this.data.forEach((row, idx) => {
      const prevRow = this.prevData[idx];
      if (prevRow && prevRow.field === row.field) {
        if (prevRow.value !== row.value) {
          newHighlights[`${idx}-value`] = true;
          setTimeout(() => {
            delete this.highlighted[`${idx}-value`];
            this.updateHighlightClass();
          }, 500);
        }
      }
    });
    
    this.highlighted = { ...this.highlighted, ...newHighlights };
    this.prevData = [...this.data];

    const table = document.createElement('table');
    table.className = 'current-state-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Field', 'Value'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    this.data.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-field', row.field);
      
      // Field name cell
      const fieldTd = document.createElement('td');
      fieldTd.textContent = row.field;
      fieldTd.className = 'field-name';
      tr.appendChild(fieldTd);
      
      // Value cell with highlighting
      const valueTd = document.createElement('td');
      valueTd.textContent = row.value;
      tr.appendChild(valueTd);
      valueTd.className = this.highlighted[`${idx}-value`] ? 'highlight' : '';
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .current-state-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--vscode-font-family, monospace);
        font-size: var(--vscode-font-size, 13px);
        background: var(--vscode-editor-background, #1e1e1e);
        color: var(--vscode-editor-foreground, #d4d4d4);
      }
      
      .current-state-table th,
      .current-state-table td {
        border: 1px solid var(--vscode-widget-border, #3e3e3e);
        padding: 4px 8px;
        text-align: left;
        vertical-align: top;
        word-break: break-all;
        font-size: 11px;
      }
      
      .current-state-table th {
        background: var(--vscode-editor-lineHighlightBackground, #2a2a2a);
        font-weight: bold;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      
      .current-state-table .highlight {
        background: var(--vscode-editor-findMatchHighlightBackground, #515c6a) !important;
        animation: highlightFade 500ms ease-out;
      }
      
      @keyframes highlightFade {
        0% { background: var(--vscode-editor-findMatchBackground, #613214) !important; }
        100% { background: var(--vscode-editor-findMatchHighlightBackground, #515c6a) !important; }
      }
      
      .current-state-table tr:nth-child(even) {
        background: var(--vscode-editor-lineHighlightBackground, rgba(255, 255, 255, 0.04));
      }
      
      .current-state-table tr:hover {
        background: var(--vscode-list-hoverBackground, #2a2d2e);
      }
      
      .current-state-table .field-name {
        font-weight: bold;
        background: var(--vscode-editor-lineHighlightBackground, rgba(255, 255, 255, 0.02));
        min-width: 120px;
      }
    `;
    
    // Clear container and add new content
    this.container.innerHTML = '';
    this.container.appendChild(style);
    this.container.appendChild(table);
  }

  private updateHighlightClass(): void {
    const table = this.container.querySelector('table');
    if (!table) return;
    
    const valueCells = table.querySelectorAll('td:nth-child(2)'); // Second column (value cells)
    valueCells.forEach((td, rowIdx) => {
      if (this.highlighted[`${rowIdx}-value`]) {
        td.className = 'highlight';
      } else {
        td.className = '';
      }
    });
  }

  public setData(data: StateFieldRow[]): void {
    this.data = data || [];
    this.render();
  }

  public updateProps(newProps: Partial<CurrentStateTableProps>): void {
    if (newProps.data !== undefined) {
      this.setData(newProps.data);
    }
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}

export function createCurrentStateTable(container: HTMLElement, props: CurrentStateTableProps): { 
  destroy: () => void;
  updateProps: (newProps: Partial<CurrentStateTableProps>) => void;
  setData: (data: StateFieldRow[]) => void;
} {
  const component = new VanillaCurrentStateTable(container, props);
  
  return {
    destroy: () => component.destroy(),
    updateProps: (newProps: Partial<CurrentStateTableProps>) => component.updateProps(newProps),
    setData: (data: StateFieldRow[]) => component.setData(data)
  };
}

// Custom element for CurrentStateTable
class CurrentStateTableElement extends HTMLElement {
  private component: { destroy: () => void; setData: (data: StateFieldRow[]) => void } | null = null;

  connectedCallback() {
    const props: CurrentStateTableProps = {
      data: []
    };
    this.component = createCurrentStateTable(this, props);
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  setData(data: StateFieldRow[]) {
    if (this.component) {
      this.component.setData(data);
    }
  }

  set data(value: StateFieldRow[]) {
    this.setData(value);
  }
}

// Register custom element
if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('current-state-table')) {
    window.customElements.define('current-state-table', CurrentStateTableElement);
  }
}

// Global exposure for VS Code webviews
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

// Window interface extensions
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