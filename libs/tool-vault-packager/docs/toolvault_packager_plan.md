# ToolVault Packager Implementation Plan (Non-SPA Elements)

This document outlines a phased implementation plan for delivering the non-SPA elements of the ToolVault packager.

---

## Phase 1 – Core Packager and Minimal Runtime
**Objective:** Establish the foundation for packaging and executing tools.

- [ ] Implement tool discovery by scanning named folder of tools.  
- [ ] Require one public function per tool module.  
- [ ] Extract metadata: name, description (docstring), parameters, return type.  
- [ ] Fail build if annotations are missing.  
- [ ] Generate minimal `index.json` with tool list, params, and returns.  
- [ ] Package into `.pyz` (Python) with:  
  - Tools  
  - Metadata (`index.json`)  
  - Basic REST wrapper (`/tools/list`, `/tools/call`).  
- [ ] Validate input/output using Pydantic (Python).  
- [ ] Provide CLI runner: `list-tools`, `call-tool`.  

**Deliverable:** Working `.pyz` file, callable via REST and CLI, idempotent package.

---

## Phase 2 – Shared-Types Integration
**Objective:** Align validation with master schemas.

- [ ] Integrate with `libs/shared-types` repo.  
- [ ] Replace inline types with `$ref` to shared-types schemas.  
- [ ] Generate Pydantic models (Python) from shared-types.  
- [ ] Enforce schema-driven validation on input/output.  
- [ ] Update `index.json` to include `$ref`s instead of free-form types.  
- [ ] Confirm MCP-compliance of discovery/execute endpoints.  

**Deliverable:** `.pyz` with schema-driven validation, full MCP-compatible metadata.

---

## Phase 3 – Provenance and Samples
**Objective:** Add analyst-facing context and test data.

- [ ] During packaging, extract Git commit history for each tool.  
- [ ] Embed provenance: commit ID, author, last modified date.  
- [ ] Support per-tool `inputs/` folder with sample JSON files.  
- [ ] Bundle sample files into package for runtime discovery.  
- [ ] Extend `index.json` with provenance and sample references.  

**Deliverable:** `.pyz` with provenance metadata and bundled sample inputs.

---

## Phase 4 – TypeScript Runtime
**Objective:** Provide cross-language parity.

- [ ] Implement TypeScript packager.  
- [ ] Discover tools in `src/tools/`.  
- [ ] Extract metadata: name, description, params, returns (from TS types).  
- [ ] Generate MCP-compatible `index.json`.  
- [ ] Use `ajv` for JSON Schema validation.  
- [ ] Bundle all dependencies with `esbuild` or `webpack`.  
- [ ] Package into self-contained `.tgz` NPM tarball with vendored deps.  
- [ ] CLI runner: `npx toolvault list-tools`, `npx toolvault call-tool`.  

**Deliverable:** `.tgz` package, equivalent behaviour to Python `.pyz`.

---

## Phase 5 – Convergence and Hardening
**Objective:** Finalise and unify both runtimes.

- [ ] Ensure Python and TS runtimes emit identical discovery metadata.  
- [ ] Add regression tests to confirm schema compliance across runtimes.  
- [ ] Validate performance (startup <2s, discovery <200ms).  
- [ ] Harden packaging process with CI pipelines for both runtimes.  
- [ ] Confirm both deployables function fully offline.  

**Deliverable:** Stable dual-runtime ToolVault packager, production-ready.

---

## Out of Scope (Handled Separately)
- SPA frontend (discovery and execution UI).  
- Rich previews (map, table, etc.).  
- Multi-tool workflow composition.  
