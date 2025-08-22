(function() {
    const vscode = acquireVsCodeApi();
    let map;
    let geoJsonLayer;

    // Initialize the map
    function initMap() {
        map = L.map('map').setView([51.505, -0.09], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Update the map with GeoJSON data
    function updateMap(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            
            // Check if it's a valid GeoJSON FeatureCollection
            if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
                // Remove existing layer
                if (geoJsonLayer) {
                    map.removeLayer(geoJsonLayer);
                }
                
                // Add new GeoJSON layer
                geoJsonLayer = L.geoJSON(data, {
                    onEachFeature: function (feature, layer) {
                        if (feature.properties && feature.properties.name) {
                            layer.bindPopup(feature.properties.name);
                        }
                    },
                    pointToLayer: function (feature, latlng) {
                        return L.marker(latlng);
                    }
                }).addTo(map);
                
                // Fit map to show all features
                if (data.features.length > 0) {
                    map.fitBounds(geoJsonLayer.getBounds());
                }
                
                // Update JSON display
                document.getElementById('json-content').textContent = JSON.stringify(data, null, 2);
            } else {
                // Not a valid FeatureCollection, show as text
                document.getElementById('json-content').textContent = jsonText;
                
                // Clear map
                if (geoJsonLayer) {
                    map.removeLayer(geoJsonLayer);
                }
            }
        } catch (error) {
            // Invalid JSON, show as text
            document.getElementById('json-content').textContent = jsonText;
            
            // Clear map
            if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
            }
        }
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                updateMap(message.text);
                break;
        }
    });

    // Handle add button click
    document.addEventListener('DOMContentLoaded', () => {
        initMap();
        
        document.querySelector('.add-button').addEventListener('click', () => {
            vscode.postMessage({
                type: 'add'
            });
        });
        
        // Handle map clicks to add new points
        map.on('click', function(e) {
            vscode.postMessage({
                type: 'addPoint',
                lat: e.latlng.lat,
                lng: e.latlng.lng
            });
        });
    });
})();