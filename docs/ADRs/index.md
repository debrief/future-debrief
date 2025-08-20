# Architecture Decision Records (ADRs) Index

This index summarises each ADR for the Debrief ecosystem. Each entry includes a link to the ADR, its status, date, and a brief summary of the decision.

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [ADR-001](ADR-001-monorepo.md) | Adopt a Monorepo for the Debrief Ecosystem | Accepted | 2025-08-20 | Use a single Git monorepo for all components, enabling shared CI, governance, and easier cross-cutting changes. |
| [ADR-002](ADR-002-pants-build.md) / [ADR-002](ADR-002-pants.md) | Use Pants as the Monorepo Build Orchestrator | Accepted | 2025-08-20 | Adopt Pants to orchestrate builds/tests across components for reproducibility and incremental builds. |
| [ADR-003](ADR-003-ci-github.md) / [ADR-003](ADR-003-github-actions.md) | Use GitHub Actions for CI/CD | Accepted | 2025-08-20 | Standardise on GitHub Actions for builds, tests, and artifact publishing. |
| [ADR-004](ADR-004-hybrid-release-model.md) / [ADR-004](ADR-004-release-model.md) | Hybrid Release Model | Accepted | 2025-08-20 | Each component versions/releases independently; umbrella releases snapshot certified sets. |
| [ADR-005](ADR-005-packaging-distribution.md) / [ADR-005](ADR-005-packaging.md) | Packaging & Distribution Strategy | Accepted | 2025-08-20 | Distribute artifact bundles and a Debrief Workbench build for air-gapped and connected environments. |
| [ADR-006](ADR-006-governance.md) | Structured but Simple Governance | Accepted | 2025-08-20 | Require PR review and green CI for merges; changelogs per component; minimal overhead. |
| [ADR-007](ADR-007-onboarding.md) | Hybrid Onboarding | Accepted | 2025-08-20 | Bootstrap script for shared deps, per-component READMEs for specifics. |
| [ADR-008](ADR-008-docs-strategy.md) / [ADR-008](ADR-008-docs.md) | Hybrid Documentation Strategy | Accepted | 2025-08-20 | Maintain per-component dev docs and a central Workbench site for stakeholders. |
| [ADR-009](ADR-009-testing.md) | Per-Component Testing Only | Accepted | 2025-08-20 | Keep unit/integration tests inside each component; umbrella releases bundle tested components. |
| [ADR-010](ADR-010-security-compliance.md) / [ADR-010](ADR-010-security.md) | Automated Security & Compliance | Accepted | 2025-08-20 | Run npm/pip audits and licence checks on every PR; fail builds on high-severity or non-approved licences. |
| [ADR-011](ADR-011-storage-format.md) | Storage Format in Monorepo with Strict SemVer | Accepted | 2025-08-20 | Store schemas in monorepo under strict SemVer; extensions live alongside core. |
| [ADR-012](ADR-012-codegen-bindings.md) | Generate TS/Python Bindings from Schemas | Accepted | 2025-08-20 | CI generates TS/Python bindings from schemas and publishes with storage-format version. |
| [ADR-013](ADR-013-validation-policy.md) | Strict in CI, Tolerant at Runtime | Accepted | 2025-08-20 | CI enforces strict schema validation; runtime libraries load tolerantly, logging warnings. |
| [ADR-014](ADR-014-persist-ui-state.md) | Persist Viewport and Time Window in FeatureCollection | Accepted | 2025-08-20 | Persist viewport/timeWindow in featureCollection properties for reproducibility. |
| [ADR-015](ADR-015-vscode-integration-mvp.md) | VS Code Integration MVP | Accepted | 2025-08-20 | Custom Editor and Debrief Side Bar for VS Code; MVP uses Leaflet and hybrid state model. |

*For full details, read each ADR file linked above.*
