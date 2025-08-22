import * as L from 'leaflet';

export interface MapConfig {
    containerId: string;
    center?: [number, number];
    zoom?: number;
    maxZoom?: number;
}

export class LeafletManager {
    private map: L.Map | null = null;
    private isInitialized = false;
    private container: HTMLElement | null = null;
    private intersectionObserver: IntersectionObserver | null = null;

    constructor(private config: MapConfig) {
        this.container = document.getElementById(config.containerId);
        if (!this.container) {
            throw new Error(`Map container with id '${config.containerId}' not found`);
        }
        this.setupLazyLoading();
    }

    private setupLazyLoading(): void {
        if (!this.container) {
            return;
        }

        // Use IntersectionObserver for true lazy loading
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !this.isInitialized) {
                        this.initializeMap();
                        this.intersectionObserver?.disconnect();
                    }
                });
            },
            { threshold: 0.1 }
        );

        this.intersectionObserver.observe(this.container);
    }

    private initializeMap(): void {
        if (this.isInitialized || !this.container) {
            return;
        }

        try {
            console.log('LeafletManager: Initializing map');
            
            // Hide loading indicator
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }

            // Create map with default configuration
            this.map = L.map(this.config.containerId, {
                center: this.config.center || [40.0, -95.0], // Center of US as default
                zoom: this.config.zoom || 4,
                maxZoom: this.config.maxZoom || 18,
                zoomControl: true,
                attributionControl: true
            });

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);

            this.isInitialized = true;
            console.log('LeafletManager: Map initialized successfully');

        } catch (error) {
            console.error('LeafletManager: Failed to initialize map:', error);
            this.showError('Failed to initialize map');
        }
    }

    public getMap(): L.Map | null {
        return this.map;
    }

    public isMapInitialized(): boolean {
        return this.isInitialized;
    }

    public forceInitialize(): void {
        if (!this.isInitialized) {
            this.initializeMap();
        }
    }

    private showError(message: string): void {
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
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.isInitialized = false;
        console.log('LeafletManager: Disposed');
    }
}