# Phase 5: GitHub Copilot Integration Validation - Test Plan

**Version**: 1.0
**Date**: 2025-10-05
**Tester**: Doc Boeuf
**Environment**: VS Code with GitHub Copilot extension

---

## 🎯 Test Objectives

1. Verify all MCP tools are discoverable by GitHub Copilot
2. Validate multi-step workflows execute correctly
3. Confirm error messages are clear and actionable
4. Ensure real-time map updates work
5. Test multi-plot scenarios
6. Validate performance targets (<5s end-to-end workflows)

---

## 📋 Pre-Test Checklist

### Environment Setup:
- [ ] VS Code with GitHub Copilot extension installed and activated
- [ ] Open workspace with at least one .plot.json file
- [ ] Verify Debrief State Server is running (check port 60124)
- [ ] Verify Tool Vault Server is running (if applicable)
- [ ] Verify WebSocket bridge is active (port 60123)
- [ ] Open Chrome DevTools for performance measurement

### Verification:
- [ ] Run `pnpm typecheck` - all checks pass
- [ ] Run `pnpm test` - 256 tests passing
- [ ] Servers auto-start when .plot.json file is opened

---

## 🧪 Test Scenarios

### Test 1: MCP Server Auto-Start
**Objective**: Verify servers start automatically with workspace

**Steps**:
1. Close all VS Code windows
2. Open workspace with .plot.json file
3. Wait 5 seconds
4. Open GitHub Copilot chat panel
5. Type: "@debrief" and check autocomplete

**Expected Result**:
- Debrief State Server appears in Copilot tools
- Tool Vault Server appears in Copilot tools (if applicable)
- Total startup time <5 seconds

**Actual Result**: _[To be filled during testing]_

**Pass/Fail**: _[To be filled]_

---

### Test 2: Tool Discovery
**Objective**: Verify all MCP tools are discoverable

**Steps**:
1. Open GitHub Copilot chat panel
2. Type: "What Debrief tools are available?"
3. Verify list includes all expected tools

**Expected Tools**:
- `debrief_get_time` ✓
- `debrief_set_time` ✓
- `debrief_get_viewport` ✓
- `debrief_set_viewport` ✓
- `debrief_list_plots` ✓
- `debrief_zoom_to_selection` ✓
- Feature CRUD tools (list, get, add, update, delete) ✓

**Actual Result**: _[To be filled]_

**Pass/Fail**: _[To be filled]_

---

### Test 3: Delete Selected Feature Workflow
**Objective**: Multi-step workflow validation

**Setup**:
1. Open `test-plot.plot.json` (created in Test Data section)
2. Select feature "Track-001" on map

**Steps**:
1. Ask Copilot: "Delete the currently selected feature"
2. Observe Copilot actions in chat panel
3. Check map updates

**Expected Copilot Actions**:
1. Calls `debrief_get_selection()`
2. Calls `debrief_delete_feature({ featureId: "Track-001" })`
3. Responds: "Deleted feature Track-001"

**Expected Map Behavior**:
- Track-001 disappears from map immediately
- No page refresh required

**Actual Result**: _[To be filled]_

**Performance**: _[Measure total time]_

**Pass/Fail**: _[To be filled]_

---

### Test 4: Filter Features by Criteria Workflow
**Objective**: Complex multi-step workflow

**Steps**:
1. Ask Copilot: "Show me all features within the current viewport that occurred between 10:00 and 12:00"
2. Observe Copilot workflow in chat

**Expected Copilot Actions**:
1. Calls `debrief_get_viewport()` to get current bounds
2. Calls `debrief_get_time()` to understand time context
3. Calls `debrief_list_features()` with viewport and time filters
4. Returns filtered list to user

**Expected Result**:
- Copilot returns filtered feature list
- Feature count matches manual count
- All features are within specified bounds and time range

**Actual Result**: _[To be filled]_

**Performance**: _[Should be <5s]_

**Pass/Fail**: _[To be filled]_

---

### Test 5: Update Selection Programmatically
**Objective**: Test selection manipulation

**Steps**:
1. Ask Copilot: "Select all features of type 'Track' in the northern hemisphere"
2. Observe map selection changes

**Expected Copilot Actions**:
1. Calls `debrief_list_features()`
2. Filters by type='Track' and lat>0
3. Calls `debrief_set_selection({ featureIds: [...] })`
4. Responds with count: "Selected 3 Track features in the northern hemisphere"

**Expected Map Behavior**:
- Only Track features north of equator are selected
- Selection highlights appear on map
- Properties panel updates to show selected features

**Actual Result**: _[To be filled]_

**Pass/Fail**: _[To be filled]_

---

### Test 6: Time and Viewport Coordination
**Objective**: Test coordinated state updates

