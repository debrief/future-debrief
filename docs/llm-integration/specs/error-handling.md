# Error Handling & Recovery Strategies

**Back to**: [Main Index](../README.md) | **Related**: [API Reference](api-reference.md) | [Troubleshooting](troubleshooting.md)

---

## Overview

Phase 2 introduced comprehensive error handling with:
- **Custom error classes** with specific error codes (-32000 to -32099)
- **Runtime type validation** for TimeState and ViewportState
- **Detailed error messages** to guide users and LLMs
- **Retry logic** with exponential backoff (available but not currently integrated)
- **Circuit breaker pattern** for service protection (available but not currently integrated)

---

## Error Classification

### Retryable Errors
Errors that may succeed on retry (transient failures):

- **WebSocketConnectionError** (-32000): WebSocket bridge temporarily unavailable
- **ToolVaultError** (-32001): Tool Vault service temporarily unavailable
- **Network timeouts**: `ECONNREFUSED`, `ETIMEDOUT`
- **503 Service Unavailable**: Service temporarily down

**Retry Strategy**:
- Max retries: 3
- Backoff: Exponential (1s, 2s, 4s)
- Total max time: ~7 seconds

### Non-Retryable Errors
Errors that will not succeed on retry (permanent failures):

- **InvalidParameterError** (-32002): Input validation failed
- **ResourceNotFoundError** (-32004): Resource (plot, feature) not found
- **MultiplePlotsError** (-32005): Ambiguous operation (user must specify)
- **DNS failures**: `ENOTFOUND`
- **400 Bad Request**: Invalid request format
- **404 Not Found**: Resource doesn't exist

**Response Strategy**: Return error to user with corrective guidance

---

## Error Code Reference

| Code | Name | Description | Retryable? | User Action |
|------|------|-------------|-----------|-------------|
| -32000 | WebSocketConnectionError | Failed to connect to WebSocket bridge | Yes | Ensure .plot.json file is open, retry |
| -32001 | ToolVaultError | Tool Vault service unavailable | Yes | Wait and retry |
| -32002 | InvalidParameterError | Input validation failed | No | Correct input parameters |
| -32003 | RetryExhaustedError | Max retries exceeded | No | Check service status, report issue |
| -32004 | ResourceNotFoundError | Resource not found | No | Verify resource exists |
| -32005 | MultiplePlotsError | Multiple plots open | No | Specify filename parameter |

---

## Type Validation

### TimeState Validation

**Validation Rules**:
1. `current`, `start`, `end` must be valid ISO 8601 date-time strings
2. `start` ≤ `end`
3. `start` ≤ `current` ≤ `end`

**Error Examples**:

```typescript
// Invalid ISO 8601 format
Input: { current: "2025-13-45T12:00:00Z" }
Error: "TimeState.current is not a valid ISO 8601 date-time: 2025-13-45T12:00:00Z"

// Time out of range
Input: { current: "2025-10-05T16:00:00Z", start: "...:10:00", end: "...:14:00" }
Error: "TimeState.current must be between start and end times"

// Start after end
Input: { start: "2025-10-05T14:00:00Z", end: "2025-10-05T10:00:00Z" }
Error: "TimeState.start must be before or equal to TimeState.end"
```

### ViewportState Validation

**Validation Rules**:
1. `bounds` must be array of exactly 4 numbers: `[west, south, east, north]`
2. Latitude (south, north): -90 to 90 degrees
3. Longitude (west, east): -180 to 180 degrees
4. `south` ≤ `north`
5. `west` may be > `east` (antimeridian crossing allowed)

**Error Examples**:

```typescript
// Wrong array length
Input: { bounds: [-10, 50, 2] }
Error: "ViewportState.bounds must have exactly 4 elements [west, south, east, north], got 3"

// Latitude out of range
Input: { bounds: [-10, -95, 2, 58] }
Error: "ViewportState.bounds[1] (south) must be between -90 and 90 degrees, got -95"

// South > North
Input: { bounds: [-10, 60, 2, 50] }
Error: "ViewportState.bounds: south (60) must be less than or equal to north (50)"

// Antimeridian crossing (valid)
Input: { bounds: [170, 50, -170, 58] }
Result: ✅ Valid (Pacific region crossing International Date Line)
```

---

## Recovery Strategies

### WebSocket Connection Errors

**Error**: "Could not connect to plot. Is a .plot.json file open?"

