# Developer Setup

**Back to**: [Main Index](../README.md) | **Related**: [Phase 1 Implementation](../phases/phase-1-implementation.md)

---

## Prerequisites

### Required Software

- **Node.js**: Version specified in `.nvmrc` (use `nvm use`)
- **pnpm**: 10.14.0+ (specified in root `package.json`)
- **Python**: 3.10+ (for Tool Vault)
- **VS Code**: Latest stable version

### VS Code Extensions

- **GitHub Copilot** (for Phase 1 testing)
- **Future Debrief Extension** (in development)

---

## Local Development Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/debrief/future-debrief.git
cd future-debrief

# Use correct Node version
nvm use

# Install dependencies
pnpm install

# Build shared types
pnpm --filter @debrief/shared-types build

# Build web components
pnpm --filter @debrief/web-components build
```

### 2. Start Development Servers

```bash
# Terminal 1: VS Code Extension (includes Debrief State Server)
cd apps/vs-code
pnpm watch

# Terminal 2: Tool Vault Server
cd libs/tool-vault-packager
npm run dev
```

### 3. Configure MCP Servers

Add to VS Code `settings.json`:

```json
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

## Testing

### Unit Tests

```bash
# Test shared types
pnpm --filter @debrief/shared-types test

# Test web components
pnpm --filter @debrief/web-components test

# Test VS Code extension
cd apps/vs-code && pnpm test
```

### Integration Tests

```bash
# Tool Vault integration tests
cd libs/tool-vault-packager
npm run test:playwright
```

### Manual Testing with GitHub Copilot

1. Open `.plot.json` file in VS Code
2. Select a feature in Plot Editor
3. Open GitHub Copilot chat
4. Type: "Delete the selected feature"
5. Verify feature deleted

---

## Performance Benchmarks

### Latency Targets

| Operation | Target (p50) | Target (p95) | Maximum Acceptable |
|-----------|-------------|--------------|-------------------|
| `get_selection` | <50ms | <100ms | <500ms |
| `get_features` | <100ms | <200ms | <1000ms |
| `update_features` | <150ms | <300ms | <2000ms |
| `toolvault_*` | <200ms | <500ms | <3000ms |
| **End-to-End Workflow** | <2s | <5s | <10s |

---

## Troubleshooting Development Issues

### Port Already in Use

```bash
# Find process using port 60123
lsof -i :60123

# Kill process
kill -9 <PID>
```

### TypeScript Build Errors

```bash
# Clean all build artifacts
pnpm clean

# Rebuild from scratch
pnpm build
```

---

**Back to**: [Main Index](../README.md)
