# Phase 1: Backend MCP Tool Implementation - Detailed Requirements

**Agent**: backend-developer (92% confidence)
**Alternative**: api-developer
**Model**: sonnet
**Duration**: 4-5 hours
**Dependencies**: None (can start immediately)
**Blocks**: Phase 2, 3, 4

---

## 🎯 Phase Objectives

Implement the remaining WebSocket API commands as MCP JSON-RPC 2.0 tools, focusing on time/viewport management and utility functions. This phase establishes the foundation for enhanced Debrief plot manipulation through GitHub Copilot.

---

## 📋 Task Checklist

### Task 1: Implement `debrief_get_time` MCP Tool
- [ ] Create `apps/vs-code/src/mcp/tools/getTime.ts`
- [ ] Accept optional `filename` parameter for multi-plot scenarios
- [ ] Call WebSocket API `getTime` command
- [ ] Return `TimeState` object with current time, range, and play state
- [ ] Add input schema validation
- [ ] Handle errors (WebSocket disconnected, plot not found)
- [ ] Add JSDoc documentation

**Expected Interface**:
```typescript
interface GetTimeParams {
  filename?: string; // Optional for multi-plot support
}

interface GetTimeResult {
  currentTime: number;
  timeRange: [number, number];
  isPlaying: boolean;
}
```

**Integration Point**: Uses WebSocket bridge on port 60123

---

### Task 2: Implement `debrief_set_time` MCP Tool
- [ ] Create `apps/vs-code/src/mcp/tools/setTime.ts`
- [ ] Accept `TimeState` parameters (currentTime, optional filename)
- [ ] Validate TimeState against shared-types interface
- [ ] Call WebSocket API `setTime` command
- [ ] Return success/failure status
- [ ] Handle validation errors (time out of range)
- [ ] Add retry logic for transient failures

**Expected Interface**:
```typescript
interface SetTimeParams {
  currentTime: number;
  filename?: string;
}

interface SetTimeResult {
  success: boolean;
  message?: string;
}
```

**Validation Rules**:
- `currentTime` must be a valid number
- If `timeRange` is known, `currentTime` should be within range (warn if not)

---

### Task 3: Implement `debrief_get_viewport` MCP Tool
- [ ] Create `apps/vs-code/src/mcp/tools/getViewport.ts`
- [ ] Accept optional `filename` parameter
- [ ] Call WebSocket API `getViewport` command
- [ ] Calculate and return bounds (north, south, east, west)
- [ ] Return zoom level and center point
- [ ] Handle coordinate system conversions if needed

**Expected Interface**:
```typescript
interface GetViewportParams {
  filename?: string;
}

interface GetViewportResult {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
  center: {
    lat: number;
    lng: number;
  };
}
```

**Note**: Ensure compatibility with Leaflet's LatLngBounds format

---

### Task 4: Implement `debrief_set_viewport` MCP Tool
- [ ] Create `apps/vs-code/src/mcp/tools/setViewport.ts`
- [ ] Accept bounds, zoom, or center parameters
- [ ] Validate ViewportState parameters
- [ ] Call WebSocket API `setViewport` command
- [ ] Support multiple viewport specification methods:
  - Bounds only (auto-calculate zoom)
  - Zoom + center
  - Bounds + zoom (zoom takes precedence)

**Expected Interface**:
```typescript
interface SetViewportParams {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom?: number;
  center?: {
    lat: number;
    lng: number;
  };
  filename?: string;
}
```

**Validation Rules**:
- At least one of `bounds`, `zoom`, or `center` must be provided
- Latitude must be -90 to 90
- Longitude must be -180 to 180
- Zoom must be 0 to 20

---

### Task 5: Implement `debrief_list_plots` Utility Tool
- [ ] Create `apps/vs-code/src/mcp/tools/listPlots.ts`
- [ ] Query active plot editors in VS Code
- [ ] Return list of plot filenames and their states
- [ ] Include active/inactive status
- [ ] Include basic metadata (feature count, time range)