**Recovery Steps**:
1. Verify .plot.json file is open in editor
2. Check WebSocket bridge is running (port 60123)
3. Reload VS Code window if necessary
4. Check VS Code extension logs for errors

**Automatic Retry**: Yes (up to 3 times with exponential backoff)

---

### Tool Vault Errors

**Error**: "Tool Vault service is currently unavailable. Please try again."

**Recovery Steps**:
1. Wait a few moments (service may be starting)
2. Check Tool Vault server is running (if applicable)
3. Retry operation
4. If persistent, check server logs

**Automatic Retry**: Yes (up to 3 times)

---

### Invalid Parameter Errors

**Error**: Detailed validation message (e.g., "TimeState.current is not a valid ISO 8601 date-time")

**Recovery Steps**:
1. Review error message for specific validation failure
2. Correct the invalid parameter
3. Retry operation with corrected input

**Automatic Retry**: No (requires user/LLM correction)

**LLM Behavior**: GitHub Copilot and other LLMs can read the detailed error message and self-correct the parameter before retrying.

---

### Multiple Plots Error

**Error**: "Multiple plot files are open. Please specify which file to use."

**Error Data**:
```json
{
  "code": -32005,
  "message": "Multiple plot files are open. Please specify which file to use.",
  "data": {
    "available_plots": [
      {"filename": "atlantic.plot.json", "title": "Atlantic Ocean Plot"},
      {"filename": "pacific.plot.json", "title": "Pacific Ocean Plot"}
    ]
  }
}
```

**Recovery Steps**:
1. Review `available_plots` list
2. Retry operation with `filename` parameter
3. Example: `{ "filename": "atlantic.plot.json" }`

**Automatic Retry**: No (requires user/LLM to specify filename)

**LLM Behavior**: Copilot will:
1. Read available plots from error data
2. Ask user which plot to use
3. Retry with specified filename

---

## Error Handling Utilities

### Custom Error Classes

Located in `apps/vs-code/src/services/utils/errors.ts`:

```typescript
// Base class
class MCPError extends Error {
  public readonly code: number;
  public readonly data?: unknown;

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}

// Specific error classes
class WebSocketConnectionError extends MCPError {
  constructor(message = 'Failed to connect to WebSocket bridge') {
    super(-32000, message);
  }
}

class ToolVaultError extends MCPError {
  constructor(message = 'Tool Vault service unavailable') {
    super(-32001, message);
  }
}

class InvalidParameterError extends MCPError {
  constructor(message: string) {
    super(-32002, message);
  }
}

class RetryExhaustedError extends MCPError {
  constructor(message: string, attempts: number, lastError?: Error) {
    super(-32003, message, { attempts, lastError: lastError?.message });
  }
}

class ResourceNotFoundError extends MCPError {
  constructor(resource: string, identifier?: string) {
    super(-32004, identifier ? `${resource} not found: ${identifier}` : `${resource} not found`);
  }
}

class MultiplePlotsError extends MCPError {
  constructor(plots: Array<{filename: string; title?: string}>) {
    super(-32005, 'Multiple plot files are open. Please specify which file to use.', { available_plots: plots });
  }
}
```

### Utility Functions

```typescript
// Check if error is retryable
function isRetryableError(error: Error | MCPError): boolean {
  if (error instanceof WebSocketConnectionError) return true;
  if (error instanceof ToolVaultError) return true;
  if (error.message.includes('ECONNREFUSED')) return true;
  if (error.message.includes('ETIMEDOUT')) return true;
  if (error.message.includes('503')) return true;
  return false;
}

// Wrap generic errors as MCP errors
function wrapError(error: Error, context?: string): MCPError {
  if (error instanceof MCPError) return error;

  if (error.message.includes('ECONNREFUSED')) {
    return new WebSocketConnectionError(context ? `${context}: ${error.message}` : error.message);
  }

  // ... other wrapping logic

  return new MCPError(-32603, error.message); // Internal error
}

// Get user-friendly error message
function getUserFriendlyMessage(error: Error | MCPError): string {
  if (error instanceof WebSocketConnectionError) {
    return 'Could not connect to plot. Is a .plot.json file open?';
  }

  if (error instanceof ToolVaultError) {
    return 'Tool Vault service is currently unavailable. Please try again.';
  }

  if (error instanceof InvalidParameterError) {
    return `Invalid input: ${error.message}`;
  }

  if (error instanceof RetryExhaustedError) {
    return 'Operation failed after multiple attempts. Please try again later.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}
```

