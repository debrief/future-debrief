# Phase 5: Manual Validation Checklist

**Quick Reference for Hands-On Testing**

## ✅ Pre-Flight Checks

- [ ] VS Code with GitHub Copilot extension installed
- [ ] Open workspace with test-plot.plot.json
- [ ] Servers auto-started (check ports 60123 and 60124)
- [ ] GitHub Copilot chat panel open

---

## 🧪 Core Functionality Tests

### 1. Tool Discovery (2 min)
- [ ] Type: "What Debrief tools are available?"
- [ ] Verify: All 6 Phase 1 tools listed
- [ ] Verify: Tool descriptions are clear

**Expected Tools:**
- debrief_get_time
- debrief_set_time
- debrief_get_viewport
- debrief_set_viewport
- debrief_list_plots
- debrief_zoom_to_selection

---

### 2. Delete Selected Feature (3 min)
- [ ] Select "Track-001" on map
- [ ] Ask Copilot: "Delete the currently selected feature"
- [ ] Verify: Track-001 disappears from map
- [ ] Verify: Execution time <3s

---

### 3. Filter and Select (5 min)
- [ ] Ask: "Select all features of type 'Track' in the northern hemisphere"
- [ ] Verify: Only Track-001 is selected (Track-002 is southern)
- [ ] Verify: Map shows correct selection highlight

---

### 4. Time and Viewport Coordination (5 min)
- [ ] Ask: "Set time to 2025-10-05T12:00:00Z and zoom to show all features"
- [ ] Verify: Time slider updates to 12:00:00
- [ ] Verify: Map zooms to show all features
- [ ] Verify: Total time <5s

---

## 🚨 Error Handling Tests

### 5. Invalid Time (2 min)
- [ ] Ask: "Set time to 2025-13-45T12:00:00Z"
- [ ] Verify error message: "TimeState.current is not a valid ISO 8601 date-time"
- [ ] Verify: No stack traces shown

---

### 6. Invalid Viewport (2 min)
- [ ] Ask: "Set viewport to latitude 95 degrees north"
- [ ] Verify error: "must be between -90 and 90 degrees, got 95"
- [ ] Verify: Copilot can self-correct to 90

---

### 7. WebSocket Disconnected (3 min)
- [ ] Stop WebSocket: `lsof -i :60123 | grep LISTEN | awk '{print $2}' | xargs kill`
- [ ] Ask: "Get the current time"
- [ ] Verify error: "Could not connect to plot. Is a .plot.json file open?"
- [ ] Restart: Reload VS Code window

---

### 8. Multiple Plots (3 min)
- [ ] Open atlantic.plot.json and pacific.plot.json
- [ ] Ask: "What is the current time?" (no filename)
- [ ] Verify error lists both files
- [ ] Ask: "What is the current time in the Atlantic plot?"
- [ ] Verify: Copilot specifies filename and succeeds

---

## 🎯 Performance Checks

### 9. Measure Workflow Time (10 min)

Open Chrome DevTools Console and measure:

```javascript
console.time('workflow1');
// Ask Copilot: "Get viewport, filter features in it, select Track features"
console.timeEnd('workflow1'); // Should be <3s
```

```javascript
console.time('workflow2');
// Ask: "Get time and viewport, list features visible now, select Points"
console.timeEnd('workflow2'); // Should be <5s
```

```javascript
console.time('workflow3');
// Ask: "Find all Track features, set color to blue, zoom to show all"
console.timeEnd('workflow3'); // Should be <4s
```

- [ ] Workflow 1: ______s (target: <3s)
- [ ] Workflow 2: ______s (target: <5s)
- [ ] Workflow 3: ______s (target: <4s)

---

## ✨ Real-Time Updates (5 min)

### 10. Map Updates
- [ ] Ask: "Add a new point at 30°N, 40°W"
- [ ] Verify: Point appears within 100ms
- [ ] Ask: "Change Track-001 color to red"
- [ ] Verify: Color updates immediately
- [ ] Ask: "Delete Point-001"
- [ ] Verify: Point disappears immediately

---

## 📊 Results Summary

**Total Time to Complete**: ________ min (target: 40-50 min)

**Tests Passed**: _____ / 10

**Tests Failed**: _____ / 10

**Critical Issues**: _____________________________

---

## 🔄 Next Steps

If all tests pass:
- [ ] Fill in Phase 5 handoff document
- [ ] Update context.yaml status to "completed"
- [ ] Proceed to Phase 6 (Documentation)

If issues found:
- [ ] Document issues in handoff
- [ ] Create GitHub issues for failures
- [ ] Determine if blockers for Phase 6

---

## 📝 Quick Notes

**Issues Found:**


**Observations:**


**Recommendations for Phase 6:**


