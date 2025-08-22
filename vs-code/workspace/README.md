# 🚢 Debrief VS Code Extension Demo

Welcome to the **Debrief VS Code Extension** demonstration environment! This Codespace provides a zero-install, browser-based way to explore the capabilities of our advanced maritime analysis tool.

## 🎯 What You'll Experience

The Debrief extension transforms VS Code into a powerful platform for analyzing maritime and military track data, featuring:

- **Interactive Map Visualization** - View tracks on dynamic maps with Leaflet integration
- **Timeline Analysis** - Navigate temporal data with intuitive time controls
- **GeoJSON Support** - Native rendering of geographic data formats
- **Real-time Editing** - Modify and visualize data changes instantly

## 🚀 Quick Start Guide

### Step 1: Launch the Extension Development Environment
The Debrief extension runs in development mode in this Codespace. To start it:

1. **Wait** for the Codespace to finish initializing (yarn install and compile will run automatically)
2. **Press** `F5` or use the Command Palette (`Ctrl/Cmd + Shift + P`) and type "Debug: Start Debugging"
3. **Select** "Run Extension" when prompted
4. A new VS Code window will open - this is the **Extension Development Host**
5. **Look** for the **Debrief** activity bar icon (🔍) on the left sidebar of the new window

### Step 2: Open Sample Files
We've provided three demonstration files in this workspace:

1. **`large-sample.plot.json`** - Maritime vessel tracks with rich temporal data
   - Click to open and see the interactive map editor
   - Contains multiple vessel tracks (VAN GALEN and others)
   - Demonstrates real-time geographic visualization

2. **`boat1.rep`** - Naval vessel NELSON track data in Debrief format
   - Shows traditional .rep file format support
   - Contains position, course, and speed data

3. **`boat2.rep`** - Naval vessel COLLINGWOOD track data
   - Demonstrates multi-vessel scenario analysis
   - Shows different operational patterns

### Step 3: Explore Key Features

#### 🗺️ Map Visualization
1. **Open** `large-sample.plot.json` by clicking on it
2. **Observe** the custom editor opens with an interactive map
3. **Interact** with the map:
   - Pan and zoom to explore the area
   - Click on track points to see detailed information
   - Use mouse wheel to zoom in/out

#### ⏱️ Timeline Controls
1. **Look** at the Debrief sidebar (left panel)
2. **Find** the "Time Controller" section
3. **Explore** temporal navigation features
4. **Notice** how the timeline reflects the data from open files

#### 📊 Outline View
1. **Check** the "Outline" section in the Debrief sidebar
2. **See** the document structure and metadata
3. **Observe** real-time updates as you interact with files

### Step 4: Try Advanced Features

#### Multi-File Analysis
- Open multiple .plot.json and .rep files simultaneously
- Switch between tabs to compare different scenarios
- Notice how the sidebar updates to reflect the active file

#### Data Interaction
- **Hover** over track points to see tooltips
- **Click** on features to open detailed popup information
- **Pan** the map to follow vessel movements

#### Theme Integration
- Try switching VS Code themes (Ctrl/Cmd + K, T)
- Notice how the extension adapts to light/dark themes
- Observe consistent styling across all components

## 📋 What to Look For

### ✅ Key Capabilities to Evaluate

- [ ] **Map Loading**: Does the interactive map display correctly?
- [ ] **Data Rendering**: Are vessel tracks visible and accurate?
- [ ] **Interactivity**: Can you click, pan, and zoom the map?
- [ ] **Sidebar Integration**: Do the Timeline and Outline panels show relevant data?
- [ ] **Theme Consistency**: Does the extension match VS Code's appearance?
- [ ] **Performance**: Is the interface responsive and smooth?
- [ ] **File Handling**: Do different file types (.plot.json, .rep) open correctly?

### 🔍 Technical Features

- **Custom Editor**: `.plot.json` files open in specialized map editor
- **GeoJSON Support**: Native rendering of geographic feature collections
- **Leaflet Integration**: Professional mapping with OpenStreetMap tiles
- **Real-time Updates**: Live communication between editor and sidebar
- **Error Handling**: Graceful fallbacks for invalid or malformed data

## 💬 Providing Feedback

Your feedback is valuable! Here are several ways to share your thoughts:

### Direct Feedback (Preferred)
- **Verbal Discussion**: Share observations during our demonstration session
- **Key Questions**: 
  - What works well for your use case?
  - What features would enhance your workflow?
  - Any performance or usability concerns?

### GitHub Issues (Optional)
If you'd like to provide detailed technical feedback:
1. Visit: [GitHub Issues](https://github.com/future-debrief/vs-code/issues)
2. Create a new issue with label "codespace-feedback"
3. Include specific details about your experience

## 🛠️ Technical Context

### Environment Details
- **Platform**: GitHub Codespace with VS Code Web
- **Container**: Microsoft Universal Dev Container
- **Extension**: Debrief VS Code Extension (development build)
- **Map Engine**: Leaflet 1.9.4 with OpenStreetMap tiles
- **Data Formats**: GeoJSON (.plot.json), Debrief replay files (.rep)

### System Architecture
- **Frontend**: React + TypeScript for sidebar components
- **Backend**: VS Code Extension API for file handling
- **Visualization**: Leaflet maps with custom GeoJSON rendering
- **Communication**: PostMessage pipeline between components

## 🔄 Troubleshooting

### Common Issues

**Extension Not Visible**
- Refresh VS Code (Ctrl/Cmd + Shift + P → "Developer: Reload Window")
- Check if Debrief icon appears in activity bar

**Map Not Loading**
- Ensure internet connectivity for map tiles
- Try opening a different .plot.json file
- Check browser console for any error messages

**Files Not Opening**
- Verify file has .plot.json extension
- Try right-click → "Open With" → "Debrief Plot Editor"

## 📚 Sample Data Details

### Large Sample File
- **Vessel**: VAN GALEN (VANG) + multiple tracks
- **Area**: Maritime operational area
- **Time Period**: November 2024
- **Data Points**: ~1000+ positions with temporal data
- **Features**: Speed, course, environmental conditions

### Replay Files
- **NELSON**: Traditional naval track with course changes
- **COLLINGWOOD**: Patrol pattern demonstration
- **Format**: Debrief .rep format (industry standard)
- **Temporal Range**: Historical exercise data

---

**Ready to explore?** Start by clicking on `large-sample.plot.json` and watch the magic happen! 

For questions or technical discussion, please engage with your session facilitator.

*🚢 Built with precision for maritime analysis excellence*