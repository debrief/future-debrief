# Phase 5: GitHub Copilot Integration Validation - Detailed Requirements

**Agent**: frontend-developer (82% confidence)
**Alternative**: systems-analyst
**Model**: sonnet
**Duration**: 3-4 hours
**Dependencies**: Phase 1, 2, 3, 4 completed
**Blocks**: Phase 6

---

## 🎯 Phase Objectives

Validate that GitHub Copilot can successfully interact with all MCP tools, execute multi-step workflows, and provide a smooth user experience for maritime plot manipulation.

---

## 📋 Task Checklist

### Task 1: Validate MCP Server Auto-Start
- [ ] Verify Debrief State Server starts automatically with workspace
- [ ] Verify Tool Vault Server starts automatically
- [ ] Confirm servers register with GitHub Copilot
- [ ] Test server restart behavior
- [ ] Validate port configurations (60123 WebSocket, 60124 HTTP)

**Expected Behavior**:
- Servers start when `.plot.json` file is opened
- GitHub Copilot detects servers within 5 seconds
- No manual intervention required

---

### Task 2: Test Tool Discovery
- [ ] Open GitHub Copilot chat panel
- [ ] Verify all 6 Phase 1 MCP tools are listed
- [ ] Verify all existing feature CRUD tools are available
- [ ] Check tool descriptions are clear and actionable
- [ ] Validate tool schemas are properly formatted

**Tools to Verify**:
- `debrief_get_time`
- `debrief_set_time`
- `debrief_get_viewport`
- `debrief_set_viewport`
- `debrief_list_plots`
- `debrief_zoom_to_selection`
- All feature CRUD tools from Phase 1

**Success Criteria**: Copilot can list and describe all tools

---

### Task 3: Verify Multi-Step Workflows

#### Workflow 1: Delete Selected Feature
- [ ] Ask Copilot: "Delete the currently selected feature"
- [ ] Verify Copilot:
  1. Calls `debrief_get_selection` to get selected feature
  2. Calls `debrief_delete_feature` with feature ID
  3. Confirms deletion to user
- [ ] Validate map updates in real-time
- [ ] Check error handling if no selection exists

#### Workflow 2: Filter Features by Criteria
- [ ] Ask Copilot: "Show me all features within the current viewport that occurred between 10:00 and 12:00"
- [ ] Verify Copilot:
  1. Calls `debrief_get_viewport` to get bounds
  2. Calls `debrief_get_time` to understand time context
  3. Calls `debrief_list_features` with appropriate filters
  4. Returns filtered results
- [ ] Validate results are correct

#### Workflow 3: Update Selection Programmatically
- [ ] Ask Copilot: "Select all features of type 'Track' in the northern hemisphere"
- [ ] Verify Copilot:
  1. Calls `debrief_list_features` with type filter
  2. Filters by latitude > 0
  3. Calls `debrief_set_selection` with filtered IDs
- [ ] Validate map shows correct selection

#### Workflow 4: Time and Viewport Coordination
- [ ] Ask Copilot: "Set the time to 2025-10-05T12:00:00Z and zoom to show all features at that time"
- [ ] Verify Copilot:
  1. Calls `debrief_set_time` with specified time
  2. Calls `debrief_list_features` to get features at that time
  3. Calls `debrief_zoom_to_selection` or calculates viewport bounds
  4. Calls `debrief_set_viewport` with calculated bounds
- [ ] Validate end-to-end execution time <5s

---

### Task 4: Validate Error Message Display

#### Scenario 1: Invalid Time State
- [ ] Ask Copilot: "Set time to 2025-13-45T12:00:00Z" (invalid date)
- [ ] Verify error message displays in chat panel
- [ ] Check error message includes validation details from Phase 2 validators
- [ ] Example: "TimeState.current is not a valid ISO 8601 date-time: 2025-13-45T12:00:00Z"

#### Scenario 2: Invalid Viewport Bounds
- [ ] Ask Copilot: "Set viewport to show latitude 95 degrees north" (out of range)
- [ ] Verify error message is clear and actionable
- [ ] Example: "ViewportState.bounds[3] (north) must be between -90 and 90 degrees, got 95"

#### Scenario 3: WebSocket Disconnected
- [ ] Manually stop WebSocket bridge
- [ ] Ask Copilot to perform any operation
- [ ] Verify error message is user-friendly
- [ ] Example: "Could not connect to plot. Is a .plot.json file open?"

#### Scenario 4: Multiple Plots Without Filename
- [ ] Open 2+ .plot.json files
- [ ] Ask Copilot: "What is the current time?" (without specifying filename)
- [ ] Verify error lists available plots
- [ ] Example: "Multiple plot files are open. Please specify which file to use: plot1.plot.json, plot2.plot.json"

---

