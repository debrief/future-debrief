(function() {
    const vscode = acquireVsCodeApi();
    let map;
    let geoJsonLayer;
    let currentData;
    let highlightedLayer;

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
            currentData = data;
            
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
               
            } else {                
                // Clear map
                if (geoJsonLayer) {
                    map.removeLayer(geoJsonLayer);
                }
                currentData = null;
            }
        } catch (error) {            
            // Clear map
            if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
            }
            currentData = null;
        }
    }

    // Highlight a specific feature by index
    function highlightFeature(featureIndex) {
        // Remove previous highlight
        if (highlightedLayer) {
            map.removeLayer(highlightedLayer);
            highlightedLayer = null;
        }

        if (!currentData || !currentData.features || featureIndex >= currentData.features.length) {
            return;
        }

        const feature = currentData.features[featureIndex];
        if (!feature) {
            return;
        }

        console.log('Highlighting feature:', featureIndex, feature.properties?.name);

        // Create a highlighted version of the feature
        highlightedLayer = L.geoJSON(feature, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 15,
                    fillColor: '#ff7f00',
                    color: '#ff4500',
                    weight: 4,
                    opacity: 0.9,
                    fillOpacity: 0.6
                });
            },
            style: function(feature) {
                return {
                    color: '#ff4500',
                    weight: 4,
                    opacity: 0.9,
                    fillColor: '#ff7f00',
                    fillOpacity: 0.6
                };
            }
        }).addTo(map);

        // Pan to the highlighted feature
        if (feature.geometry.type === 'Point') {
            const coords = feature.geometry.coordinates;
            map.panTo([coords[1], coords[0]]);
        }
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                updateMap(message.text);
                break;
            case 'highlightFeature':
                highlightFeature(message.featureIndex);
                break;
            case 'zoomToSelection':
                zoomToSelection();
                break;
        }
    });

    // Zoom to current selection/highlight
    function zoomToSelection() {
        if (highlightedLayer) {
            // If there's a highlighted feature, zoom to it
            map.fitBounds(highlightedLayer.getBounds());
        } else if (geoJsonLayer) {
            // Otherwise zoom to all features
            map.fitBounds(geoJsonLayer.getBounds());
        }
    }

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