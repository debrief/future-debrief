# GitHub Copilot Integration Guide - Debrief MCP Tools

**For Phase 6 Documentation Team**: This template provides structure for the final user-facing documentation.

---

## Getting Started with GitHub Copilot and Debrief

### Prerequisites
1. VS Code with GitHub Copilot extension installed
2. Debrief VS Code extension installed
3. At least one `.plot.json` file open

### Automatic Server Startup
When you open a `.plot.json` file, two servers start automatically:
- **Debrief State Server** (port 60124): Handles plot state and operations
- **Tool Vault Server** (if configured): Provides additional analysis tools
- **WebSocket Bridge** (port 60123): Connects Python scripts to VS Code

No manual configuration required!

---

## Available Tools

### Time Management Tools

#### `debrief_get_time`
**Purpose**: Get current time state from the plot

**Example Prompts**:
- "What is the current time?"
- "Show me the time range"
- "Is the time slider playing?"

**Response Example**:
```json
{
  "current": "2025-10-05T12:00:00Z",
  "start": "2025-10-05T10:00:00Z",
  "end": "2025-10-05T14:00:00Z",
  "isPlaying": false
}
```

#### `debrief_set_time`
**Purpose**: Set the current time

**Example Prompts**:
- "Set time to 12:30"
- "Move to 2025-10-05T11:00:00Z"
- "Jump to the start of the time range"

**What Happens**:
- Time slider updates immediately
- Features update based on new time
- Map refreshes to show relevant data

---

### Viewport Management Tools

#### `debrief_get_viewport`
**Purpose**: Get current map viewport bounds

**Example Prompts**:
- "What area is currently visible?"
- "Show me the viewport bounds"
- "What's the current zoom level?"

**Response Example**:
```json
{
  "bounds": {
    "west": -10,
    "south": 50,
    "east": 2,
    "north": 58
  },
  "zoom": 7,
  "center": { "lat": 54, "lng": -4 }
}
```

#### `debrief_set_viewport`
**Purpose**: Change map viewport

**Example Prompts**:
- "Zoom to the Atlantic Ocean"
- "Set viewport to show Europe"
- "Pan to coordinates 50°N, 10°W"
- "Zoom level 10 centered on London"

**What Happens**:
- Map pans and zooms smoothly
- Viewport updates within 500ms
- No page refresh required

---

### Feature Management Tools

#### `debrief_list_features`
**Purpose**: List features in the plot (with optional filters)

**Example Prompts**:
- "Show me all Track features"
- "List features in the current viewport"
- "What features exist between 10:00 and 12:00?"
- "Find all features in the northern hemisphere"

**Filter Options** (Copilot handles automatically):
- Type filtering (Track, Point, Annotation)
- Geographic bounds filtering
- Time range filtering
- Property-based filtering

#### `debrief_get_selection`
**Purpose**: Get currently selected features

**Example Prompts**:
- "What features are selected?"
- "Show me the selected feature details"
- "How many features are selected?"

#### `debrief_set_selection`
**Purpose**: Select features programmatically

**Example Prompts**:
- "Select all Track features"
- "Select features in the northern hemisphere"
- "Clear selection"
- "Select features that occurred between 10:00 and 11:00"

---

### Utility Tools

#### `debrief_list_plots`
**Purpose**: List all open plot files (for multi-plot scenarios)

**Example Prompts**:
- "What plot files are open?"
- "Show me all plots"

**When You Need This**:
- Multiple .plot.json files are open
- You need to specify which plot to operate on

#### `debrief_zoom_to_selection`
**Purpose**: Zoom map to show selected features

**Example Prompts**:
- "Zoom to the selected features"
- "Show all selected items on the map"
- "Fit selection in viewport"

**Options**:
- Default padding: 15%
- Custom padding: "Zoom to selection with 20% padding"

---

## Multi-Step Workflows

### Example 1: Delete Selected Feature
**User Prompt**: "Delete the currently selected feature"

**What Copilot Does**:
1. Calls `debrief_get_selection()` to get selected feature ID
2. Calls `debrief_delete_feature({ featureId: "..." })` to delete
3. Confirms deletion to user
4. Map updates automatically

---

### Example 2: Filter and Analyze
**User Prompt**: "Show me all features within the current viewport that occurred between 10:00 and 12:00"

**What Copilot Does**:
1. Calls `debrief_get_viewport()` to get bounds
2. Calls `debrief_list_features()` with viewport and time filters
3. Returns filtered list to user

**Typical Response Time**: 2-3 seconds

---

### Example 3: Programmatic Selection
**User Prompt**: "Select all features of type 'Track' in the northern hemisphere"

**What Copilot Does**:
1. Calls `debrief_list_features()` to get all features
2. Filters by type='Track' and latitude > 0
3. Calls `debrief_set_selection({ featureIds: [...] })` with filtered IDs
4. Map highlights selected features

---

### Example 4: Time-Based Visualization
**User Prompt**: "Set time to 11:30 and zoom to show all features at that time"

**What Copilot Does**:
1. Calls `debrief_set_time({ current: "2025-10-05T11:30:00Z" })`
2. Calls `debrief_list_features()` to get features at that time
3. Calculates bounding box from feature coordinates
4. Calls `debrief_set_viewport({ bounds: {...} })` to zoom

**Total Time**: <5 seconds

---

## Error Handling