### Task 5: Confirm Real-Time Map Updates
- [ ] Ask Copilot to add a new feature
- [ ] Verify feature appears on map immediately
- [ ] Ask Copilot to update feature properties
- [ ] Verify map reflects changes without refresh
- [ ] Ask Copilot to delete a feature
- [ ] Verify feature disappears from map
- [ ] Test time slider updates via Copilot
- [ ] Test viewport changes via Copilot

**Performance Target**: Map updates within 100ms of operation completion

---

### Task 6: Test Multiple Concurrent Operations
- [ ] Ask Copilot to perform multiple operations in quick succession
- [ ] Example: "Delete feature A, add feature B, and zoom to the selection"
- [ ] Verify operations execute in correct order
- [ ] Check for race conditions or state inconsistencies
- [ ] Validate no performance degradation

**Concurrency Scenarios**:
- Sequential operations (one after another)
- Batch operations (multiple features at once)
- Interleaved UI and Copilot operations

---

### Task 7: Verify Performance (<5s End-to-End Workflows)

#### Benchmark Workflows:
1. **Get-Process-Update Workflow**
   - Get current viewport
   - Filter features by bounds
   - Update selection
   - **Target**: <3s total

2. **Multi-Step Analysis Workflow**
   - Get time state
   - Get viewport
   - List features in viewport at current time
   - Calculate statistics
   - Set selection based on criteria
   - **Target**: <5s total

3. **Batch Update Workflow**
   - List all features of type X
   - Update properties for all
   - Zoom to show all
   - **Target**: <4s total

**Measurement Method**:
- Use Chrome DevTools timeline
- Measure from Copilot request to final map update
- Record p95 latency across 10 runs

---

### Task 8: Document GitHub Copilot Usage Patterns

#### Documentation to Create:
- [ ] **User Guide**: "Using GitHub Copilot with Debrief"
  - How to start servers
  - Example prompts for common tasks
  - Troubleshooting common errors

- [ ] **LLM Integration Guide**: For other AI assistants
  - Tool descriptions and schemas
  - Multi-step workflow patterns
  - Error handling best practices

- [ ] **Example Prompts**: Collection of effective prompts
  - Time manipulation
  - Viewport control
  - Feature filtering
  - Selection management

---

## 🧪 Test Scenarios (Detailed)

### Scenario 1: Delete Selected Feature Workflow
```
User: "Delete the currently selected feature"

Expected Copilot Actions:
1. Call debrief_get_selection()
2. If selection exists:
   - Call debrief_delete_feature({ featureId })
   - Respond: "Deleted feature [ID]"
3. If no selection:
   - Respond: "No feature is currently selected"

Expected Errors to Handle:
- No selection: Clear message to user
- WebSocket error: Retry and inform user if fails
- Feature not found: Explain feature may have been deleted
```

### Scenario 2: Filter Features by Criteria Workflow
```
User: "Show me all features within the current viewport that occurred between 10:00 and 12:00"

Expected Copilot Actions:
1. Call debrief_get_viewport()
2. Call debrief_get_time() (to understand time context/range)
3. Call debrief_list_features() with filters:
   - bounds: from step 1
   - timeRange: [10:00, 12:00]
4. Display filtered features to user

Validation:
- Verify bounds filter is applied correctly
- Verify time range filter is applied correctly
- Check feature count is accurate
```

### Scenario 3: Update Selection Programmatically Workflow
```
User: "Select all features of type 'Track' in the northern hemisphere"

Expected Copilot Actions:
1. Call debrief_list_features()
2. Client-side filter:
   - type === 'Track'
   - latitude > 0 (northern hemisphere)
3. Extract feature IDs
4. Call debrief_set_selection({ featureIds: [...] })
5. Respond: "Selected [N] Track features in the northern hemisphere"

Validation:
- All tracks in northern hemisphere are selected
- No other features are selected
- Map shows correct selection visually
```

### Scenario 4: Multi-Plot Workflows with Filename Specification
```
Context: 2 plot files open: "atlantic.plot.json", "pacific.plot.json"

User: "What is the current time in the Atlantic plot?"

Expected Copilot Actions:
1. Call debrief_list_plots() to see available plots
2. Identify "atlantic.plot.json" from user query
3. Call debrief_get_time({ filename: "atlantic.plot.json" })
4. Respond with time information

Alternative (Error Case):
User: "What is the current time?" (ambiguous)

Expected Copilot Actions:
1. Call debrief_get_time() without filename
2. Receive MultiplePlotsError
3. Call debrief_list_plots() to show options
4. Ask user: "Multiple plots are open. Which one? atlantic.plot.json or pacific.plot.json?"
```

### Scenario 5: Error Handling (Service Unavailable)
```
Context: Tool Vault server is down

User: "Add a new track feature at 50°N, 10°W"

Expected Copilot Actions:
1. Call debrief_add_feature({ type: 'Track', coordinates: [...] })
2. Receive ToolVaultError (503)
3. Retry after 1s (Phase 1 retry logic)
4. Retry after 2s
5. Retry after 4s
6. After 3 failures, respond to user:
   "Tool Vault service is currently unavailable. Please try again in a few moments."

Validation:
- User sees friendly error message
- No technical jargon or stack traces
- Retry logic executes correctly
```