---

## Retry Logic (Available but Not Integrated)

Retry utilities are available in `apps/vs-code/src/services/utils/retry.ts` but not currently integrated into handlers. They can be adopted incrementally if needed.

### Configuration

```typescript
interface RetryOptions {
  maxRetries?: number;    // Default: 3
  baseDelay?: number;     // Default: 1000ms
  maxDelay?: number;      // Default: 10000ms
}
```

### Usage Example

```typescript
import { callWithRetry } from './utils/retry';

const result = await callWithRetry(
  () => websocketCall('getTime', params),
  {
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.warn(`Retry attempt ${attempt} after error: ${error.message}`);
    }
  }
);
```

### Circuit Breaker Pattern

Prevents cascading failures by temporarily blocking requests to failing services:

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;  // Default: 5
  timeout: number;           // Default: 30000ms
  half_open_requests: number; // Default: 3
}
```

**States**:
- **Closed**: Normal operation, requests pass through
- **Open**: Service failed threshold times, requests blocked
- **Half-Open**: Testing if service recovered

---

## Best Practices

### 1. Always Use Type Validators

```typescript
import { validateTimeState, validateViewportState } from './utils/validators';

// ✅ Good: Validate before processing
const validation = validateTimeState(params.timeState);
if (!validation.valid) {
  return { error: { code: 400, message: validation.error } };
}
const timeState = params.timeState as TimeState; // Safe after validation

// ❌ Bad: No validation
const timeState = params.timeState as TimeState;
globalController.updateState(editorId, 'timeState', timeState);
```

### 2. Provide Detailed Error Messages

```typescript
// ✅ Good: Specific, actionable error
throw new InvalidParameterError(
  'TimeState.current is not a valid ISO 8601 date-time: 2025-13-45'
);

// ❌ Bad: Vague error
throw new Error('Invalid input');
```

### 3. Use Error Utilities for Consistency

```typescript
// ✅ Good: User-friendly message
catch (error) {
  const message = getUserFriendlyMessage(error as Error);
  return { error: { code: getErrorCode(error), message } };
}

// ❌ Bad: Raw error message
catch (error) {
  return { error: { message: error.message } };
}
```

### 4. Handle Multiple Plots Gracefully

```typescript
// ✅ Good: List available plots in error
if (plots.length > 1 && !filename) {
  throw new MultiplePlotsError(plots.map(p => ({
    filename: p.filename,
    title: p.properties?.title
  })));
}

// ❌ Bad: Generic error
if (plots.length > 1) {
  throw new Error('Multiple plots open');
}
```

---

## Debugging

### Enable Error Logging

Check VS Code extension logs:
1. Open Command Palette (Cmd+Shift+P)
2. Run "Developer: Show Logs"
3. Select "Extension Host"
4. Filter for "Debrief" or "MCP"

### Common Debug Scenarios

**WebSocket Connection Issues**:
```bash
# Check if WebSocket is running
lsof -i :60123

# Check WebSocket bridge logs
# (logs appear in VS Code extension host console)
```

**Type Validation Failures**:
```typescript
// Add debug logging in validators
console.warn('[Validation] TimeState:', JSON.stringify(value, null, 2));
const result = validateTimeState(value);
if (!result.valid) {
  console.warn('[Validation] Error:', result.error);
}
```

**Retry Logic (if integrated)**:
```typescript
const result = await callWithRetry(
  () => operation(),
  {
    onRetry: (attempt, error) => {
      console.warn(`[Retry] Attempt ${attempt}:`, error.message);
    }
  }
);
```

---

## Future Enhancements

### Planned but Not Implemented
- Retry logic integration across all WebSocket operations
- Circuit breaker for WebSocket connection
- Automatic recovery from Tool Vault failures
- Telemetry and error reporting

### Available for Adoption
- `callWithRetry()` utility (Phase 1)
- Circuit breaker pattern (Phase 1)
- Error wrapping middleware (Phase 1)

---

**Back to**: [Main Index](../README.md) | **See Also**: [API Reference](api-reference.md) | [Troubleshooting](troubleshooting.md)

**Version**: 1.0 (Phase 2 Release)
**Last Updated**: 2025-10-05
