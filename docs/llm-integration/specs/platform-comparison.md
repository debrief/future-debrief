# Platform Comparison

**Back to**: [Main Index](../README.md) | **Related**: [ADR 002](../decisions/002-github-copilot-phase1.md)

---

## VS Code LLM Integration Platforms

Naval analysts will interact with LLMs from **INSIDE VS Code** (Future Debrief extension), not external tools.

### Comparison Matrix

| Capability | GitHub Copilot | together.dev | Cline (Claude Dev) |
|------------|----------------|--------------|-------------------|
| **MCP streamable-http** | ✅ Native support | ✅ Native support | ✅ Native support |
| **MCP stdio** | ✅ Native support | ✅ Native support | ✅ Native support |
| **VS Code Integration** | ✅ Built-in extension | ✅ VS Code extension | ✅ VS Code extension |
| **Local Operation** | ❌ Cloud-only | ✅ 100% local/offline | ⚠️ API key required |
| **Multi-step Workflows** | ✅ Agentic mode | ✅ Tool orchestration | ✅ Agentic mode |
| **User Experience** | Chat panel + inline | Chat panel + inline | Chat panel + commands |
| **Setup Complexity** | **Low** (built-in) | Medium (local LLM config) | Medium (API setup) |
| **Cost** | Subscription | Free (local) | Usage-based |
| **Data Privacy** | ⚠️ Cloud (data leaves machine) | ✅ 100% local | ⚠️ Cloud |

### Our Choice

**Phase 1**: GitHub Copilot (3-5 days) - Fast validation
**Phase 2**: together.dev (2-3 weeks) - Offline/classified environments

See: [ADR 002: GitHub Copilot Phase 1](../decisions/002-github-copilot-phase1.md)

---

**Back to**: [Main Index](../README.md)