**Expected Interface**:
```typescript
interface ListPlotsResult {
  plots: Array<{
    filename: string;
    isActive: boolean;
    featureCount: number;
    timeRange?: [number, number];
  }>;
  activeCount: number;
  totalCount: number;
}
```

**Purpose**: Helps LLMs discover available plots for multi-plot scenarios

---

### Task 6: Implement `debrief_zoom_to_selection` Tool
- [ ] Create `apps/vs-code/src/mcp/tools/zoomToSelection.ts`
- [ ] Get currently selected features
- [ ] Calculate bounding box of selected features
- [ ] Add padding (10-20%) for better visualization
- [ ] Set viewport to calculated bounds
- [ ] Handle edge cases:
  - No selection (do nothing or error?)
  - Single point (zoom to reasonable level)
  - Features spanning large areas

**Expected Interface**:
```typescript
interface ZoomToSelectionParams {
  padding?: number; // Percentage padding, default 15%
  filename?: string;
}

interface ZoomToSelectionResult {
  success: boolean;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom?: number;
  message?: string; // "No selection", "Zoomed to 3 features", etc.
}
```

**Algorithm**:
1. Get selected features via WebSocket
2. Calculate min/max lat/lng across all features
3. Add padding percentage
4. Call `setViewport` with calculated bounds

---

### Task 7: Comprehensive Error Handling
- [ ] Define custom error classes:
  - `WebSocketConnectionError` (-32000)
  - `ToolVaultError` (-32001)
  - `InvalidParameterError` (-32002)
  - `RetryExhaustedError` (-32003)
- [ ] Create error utility module `apps/vs-code/src/mcp/utils/errors.ts`
- [ ] Implement `isRetryableError(error)` function
- [ ] Add error context (which tool, what parameters)
- [ ] Create user-friendly error messages
- [ ] Log errors for debugging (but don't expose internals to user)

**Error Classification**:
```typescript
function isRetryableError(error: Error): boolean {
  // Retryable: network timeouts, WebSocket disconnects, 503 errors
  // Not retryable: validation errors, 404s, authentication errors
}
```

---

### Task 8: Retry Logic with Exponential Backoff
- [ ] Create `apps/vs-code/src/mcp/utils/retry.ts`
- [ ] Implement `callWithRetry(fn, options)` utility
- [ ] Configuration:
  - Base delay: 1000ms
  - Max retries: 3
  - Backoff strategy: exponential (1s, 2s, 4s)
- [ ] Only retry retryable errors
- [ ] Log retry attempts
- [ ] Return `RetryExhaustedError` after max attempts

**Expected Interface**:
```typescript
interface RetryOptions {
  maxRetries?: number; // Default 3
  baseDelay?: number; // Default 1000ms
  maxDelay?: number; // Default 10000ms
  onRetry?: (attempt: number, error: Error) => void;
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T>;
```

**Usage Example**:
```typescript
const result = await callWithRetry(
  () => websocketCall('getTime', params),
  {
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt} after error: ${error.message}`);
    }
  }
);
```

---

## 🏗️ File Structure to Create

```
apps/vs-code/src/mcp/
├── tools/
│   ├── getTime.ts           # Task 1
│   ├── setTime.ts           # Task 2
│   ├── getViewport.ts       # Task 3
│   ├── setViewport.ts       # Task 4
│   ├── listPlots.ts         # Task 5
│   └── zoomToSelection.ts   # Task 6
├── utils/
│   ├── errors.ts            # Task 7
│   └── retry.ts             # Task 8
└── index.ts                 # Export all tools for registration
```

---

## 🧪 Testing Requirements

### Unit Tests (to be created)
For each tool, create tests in `apps/vs-code/test/unit/mcp/`:

- [ ] **Happy path**: Tool works with valid inputs
- [ ] **Validation**: Tool rejects invalid inputs
- [ ] **Error handling**: Tool handles WebSocket errors gracefully
- [ ] **Retry logic**: Tool retries transient failures
- [ ] **Multi-plot**: Tool works with filename parameter

### Test Files to Create
```
apps/vs-code/test/unit/mcp/
├── getTime.test.ts
├── setTime.test.ts
├── getViewport.test.ts
├── setViewport.test.ts
├── listPlots.test.ts
├── zoomToSelection.test.ts
└── utils/
    ├── errors.test.ts
    └── retry.test.ts
