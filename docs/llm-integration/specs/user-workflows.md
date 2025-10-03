# User Workflows

**Back to**: [Main Index](../README.md) | **Related**: [Integration Patterns](integration-patterns.md)

---

## Delete Selected Feature

**Objective**: Delete a selected maritime feature using LLM automation.

### Steps

1. **Retrieve**: Get first selected feature ID from State Server
2. **Process**: Pass feature ID to Tool Vault's `delete-features` tool
3. **Apply**: Pass DebriefCommand result to State Server

### LLM Orchestration

```typescript
// Step 1: Get selection
const selection = await callTool('debrief_get_selection', {});
const selectedIds = selection.selectedIds;

if (selectedIds.length === 0) {
  return { error: "No features selected" };
}

const featureId = selectedIds[0];

// Step 2: Delete feature via Tool Vault
const deleteResult = await callBash(
  `python toolvault.pyz call-tool delete_features '{"ids": ["${featureId}"]}'`
);

// Step 3: Apply DebriefCommand to State Server
if (deleteResult.command === 'setFeatureCollection') {
  await callTool('debrief_apply_command', {
    command: deleteResult
  });
}

return { success: true, deletedId: featureId };
```

---

## Test Scenarios

### Scenario 1: Happy Path (Single Feature Selected)

**Setup**:
- Open plot file: `workspace/sample.plot.json`
- Select feature: "HMS Illustrious"

**Expected Behavior**:
1. LLM retrieves selection: ["feature1"]
2. LLM calls Tool Vault delete tool
3. Tool Vault returns updated feature collection
4. LLM updates plot editor state
5. Map re-renders without deleted feature

**Validation**:
- ✅ Feature removed from feature collection
- ✅ Map no longer displays feature
- ✅ Outline view updates
- ✅ LLM confirms deletion

---

### Scenario 2: No Selection

**Setup**:
- Open plot file: `workspace/sample.plot.json`
- No features selected

**Expected Behavior**:
1. LLM retrieves selection: []
2. LLM detects empty selection
3. LLM responds: "No features selected. Please select a feature to delete."

**Validation**:
- ✅ LLM provides clear error message
- ✅ No state changes occur
- ✅ No errors logged

---

### Scenario 3: Multiple Features Selected

**Setup**:
- Open plot file: `workspace/sample.plot.json`
- Select features: ["feature1", "feature2"]

**Expected Behavior**:
1. LLM retrieves selection: ["feature1", "feature2"]
2. LLM confirms deletion: "Delete 2 features?"
3. User confirms
4. LLM deletes all selected features

**Validation**:
- ✅ All selected features removed
- ✅ Map updates correctly
- ✅ LLM confirms count

---

### Scenario 4: Multiple Plots Open

**Setup**:
- Open plots: `mission1.plot.json`, `mission2.plot.json`
- Select feature in `mission1.plot.json`

**Expected Behavior**:
1. LLM calls `debrief_get_selection({})` (no filename)
2. State Server returns MULTIPLE_PLOTS error with list
3. LLM prompts user: "Multiple plots open: mission1, mission2. Which plot?"
4. User selects `mission1.plot.json`
5. LLM retries with filename parameter
6. Workflow completes successfully

**Validation**:
- ✅ LLM handles MULTIPLE_PLOTS error gracefully
- ✅ User prompted for clarification
- ✅ Correct plot updated

---

**Back to**: [Main Index](../README.md)
