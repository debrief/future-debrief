# Phase 3: together.dev Integration & Offline Support

**Back to**: [Main Index](../README.md) | **Previous**: [Phase 2](phase-2-enhanced-features.md)

---

## Timeline

**Duration**: 2-3 weeks

**Prerequisites**: Phase 2 complete and validated

---

## Goals

1. Enable offline local LLM support via together.dev
2. Optimize performance for local operation
3. Improve developer experience with VS Code integration
4. Create comprehensive documentation

---

## Deliverables

### 1. together.dev VS Code Extension Integration

**Installation Guide**:

```markdown
### Installing together.dev Extension

1. Open VS Code Extensions panel
2. Search for "together.dev"
3. Install extension
4. Configure local LLM backend (details TBD)
5. MCP servers auto-configured by Future Debrief extension
```

**Configuration** (expected format):

```json
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

**Testing Workflows**:

1. **Offline Operation Test**:
   - Disconnect from internet
   - Open `.plot.json` file
   - Select feature
   - Use together.dev chat: "Delete selected feature"
   - Verify workflow completes (fully offline)

2. **Local Privacy Test**:
   - Monitor network traffic (no outbound connections)
   - Verify all data stays on local machine
   - Confirm suitable for classified environments

---

### 2. Performance Optimization

**Connection Pooling**:

```typescript
class ConnectionPool {
  private connections = new Map<string, WebSocket>();
  private readonly maxConnections = 5;

  async getConnection(filename?: string): Promise<WebSocket> {
    const key = filename || 'default';

    if (this.connections.size >= this.maxConnections) {
      // Close oldest connection
      const [oldestKey] = this.connections.keys();
      this.connections.get(oldestKey)?.close();
      this.connections.delete(oldestKey);
    }

    if (!this.connections.has(key)) {
      this.connections.set(key, await this.createConnection());
    }

    return this.connections.get(key)!;
  }
}
```

**Response Caching**:

```typescript
class MCPResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl = 60000; // 1 minute

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}
```

**Batch Operations**:

```typescript
{
  name: "debrief_update_features_batch",
  description: "Update multiple features in single operation",
  inputSchema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            featureId: { type: "string" },
            properties: { type: "object" }
          }
        }
      },
      filename: { type: "string" }
    },
    required: ["updates"]
  }
}
```

**Performance Targets** (with caching):

| Operation | Target (p50) | Target (p95) |
|-----------|-------------|--------------|
| `get_selection` (cached) | <10ms | <50ms |
| `get_features` (cached) | <20ms | <100ms |
| Tool call (cache hit) | <50ms | <100ms |

---

### 3. Developer Experience Improvements

**VS Code Extension Auto-Configuration**:

```typescript
// When Future Debrief extension activates
export async function activate(context: vscode.ExtensionContext) {
  // Start MCP servers
  await startDebriefStateServer();
  await startToolVaultServer();

  // Auto-configure LLM extensions
  const config = vscode.workspace.getConfiguration();
  
  // GitHub Copilot configuration
  await config.update(
    'github.copilot.advanced.mcpServers',
    {
      'debrief-state': {
        type: 'streamable-http',
        url: 'http://localhost:60123/mcp'
      },
      'tool-vault': {
        type: 'streamable-http',
        url: 'http://localhost:60124/mcp'
      }
    },
    vscode.ConfigurationTarget.Workspace
  );

  // together.dev configuration (if extension installed)
  if (isTogetherDevInstalled()) {
    await config.update('together.mcpServers', /* same config */);
  }
}
```

**Status Bar Indicators**:

```typescript
// Show MCP server health in status bar
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);

statusBarItem.text = "$(check) MCP Servers Online";
statusBarItem.tooltip = "Debrief State (60123) & Tool Vault (60124)";
statusBarItem.show();

// Update on server status changes
statusBarItem.text = "$(alert) MCP Server Unavailable";
statusBarItem.tooltip = "Tool Vault server not responding";
```

**Command Palette Commands**:

```typescript
// Register diagnostics command
context.subscriptions.push(
  vscode.commands.registerCommand('debrief.mcpDiagnostics', async () => {
    const diagnostics = await runMCPDiagnostics();
    
    const panel = vscode.window.createWebviewPanel(
      'mcpDiagnostics',
      'MCP Server Diagnostics',
      vscode.ViewColumn.One,
      {}
    );
    
    panel.webview.html = generateDiagnosticsHTML(diagnostics);
  })
);
```

---

### 4. Documentation

**Complete API Reference**:
- All MCP tools documented
- Request/response examples
- Error code reference
- Performance characteristics

**Architecture Diagrams**:
- Updated sequence diagrams
- Component interaction diagrams
- Deployment architecture

**Video Tutorials** (optional):
- Getting started with GitHub Copilot
- Setting up together.dev for offline
- Common workflow examples
- Troubleshooting guide walkthrough

---

## Platform Comparison

**Final Comparison** (GitHub Copilot vs together.dev):

| Capability | GitHub Copilot | together.dev |
|------------|----------------|--------------|
| **Setup Complexity** | Low (built-in) | Medium (local LLM) |
| **Internet Required** | ✅ Yes | ❌ No |
| **Data Privacy** | ⚠️ Cloud | ✅ 100% local |
| **Cost** | Subscription | Free (local) |
| **Response Speed** | 2-5s | TBD (local model dependent) |
| **Offline Capable** | ❌ No | ✅ Yes |
| **Use Case** | Quick testing, online workflows | Classified, offline, privacy-critical |

---

## Success Criteria

- ✅ together.dev can orchestrate workflows with local LLMs
- ✅ Fully offline operation (no internet required)
- ✅ Tool call latency <100ms p95 (cached)
- ✅ VS Code extension auto-configures MCP servers
- ✅ Comprehensive documentation published
- ✅ Video tutorials created (optional)
- ✅ Both platforms (Copilot + together.dev) validated

---

## Implementation Tasks

### Week 1: together.dev Integration

- [ ] Research together.dev configuration format
- [ ] Implement auto-configuration in VS Code extension
- [ ] Test with local LLM backends
- [ ] Document installation and setup
- [ ] Create example workflows

### Week 2: Performance & Developer Experience

- [ ] Implement connection pooling
- [ ] Add response caching
- [ ] Implement batch operations
- [ ] Add status bar indicators
- [ ] Create command palette commands
- [ ] Performance benchmarking

### Week 3: Documentation & Release

- [ ] Complete API reference
- [ ] Update architecture diagrams
- [ ] Create video tutorials (optional)
- [ ] Final testing (both platforms)
- [ ] Release preparation
- [ ] Phase 3 release

---

## Future Enhancements (Phase 4+)

**STAC Server Integration**:
- MCP resource provider for geospatial data
- Tool for querying STAC catalog
- Integration with plot visualization

**Advanced Orchestration**:
- Workflow templates (common analysis patterns)
- State persistence across sessions
- Undo/redo support for LLM operations

**Remote Deployment**:
- OAuth 2.0 authentication
- Multi-user support
- Remote access scenarios

---

**Back to**: [Main Index](../README.md) | **Previous**: [Phase 2: Enhanced Features](phase-2-enhanced-features.md)