**Steps**:
1. Ask Copilot: "Set the time to 2025-10-05T12:00:00Z and zoom to show all features at that time"
2. Observe time slider and map viewport changes

**Expected Copilot Actions**:
1. Calls `debrief_set_time({ current: "2025-10-05T12:00:00Z" })`
2. Calls `debrief_list_features()` to get features at that time
3. Calculates bounding box
4. Calls `debrief_set_viewport({ bounds: [...] })`

**Expected UI Behavior**:
- Time slider updates to 12:00:00
- Map zooms to show all features
- Total execution time <5s

**Actual Result**: _[To be filled]_

**Performance**: _[Measure]_

**Pass/Fail**: _[To be filled]_

---

### Test 7: Invalid Time State Error
**Objective**: Validate error message display and quality

**Steps**:
1. Ask Copilot: "Set time to 2025-13-45T12:00:00Z" (invalid date)
2. Observe error message in chat panel

**Expected Error Message** (from Phase 2 validators):
```
"TimeState.current is not a valid ISO 8601 date-time: 2025-13-45T12:00:00Z"
```

**Validation Criteria**:
- Error message is displayed to user
- Message is clear and actionable
- No technical stack traces visible
- Copilot understands error and can correct

**Actual Result**: _[To be filled]_

**Pass/Fail**: _[To be filled]_

---

### Test 8: Invalid Viewport Bounds Error
**Objective**: Validate geographic validation errors

**Steps**:
1. Ask Copilot: "Set viewport to show latitude 95 degrees north" (out of range)
2. Observe error message

**Expected Error Message**:
```
"ViewportState.bounds[3] (north) must be between -90 and 90 degrees, got 95"
```

**Validation Criteria**:
- Error specifies which bound is invalid
- Error shows valid range
- Error shows actual invalid value
- Copilot can self-correct to latitude 90

**Actual Result**: _[To be filled]_

**Pass/Fail**: _[To be filled]_

---

### Test 9: WebSocket Disconnected Error
**Objective**: Test error handling when WebSocket is unavailable

**Setup**:
1. Manually stop WebSocket bridge (kill process on port 60123)

**Steps**:
1. Ask Copilot: "Get the current time"
2. Observe error message

**Expected Error Message** (from Phase 1 error utilities):
```
"Could not connect to plot. Is a .plot.json file open?"
```

**Validation Criteria**:
- User-friendly message (no technical jargon)
- Suggests corrective action
- No stack traces visible

**Actual Result**: _[To be filled]_

**Pass/Fail**: _[To be filled]_

---

### Test 10: Multiple Plots Without Filename
**Objective**: Test multi-plot disambiguation

**Setup**:
1. Open `atlantic.plot.json` and `pacific.plot.json`

**Steps**:
1. Ask Copilot: "What is the current time?" (without specifying file)
2. Observe error and disambiguation

**Expected Error**:
```
"Multiple plot files are open. Please specify which file to use."
```

**Expected Copilot Behavior**:
1. Receives MultiplePlotsError with available plots
2. Calls `debrief_list_plots()` to show options
3. Asks user: "Which plot? atlantic.plot.json or pacific.plot.json?"

**Actual Result**: _[To be filled]_

**Pass/Fail**: _[To be filled]_

---

### Test 11: Real-Time Map Updates
**Objective**: Verify map reflects all changes immediately

**Test Cases**:

#### 11a: Add Feature
1. Ask Copilot: "Add a new track feature at 50°N, 10°W"
2. Verify feature appears on map within 100ms
3. No manual refresh required

**Pass/Fail**: _[To be filled]_

#### 11b: Update Feature
1. Ask Copilot: "Change the color of Track-001 to red"
2. Verify map updates color immediately

**Pass/Fail**: _[To be filled]_

#### 11c: Delete Feature
1. Ask Copilot: "Delete Track-002"
2. Verify feature disappears from map immediately

**Pass/Fail**: _[To be filled]_

#### 11d: Time Slider Update
1. Ask Copilot: "Set time to 11:30"
2. Verify time slider moves to 11:30
3. Verify features update based on time

**Pass/Fail**: _[To be filled]_

#### 11e: Viewport Change
1. Ask Copilot: "Zoom to Atlantic Ocean"
2. Verify map pans and zooms correctly

**Pass/Fail**: _[To be filled]_

---

### Test 12: Concurrent Operations
**Objective**: Test multiple operations in quick succession

**Steps**:
1. Ask Copilot: "Delete Track-001, add a new point at 0°N 0°E, and zoom to the selection"
2. Observe execution order and results

**Expected Behavior**:
- Operations execute sequentially
- No race conditions
- No state inconsistencies
- Final state is correct

**Validation**:
- Track-001 is deleted
- New point exists at 0,0
- Viewport shows the new point
- Total time <5s

**Actual Result**: _[To be filled]_

