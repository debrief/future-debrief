# Contributing Guide

**Back to**: [Main Index](../README.md)

---

## Overview

This guide helps developers contribute to the LLM integration architecture for Future Debrief.

---

## Development Setup

See [Developer Setup](developer-setup.md) for complete instructions.

**Quick Start**:
```bash
nvm use
pnpm install
pnpm build
```

---

## Code Style

### TypeScript

- Follow existing code style in `apps/vs-code/`
- Use strict TypeScript configuration
- Prefer `async/await` over callbacks
- Use shared types from `@debrief/shared-types`

### Python

- Follow PEP 8 style guide
- Use type hints (Pydantic models preferred)
- Tool Vault tools use schema-first approach

---

## Testing Requirements

### Before Submitting PR

- ✅ All unit tests pass (`pnpm test`)
- ✅ All integration tests pass
- ✅ TypeScript compiles without errors (`pnpm typecheck`)
- ✅ Linting passes (`pnpm lint`)
- ✅ Manual testing with GitHub Copilot (Phase 1)

### New Features

- Add unit tests for new functionality
- Add integration tests for MCP endpoints
- Update documentation
- Add example workflows if applicable

---

## Pull Request Process

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow code style guidelines
- Add tests for new functionality
- Update documentation

### 3. Test Locally

```bash
# Run all tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### 4. Submit PR

- Clear description of changes
- Reference related issues
- Include test results
- Update CHANGELOG if applicable

---

## Architecture Decisions

For significant architectural changes:

1. **Create ADR** in `docs/llm-integration/decisions/`
2. **Follow template**: See existing ADRs for format
3. **Get review**: Discuss with maintainers before implementation

---

## MCP Protocol Changes

When modifying MCP endpoints:

1. **Update API Reference**: `docs/llm-integration/specs/api-reference.md`
2. **Update Tool Schemas**: Document input/output changes
3. **Backward Compatibility**: Consider existing LLM integrations
4. **Version Carefully**: Use semantic versioning

---

## Documentation

### Required Documentation Updates

- **specs/**: Technical specifications
- **API Reference**: Tool schema changes
- **User Workflows**: New workflow examples
- **Troubleshooting**: Common issues and solutions

---

## Getting Help

- **GitHub Issues**: https://github.com/debrief/future-debrief/issues
- **Discussions**: GitHub Discussions for questions
- **Documentation**: Start with [Main Index](../README.md)

---

**Back to**: [Main Index](../README.md)
