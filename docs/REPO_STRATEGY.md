# Debrief Ecosystem Repository Strategy

This document summarises the strategy for organising, building, testing, and releasing the Debrief ecosystem within a single monorepo. 
It is complemented by detailed Architecture Decision Records (ADRs) stored in `/adr/`.

---

## 1. Repository Model
- **Monorepo**: All ecosystem components are housed in a single repository.
- Components include:
  - React Map Tools (TypeScript/Leaflet)
  - VS Code Extensions (Time Controller, Outline, STAC Browser, Command Toolbox, Properties Panel)
  - ToolVault (Python app, serving SPA and tools via REST)
  - Custom STAC Server
  - Lightweight Browser FC Renderer
  - Debrief Storage Format (schemas + generated bindings)

See ADR-001 for rationale.

---

## 2. Build System
- **Pants** is the orchestrator for the monorepo.
- Each component uses its native tooling (npm, pytest, etc.) but Pants coordinates builds and caching.
- Optimised for incremental builds and air-gapped operation.

See ADR-002 for rationale.

---

## 3. CI/CD
- **GitHub Actions** for continuous integration and delivery.
- Per-component pipelines run build + tests + audits on every PR.
- Automated scans: `npm audit`, `pip-audit`, licence compliance checks.

See ADR-003 for rationale.

---

## 4. Release Strategy
- **Per-component releases**: Each subproject publishes independently (npm, PyPI, VSIX, wheels).
- **Umbrella releases**: Periodically tag the whole monorepo to snapshot the ecosystem for MOD/NATO deployments.
- **Cadence**: Quarterly umbrella releases + ad-hoc builds as required.

See ADR-004 for rationale.

---

## 5. Packaging & Distribution
- **Artifact bundles (zip/tar)** containing:
  - npm tgz packages
  - Python wheels
  - VSIX extension packages
  - Storage schemas + docs
- **Workbench Build**: Branded VS Code distribution with extensions + Python tools for analysts.
- Distribution via **file-share only** for offline/air-gapped environments.

See ADR-005 for rationale.

---

## 6. Governance
- **Structured but simple**:
  - PR review rules (approval required, CI must pass)
  - Changelog generation per component
  - Release tagging discipline
- No strict CODEOWNERS per component.

See ADR-006 for rationale.

---

## 7. Onboarding
- **Hybrid onboarding**:
  - One bootstrap script for Pants, Node, Python, VS Code setup.
  - Per-component READMEs for local development guidance.

See ADR-007 for rationale.

---

## 8. Documentation
- **Hybrid documentation strategy**:
  - Per-component READMEs/docs for developers.
  - Centralised "Debrief Workbench" docs site for MOD/NATO users.

See ADR-008 for rationale.

---

## 9. Testing
- **Per-component testing only** (unit + integration).
- Umbrella release bundles tested components; no extra cross-ecosystem integration tests at this stage.

See ADR-009 for rationale.

---

## 10. Security & Compliance
- Automated dependency and licence scanning in CI.
- Fail builds on high-severity issues or non-approved licences.

See ADR-010 for rationale.

---

## References
- ADRs live in `/adr/` with one ADR per strategic decision.
- This `REPO_STRATEGY.md` is the living summary of current practice.
