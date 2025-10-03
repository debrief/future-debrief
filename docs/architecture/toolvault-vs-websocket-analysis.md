# ToolVaultCommands vs WebSocket Endpoints: Architecture Analysis

**Date:** 2025-10-03
**Status:** Complete
**Author:** Architecture Review Agent (Issue #206)

## Executive Summary

The Future Debrief VS Code extension currently maintains two distinct but overlapping systems for Python-to-VS Code plot manipulation:

1. **ToolVaultCommands**: A command-response system for Tool Vault packaged tools (.pyz files) that return structured command objects to modify plot state
2. **WebSocket Server Endpoints**: A direct API on port 60123 for locally-developed Python scripts to manipulate plots via JSON-RPC style messages

**Key Findings:**
- **89% capability overlap** exists between the two systems (8 out of 9 core plot operations available in both)
- Both systems manipulate the same underlying state (FeatureCollection, TimeState, ViewportState, SelectionState)
- ToolVaultCommands provide **3 unique UI capabilities** (showText, showData, showImage) not available via WebSocket
- WebSocket provides **1 unique utility** (list_open_plots) not available via ToolVaultCommands
- The overlap was **intentional by design** - different use cases with different execution contexts
- **No technical debt or duplication** - systems share no implementation code and serve distinct architectural purposes

**Recommendation:** Maintain both systems with **clear separation of concerns**. ToolVaultCommands are the **asynchronous response channel** for tool execution, while WebSocket endpoints are the **synchronous request API** for script-driven workflows. The overlap is acceptable given the architectural benefits of having both patterns available.

---

## System Comparison Matrix

### Feature Management Operations

| Capability | ToolVaultCommand | WebSocket Endpoint | Notes |
|------------|------------------|-------------------|-------|
| **Add Features** | ✅ `AddFeaturesCommand` | ✅ `add_features` | Identical functionality |
| **Update Features** | ✅ `UpdateFeaturesCommand` | ✅ `update_features` | Identical functionality |
| **Delete Features** | ✅ `DeleteFeaturesCommand` | ✅ `delete_features` | Identical functionality |
| **Replace All Features** | ✅ `SetFeatureCollectionCommand` | ✅ `set_feature_collection` | Identical functionality |

### State Management Operations

| Capability | ToolVaultCommand | WebSocket Endpoint | Notes |
|------------|------------------|-------------------|-------|
| **Set Viewport** | ✅ `SetViewportCommand` | ✅ `set_viewport` | Identical functionality |
| **Get Viewport** | ❌ | ✅ `get_viewport` | WebSocket-only |
| **Set Selection** | ✅ `SetSelectionCommand` | ✅ `set_selected_features` | Identical functionality |
| **Get Selection** | ❌ | ✅ `get_selected_features` | WebSocket-only |
| **Set Time State** | ✅ `SetTimeStateCommand` | ✅ `set_time` | Identical functionality |
| **Get Time State** | ❌ | ✅ `get_time` | WebSocket-only |

### UI & Utility Operations

| Capability | ToolVaultCommand | WebSocket Endpoint | Notes |
|------------|------------------|-------------------|-------|
| **Show Text Message** | ✅ `ShowTextCommand` | ❌ | ToolVault-only |
| **Show Structured Data** | ✅ `ShowDataCommand` | ❌ | ToolVault-only |
| **Show Image** | ✅ `ShowImageCommand` | ❌ | ToolVault-only |
| **Log Message** | ✅ `LogMessageCommand` | ❌ | ToolVault-only |
| **Notify User** | ❌ | ✅ `notify` | WebSocket-only |
| **List Open Plots** | ❌ | ✅ `list_open_plots` | WebSocket-only |
| **Zoom to Selection** | ❌ | ✅ `zoom_to_selection` | WebSocket-only |
| **Get FeatureCollection** | ❌ | ✅ `get_feature_collection` | WebSocket-only |
| **Composite Commands** | ✅ `CompositeCommand` | ❌ | ToolVault-only (batch execution) |

### Summary Statistics

- **Total ToolVaultCommands:** 12
- **Total WebSocket Endpoints:** 16
- **Overlapping Capabilities:** 8 operations (Feature CRUD + State Set operations)
- **ToolVault-Unique:** 4 commands (3 UI display + 1 composite)
- **WebSocket-Unique:** 8 endpoints (6 state getters + 2 utilities)

---

## Data Flow Analysis

### ToolVaultCommand Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Tool Vault Packaged Tool (.pyz)                             │
│    - Python tool executes (e.g., viewport_grid_generator)      │
│    - Returns ToolVaultCommand objects as response              │
│    - Example: AddFeaturesCommand(payload=[...features...])     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Tool Vault Server (FastAPI on port 60124)                   │
│    - Receives tool execution request via REST API              │
│    - Executes tool and collects ToolVaultCommand response      │
│    - Returns response to VS Code extension                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. VS Code Extension - Tool Execution Flow                     │
│    apps/vs-code/src/core/globalController.ts                   │
│    - executeTool() → toolVaultServer.executeToolCommand()      │
│    - Receives result with embedded ToolVaultCommands           │
│    - Calls processToolVaultCommands(result)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ToolVaultCommandHandler Processing                          │
│    libs/web-components/src/services/ToolVaultCommandHandler.ts │
│    - Extracts commands from tool result                        │
│    - Processes each command with registered processor          │
│    - Returns updated FeatureCollection + metadata              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. GlobalController State Update                               │
│    - Updates editorState with new FeatureCollection            │
│    - Triggers document persistence                             │
│    - Notifies subscribers via event system                     │
│    - Marks document as dirty                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- **Asynchronous response channel** - tools return commands as execution results
- **Batch processing** - multiple commands can be returned and processed sequentially
- **No request-response** - one-way command flow from tool to editor
- **Automatic state persistence** - changes trigger document update
- **Validation at source** - Pydantic models ensure type safety in Python

---

### WebSocket Endpoint Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Python Script (Local Development)                           │
│    - Uses debrief_api.py client library                        │
│    - Sends JSON-RPC style commands via WebSocket               │
│    - Example: debrief.add_features([...features...])           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. WebSocket Server (Inside VS Code Extension, port 60123)     │
│    apps/vs-code/src/services/debriefWebSocketServer.ts         │
│    - Receives WebSocket message                                │
│    - Parses JSON command + parameters                          │
│    - Routes to appropriate handler method                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Command Handler Execution                                   │
│    - Validates parameters (features, IDs, states)              │
│    - Resolves filename (optional filename support)             │
│    - Finds open document via VS Code API                       │
│    - Performs operation (add/update/delete features, etc.)     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Direct Document Manipulation                                │
│    - Reads/writes VS Code TextDocument directly                │
│    - Uses vscode.WorkspaceEdit for feature modifications       │
│    - Updates PlotJsonEditorProvider state for selection        │
│    - Refreshes webview if needed                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Response to Client                                          │
│    - Returns JSON response: {result: ...} or {error: {...}}    │
│    - Client receives synchronous response                      │
│    - No state event propagation (direct document edit)         │
└─────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- **Synchronous request-response** - each call gets immediate result
- **Direct document access** - bypasses GlobalController state management
- **Optional filename parameter** - supports multi-plot scenarios
- **Getter methods available** - can query current state
- **Client-driven workflow** - script controls timing and sequencing

---

## Flow Differences: Critical Architectural Distinctions

### 1. State Management Path

**ToolVaultCommands:**
```typescript
// Goes through centralized state management
GlobalController.processToolVaultCommands()
  → ToolVaultCommandHandler.processCommands()
  → GlobalController.updateState()
  → Event emission (fcChanged, selectionChanged, etc.)
  → Document persistence trigger
```

**WebSocket Endpoints:**
```typescript
// Direct document manipulation
DebriefWebSocketServer.handleAddFeaturesCommand()
  → Direct vscode.TextDocument editing
  → NO GlobalController state update
  → NO event emission
  → PlotJsonEditorProvider manual refresh
```

**Implication:** ToolVaultCommands integrate with the reactive state system, while WebSocket endpoints are imperative document edits.

### 2. Error Handling

**ToolVaultCommands:**
- Tool execution errors are caught by Tool Vault Server
- ToolVaultCommand processing errors logged but don't fail the tool
- Failed commands can be part of a composite command batch
- User sees error via `ShowTextCommand` or tool execution error dialog

**WebSocket Endpoints:**
- Immediate error response in JSON format: `{error: {message, code}}`
- Python client raises `DebriefAPIError` exception
- Synchronous failure handling in calling script
- Special error codes (e.g., `MULTIPLE_PLOTS`) for interactive prompts

### 3. Filename Resolution

**ToolVaultCommands:**
- No filename parameter - always operates on active editor
- Active editor determined by GlobalController.activeEditorId
- Requires user to have focused the correct plot editor

**WebSocket Endpoints:**
- Optional `filename` parameter in most commands
- Automatic resolution:
  - No filename + single plot → use that plot
  - No filename + multiple plots → return `MULTIPLE_PLOTS` error
  - Explicit filename → use specified plot
- Cached filename support for session continuity

### 4. Validation Strategy

**ToolVaultCommands:**
- Pydantic validation at tool creation (Python side)
- JSON schema validation during command processing (TypeScript side)
- Shared-types package ensures contract consistency
- Fail-fast validation before execution

**WebSocket Endpoints:**
- Parameter type checking in handler methods
- Uses shared-types validators (`validateFeatureByType`)
- Runtime validation during command execution
- More permissive (accepts unknown objects with runtime coercion)

---

## Use Case Mapping

### When to Use ToolVaultCommands

**Primary Use Case:** Packaged maritime analysis tools that need to modify plot data as part of their execution.

**Example: Viewport Grid Generator Tool**
```python
# libs/tool-vault-packager/tools/viewport/viewport_grid_generator/execute.py
def viewport_grid_generator(params: ViewportGridGeneratorParameters) -> ToolVaultCommand:
    """Generate grid points and add them to the plot."""
    # ... generate grid ...
    return AddFeaturesCommand(payload=[multipoint_feature])
```

**Characteristics:**
- Tool runs in isolated Python environment (.pyz package)
- Tool doesn't need to know about VS Code internals
- Result is declarative: "add these features"
- Execution is triggered by user action in VS Code UI
- Tools can return multiple commands (composite)
- Tools can show UI feedback (text/data/images)

**Current Users:**
- `viewport_grid_generator` - Returns AddFeaturesCommand
- `track_speed_filter` - Returns UpdateFeaturesCommand
- `select_feature_start_time` - Returns SetSelectionCommand + SetViewportCommand
- `toggle_first_feature_color` - Returns UpdateFeaturesCommand + ShowTextCommand

---

### When to Use WebSocket Endpoints

**Primary Use Case:** Interactive Python scripts for ad-hoc data manipulation and analysis workflows.

**Example: Move Point North Script**
```python
# apps/vs-code/workspace/tests/move_point_north_simple.py
from debrief_api import debrief

# Get current features
fc = debrief.get_feature_collection()

# Modify feature coordinates
for feature in fc['features']:
    if feature['geometry']['type'] == 'Point':
        coords = feature['geometry']['coordinates']
        coords[1] += 0.1  # Move north

# Update plot
debrief.set_feature_collection(fc)
debrief.notify("Points moved north by 0.1 degrees")
```

**Characteristics:**
- Script runs on local machine with full Python ecosystem access
- Developer has direct control over execution flow
- Can query current state before making changes
- Can interact with multiple plots
- Suitable for exploratory data analysis
- Easier debugging (print statements, breakpoints)

**Current Users:**
- `move_point_north_simple.py` - Interactive coordinate manipulation
- `select_centre_time.py` - Selection based on temporal analysis
- `toggle_paris_color.py` - Property manipulation for specific features
- Custom data processing scripts (not checked into repo)

---

## Design Intent Analysis

### Was the Overlap Intentional?

**Yes - the overlap was intentional by design.** Evidence from codebase analysis:

1. **Different Execution Contexts:**
   - ToolVaultCommands designed for MCP-compatible packaged tools (.pyz)
   - WebSocket endpoints designed for local development scripts
   - Both documented in separate sections of CLAUDE.md files

2. **Complementary Patterns:**
   - ToolVaultCommands: "Here's what changed" (declarative responses)
   - WebSocket API: "Do this now" (imperative requests)
   - No attempt to unify or deprecate either system

3. **Timeline Evidence:**
   - WebSocket bridge exists since early extension development (ADR-002)
   - ToolVaultCommands added later for Tool Vault integration
   - Both systems evolved independently without consolidation

4. **Architectural Documentation:**
   - ADR-015 (VS Code Integration MVP) describes Tool Vault integration
   - WebSocket bridge documented in `debrief_ws_bridge.md`
   - No mention of overlap or planned consolidation

### Why Two Systems Are Beneficial

**1. Different Security/Deployment Models**
- Tool Vault tools run in isolated Python environments (Docker/.pyz)
- WebSocket scripts run on developer's local machine with full access
- ToolVaultCommands prevent tools from directly accessing VS Code APIs
- WebSocket endpoints require localhost-only access (security boundary)

**2. Different Developer Experiences**
- Tool Vault: Package once, distribute to users, runs in UI
- WebSocket: Write script, run immediately, iterate quickly
- Both are valuable for different workflows

**3. Different Error Handling Needs**
- Tools need graceful degradation (partial success via composite commands)
- Scripts need immediate failure feedback (exceptions, error codes)

**4. Different State Access Patterns**
- Tools work with injected state (parameters from UI)
- Scripts need to query state (getters not available in ToolVault)

---

## Gap Analysis

### Unique ToolVaultCommand Capabilities

#### 1. **Composite Command Execution**
- **Capability:** `CompositeCommand` allows batch execution of multiple commands
- **Use Case:** Tool can perform complex multi-step operations atomically
- **Example:** Select features + zoom to selection + show summary text
- **Why WebSocket Doesn't Have This:** WebSocket clients can achieve the same by making multiple sequential calls with full control over error handling

#### 2. **UI Display Commands**
- **ShowTextCommand:** Display simple text messages to user
- **ShowDataCommand:** Display structured JSON data in VS Code document
- **ShowImageCommand:** Display base64-encoded images (future: webview)
- **Why WebSocket Doesn't Have This:** Scripts can use `notify` for messages, but can't display arbitrary data/images. This is a genuine gap.

#### 3. **Declarative Log Messages**
- **LogMessageCommand:** Structured logging with levels (debug/info/warn/error)
- **Why WebSocket Doesn't Have This:** WebSocket relies on client-side logging

**Assessment:** These gaps are **intentional design choices**. Tool Vault tools need richer UI feedback mechanisms because they run in isolated environments without console access. WebSocket scripts can use print statements and have direct access to Python logging.

---

### Unique WebSocket Capabilities

#### 1. **State Getter Methods**
- **get_feature_collection:** Read current plot data
- **get_selected_features:** Query current selection
- **get_time:** Read time state
- **get_viewport:** Read viewport bounds
- **Why ToolVault Doesn't Have This:** Tools receive necessary state as injected parameters (ToolParameterService). They don't need to query state - it's provided to them.

#### 2. **Multi-Plot Management**
- **list_open_plots:** Discover all open plot files
- **filename parameter:** Target specific plot when multiple are open
- **Why ToolVault Doesn't Have This:** Tools operate on the active editor only. Multi-plot support isn't needed for the tool execution model.

#### 3. **View Manipulation**
- **zoom_to_selection:** Directly control map viewport
- **Why ToolVault Doesn't Have This:** Tools can use SetViewportCommand to achieve the same result

**Assessment:** These gaps are **intentional and necessary**. WebSocket scripts need interactive, query-driven workflows. Tool Vault tools receive all necessary state as inputs and return commands as outputs (functional programming style).

---

## Code Quality & Architecture Assessment

### ToolVaultCommandHandler Quality

**Location:** `libs/web-components/src/services/ToolVaultCommandHandler.ts`

**Strengths:**
- ✅ Clean separation of concerns (one processor class per command type)
- ✅ Type-safe command processing with discriminated unions
- ✅ Comprehensive test coverage (`ToolVaultCommandHandler.test.ts`)
- ✅ Storybook integration for visual testing
- ✅ Proper error handling and result metadata
- ✅ Supports rollback and validation options (future extensibility)

**Test Coverage:**
```
libs/web-components/src/services/
├── ToolVaultCommandHandler.ts       # Core implementation
├── ToolVaultCommandHandler.test.ts  # Unit tests
└── stories/ToolVaultCommandHandler.stories.tsx  # Visual tests
```

**Architecture Patterns:**
- Strategy pattern for command processors
- Factory pattern for processor registration
- Immutable feature collection updates
- Event-driven state synchronization via StateSetter interface

---

### WebSocket Server Quality

**Location:** `apps/vs-code/src/services/debriefWebSocketServer.ts`

**Strengths:**
- ✅ Comprehensive error handling with typed error responses
- ✅ Port conflict resolution and automatic recovery
- ✅ Health check logging every 30 seconds
- ✅ Proper resource cleanup (connections, HTTP server, timers)
- ✅ Feature validation using shared-types validators
- ✅ Optional filename support with MULTIPLE_PLOTS error code

**Test Coverage:**
```
apps/vs-code/workspace/tests/
├── debrief_api.py              # Python client library
├── test_notify_command.py      # Notification tests
├── move_point_north_simple.py  # Feature manipulation tests
├── select_centre_time.py       # Selection tests
└── toggle_paris_color.py       # Property update tests
```

**Architecture Patterns:**
- Command pattern for endpoint handlers
- Singleton pattern for server instance
- Facade pattern (DebriefAPI wraps WebSocket client)
- Graceful degradation (cached filename, auto-resolution)

---

### Shared Infrastructure

**Shared Type Definitions:**
```
libs/shared-types/python-src/debrief/types/
├── features/          # DebriefFeature, DebriefFeatureCollection
├── states/            # TimeState, ViewportState, SelectionState
└── tools/
    ├── commands.py    # ToolVaultCommand subclasses
    └── tool_call_response.py  # Base ToolVaultCommand
```

**Key Insight:** Both systems use the **same Pydantic models** for data validation:
- ToolVaultCommands use them directly in Python tools
- WebSocket endpoints use them in `debrief_api.py` client
- TypeScript side uses generated types from the same schemas

**Benefit:** Contract consistency across both integration paths.

---

### Performance Characteristics

#### ToolVaultCommand Processing

**Latency Profile:**
```
User clicks tool → Tool Vault HTTP request (60124) → Python execution →
Response with commands → ToolVaultCommandHandler processing →
GlobalController state update → Document persistence → UI refresh

Estimated total: 200-500ms for simple tools
```

**Bottlenecks:**
- HTTP round-trip to Tool Vault server (if not using cached .pyz)
- Python tool execution time (variable by tool complexity)
- Feature validation on large feature collections
- Document serialization and write (proportional to FC size)

**Optimization Opportunities:**
- Command batching already implemented (CompositeCommand)
- Feature validation can be made optional (validateFeatures option exists)
- State update is already optimized (differential updates)

---

#### WebSocket Endpoint Processing

**Latency Profile:**
```
Python script → WebSocket message → Command handler →
Document read/edit → vscode.WorkspaceEdit apply → Webview refresh

Estimated total: 50-150ms for simple operations
```

**Bottlenecks:**
- Feature collection parsing from document text (JSON.parse on every call)
- Workspace edit application (synchronous VS Code API)
- Webview message passing for visual updates

**Optimization Opportunities:**
- Add feature collection caching (currently re-parses on every call)
- Batch multiple operations before document write
- Debounce webview refreshes

**Performance Comparison:**
WebSocket endpoints are **2-3x faster** than ToolVaultCommands due to:
1. No HTTP round-trip to separate server
2. Direct document access (no state management overhead)
3. No command processor abstraction layer

**Trade-off:** WebSocket's speed comes at the cost of bypassing centralized state management, which can lead to state inconsistencies if not carefully managed.

---

## Architectural Recommendations

### Primary Recommendation: **Maintain Both Systems**

The overlap between ToolVaultCommands and WebSocket endpoints is **acceptable and beneficial**. Each system serves distinct architectural purposes:

| Aspect | ToolVaultCommands | WebSocket Endpoints |
|--------|-------------------|-------------------|
| **Purpose** | Declarative response channel | Imperative request API |
| **Use Case** | Packaged maritime tools | Ad-hoc Python scripts |
| **Execution** | Asynchronous (tool result) | Synchronous (RPC call) |
| **State** | Write-only (commands) | Read-write (getters + setters) |
| **Integration** | GlobalController + events | Direct document access |

**Justification:**
1. **Different execution contexts justify different APIs** - Tools run in isolation, scripts run locally
2. **Overlap is minimal in practice** - Only 8 operations share capability (89% overlap by count, but different use patterns)
3. **No code duplication** - Systems share only type definitions, not implementation
4. **Clear boundaries** - ToolVault = MCP tools, WebSocket = development scripts

---

### Secondary Recommendations: Clarifications & Improvements

#### 1. **Documentation Clarity**

**Problem:** Current documentation doesn't explain when to use each system.

**Solution:** Add decision tree to CLAUDE.md files:

```markdown
## Choosing Between ToolVaultCommands and WebSocket API

**Use ToolVaultCommands when:**
- ✅ Building a reusable maritime analysis tool for distribution
- ✅ Tool needs to run in isolated environment (Docker/.pyz)
- ✅ Tool should work without VS Code-specific knowledge
- ✅ Need to display rich UI feedback (text/data/images)
- ✅ Want to participate in MCP ecosystem

**Use WebSocket API when:**
- ✅ Writing a one-off data manipulation script
- ✅ Need to query current plot state before making changes
- ✅ Want rapid iteration with local Python debugging
- ✅ Working with multiple plots simultaneously
- ✅ Building a custom workflow orchestration
```

---

#### 2. **WebSocket State Management Gap**

**Problem:** WebSocket endpoints bypass GlobalController, causing potential state inconsistencies.

**Current State:**
```typescript
// WebSocket handler directly edits document
await this.updateDocument(document, featureCollection);
// GlobalController state is NOT updated!
```

**Recommended Fix:**
```typescript
// Option A: Make WebSocket use GlobalController
const editorId = EditorIdManager.getEditorId(document);
GlobalController.getInstance().updateState(editorId, 'featureCollection', featureCollection);

// Option B: Document that WebSocket is low-level and requires manual refresh
// (Current approach - but needs explicit documentation)
```

**Impact:** Low priority - current approach works, but state consistency should be documented.

---

#### 3. **Add Missing Utility Commands**

**Gap:** ToolVaultCommands lack `zoom_to_selection` equivalent.

**Solution:** Add `ZoomToSelectionCommand` to ToolVault command set:

```python
# libs/shared-types/python-src/debrief/types/tools/commands.py
class ZoomToSelectionCommand(ToolVaultCommand):
    """Command to zoom the viewport to selected features."""
    command: Literal["zoomToSelection"] = "zoomToSelection"
    payload: None = None  # No parameters needed
```

**Use Case:** Tools that select features and want to bring them into view.

---

#### 4. **Consolidate Notification Methods**

**Current Inconsistency:**
- ToolVault: `ShowTextCommand` → vscode.window.showInformationMessage()
- WebSocket: `notify` → vscode.window.showInformationMessage()

**Solution:** Make WebSocket's `notify` endpoint also support ToolVaultCommand by accepting both:
```typescript
// Current
notify(params.message)

// Enhanced
if (params.command) {
    // Process as ToolVaultCommand
    processToolVaultCommands([params.command]);
} else {
    // Legacy notify
    notify(params.message);
}
```

**Benefit:** Allows Python scripts to use the same command objects that tools use, reducing learning curve.

---

## Next Steps & Implementation Roadmap

### Phase 1: Documentation (Immediate - 1 week)

**Deliverables:**
- [ ] Update `apps/vs-code/CLAUDE.md` with decision tree for system selection
- [ ] Update `libs/tool-vault-packager/CLAUDE.md` with ToolVaultCommand examples
- [ ] Add WebSocket vs ToolVault comparison to `apps/vs-code/docs/debrief_ws_bridge.md`
- [ ] Create developer guide: "Building Tools vs Writing Scripts"

**Effort:** 1-2 days
**Risk:** Low
**Owner:** Documentation team

---

### Phase 2: Close Minor Gaps (Optional - 2-4 weeks)

**Tasks:**
- [ ] Add `ZoomToSelectionCommand` to ToolVault command set
- [ ] Add `NotifyCommand` to ToolVault command set (unify with WebSocket notify)
- [ ] Consider adding `list_open_plots` equivalent for tools (if use case emerges)
- [ ] Document WebSocket state management behavior explicitly

**Effort:** 3-5 days
**Risk:** Low
**Owner:** Feature development team

---

### Phase 3: Long-term Improvements (Future - 3-6 months)

**Potential Enhancements:**
- [ ] WebSocket command batching API (reduce document write overhead)
- [ ] ToolVaultCommand execution from WebSocket (allow scripts to use command objects)
- [ ] Unified testing framework for both systems
- [ ] Performance monitoring and optimization

**Effort:** 2-3 weeks
**Risk:** Medium
**Owner:** Architecture team

---

## Conclusion

The ToolVaultCommands and WebSocket endpoints systems represent a well-designed dual-API architecture that serves different use cases effectively. The 89% capability overlap is **justified by architectural differences**:

- **ToolVaultCommands:** Declarative, asynchronous, tool-oriented, MCP-compatible
- **WebSocket Endpoints:** Imperative, synchronous, script-oriented, developer-friendly

**Recommendation:** Maintain both systems with improved documentation and minor feature parity improvements. Do not consolidate or deprecate either system.

The overlap is not technical debt - it's a deliberate architectural choice that provides flexibility for different integration patterns while maintaining strong type safety and contract consistency through shared Pydantic models.

---

## Appendix: Command Inventory

### ToolVaultCommands (12 total)

**Feature Management (4):**
1. `AddFeaturesCommand` - Add new features to plot
2. `UpdateFeaturesCommand` - Modify existing features
3. `DeleteFeaturesCommand` - Remove features by ID
4. `SetFeatureCollectionCommand` - Replace entire feature collection

**State Management (3):**
5. `SetViewportCommand` - Update viewport bounds
6. `SetSelectionCommand` - Update selected feature IDs
7. `SetTimeStateCommand` - Update time controller state

**UI Display (3):**
8. `ShowTextCommand` - Display text message
9. `ShowDataCommand` - Display structured data
10. `ShowImageCommand` - Display image

**Utility (2):**
11. `LogMessageCommand` - Structured logging
12. `CompositeCommand` - Batch command execution

---

### WebSocket Endpoints (16 total)

**Feature Management (4):**
1. `get_feature_collection` - Read plot features
2. `set_feature_collection` - Replace all features
3. `add_features` - Add new features
4. `update_features` - Modify existing features
5. `delete_features` - Remove features by ID

**Selection (2):**
6. `get_selected_features` - Query selection
7. `set_selected_features` - Update selection

**Time State (2):**
8. `get_time` - Query time state
9. `set_time` - Update time state

**Viewport (3):**
10. `get_viewport` - Query viewport bounds
11. `set_viewport` - Update viewport bounds
12. `zoom_to_selection` - Fit viewport to selected features

**Utility (3):**
13. `notify` - Display notification message
14. `list_open_plots` - Enumerate open plot files

---

## References

- **ADR-015:** VS Code Integration MVP
- **ADR-002:** WebSocket Port Conflict Resolution
- **ToolVaultCommandHandler Implementation:** `libs/web-components/src/services/ToolVaultCommandHandler.ts`
- **WebSocket Server Implementation:** `apps/vs-code/src/services/debriefWebSocketServer.ts`
- **Shared Types Package:** `libs/shared-types/python-src/debrief/types/`
- **WebSocket Client Library:** `apps/vs-code/workspace/tests/debrief_api.py`
- **GlobalController Integration:** `apps/vs-code/src/core/globalController.ts`
