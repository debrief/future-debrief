import { LeafletManager } from './LeafletManager';
import { GeoJSONRenderer } from './GeoJSONRenderer';
import type { FeatureCollection } from 'geojson';

interface UpdateMessage {
    type: 'update';
    content: string;
    parsedJson: any;
    isValidJson: boolean;
}

export class MapApp {
    private leafletManager: LeafletManager | null = null;
    private geoJsonRenderer: GeoJSONRenderer | null = null;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        try {
            console.log('MapApp: Initializing application');
            
            // Initialize Leaflet manager with lazy loading
            this.leafletManager = new LeafletManager({
                containerId: 'map',
                center: [40.0, -95.0],
                zoom: 4,
                maxZoom: 18
            });

            // Set up message listener for VS Code communication
            this.setupMessageListener();

            console.log('MapApp: Application initialized successfully');

        } catch (error) {
            console.error('MapApp: Failed to initialize application:', error);
            this.showError('Failed to initialize map application');
        }
    }

    private setupMessageListener(): void {
        window.addEventListener('message', (event) => {
            const message = event.data as UpdateMessage;
            
            try {
                console.log('MapApp: Received message:', message);
                
                if (message.type === 'update') {
                    this.handleDataUpdate(message);
                }
                
            } catch (error) {
                console.error('MapApp: Failed to handle message:', error);
                this.showError('Failed to process data update');
            }
        });

        console.log('MapApp: Message listener set up');
    }

    private handleDataUpdate(message: UpdateMessage): void {
        if (!message.isValidJson) {
            console.log('MapApp: Invalid JSON detected, showing fallback');
            this.showJsonFallback(message.content, 'Invalid JSON format');
            return;
        }

        const data = message.parsedJson;
        
        // Check if it's a valid FeatureCollection
        if (this.isFeatureCollection(data)) {
            console.log('MapApp: Valid FeatureCollection detected, rendering map');
            this.renderFeatureCollection(data as FeatureCollection);
        } else if (this.hasGeoJSONContent(data)) {
            console.log('MapApp: GeoJSON-like content detected, attempting to render');
            this.renderGeoJSON(data);
        } else {
            console.log('MapApp: No geographic data detected, showing JSON fallback');
            this.showJsonFallback(message.content, 'No geographic data found in JSON');
        }
    }

    private isFeatureCollection(data: any): boolean {
        return data && 
               typeof data === 'object' && 
               data.type === 'FeatureCollection' && 
               Array.isArray(data.features);
    }

    private hasGeoJSONContent(data: any): boolean {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check for various GeoJSON indicators
        if (data.type && ['Feature', 'FeatureCollection', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(data.type)) {
            return true;
        }
        
        // Check for coordinates property
        if (data.coordinates && Array.isArray(data.coordinates)) {
            return true;
        }
        
        // Check for geometry property
        if (data.geometry && data.geometry.type && data.geometry.coordinates) {
            return true;
        }
        
        return false;
    }

    private async renderFeatureCollection(fc: FeatureCollection): Promise<void> {
        try {
            // Ensure map is initialized
            if (!this.leafletManager?.isMapInitialized()) {
                console.log('MapApp: Force initializing map for FeatureCollection');
                this.leafletManager?.forceInitialize();
                
                // Wait a bit for map to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const map = this.leafletManager?.getMap();
            if (!map) {
                throw new Error('Map not available');
            }

            // Initialize renderer if needed
            if (!this.geoJsonRenderer) {
                this.geoJsonRenderer = new GeoJSONRenderer(map);
            }

            // Hide error and fallback displays
            this.hideErrorAndFallback();

            // Render the FeatureCollection
            const success = this.geoJsonRenderer.renderFeatureCollection(fc, {
                clearExisting: true,
                fitBounds: true
            });

            if (success) {
                console.log(`MapApp: Successfully rendered FeatureCollection with ${fc.features.length} features`);
            } else {
                throw new Error('Failed to render FeatureCollection');
            }

        } catch (error) {
            console.error('MapApp: Failed to render FeatureCollection:', error);
            this.showError('Failed to render geographic data on map');
        }
    }

    private async renderGeoJSON(data: any): Promise<void> {
        try {
            // Ensure map is initialized
            if (!this.leafletManager?.isMapInitialized()) {
                console.log('MapApp: Force initializing map for GeoJSON');
                this.leafletManager?.forceInitialize();
                
                // Wait a bit for map to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const map = this.leafletManager?.getMap();
            if (!map) {
                throw new Error('Map not available');
            }

            // Initialize renderer if needed
            if (!this.geoJsonRenderer) {
                this.geoJsonRenderer = new GeoJSONRenderer(map);
            }

            // Hide error and fallback displays
            this.hideErrorAndFallback();

            // Attempt to render the GeoJSON data
            const success = this.geoJsonRenderer.renderGeoJSON(data, {
                clearExisting: true,
                fitBounds: true
            });

            if (success) {
                console.log('MapApp: Successfully rendered GeoJSON data');
            } else {
                throw new Error('Failed to render GeoJSON data');
            }

        } catch (error) {
            console.error('MapApp: Failed to render GeoJSON:', error);
            this.showError('Failed to render geographic data on map');
        }
    }

    private showJsonFallback(content: string, reason: string): void {
        console.log(`MapApp: Showing JSON fallback - ${reason}`);
        
        // Hide map and error containers
        const mapContainer = document.querySelector('.map-container') as HTMLElement;
        const errorContainer = document.getElementById('error');
        
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }

        // Show fallback JSON view
        const fallbackEl = document.getElementById('fallback-json');
        if (fallbackEl) {
            // Format JSON if possible
            let displayContent = content;
            try {
                const parsed = JSON.parse(content);
                displayContent = JSON.stringify(parsed, null, 2);
            } catch {
                // Use raw content if parsing fails
            }
            
            fallbackEl.textContent = displayContent;
            fallbackEl.style.display = 'block';
        }

        // Update header subtitle
        const subtitle = document.querySelector('.subtitle') as HTMLElement;
        if (subtitle) {
            subtitle.textContent = `JSON view - ${reason}`;
        }
    }

    private hideErrorAndFallback(): void {
        // Hide error container
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }

        // Hide fallback JSON
        const fallbackEl = document.getElementById('fallback-json');
        if (fallbackEl) {
            fallbackEl.style.display = 'none';
        }

        // Show map container
        const mapContainer = document.querySelector('.map-container') as HTMLElement;
        if (mapContainer) {
            mapContainer.style.display = 'block';
        }

        // Reset header subtitle
        const subtitle = document.querySelector('.subtitle') as HTMLElement;
        if (subtitle) {
            subtitle.textContent = 'Interactive map visualization of GeoJSON data';
        }
    }

    private showError(message: string): void {
        console.error('MapApp:', message);
        
        const errorEl = document.getElementById('error');
        const errorMessageEl = document.getElementById('error-message');
        
        if (errorEl && errorMessageEl) {
            errorMessageEl.textContent = message;
            errorEl.style.display = 'block';
        }

        // Hide loading indicator
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    public dispose(): void {
        if (this.geoJsonRenderer) {
            this.geoJsonRenderer.clearLayers();
        }
        
        if (this.leafletManager) {
            this.leafletManager.dispose();
        }
        
        console.log('MapApp: Disposed');
    }
}

// Initialize the application when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MapApp();
    });
} else {
    new MapApp();
}