# Changelog

All notable changes to the Future Debrief project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [Phase 2.0.0] - 2025-10-05

### Added - MCP Enhanced Tools & Robustness

#### New MCP Tools
- **`debrief_get_time`**: Get current time state from plot (ISO 8601 format)
- **`debrief_set_time`**: Set current time with validation
- **`debrief_get_viewport`**: Get map viewport bounds and zoom level
- **`debrief_set_viewport`**: Set viewport with geographic validation
- **`debrief_list_plots`**: List all open plot files (multi-plot support)
- **`debrief_zoom_to_selection`**: Zoom map to show selected features with padding

#### Error Handling Infrastructure
- Custom error classes with JSON-RPC 2.0 error codes (-32000 to -32099):
  - `WebSocketConnectionError` (-32000): WebSocket connection failures
  - `ToolVaultError` (-32001): Tool Vault service unavailable
  - `InvalidParameterError` (-32002): Input validation failures
  - `RetryExhaustedError` (-32003): Max retries exceeded
  - `ResourceNotFoundError` (-32004): Resource not found
  - `MultiplePlotsError` (-32005): Multiple plots open, filename required
- Error utility functions:
  - `isRetryableError()`: Classify errors for retry logic
  - `wrapError()`: Wrap generic errors as MCP errors
  - `getUserFriendlyMessage()`: Convert errors to user-friendly messages
  - `getErrorCode()`: Extract error codes consistently

#### Type Safety & Validation
- Runtime type guards for TimeState and ViewportState
- Detailed validation functions:
  - `validateTimeState()`: ISO 8601 validation, time range checking
  - `validateViewportState()`: Geographic bounds validation, antimeridian support
  - `validateFilename()`: Optional filename parameter validation
- Validation error messages specify exact field and reason

#### Retry Logic & Resilience (Available)
- Exponential backoff retry utility (`callWithRetry()`)
  - Default: 3 retries with 1s, 2s, 4s delays
  - Configurable max retries, base delay, max delay
  - Only retries retryable errors
- Circuit breaker pattern for service protection
  - Prevents cascading failures
  - Configurable failure threshold and timeout
  - Half-open state for recovery testing
- **Note**: Retry utilities created but not yet integrated into handlers

#### Testing
- 95 new tests added (total: 256 tests, up from 161)
- Validator test suite: 44 tests covering all validation scenarios
- Error utility test suite: 51 tests covering all error classes and utilities
- Test coverage: Validators and error utilities at 100% function coverage
- Edge case testing: Antimeridian crossing, boundary conditions, invalid inputs

### Changed

#### Error Response Format
- Standardized error codes to -32000 to -32099 range
- Deprecated legacy error codes (use new Phase 2 codes):
  - `MULTIPLE_PLOTS` (-32001) → `MULTIPLE_PLOTS_ERROR` (-32005)
  - `PLOT_NOT_FOUND` (-32002) → `RESOURCE_NOT_FOUND_ERROR` (-32004)
  - `FEATURE_NOT_FOUND` (-32003) → `RESOURCE_NOT_FOUND_ERROR` (-32004)
- Enhanced error messages with specific field-level details

#### Validation Improvements
- `handleSetTimeCommand` now uses `validateTimeState()` for detailed validation
- `handleSetViewportCommand` now uses `validateViewportState()` for geographic validation
- Error messages now specify which field failed and why (e.g., "TimeState.current is not a valid ISO 8601 date-time: 2025-13-45")

### Documentation

#### New Documentation
- **API Reference**: Updated with Phase 2 MCP tools and error codes
- **GitHub Copilot User Guide**: Complete guide for using MCP tools with Copilot
- **Error Handling Guide**: Comprehensive error handling patterns and recovery strategies
- **Troubleshooting Guide**: Enhanced with Phase 2 specific troubleshooting

#### Test Materials
- Phase 5 test plan with 15 detailed test scenarios
- Quick validation checklist (40-50 minute validation)
- Sample test data files:
  - `test-plot.plot.json`: Primary test file (5 features, northern/southern hemisphere)
  - `atlantic.plot.json`: Multi-plot test data
  - `pacific.plot.json`: Antimeridian crossing test data

### Performance

#### Targets
- Get operations: <200ms p95 latency
- Set operations: <500ms p95 latency
- Multi-step workflows: <5s p95 end-to-end
- Map updates: <100ms after operation completion

#### Optimizations
- Validation overhead: <1ms per operation
- Type guards use O(1) field checks
- Date validation uses native Date parsing

### Fixed
- Scoping error in debriefHttpServer.ts (id variable out of scope in catch block)
- TypeScript error in errors.ts (spread operator issue with optional data field)

### Developer Experience

#### Code Quality
- 256 passing tests (95 new tests added in Phase 4)
- TypeScript strict type checking enabled
- All linting checks passing
- Pre-push hooks validate code quality

#### Development Utilities
- Centralized error handling in `apps/vs-code/src/services/utils/errors.ts`
- Reusable validators in `apps/vs-code/src/services/utils/validators.ts`
- Retry utilities in `apps/vs-code/src/services/utils/retry.ts` (ready for integration)

## [Phase 1.0.0] - 2025-10-05

### Added
- Basic MCP JSON-RPC 2.0 endpoint implementation
- Feature CRUD operations (list, get, add, update, delete)
- WebSocket bridge on port 60123
- HTTP server on port 60124
- Basic error handling

---

## Version History

- **Phase 2.0.0** (2025-10-05): Enhanced MCP tools, error handling, type safety
- **Phase 1.0.0** (2025-10-05): Initial MCP implementation

---

**Links**:
- [API Reference](docs/llm-integration/specs/api-reference.md)
- [GitHub Copilot User Guide](docs/llm-integration/specs/github-copilot-user-guide.md)
- [Error Handling](docs/llm-integration/specs/error-handling.md)
- [Troubleshooting](docs/llm-integration/specs/troubleshooting.md)