**Performance**: _[Measure]_

**Pass/Fail**: _[To be filled]_

---

## 📊 Performance Benchmarks

### Benchmark 1: Get-Process-Update Workflow
**Steps**:
1. Start timer
2. Ask Copilot: "Get current viewport, filter features within it, and select all Track features"
3. Stop timer when map updates

**Target**: <3s total
**Actual**: _[Measure]_
**Pass/Fail**: _[To be filled]_

---

### Benchmark 2: Multi-Step Analysis Workflow
**Steps**:
1. Start timer
2. Ask Copilot: "Get current time and viewport, list all features visible now, and select those of type 'Point'"
3. Stop timer when selection appears

**Target**: <5s total
**Actual**: _[Measure]_
**Pass/Fail**: _[To be filled]_

---

### Benchmark 3: Batch Update Workflow
**Steps**:
1. Start timer
2. Ask Copilot: "Find all Track features, set their color to blue, and zoom to show all"
3. Stop timer when map updates

**Target**: <4s total
**Actual**: _[Measure]_
**Pass/Fail**: _[To be filled]_

---

## 📝 Test Data Files

### File 1: test-plot.plot.json
**Location**: `apps/vs-code/workspace/test-plot.plot.json`
**Contents**:
- Track-001: Track feature in northern hemisphere (50°N, 10°W to 52°N, 12°W)
- Track-002: Track feature in southern hemisphere (-30°S, 20°E to -28°S, 22°E)
- Point-001: Point feature at equator (0°N, 0°E)
- Point-002: Point feature in Arctic (80°N, 0°E)
- Annotation-001: Text annotation at 45°N, 5°W
- Time range: 2025-10-05 10:00:00 to 14:00:00

### File 2: atlantic.plot.json
**Location**: `apps/vs-code/workspace/atlantic.plot.json`
**Contents**:
- 3 Track features in Atlantic Ocean
- Time range: 2025-10-05 09:00:00 to 15:00:00

### File 3: pacific.plot.json
**Location**: `apps/vs-code/workspace/pacific.plot.json`
**Contents**:
- 2 Track features in Pacific Ocean (crosses antimeridian)
- Time range: 2025-10-05 08:00:00 to 16:00:00

---

## ✅ Success Criteria Summary

### Functional Requirements:
- [ ] All MCP tools discoverable by Copilot
- [ ] Multi-step workflows execute correctly
- [ ] Error messages are clear and actionable
- [ ] Map updates reflect all operations in real-time
- [ ] Multi-plot scenarios work with filename parameter
- [ ] Concurrent operations don't cause race conditions

### Performance Requirements:
- [ ] Server startup <5s
- [ ] Tool discovery <3s
- [ ] Single operations meet p95 targets (<200ms get, <500ms set)
- [ ] Multi-step workflows <5s p95
- [ ] Error recovery <3s

### User Experience Requirements:
- [ ] Error messages help user correct issues
- [ ] No technical jargon in user-facing errors
- [ ] Copilot can retry after receiving error guidance
- [ ] Multi-plot disambiguation is clear

---

## 📊 Test Results Summary

**Total Tests**: 12 scenarios + 3 performance benchmarks = 15 tests
**Passed**: _[To be filled]_
**Failed**: _[To be filled]_
**Blocked**: _[To be filled]_

**Critical Issues Found**: _[To be filled]_

**Performance Summary**:
- Server startup: _[Actual]_ (Target: <5s)
- Tool discovery: _[Actual]_ (Target: <3s)
- Get operations p95: _[Actual]_ (Target: <200ms)
- Set operations p95: _[Actual]_ (Target: <500ms)
- Multi-step workflows p95: _[Actual]_ (Target: <5s)

---

## 🔄 Next Steps

After completing all tests:

1. [ ] Fill in all "Actual Result" fields
2. [ ] Mark all "Pass/Fail" statuses
3. [ ] Document any issues found
4. [ ] Create issue tickets for failures
5. [ ] Update Phase 5 handoff document
6. [ ] Prepare documentation for Phase 6

---

## 📎 Appendix: Useful Commands

### Check Server Status:
```bash
# Check if WebSocket bridge is running
lsof -i :60123

# Check if HTTP server is running
lsof -i :60124

# Check server logs
# (Location depends on VS Code extension implementation)
```

### Restart Servers:
```bash
# Close and reopen .plot.json file in VS Code
# Or reload VS Code window: Cmd+Shift+P → "Developer: Reload Window"
```

### Performance Measurement:
```javascript
// In Chrome DevTools Console:
console.time('workflow');
// ... perform Copilot interaction ...
console.timeEnd('workflow');
```

---

**Test Plan Version**: 1.0
**Last Updated**: 2025-10-05
**Next Review**: After Phase 5 completion