### Invalid Input Errors
Copilot receives detailed error messages and can self-correct:

**Example**: Invalid time format
```
User: "Set time to 2025-13-45T12:00:00Z"
Error: "TimeState.current is not a valid ISO 8601 date-time: 2025-13-45T12:00:00Z"
Copilot: (corrects to valid date and retries)
```

**Example**: Out-of-range coordinates
```
User: "Set viewport to latitude 95 degrees north"
Error: "ViewportState.bounds[3] (north) must be between -90 and 90 degrees, got 95"
Copilot: (corrects to 90 degrees and retries)
```

---

### Connection Errors
Clear, user-friendly messages guide troubleshooting:

**WebSocket Disconnected**:
```
Error: "Could not connect to plot. Is a .plot.json file open?"
Solution: Open a .plot.json file or reload VS Code window
```

**Tool Vault Unavailable**:
```
Error: "Tool Vault service is currently unavailable. Please try again."
Solution: Wait a few moments and retry
```

---

### Multi-Plot Disambiguation
When multiple plots are open, Copilot guides you:

```
User: "What is the current time?" (ambiguous - which plot?)
Error: "Multiple plot files are open. Please specify which file to use."
Available: atlantic.plot.json, pacific.plot.json

Copilot: "Which plot? Atlantic or Pacific?"
User: "Atlantic"
Copilot: (retries with filename parameter)
```

---

## Best Practices

### 1. Be Specific with Geographic References
✅ Good: "Zoom to 50°N, 10°W with zoom level 7"
❌ Vague: "Zoom to Europe" (Copilot interprets, but may not match intent)

### 2. Use Time Formats Consistently
✅ Good: "Set time to 2025-10-05T12:00:00Z" (ISO 8601)
✅ Good: "Set time to 12:00" (Copilot infers date from current context)
❌ Avoid: "Set time to noon tomorrow" (ambiguous)

### 3. Specify Plot File for Multi-Plot Scenarios
✅ Good: "Get time from atlantic.plot.json"
✅ Good: "What is the time in the Atlantic plot?"
❌ Ambiguous: "What is the time?" (when multiple plots open)

### 4. Chain Operations Clearly
✅ Good: "First get the viewport, then list features in it, then select Track features"
✅ Good: "Delete selected feature, add a new point at 0,0, and zoom to show it"

---

## Performance Expectations

| Operation | Target Latency | What to Expect |
|-----------|---------------|----------------|
| Single get operation | <200ms | Instant response |
| Single set operation | <500ms | Map updates quickly |
| Multi-step workflow (2-3 steps) | <3s | Brief pause, then updates |
| Complex workflow (4-5 steps) | <5s | Longer processing, then completes |
| Map updates after operation | <100ms | Immediate visual feedback |

---

## Troubleshooting

### Issue: Tools Not Appearing
**Symptoms**: Copilot doesn't recognize Debrief tools

**Solutions**:
1. Ensure .plot.json file is open
2. Check servers are running: `lsof -i :60123` and `lsof -i :60124`
3. Reload VS Code window: Cmd+Shift+P → "Developer: Reload Window"

---

### Issue: Slow Performance
**Symptoms**: Operations take >10 seconds

**Solutions**:
1. Check network connectivity (if using remote services)
2. Reduce complexity of operations (break into smaller steps)
3. Check VS Code extension logs for errors

---

### Issue: Map Not Updating
**Symptoms**: Commands succeed but map doesn't change

**Solutions**:
1. Verify plot file is in focus
2. Check browser console for JavaScript errors
3. Reload editor: Close and reopen .plot.json file

---

## Advanced Prompts

### Complex Analysis
```
"Analyze the movement patterns: get all Track features, calculate their average speed
between 10:00 and 12:00, and select those moving faster than 10 knots"
```

### Batch Operations
```
"For each feature of type Point, if it's in the northern hemisphere, change its color
to red, otherwise blue, then zoom to show all"
```

### Time-Series Analysis
```
"Step through time from 10:00 to 14:00 in 30-minute increments, and at each step,
show me which features are visible in the viewport"
```

---

## Example Conversation Flow

```
User: What plot files are open?
Copilot: You have 2 plot files open:
  1. atlantic.plot.json - Atlantic Ocean Plot
  2. pacific.plot.json - Pacific Ocean Plot

User: Show me all Track features in the Atlantic plot
Copilot: [Lists 3 Track features from atlantic.plot.json]

User: Select the first one and zoom to it
Copilot: Selected "Atlantic Vessel 1" and zoomed to show it. The feature is now highlighted on the map.

User: What time is it currently showing?
Copilot: The current time is 2025-10-05T09:00:00Z (start of the time range)

User: Move time to 11:00
Copilot: Time updated to 2025-10-05T11:00:00Z. The time slider has moved accordingly.
```

---

## Summary

GitHub Copilot with Debrief MCP tools provides:
- ✅ Natural language control of maritime plots
- ✅ Multi-step workflows with automatic coordination
- ✅ Clear error messages with self-correction
- ✅ Real-time map updates
- ✅ Multi-plot support with disambiguation
- ✅ Sub-5-second end-to-end workflows

**Next Steps**:
1. Try the example prompts above
2. Experiment with multi-step workflows
3. Report any issues or unexpected behavior

---

**Template Version**: 1.0 (for Phase 6 documentation team)
**Last Updated**: 2025-10-05
