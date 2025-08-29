(function() {
    const vscode = acquireVsCodeApi();
    let map;
    let geoJsonLayer;
    let currentData;
    let highlightedLayer;
    let selectedFeatures = new Set(); // Track selected feature indices
    let featureToLayerMap = new Map(); // Map feature indices to their layers

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
                // Store current selection IDs before clearing
                const previousSelectedIds = Array.from(selectedFeatures).map(index => {
                    if (currentData && currentData.features && currentData.features[index]) {
                        const feature = currentData.features[index];
                        return feature.id ? feature.id : null;
                    }
                    return null;
                }).filter(id => id !== null);
                
                console.log('🔄 Updating map, preserving selection for IDs:', previousSelectedIds);
                
                // Clear all existing selection visuals
                clearAllSelectionVisuals();
                
                // Remove existing layer
                if (geoJsonLayer) {
                    map.removeLayer(geoJsonLayer);
                }
                
                // Clear selection tracking
                selectedFeatures.clear();
                featureToLayerMap.clear();
                
                // Add new GeoJSON layer
                geoJsonLayer = L.geoJSON(data, {
                    onEachFeature: function (feature, layer, featureIndex) {
                        // Store layer reference for selection management
                        const index = data.features.indexOf(feature);
                        featureToLayerMap.set(index, layer);
                        
                        // Bind popup with feature info
                        if (feature.properties && feature.properties.name) {
                            layer.bindPopup(feature.properties.name);
                        }
                        
                        // Add click handler for selection
                        layer.on('click', function(e) {
                            e.originalEvent.preventDefault(); // Prevent map click
                            toggleFeatureSelection(index);
                        });
                    },
                    pointToLayer: function (feature, latlng) {
                        // Get color from feature properties, default to #00F (blue) if not present
                        const color = (feature.properties && feature.properties.color) ? feature.properties.color : '#00F';
                        
                        return L.circleMarker(latlng, {
                            radius: 8,                    // Size in screen pixels
                            fillColor: color,             // Fill color from properties.color or default
                            color: color,                 // Border color matches fill
                            weight: 2,                    // Border width
                            opacity: 0.8,               // Border opacity
                            fillOpacity: 0.7             // Fill opacity
                        });
                    },
                    style: function(feature) {
                        // Default style for non-point features
                        return {
                            color: '#3388ff',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.2
                        };
                    }
                }).addTo(map);
                
                // Fit map to show all features
                if (data.features.length > 0) {
                    map.fitBounds(geoJsonLayer.getBounds());
                }
                
                // Restore previous selection if any features had IDs that match
                if (previousSelectedIds.length > 0) {
                    console.log('🔄 Restoring selection for IDs:', previousSelectedIds);
                    setSelectionByIds(previousSelectedIds);
                }
               
            } else {                
                // Clear map and selections
                clearAllSelectionVisuals();
                if (geoJsonLayer) {
                    map.removeLayer(geoJsonLayer);
                }
                currentData = null;
            }
        } catch (error) {            
            // Clear map and selections
            clearAllSelectionVisuals();
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
                    radius: 12,                  // Larger for highlight
                    fillColor: '#ff7f00',       // Orange highlight fill
                    color: '#ff4500',           // Darker orange border
                    weight: 4,                  // Thick border
                    opacity: 0.9,              // High opacity border
                    fillOpacity: 0.6           // Semi-transparent fill
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
            case 'setSelection':
                if (message.featureIndices) {
                    setSelection(message.featureIndices);
                }
                break;
            case 'setSelectionByIds':
                if (message.featureIds) {
                    setSelectionByIds(message.featureIds);
                }
                break;
            case 'clearSelection':
                clearSelection();
                break;
            case 'getSelection':
                // Return current selection
                vscode.postMessage({
                    type: 'selectionResponse',
                    selectedFeatures: getSelectedFeatureData(),
                    selectedIndices: Array.from(selectedFeatures)
                });
                break;
            case 'refreshSelection':
                // Refresh selection visual indicators after feature updates
                refreshSelectionVisuals();
                break;
        }
    });

    // Zoom to current selection/highlight
    function zoomToSelection() {
        if (highlightedLayer) {
            // If there's a highlighted feature, zoom to it
            map.fitBounds(highlightedLayer.getBounds());
        } else if (selectedFeatures.size > 0) {
            // Zoom to selected features
            zoomToSelectedFeatures();
        } else if (geoJsonLayer) {
            // Otherwise zoom to all features
            map.fitBounds(geoJsonLayer.getBounds());
        }
    }

    // Toggle selection of a feature
    function toggleFeatureSelection(featureIndex) {
        if (!currentData || !currentData.features || featureIndex >= currentData.features.length) {
            return;
        }

        const layer = featureToLayerMap.get(featureIndex);
        if (!layer) {
            return;
        }

        if (selectedFeatures.has(featureIndex)) {
            // Deselect
            selectedFeatures.delete(featureIndex);
            updateFeatureStyle(featureIndex, false);
        } else {
            // Select
            selectedFeatures.add(featureIndex);
            updateFeatureStyle(featureIndex, true);
        }

        // Notify VS Code of selection change
        notifySelectionChange();
        
        console.log('Selected features:', Array.from(selectedFeatures));
    }

    // Update feature visual style based on selection state
    function updateFeatureStyle(featureIndex, isSelected) {
        const layer = featureToLayerMap.get(featureIndex);
        const feature = currentData.features[featureIndex];
        
        if (!layer || !feature) {
            return;
        }

        if (feature.geometry.type === 'Point') {
            // For circle markers, modify the style directly for selection
            const baseColor = (feature.properties && feature.properties.color) ? feature.properties.color : '#00F';
            
            if (isSelected) {
                // Selected state: larger radius, thicker border, orange selection color
                layer.setStyle({
                    radius: 10,                   // Larger when selected
                    fillColor: baseColor,         // Keep original fill color
                    color: '#ff6b35',            // Orange selection border
                    weight: 4,                   // Thicker border when selected
                    opacity: 1,                  // Full opacity border
                    fillOpacity: 0.8             // Slightly more opaque fill
                });
            } else {
                // Default state: restore original styling
                layer.setStyle({
                    radius: 8,                   // Normal size
                    fillColor: baseColor,        // Original fill color
                    color: baseColor,            // Border matches fill
                    weight: 2,                   // Normal border width
                    opacity: 0.8,               // Normal border opacity
                    fillOpacity: 0.7             // Normal fill opacity
                });
            }
        } else {
            // For other geometry types, change the style
            const selectedStyle = {
                color: '#ff6b35',
                weight: 4,
                opacity: 1,
                fillColor: '#ff6b35',
                fillOpacity: 0.3
            };
            
            const defaultStyle = {
                color: '#3388ff',
                weight: 3,
                opacity: 0.8,
                fillColor: '#3388ff',
                fillOpacity: 0.2
            };
            
            layer.setStyle(isSelected ? selectedStyle : defaultStyle);
        }
    }

    // Set selection from external source (e.g., Python API)
    function setSelection(featureIndices) {
        // Clear current selection
        clearSelection();
        
        // Set new selection
        featureIndices.forEach(index => {
            if (index >= 0 && index < currentData.features.length) {
                selectedFeatures.add(index);
                updateFeatureStyle(index, true);
            }
        });
        
        console.log('Selection set to:', featureIndices);
    }

    // Set selection by feature IDs
    function setSelectionByIds(featureIds) {
        if (!currentData || !currentData.features) {
            return;
        }

        // Clear current selection
        clearSelection();
        
        // Find indices for the given IDs
        const indices = [];
        featureIds.forEach(id => {
            const index = currentData.features.findIndex(feature => 
                feature.id === id
            );
            if (index >= 0) {
                indices.push(index);
            }
        });
        
        // Set selection
        setSelection(indices);
        
        console.log('Selection set by IDs:', featureIds, 'indices:', indices);
    }

    // Clear all selections
    function clearSelection() {
        selectedFeatures.forEach(index => {
            updateFeatureStyle(index, false);
        });
        selectedFeatures.clear();
    }

    // Clear all selection visuals
    function clearAllSelectionVisuals() {
        console.log('🧹 Clearing all selection visuals...');
        
        // Clear tracked selections first
        selectedFeatures.forEach(index => {
            updateFeatureStyle(index, false);
        });
        selectedFeatures.clear();
    }

    // Get currently selected feature data
    function getSelectedFeatureData() {
        if (!currentData || !currentData.features) {
            return [];
        }
        
        return Array.from(selectedFeatures).map(index => currentData.features[index]);
    }

    // Zoom to selected features
    function zoomToSelectedFeatures() {
        if (selectedFeatures.size === 0) {
            return;
        }

        const bounds = L.latLngBounds();
        selectedFeatures.forEach(index => {
            const layer = featureToLayerMap.get(index);
            if (layer) {
                if (layer.getLatLng) {
                    // Point feature
                    bounds.extend(layer.getLatLng());
                } else if (layer.getBounds) {
                    // Other geometry types
                    bounds.extend(layer.getBounds());
                }
            }
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [10, 10] });
        }
    }

    // Notify VS Code of selection changes
    function notifySelectionChange() {
        const selectedFeatureIds = Array.from(selectedFeatures).map(index => {
            const feature = currentData.features[index];
            return feature.id ? feature.id : `index_${index}`;
        });

        console.log('🔄 Selection changed:');
        console.log('  Selected indices:', Array.from(selectedFeatures));
        console.log('  Selected feature IDs:', selectedFeatureIds);
        console.log('  Features with missing IDs:', Array.from(selectedFeatures).filter(index => {
            const feature = currentData.features[index];
            return !feature.id;
        }));

        vscode.postMessage({
            type: 'selectionChanged',
            selectedFeatureIds: selectedFeatureIds,
            selectedIndices: Array.from(selectedFeatures)
        });
    }

    // Refresh selection visual indicators (removes old selection circles and redraws them)
    function refreshSelectionVisuals() {
        console.log('🔄 Refreshing selection visuals...');
        
        if (!currentData || selectedFeatures.size === 0) {
            return;
        }

        // Store current selection indices
        const currentSelection = Array.from(selectedFeatures);
        
        // Clear all selection visuals
        clearSelection();
        
        // Reapply selection to refresh visual indicators at updated positions
        currentSelection.forEach(index => {
            if (index >= 0 && index < currentData.features.length) {
                selectedFeatures.add(index);
                updateFeatureStyle(index, true);
            }
        });
        
        console.log('✅ Selection visuals refreshed for', currentSelection.length, 'features');
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