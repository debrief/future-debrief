# ADR 002: GitHub Copilot for Phase 1 Testing

**Status**: ✅ Accepted
**Date**: 2025-10-03
**Context**: [LLM Integration Architecture](../README.md)

## Context

Naval analysts need LLM assistance for maritime analysis workflows within VS Code (Future Debrief extension). Multiple VS Code-compatible LLM platforms exist:

- **GitHub Copilot**: Built-in, cloud-based, subscription required
- **together.dev**: Local LLM support, offline-capable, requires configuration
- **Claude VS Code extension**: Cloud-based, API key required
- **Cline**: Cloud-based, usage-based pricing

## Decision

**Phase 1 (Initial - 3-5 days)**: Use **GitHub Copilot** for MCP server validation
**Phase 2 (Offline - 2-3 weeks)**: Add **together.dev** for offline/classified environments

## Rationale

### Why GitHub Copilot First?

1. **Built into VS Code**
   - Already installed for most developers
   - No additional extension installation needed
   - Familiar interface for analysts

2. **Easy Setup**
   - Just authenticate with GitHub account
   - Auto-discovers MCP servers via VS Code settings
   - Minimal configuration

3. **Fast Validation**
   - Quick proof-of-concept for MCP server integration
   - Verify architecture works end-to-end
   - Catch integration issues early

4. **Good Developer Experience**
   - Chat panel familiar to GitHub users
   - Inline suggestions and completions
   - Multi-step workflow support

### Why together.dev for Phase 2?

1. **100% Local Operation**
   - No data leaves the machine
   - Works without internet connection
   - Perfect for classified/offline environments

2. **Security/Privacy**
   - No cloud data transmission
   - Meets naval security requirements
   - Complete data sovereignty

3. **Cost-Effective**
   - No subscription fees
   - No usage-based charges
   - Free local LLM execution

4. **VS Code Integration**
   - Native extension
   - Same MCP endpoint compatibility
   - Consistent user experience

## Platform Comparison

| Capability | GitHub Copilot (Phase 1) | together.dev (Phase 2) |
|------------|--------------------------|------------------------|
| **Setup** | ⭐⭐⭐ Built-in | ⭐⭐ Extension + config |
| **Network** | ❌ Requires internet | ✅ 100% offline |
| **Data Privacy** | ⚠️ Cloud-based | ✅ 100% local |
| **Cost** | 💰 Subscription | ✅ Free |
| **Speed** | ⚡ Fast (cloud) | ⏱️ Varies (local) |
| **MCP Support** | ✅ Native | ✅ Native |
| **Use Case** | Quick testing | Production deployment |

## Implementation Strategy

### Phase 1: GitHub Copilot (3-5 days)

```json
// VS Code settings.json (auto-configured)
{
  "github.copilot.advanced": {
    "mcpServers": {
      "debrief-state": {
        "type": "streamable-http",
        "url": "http://localhost:60123/mcp"
      },
      "tool-vault": {
        "type": "streamable-http",
        "url": "http://localhost:60124/mcp"
      }
    }
  }
}
```

**Success Criteria**:
- ✅ Copilot discovers Debrief MCP tools
- ✅ Multi-step workflows execute (e.g., get selection → delete → verify)
- ✅ Error handling works correctly
- ✅ Multiple concurrent requests supported

### Phase 2: together.dev (2-3 weeks later)

```json
// VS Code settings.json (expected format)
{
  "together": {
    "mcpServers": {
      "debrief-state": {
        "type": "streamable-http",
        "url": "http://localhost:60123/mcp"
      },
      "tool-vault": {
        "type": "streamable-http",
        "url": "http://localhost:60124/mcp"
      }
    }
  }
}
```

**Success Criteria**:
- ✅ Fully offline operation
- ✅ Same MCP tools as Copilot
- ✅ Local LLM backend configured
- ✅ Meets naval security requirements

## Consequences

### Positive

- ✅ **Fast validation**: Prove MCP architecture in days, not weeks
- ✅ **Low risk**: Use proven, stable platform for testing
- ✅ **Clear path**: Phase 1 validates, Phase 2 productionizes
- ✅ **Flexibility**: Support both cloud and local LLMs

### Negative

- ⚠️ **Phase 1 requires subscription**: GitHub Copilot not free
- ⚠️ **Phase 1 requires internet**: Not suitable for classified work initially
- ⚠️ **Two platforms to support**: Maintain compatibility with both

### Mitigation

- Phase 1 is short (3-5 days) - minimal subscription cost
- Both platforms use identical MCP protocol - no code duplication
- Phase 2 addresses security/offline requirements

## Analyst Workflow

### Phase 1 (GitHub Copilot)

1. Open `.plot.json` file in VS Code
2. Select a maritime feature
3. Open Copilot chat: "Delete the selected feature"
4. Copilot orchestrates: get selection → call tool → apply command
5. Plot updates in real-time

### Phase 2 (together.dev - Offline)

Same workflow, but:
- ✅ Works without internet
- ✅ No data leaves local machine
- ✅ Suitable for classified environments

## Alternatives Considered

### Continue.dev + Ollama

**Rejected**: Requires external bridge processes, not VS Code-native

### Claude VS Code Extension Only

**Rejected**: Cloud-only, no offline option for Phase 2

### Cline

**Rejected**: Usage-based pricing, less familiar to analysts

## References

- [Platform Comparison Matrix](../specs/platform-comparison.md)
- [GitHub Copilot Configuration Guide](../specs/github-copilot-setup.md)
- [together.dev Integration Plan](../phases/phase-3-together-dev.md)
- [Main Architecture Overview](../README.md)

## Related Work

- [ADR 001: Streamable-HTTP Transport](001-streamable-http-transport.md)
- [ADR 004: Python Scripts via MCP](004-python-scripts-via-mcp.md)
- [Phase 1 Implementation Plan](../phases/phase-1-implementation.md)
- [Phase 3: together.dev Integration](../phases/phase-3-together-dev.md)

---

**Back to**: [Main Architecture](../README.md) | [All Decisions](../README.md#key-decisions)
