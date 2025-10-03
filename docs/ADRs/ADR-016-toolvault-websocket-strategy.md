# ADR-016: ToolVault Commands vs WebSocket Endpoints: Maintain Dual-API Strategy

- **Status:** Accepted
- **Date:** 2025-10-03
- **Deciders:** Architecture Review (Issue #206)
- **Tags:** architecture, integration, api-design

## Context

The Future Debrief VS Code extension provides two mechanisms for Python code to modify plot/document state:

1. **ToolVaultCommands**: Command-response system where packaged tools (.pyz files) return structured command objects (AddFeaturesCommand, SetViewportCommand, etc.) that are processed by ToolVaultCommandHandler
2. **WebSocket Server Endpoints**: Direct JSON-RPC style API on port 60123 allowing locally-developed Python scripts to manipulate plots via synchronous request-response calls

An architecture review revealed **89% capability overlap** (8 out of 9 core plot operations available in both systems), raising the question: is this overlap intentional design or accidental technical debt requiring consolidation?

### Current State Analysis

**ToolVaultCommands (12 total):**
- Feature Management: AddFeatures, UpdateFeatures, DeleteFeatures, SetFeatureCollection
- State Management: SetViewport, SetSelection, SetTimeState
- UI Display: ShowText, ShowData, ShowImage
- Utility: LogMessage, Composite

**WebSocket Endpoints (16 total):**
- Feature Management: add_features, update_features, delete_features, get_feature_collection, set_feature_collection
- Selection: get_selected_features, set_selected_features
- Time State: get_time, set_time
- Viewport: get_viewport, set_viewport, zoom_to_selection
- Utility: notify, list_open_plots

**Overlap:** 8 operations (feature CRUD + state setters) exist in both systems.

**Unique to ToolVault:** 4 commands (ShowText, ShowData, ShowImage, Composite)

**Unique to WebSocket:** 8 endpoints (6 state getters + 2 plot management utilities)

### Investigation Findings

The architecture review (documented in `docs/architecture/toolvault-vs-websocket-analysis.md`) found that:

1. **Overlap was intentional by design** - not accidental duplication
2. **Different execution contexts justify different APIs**:
   - Tools run in isolated Python environments (.pyz packages, Docker)
   - Scripts run on local developer machines with full Python ecosystem access
3. **Different architectural patterns**:
   - ToolVaultCommands: Declarative, asynchronous response channel
   - WebSocket: Imperative, synchronous request-response API
4. **No code duplication** - systems share only type definitions (via shared-types package), not implementation
5. **Clear use case separation**:
   - ToolVault: Reusable, distributable maritime analysis tools for end users
   - WebSocket: Ad-hoc development scripts for exploratory data analysis

## Decision

**Maintain both systems** as complementary integration patterns with the following clarifications:

### System Positioning

**ToolVaultCommands** is the **asynchronous response channel** for MCP-compatible packaged tools:
- Tools receive state as injected parameters (viewport, selection, featureCollection)
- Tools return commands as execution results
- Commands are processed by ToolVaultCommandHandler and integrated with GlobalController state management
- Supports batch operations via CompositeCommand
- Provides rich UI feedback (text/data/images) for isolated tool environments

**WebSocket Endpoints** is the **synchronous request API** for script-driven workflows:
- Scripts can query current state (getters not available in ToolVault)
- Scripts can target specific plots via optional filename parameter
- Scripts control execution flow and timing
- Direct document access for faster operations
- Better suited for interactive development and debugging

### Decision Tree for Developers

**Use ToolVaultCommands when:**
- Building a reusable maritime analysis tool for distribution to end users
- Tool needs to run in isolated environment (Docker/.pyz package)
- Tool should work without VS Code-specific API knowledge
- Need rich UI feedback (ShowText, ShowData, ShowImage)
- Want to participate in MCP ecosystem
- Prefer declarative, functional programming style

**Use WebSocket API when:**
- Writing a one-off data manipulation script for specific analysis
- Need to query current plot state before making changes
- Want rapid iteration with local Python debugging (print statements, breakpoints)
- Working with multiple plots simultaneously
- Building custom workflow orchestration
- Prefer imperative, procedural programming style

### No Consolidation Required

**Rationale:**
- Different execution contexts (isolated .pyz vs local Python)
- Different security models (packaged tools vs trusted local scripts)
- Different state access patterns (write-only commands vs read-write RPC)
- Different error handling (graceful degradation vs immediate failure)
- Minimal maintenance burden (only 28 lines shared infrastructure)

## Consequences

### Benefits

- **Flexibility**: Developers can choose the right tool for their use case
- **Type Safety**: Both systems use shared Pydantic models ensuring contract consistency
- **Clear Boundaries**: ToolVault = packaged tools, WebSocket = development scripts
- **No Breaking Changes**: Existing tools and scripts continue working as-is
- **MCP Compatibility**: ToolVault approach aligns with Model Context Protocol standards

### Maintenance

- **Documentation**: Requires clear guidance on when to use each system
- **Testing**: Both integration paths need test coverage (already exists)
- **Type Definitions**: Must maintain shared-types package for both (already required)

### Future Evolution

- Systems may converge features over time (e.g., adding ZoomToSelectionCommand to ToolVault)
- WebSocket may support ToolVaultCommand processing for hybrid workflows
- Performance optimizations can be applied independently to each system

## Alternatives Considered

### Alternative 1: Consolidate into Single System (ToolVault-only)

**Approach:** Deprecate WebSocket endpoints, require all Python code to use ToolVaultCommands.

**Rejected because:**
- Would eliminate getter methods (get_feature_collection, get_selected_features, etc.)
- Would complicate interactive script development (no sync request-response)
- Would prevent multi-plot targeting (filename parameter)
- Would lose WebSocket's 2-3x performance advantage for simple operations

### Alternative 2: Consolidate into Single System (WebSocket-only)

**Approach:** Deprecate ToolVaultCommands, require tools to call WebSocket endpoints directly.

**Rejected because:**
- Would couple tool implementation to VS Code WebSocket API
- Would break MCP compatibility for tool distribution
- Would eliminate declarative command pattern (functional programming style)
- Would lose rich UI feedback capabilities (ShowData, ShowImage)
- Would prevent graceful degradation via CompositeCommand

### Alternative 3: Layer ToolVault on Top of WebSocket

**Approach:** Implement ToolVaultCommandHandler by translating commands to WebSocket calls.

**Rejected because:**
- Would bypass GlobalController state management (current strength of ToolVault)
- Would add unnecessary HTTP round-trip overhead
- Would make error handling more complex (two failure points)
- Provides no architectural benefit (systems serve different purposes)

### Alternative 4: Add Missing Features to Close Gaps

**Approach:** Add getters to ToolVault and UI commands to WebSocket to achieve complete parity.

**Partially Accepted:**
- Minor feature additions recommended (ZoomToSelectionCommand, NotifyCommand)
- Full parity not required - gaps are intentional design choices
- Document that some capabilities are system-specific by design

## Implementation Plan

### Phase 1: Documentation Clarity (Immediate - 1 week)

**Deliverables:**
- [ ] Update `apps/vs-code/CLAUDE.md` with decision tree for system selection
- [ ] Update `libs/tool-vault-packager/CLAUDE.md` with ToolVaultCommand usage examples
- [ ] Add comparison table to `apps/vs-code/docs/debrief_ws_bridge.md`
- [ ] Create developer guide: "Building Tools vs Writing Scripts"

**Effort:** 1-2 days
**Risk:** Low
**Owner:** Documentation team

### Phase 2: Minor Feature Parity (Optional - 1 month)

**Tasks:**
- [ ] Add `ZoomToSelectionCommand` to ToolVault command set
- [ ] Add `NotifyCommand` to unify with WebSocket notify
- [ ] Document WebSocket state management behavior explicitly
- [ ] Consider adding `ListOpenPlotsCommand` if use case emerges

**Effort:** 3-5 days
**Risk:** Low
**Owner:** Feature development team

### Phase 3: Long-term Improvements (Future - 3-6 months)

**Potential Enhancements:**
- [ ] WebSocket command batching API (reduce document write overhead)
- [ ] Allow WebSocket to process ToolVaultCommand objects (hybrid workflows)
- [ ] Unified testing framework for both integration paths
- [ ] Performance monitoring and profiling

**Effort:** 2-3 weeks
**Risk:** Medium
**Owner:** Architecture team

## Success Metrics

- Developer confusion about system choice decreases (measured by support requests)
- New maritime analysis tools successfully published to Tool Vault
- Python scripts continue to use WebSocket API effectively
- No breaking changes to existing tools or scripts
- Type safety maintained through shared-types package

## References

- **Detailed Analysis:** `docs/architecture/toolvault-vs-websocket-analysis.md`
- **ADR-015:** VS Code Integration MVP (established Tool Vault integration)
- **ToolVaultCommandHandler:** `libs/web-components/src/services/ToolVaultCommandHandler.ts`
- **WebSocket Server:** `apps/vs-code/src/services/debriefWebSocketServer.ts`
- **Shared Types:** `libs/shared-types/python-src/debrief/types/`
- **GlobalController:** `apps/vs-code/src/core/globalController.ts`
- **WebSocket Client Library:** `apps/vs-code/workspace/tests/debrief_api.py`
- **Issue #206:** Architecture Review task assignment
