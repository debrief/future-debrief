# Debrief WebSocket API - User Guide & Reference

## Overview

This guide provides **complete Python API usage examples and reference** for the Debrief WebSocket API. For system architecture and design details, see [debrief_ws_bridge.md](debrief_ws_bridge.md).

The API enables Python scripts to interact with open Debrief plot files in VS Code, providing:
- Real-time feature manipulation and selection management
- Typed state objects for time, viewport, and selection control  
- Automatic connection handling and error management

## Quick Start

The WebSocket server runs automatically inside the VS Code extension on `ws://localhost:60123`.

### Python Quick Start

```python
from debrief_api import notify, get_feature_collection

# Send a notification
notify("Hello from Python!")

# Get plot data
fc = get_feature_collection("sample.plot.json")
print(f"Plot has {len(fc['features'])} features")
```

## API Commands

### 1. notify(message)

Display a notification in VS Code.

**Parameters:**
- `message` (str): The message to display

**Returns:** None

**Example:**
```python
from debrief_api import notify
notify("Processing complete!")
```

---

### 2. get_feature_collection(filename)

Retrieve the complete GeoJSON FeatureCollection from a plot file.

**Parameters:**
- `filename` (str): Path to the plot file (relative to workspace or absolute)

**Returns:** dict - Complete GeoJSON FeatureCollection

**Example:**
```python
from debrief_api import get_feature_collection

fc = get_feature_collection("sample.plot.json")
print(f"Type: {fc['type']}")
print(f"Features: {len(fc['features'])}")

# Access individual features
for i, feature in enumerate(fc['features']):
    print(f"Feature {i}: {feature['properties'].get('name', 'Unnamed')}")
```

---

### 3. set_feature_collection(filename, feature_collection)

Replace the entire plot with a new FeatureCollection.

**Parameters:**
- `filename` (str): Path to the plot file
- `feature_collection` (dict): Complete GeoJSON FeatureCollection

**Returns:** None

**Example:**
```python
from debrief_api import set_feature_collection

new_plot = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"name": "New Point", "id": "point_1"},
            "geometry": {
                "type": "Point",
                "coordinates": [-74.006, 40.7128]
            }
        }
    ]
}

set_feature_collection("new_plot.plot.json", new_plot)
```

---

### 4. get_selected_features(filename)

Get the currently selected features from a plot file.

**Parameters:**
- `filename` (str): Path to the plot file

**Returns:** SelectionState - Typed object containing selected feature IDs

**Example:**
```python
from debrief_api import get_selected_features

selection_state = get_selected_features("sample.plot.json")
print(f"Selected feature IDs: {selection_state.selected_ids}")

# Get actual feature objects if needed
fc = get_feature_collection("sample.plot.json")
selected_features = [f for f in fc['features'] if f.get('id') in selection_state.selected_ids]
for feature in selected_features:
    print(f"Selected: {feature['properties'].get('name')}")
```

---

### 5. set_selected_features(selection_state, filename)

Update the selection using a SelectionState object.

**Parameters:**
- `selection_state` (SelectionState): SelectionState object containing feature IDs to select
- `filename` (str): Path to the plot file

**Returns:** None

**Example:**
```python
from debrief_api import set_selected_features, SelectionState

# Select specific features
selection = SelectionState(selected_ids=["feature_1", "feature_2"])
set_selected_features(selection, "sample.plot.json")

# Clear selection
empty_selection = SelectionState(selected_ids=[])
set_selected_features(empty_selection, "sample.plot.json")
```

---

### 6. add_features(filename, features)

Add new features to an existing plot. Feature IDs are generated automatically if not provided.

**Parameters:**
- `filename` (str): Path to the plot file
- `features` (list): Array of Feature objects to add

**Returns:** None

**Example:**
```python
from debrief_api import add_features

new_features = [
    {
        "type": "Feature",
        "properties": {"name": "Added Point 1"},
        "geometry": {
            "type": "Point", 
            "coordinates": [-73.935, 40.730]
        }
    },
    {
        "type": "Feature",
        "properties": {"name": "Added Point 2"},
        "geometry": {
            "type": "Point",
            "coordinates": [-74.01, 40.72]
        }
    }
]

add_features("sample.plot.json", new_features)
```

---

### 7. update_features(filename, features)

Update existing features by replacing them with modified versions. Features are matched by their ID.