```

---

## 🔗 Integration Points

### WebSocket Bridge
- **Location**: `apps/vs-code/src/websocket/`
- **Port**: 60123
- **Commands to Use**:
  - `getTime`
  - `setTime`
  - `getViewport`
  - `setViewport`
  - `getSelection`
  - `getEditorState` (for listPlots)

### Shared Types
- **TimeState**: `libs/shared-types/src/types/TimeState.ts`
- **ViewportState**: `libs/shared-types/src/types/ViewportState.ts`
- **EditorState**: `libs/shared-types/src/types/EditorState.ts`

### Existing MCP Infrastructure
- **Tool Registration**: Follow pattern in existing feature CRUD tools
- **Schema Validation**: Use JSON Schema for inputSchema
- **Error Format**: Follow existing MCP error response pattern

---

## 📊 Performance Targets

- **Get operations**: <200ms p95 latency
- **Set operations**: <500ms p95 latency
- **Zoom to selection**: <1s for up to 1000 features
- **List plots**: <100ms regardless of plot count

---

## 🎓 Implementation Guidance

### Code Style
- Follow existing TypeScript conventions in the codebase
- Use async/await, not callbacks
- Prefer explicit types over `any`
- Add JSDoc comments for all public functions

### Error Messages
- **For Users**: "Could not connect to plot. Is a .plot.json file open?"
- **For Logs**: Include stack traces, parameters, error codes

### Retry Logic Best Practices
- Only retry network/transient errors
- Don't retry validation errors
- Log each retry attempt
- Set reasonable timeouts

---

## 📤 Deliverables

At the end of this phase, you should have:

1. ✅ **6 new MCP tools** fully implemented and tested
2. ✅ **Error handling utilities** with custom error classes
3. ✅ **Retry logic** with exponential backoff
4. ✅ **Unit tests** with 90%+ coverage
5. ✅ **Integration** with WebSocket bridge verified
6. ✅ **Handoff document** (`handoffs/phase-1.md`) created

---

## 🔄 Handoff to Phase 2

After completing this phase, document the following in your handoff:

### For TypeScript Developer (Phase 2):
- Location of new type interfaces
- Any type definitions that need refinement
- Runtime validation requirements
- Edge cases in type contracts

### Key Files Modified:
- List all files created/modified
- Highlight any changes to shared interfaces
- Note any breaking changes (should be none)

### Integration Examples:
- Provide code snippets showing how to call each tool
- Include error handling examples
- Show retry logic in action

---

## ❓ Questions to Answer in Handoff

1. Are all WebSocket commands properly wrapped?
2. Is retry logic working as expected?
3. Are error messages clear for end users?
4. Is the multi-plot `filename` parameter consistent across tools?
5. Are there any performance concerns?
6. What edge cases still need testing?

---

## 🚦 Ready to Start?

Before you begin:

1. ✅ Read `context.yaml` for shared context
2. ✅ Review existing MCP tools in `apps/vs-code/src/mcp/`
3. ✅ Understand WebSocket API in `apps/vs-code/src/websocket/`
4. ✅ Check TimeState and ViewportState interfaces
5. ✅ Review error handling patterns in Phase 1 tools

---

**Good luck, backend-developer! 🚀**

**Remember**: Quality over speed. Thorough error handling and testing now will save time later.
