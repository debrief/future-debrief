import * as L from 'leaflet';
import type { FeatureCollection, Feature, GeoJsonObject } from 'geojson';

export interface RenderOptions {
    fitBounds?: boolean;
    clearExisting?: boolean;
}

export class GeoJSONRenderer {
    private geoJsonLayer: L.GeoJSON | null = null;

    constructor(private map: L.Map) {}

    public renderGeoJSON(geoJson: GeoJsonObject, options: RenderOptions = {}): boolean {
        try {
            console.log('GeoJSONRenderer: Rendering GeoJSON data', geoJson);

            // Clear existing layer if requested
            if (options.clearExisting && this.geoJsonLayer) {
                this.map.removeLayer(this.geoJsonLayer);
                this.geoJsonLayer = null;
            }

            // Create new GeoJSON layer with styling and popups
            this.geoJsonLayer = L.geoJSON(geoJson, {
                style: this.getFeatureStyle,
                onEachFeature: this.onEachFeature,
                pointToLayer: this.pointToLayer
            });

            // Add to map
            this.geoJsonLayer.addTo(this.map);

            // Fit bounds if requested and we have features
            if (options.fitBounds) {
                this.fitBounds();
            }

            console.log('GeoJSONRenderer: Successfully rendered GeoJSON');
            return true;

        } catch (error) {
            console.error('GeoJSONRenderer: Failed to render GeoJSON:', error);
            return false;
        }
    }

    public renderFeatureCollection(fc: FeatureCollection, options: RenderOptions = {}): boolean {
        if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
            console.warn('GeoJSONRenderer: Invalid FeatureCollection provided');
            return false;
        }

        console.log(`GeoJSONRenderer: Rendering FeatureCollection with ${fc.features.length} features`);
        return this.renderGeoJSON(fc, options);
    }

    private getFeatureStyle = (feature?: Feature): L.PathOptions => {
        // Default styling - can be enhanced later
        return {
            color: '#3388ff',
            weight: 2,
            opacity: 0.8,
            fillColor: '#3388ff',
            fillOpacity: 0.2
        };
    };

    private pointToLayer = (feature: Feature, latlng: L.LatLng): L.Marker => {
        // Create markers for point features
        return L.marker(latlng, {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
                        <path fill="#3388ff" stroke="#fff" stroke-width="1" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,12.5,12.5,28.5,12.5,28.5s12.5-16,12.5-28.5C25,5.6,19.4,0,12.5,0z"/>
                        <circle fill="#fff" cx="12.5" cy="12.5" r="3"/>
                    </svg>
                `),
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        });
    };

    private onEachFeature = (feature: Feature, layer: L.Layer): void => {
        // Add popup with feature properties
        if (feature.properties) {
            const popupContent = this.createPopupContent(feature);
            layer.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'feature-popup'
            });
        }

        // Add hover effects
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                if (layer.setStyle) {
                    layer.setStyle({
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.4
                    });
                }
            },
            mouseout: (e) => {
                if (this.geoJsonLayer) {
                    this.geoJsonLayer.resetStyle(e.target);
                }
            }
        });
    };

    private createPopupContent(feature: Feature): string {
        const props = feature.properties || {};
        const geometry = feature.geometry;
        
        let content = '<div class="feature-popup-content">';
        
        // Feature ID
        if (feature.id !== undefined) {
            content += `<div><strong>ID:</strong> ${feature.id}</div>`;
        }
        
        // Geometry type
        if (geometry) {
            content += `<div><strong>Type:</strong> ${geometry.type}</div>`;
        }

        // Properties
        const propEntries = Object.entries(props);
        if (propEntries.length > 0) {
            content += '<div><strong>Properties:</strong></div>';
            content += '<ul style="margin: 4px 0; padding-left: 16px;">';
            propEntries.slice(0, 5).forEach(([key, value]) => {
                const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                const truncatedValue = displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue;
                content += `<li><strong>${key}:</strong> ${truncatedValue}</li>`;
            });
            if (propEntries.length > 5) {
                content += `<li><em>... and ${propEntries.length - 5} more properties</em></li>`;
            }
            content += '</ul>';
        }
        
        content += '</div>';
        return content;
    }

    public fitBounds(): void {
        if (this.geoJsonLayer) {
            const bounds = this.geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [10, 10] });
            }
        }
    }

    public clearLayers(): void {
        if (this.geoJsonLayer) {
            this.map.removeLayer(this.geoJsonLayer);
            this.geoJsonLayer = null;
        }
    }

    public getLayerCount(): number {
        return this.geoJsonLayer ? Object.keys((this.geoJsonLayer as any)._layers || {}).length : 0;
    }
}