**Parameters:**
- `filename` (str): Path to the plot file
- `features` (list): Array of Feature objects with updated data

**Returns:** None

**Example:**
```python
from debrief_api import get_feature_collection, update_features

# Get current data
fc = get_feature_collection("sample.plot.json")

# Modify a feature
if fc['features']:
    feature = fc['features'][0].copy()
    feature['properties']['name'] = "Updated Name"
    feature['properties']['updated'] = True
    
    # Update in the plot
    update_features("sample.plot.json", [feature])
```

---

### 8. delete_features(filename, feature_ids)

Remove features from the plot by their IDs.

**Parameters:**
- `filename` (str): Path to the plot file  
- `feature_ids` (list): List of feature ID strings to delete

**Returns:** None

**Example:**
```python
from debrief_api import delete_features

# Delete specific features
delete_features("sample.plot.json", ["feature_1", "feature_3"])
```

---

### 9. zoom_to_selection(filename)

Adjust the map view to fit the currently selected features. If no features are selected, zooms to fit all features.

**Parameters:**
- `filename` (str): Path to the plot file

**Returns:** None

**Example:**
```python
from debrief_api import set_selected_features, zoom_to_selection

# Select features and zoom to them
set_selected_features("sample.plot.json", ["feature_1"])
zoom_to_selection("sample.plot.json")
```

---

## State Management APIs (Typed Objects)

The API provides typed state management for time, viewport, and selection control with full type safety:

### Time State Management

**get_time(filename) → TimeState**

Get current time state as a typed TimeState object.

```python
from debrief_api import debrief, TimeState

# Get time state (returns TimeState object)
time_state = debrief.get_time("temporal.plot.json")
if time_state:
    print(f"Current time: {time_state.current}")
    print(f"Time range: {time_state.range[0]} to {time_state.range[1]}")
```

**set_time(time_state, filename)**

Set time state using a TimeState object.

```python
# Create new TimeState with center time
start = time_state.range[0]
end = time_state.range[1]
center = start + (end - start) / 2
new_time_state = TimeState(current=center, range=time_state.range)
debrief.set_time(new_time_state, "temporal.plot.json")
```

---

### Viewport State Management

**get_viewport(filename) → ViewportState**

Get current viewport state as a typed ViewportState object.

```python
from debrief_api import debrief, ViewportState

# Get viewport bounds
viewport = debrief.get_viewport("sample.plot.json")
if viewport:
    west, south, east, north = viewport.bounds
    print(f"Viewport: {west}, {south}, {east}, {north}")
```

**set_viewport(viewport_state, filename)**

Set viewport using a ViewportState object.

```python
# Set new viewport bounds [west, south, east, north]
new_viewport = ViewportState(bounds=[-10.0, 50.0, 2.0, 58.0])
debrief.set_viewport(new_viewport, "sample.plot.json")
```

---

### Selection State Management

**get_selected_features(filename) → SelectionState**

Get currently selected features as a typed SelectionState object.

```python
from debrief_api import debrief, SelectionState

# Get selected feature IDs
selection = debrief.get_selected_features("sample.plot.json")
print(f"Selected IDs: {selection.selected_ids}")
```

**set_selected_features(selection_state, filename)**

Set selection using a SelectionState object.

```python
# Create selection with specific feature IDs
new_selection = SelectionState(selected_ids=["feature1", "feature2"])
debrief.set_selected_features(new_selection, "sample.plot.json")

# Clear selection
empty_selection = SelectionState(selected_ids=[])
debrief.set_selected_features(empty_selection, "sample.plot.json")
```

---

### Type Safety Benefits

The typed state objects provide:
- **IDE Auto-completion**: Full IntelliSense support for all properties
- **Runtime Validation**: Automatic type checking and data validation  
- **Conversion Methods**: Automatic `to_dict()` and `from_dict()` for WebSocket communication
- **Error Prevention**: Catch type mismatches before runtime
- **Better Documentation**: Self-documenting code with clear property types

---

## Complete Workflow Example

Here's a complete example showing common operations:

```python
from debrief_api import (
    get_feature_collection, set_selected_features, 
    add_features, update_features, delete_features,
    zoom_to_selection, notify
)

filename = "sample.plot.json"

# Get current plot data
fc = get_feature_collection(filename)
notify(f"Loaded plot with {len(fc['features'])} features")

# Add a new feature
new_feature = {
    "type": "Feature",
    "properties": {"name": "Python Added Point"},
    "geometry": {
        "type": "Point",
        "coordinates": [-74.0059, 40.7589]  # New York
    }
}
add_features(filename, [new_feature])

# Get updated data to find the new feature's ID
fc_updated = get_feature_collection(filename)
new_feature_id = None
for feature in fc_updated['features']:
    if feature['properties'].get('name') == 'Python Added Point':
        new_feature_id = feature['properties']['id']
        break

if new_feature_id:
    # Select the new feature
    set_selected_features(filename, [new_feature_id])
    
    # Zoom to it
    zoom_to_selection(filename)
    
    # Update its properties
    updated_feature = None
    for feature in fc_updated['features']:
        if feature['properties'].get('id') == new_feature_id:
            updated_feature = feature.copy()
            break
    
    if updated_feature:
        updated_feature['properties']['description'] = 'Added and modified by Python'
        update_features(filename, [updated_feature])
        
        notify("Feature added, selected, zoomed, and updated!")
```

## Error Handling

All API functions raise `DebriefAPIError` exceptions when operations fail:

```python
from debrief_api import get_feature_collection, DebriefAPIError

try:
    fc = get_feature_collection("nonexistent.plot.json")
except DebriefAPIError as e:
    print(f"Error: {e}")
    print(f"Error code: {e.code}")  # HTTP-style error codes (404, 400, 500)
```

### Common Error Codes

- **400**: Bad Request - Invalid parameters or malformed data
- **404**: Not Found - File not found or not open in VS Code
- **500**: Internal Server Error - Server-side processing error

## File Path Handling

The API supports both relative and absolute file paths:

```python
# Relative to workspace root
get_feature_collection("plots/sample.plot.json")

# Absolute path
get_feature_collection("/full/path/to/plot.json")

# Just filename (searches in workspace)
get_feature_collection("sample.plot.json")
```

## Feature ID Management

- **Automatic IDs**: When adding features without IDs, unique IDs are generated automatically
- **ID Format**: Generated IDs follow the pattern `feature_<timestamp>_<random>`
- **ID Persistence**: Feature IDs are preserved across operations and saved in the plot file
- **ID Requirements**: Update and delete operations require features to have valid IDs

## Real-time Integration

All operations immediately reflect in the VS Code interface:

- **File Changes**: Modifications are saved to the document and trigger VS Code's change detection
- **UI Updates**: Map view updates automatically when features are added/modified/deleted  
- **Selection Sync**: Selection changes are reflected in both the map and outline tree view
- **Zoom Operations**: Map view adjustments happen immediately

## Connection Notes

No manual connection management required - the API handles everything automatically:

- Connects on first API call
- Reconnects automatically if connection drops  
- Cleans up resources when script ends

## Performance Considerations

- **Small Files**: Operations on small plot files (< 100 features) are typically < 50ms
- **Large Files**: For files with thousands of features, operations may take several seconds
- **Batch Operations**: Use `add_features()` with multiple features rather than multiple single calls
- **Selection Efficiency**: Limit selection to reasonable numbers of features for best performance

## Troubleshooting

### Common Issues

1. **Connection Failed**: Ensure VS Code extension is running and WebSocket server started
2. **File Not Found**: Check file path and ensure file is open in VS Code workspace  
3. **Invalid GeoJSON**: Verify that feature data follows valid GeoJSON format
4. **Selection Not Updating**: Ensure features have valid IDs in their properties

### Debug Mode

Enable debug logging in Python:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# API calls will now show detailed debug information
```

### Manual Testing

Test individual commands interactively:

```python
from debrief_api import *

# Test connection
notify("Testing connection...")

# Explore available files
import os
print("Plot files in workspace:")
for f in os.listdir('.'):
    if f.endswith('.plot.json'):
        print(f"  {f}")
```

---

## Related Documentation

- **[WebSocket Bridge Architecture](debrief_ws_bridge.md)**: System design and technical implementation details  
- **[Extension Development Guide](../README.md)**: VS Code extension setup and development
- **[Test Examples](../workspace/tests/)**: Working Python scripts demonstrating API usage
- **[Shared Types](../../libs/shared-types/README.md)**: Type system and schema documentation