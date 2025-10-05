# Phase 2: Enhanced Features & Robustness

**Back to**: [Main Index](../README.md) | **Previous**: [Phase 1](phase-1-implementation.md) | **Next**: [Phase 3](phase-3-together-dev.md)

---

## Timeline

**Duration**: 1-2 weeks

**Prerequisites**: Phase 1 complete and validated

---

## Goals

1. Improve robustness and error handling
2. Add remaining MCP tools
3. Validate GitHub Copilot integration in VS Code
4. Performance optimization

---

## Deliverables

### 1. Additional MCP Tools

**Debrief State Server - Time Management**:

```typescript
{
  name: "debrief_get_time",
  description: "Get current time state from plot",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string", description: "Optional plot filename" }
    }
  }
}

{
  name: "debrief_set_time",
  description: "Update plot time state",
  inputSchema: {
    type: "object",
    properties: {
      timeState: { type: "object", description: "TimeState object" },
      filename: { type: "string" }
    },
    required: ["timeState"]
  }
}
```

**Debrief State Server - Viewport Management**:

```typescript
{
  name: "debrief_get_viewport",
  description: "Get current viewport/map bounds",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string" }
    }
  }
}

{
  name: "debrief_set_viewport",
  description: "Update map viewport/bounds",
  inputSchema: {
    type: "object",
    properties: {
      viewportState: { type: "object" },
      filename: { type: "string" }
    },
    required: ["viewportState"]
  }
}
```

**Debrief State Server - Utilities**:

```typescript
{
  name: "debrief_list_plots",
  description: "List all open plot files",
  inputSchema: {
    type: "object",
    properties: {}
  }
}

{
  name: "debrief_zoom_to_selection",
  description: "Zoom map to selected features",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string" }
    }
  }
}
```

---

### 2. Advanced Error Handling

**Retry Logic with Exponential Backoff**:

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Only retry on specific error codes
      if (isRetryableError(error)) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }
}

function isRetryableError(error: unknown): boolean {
  return error instanceof WebSocketConnectionError ||
         (error instanceof ToolVaultError && error.code === 503);
}
```

**Graceful Degradation**:

```typescript
// If Tool Vault unavailable, return clear error
try {
  const result = await callToolVault('analyze_track', params);
  return result;
} catch (error) {
  if (error.code === 'SERVICE_UNAVAILABLE') {
    return {
      error: {
        code: -32005,
        message: "Tool Vault server unavailable. Analysis tools temporarily disabled.",
        data: {
          fallback: "Use manual analysis or wait for service to restore"
        }
      }
    };
  }
  throw error;
}
```

---

### 3. VS Code LLM Integration Validation

**GitHub Copilot Testing Checklist**:

- [ ] MCP servers auto-start with workspace
- [ ] GitHub Copilot can list all Debrief tools
- [ ] Multi-step workflows execute (get → process → update)
- [ ] Error messages display clearly in chat panel
- [ ] Map updates in real-time
- [ ] Multiple concurrent operations work
- [ ] Performance acceptable (<5s end-to-end workflows)

**Test Scenarios**:
1. Delete selected feature
2. Filter features by criteria
3. Update selection programmatically
4. Multi-plot workflows (specify filename)
5. Error handling (service unavailable, invalid params)

---

### 4. Testing & Validation

**Performance Benchmarking**:

```typescript
describe('MCP Server Performance', () => {
  test('get_selection latency <100ms p95', async () => {
    const latencies = await runMultiple(100, async () => {
      const start = Date.now();
      await callTool('debrief_get_selection', {});
      return Date.now() - start;
    });

    const p95 = percentile(latencies, 95);
    expect(p95).toBeLessThan(100);
  });

  test('end-to-end delete workflow <5s p95', async () => {
    const latencies = await runMultiple(50, async () => {
      const start = Date.now();
      await deleteSelectedFeatureWorkflow();
      return Date.now() - start;
    });

    const p95 = percentile(latencies, 95);
    expect(p95).toBeLessThan(5000);
  });
});
```

**Stress Testing**:
- Rate limiting validation (10 req/sec sustained)
- Concurrent client testing (5+ simultaneous connections)
- Memory leak detection (long-running sessions)

---

## Success Criteria

- ✅ All WebSocket API commands available as MCP tools
- ✅ GitHub Copilot integration verified within VS Code
- ✅ Performance meets targets (<200ms p95 latency)
- ✅ Error handling provides clear, actionable feedback
- ✅ Zero regressions in existing functionality

---

## Implementation Tasks

### Week 1: Additional Tools & Error Handling

- [ ] Implement time state tools (get/set)
- [ ] Implement viewport tools (get/set/zoom)
- [ ] Implement utility tools (list plots)
- [ ] Add retry logic with exponential backoff
- [ ] Implement graceful degradation patterns
- [ ] Unit tests for all new tools

### Week 2: Integration Testing & Validation

- [ ] GitHub Copilot end-to-end testing
- [ ] Performance benchmarking
- [ ] Stress testing (rate limits, concurrency)
- [ ] Security review
- [ ] Documentation updates
- [ ] Phase 2 release

---

**Back to**: [Main Index](../README.md) | **Next**: [Phase 3: together.dev Integration](phase-3-together-dev.md)
