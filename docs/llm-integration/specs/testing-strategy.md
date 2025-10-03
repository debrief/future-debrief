# Testing Strategy

**Back to**: [Main Index](../README.md) | **Related**: [Phase 1 Plan](../phases/phase-1-implementation.md)

---

## Test Levels

### Unit Tests
- MCP endpoint JSON-RPC 2.0 responses
- Each command via WebSocket and HTTP
- Error handling for invalid requests

### Integration Tests
- Tool execution → command processing → state update
- ToolVaultCommandHandler processes commands
- Multi-plot scenarios (MULTIPLE_PLOTS error)
- Python scripts via MCP endpoint

### End-to-End Tests
- LLM extension connects to MCP endpoint
- Workflow: get selection → call tool → apply command → verify
- GitHub Copilot integration
- Error scenarios (server unavailable, invalid commands)

### Playwright Tests
- MCP endpoint smoke tests in `apps/vs-code/tests/playwright/`
- HTTP POST /mcp alongside WebSocket tests
- Both protocols access same state

---

**Back to**: [Main Index](../README.md)
