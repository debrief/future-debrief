# GitHub Copilot Setup

**Back to**: [Main Index](../README.md) | **Phase**: 1 | **Related**: [ADR 002](../decisions/002-github-copilot-phase1.md)

---

## Prerequisites

- VS Code with GitHub Copilot extension (usually built-in)
- GitHub account with Copilot subscription
- Future Debrief extension running

---

## Configuration

VS Code will **auto-configure** MCP servers when Future Debrief extension starts.

###Manual Configuration (if needed)

```json
// .vscode/settings.json
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

---

## Usage

1. Open `.plot.json` file in VS Code
2. Select a maritime feature
3. Open Copilot chat panel
4. Type: "Delete the selected feature"
5. Copilot orchestrates via MCP servers
6. Plot updates in real-time

---

**Back to**: [Main Index](../README.md)
