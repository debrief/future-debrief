# ADR-002: Adopt Pants as Monorepo Build System

## Context
The ecosystem contains TypeScript/React projects, Python applications, and VS Code extensions.
We need a single build orchestrator for reproducible builds and air-gapped operation.

## Decision
We will adopt **Pants** as the monorepo build system.

## Rationale
- Excellent Python support (critical for ToolVault and STAC server).
- Good support for TypeScript/Node projects.
- Simpler to adopt and configure than Bazel, with lower learning curve.
- Supports incremental builds, remote caching, and reproducibility.

## Consequences
- Developers learn Pants conventions, but simpler than Bazel.
- Small ecosystem compared to Bazel, but sufficient for our stack.
- All builds/tests run through Pants in CI/CD.