### Scenario 6: Error Handling (Invalid Parameters)
```
User: "Set the viewport to show Antarctica" (vague request)

Copilot (might attempt):
1. Call debrief_set_viewport({ bounds: [-180, -90, 180, -60] })

If Copilot provides invalid bounds:
- Example: { bounds: [-180, -95, 180, -60] } (south = -95, out of range)
- Receive InvalidParameterError with message:
  "ViewportState.bounds[1] (south) must be between -90 and 90 degrees, got -95"
- Copilot should correct and retry:
  debrief_set_viewport({ bounds: [-180, -90, 180, -60] })
```

---

## 🏗️ Test Environment Setup

### Prerequisites:
1. VS Code with GitHub Copilot extension installed
2. At least one .plot.json file open
3. Debrief State Server and Tool Vault Server running
4. Phase 1-4 implementations complete

### Test Data:
- Create sample .plot.json files with:
  - Mix of feature types (Track, Point, Annotation)
  - Features across different hemispheres
  - Features across different time ranges
  - Various coordinate ranges

---

## 📊 Performance Validation

### Metrics to Collect:
1. **Server Startup Time**
   - Time from workspace open to server ready: <5s

2. **Tool Discovery Time**
   - Time for Copilot to list all tools: <3s

3. **Single Operation Latency**
   - Get operations: <200ms p95
   - Set operations: <500ms p95

4. **Multi-Step Workflow Latency**
   - 2-step workflow: <2s p95
   - 3-step workflow: <3s p95
   - 5-step workflow: <5s p95

5. **Concurrent Operation Handling**
   - 5 simultaneous operations: <5s total
   - No failures or race conditions

6. **Error Recovery Time**
   - Time to detect and retry failed operation: <3s
   - Time to display error to user: <1s

---

## ✅ Acceptance Criteria

### Functional:
- ✅ All MCP tools discoverable by GitHub Copilot
- ✅ Multi-step workflows execute correctly
- ✅ Error messages are clear and actionable
- ✅ Map updates reflect all operations in real-time
- ✅ Multi-plot scenarios work with filename parameter
- ✅ Concurrent operations don't cause race conditions

### Performance:
- ✅ Server startup <5s
- ✅ Tool discovery <3s
- ✅ Single operations meet p95 targets
- ✅ Multi-step workflows <5s p95
- ✅ Error recovery <3s

### User Experience:
- ✅ Error messages help user correct issues
- ✅ No technical jargon in user-facing errors
- ✅ Copilot can retry after receiving error guidance
- ✅ Multi-plot disambiguation is clear

---

## 📤 Deliverables

At the end of this phase, you should have:

1. ✅ **Integration Test Results**
   - All test scenarios executed and documented
   - Pass/fail status for each scenario
   - Screenshots of Copilot interactions

2. ✅ **Usage Documentation**
   - User guide for GitHub Copilot integration
   - LLM integration guide
   - Example prompts collection

3. ✅ **Performance Validation Report**
   - Metrics for all performance targets
   - Comparison to baseline targets
   - Bottleneck analysis if targets not met

4. ✅ **Handoff Document** (`handoffs/phase-5.md`)
   - Test results summary
   - Issues discovered and resolutions
   - Recommendations for Phase 6 documentation

---

## 🔄 Handoff to Phase 6

After completing this phase, document the following in your handoff:

### For Documentation Team (Phase 6):
- Test scenarios that worked well (include as examples)
- Error messages that need better documentation
- Common user questions or confusion points
- GitHub Copilot-specific tips and tricks

### Key Findings to Document:
- Most effective prompt patterns
- Common error scenarios and solutions
- Performance characteristics observed
- Any GitHub Copilot quirks or workarounds

### Integration Examples:
- Provide annotated screenshots of successful interactions
- Include sample conversation flows
- Document multi-step workflow patterns

---

## ❓ Questions to Answer in Handoff

1. Do all MCP tools work reliably with GitHub Copilot?
2. Are error messages helping users and LLMs correct mistakes?
3. Are performance targets met for all workflows?
4. What are the most common user errors or confusion points?
5. Are there any GitHub Copilot-specific limitations discovered?
6. What documentation would most help end users?

---

## 🚦 Ready to Start?

Before you begin:

1. ✅ Read `context.yaml` for shared context
2. ✅ Review Phase 1-4 handoff documents
3. ✅ Ensure all Phase 1-4 deliverables are complete
4. ✅ Install GitHub Copilot extension
5. ✅ Prepare test .plot.json files
6. ✅ Verify servers start automatically

---

**Good luck, frontend-developer! 🚀**

**Remember**: The goal is validating user experience, not just technical functionality. Focus on how well GitHub Copilot can help users accomplish maritime analysis tasks.
