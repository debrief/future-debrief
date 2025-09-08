# Software Requirements Document (SRD)
## ToolVault Packaging and Deployment (Multi-Runtime, MCP-Compatible)

### 1. Scope
ToolVault is a self-contained module that packages tools, reference data, metadata, and an MCP-compatible wrapper into a single deployable unit. It supports both **Python** and **TypeScript** runtimes, ensuring flexibility in different environments. Each deployable must run in connected or air-gapped environments with minimal setup.

### 2. Context
ToolVault instances will be used in the Future Debrief ecosystem and may also be consumed by AI supervisors via the **Model Context Protocol (MCP)**.  
- Python runtime is packaged as a `.pyz` (zipapp).  
- TypeScript runtime is packaged as a self-contained NPM tarball containing all dependencies.  
- Both runtimes expose identical MCP endpoints (`tools/list`, `tools/call`) and serve the same static SPA.

### 3. Functional Requirements

#### 3.1 Tools
- [F1] Each module in `toolvault/tools/` must contain one public function representing a tool.
- [F2] Each function must include type annotations for all parameters and return values (Python) or TypeScript types (TS).
- [F3] Missing annotations must cause the build to fail.

#### 3.2 Discovery (`tools/list`)
- [F4] Both runtimes must expose `tools/list`, per MCP spec.
- [F5] Response must enumerate all tools with name, description, input schema, and output schema (inline or `$ref`).

#### 3.3 Execution (`tools/call`)
- [F6] Both runtimes must expose `tools/call`, per MCP spec.
- [F7] Requests must include tool name and arguments.  
- [F8] Responses must include result, validated against schema.  
- [F9] Error responses must follow MCP error structure.

#### 3.4 Validation
- [F10] Validation must be schema-driven:  
  - Python: Pydantic models generated from shared-types schemas.  
  - TypeScript: `ajv` (or equivalent) validators generated from shared-types schemas.  
- [F11] All tool outputs must be wrapped in `{"result": ...}` for uniformity.

#### 3.5 Packaging
- [F12] Python build must bundle:  
  - Tools (`toolvault/tools/`).  
  - Metadata (`index.json`, Pydantic models).  
  - Static SPA.  
  - REST/WebSocket wrapper.  
  - Deliverable: `toolvault.pyz`.  

- [F13] TypeScript build must bundle:  
  - Tools (`src/tools/`).  
  - Metadata (`index.json`, AJV validators).  
  - Static SPA.  
  - REST/WebSocket wrapper (Express/Fastify).  
  - Deliverable: self-contained `.tgz` NPM tarball with all dependencies vendored.  

- [F14] Both deployables must run without network fetch.  

#### 3.6 Runtime
- [F15] Python: `python toolvault.pyz serve --port <n>` must start the service.  
- [F16] TypeScript: after installing tarball, `npx toolvault serve --port <n>` must start the service.  
- [F17] Both must expose MCP endpoints:  
  - `POST /tools/list`  
  - `POST /tools/call`  
- [F18] SPA must work identically on both runtimes.  

### 4. Non-Functional Requirements
- [N1] Must run with Python 3.9+ or Node.js 18+.  
- [N2] Must function in offline/air-gapped networks.  
- [N3] Startup under 2 seconds on modern laptop.  
- [N4] Discovery/execution formats must remain MCP-compliant.  
- [N5] Shared-types schemas must be the single source of truth for validation in both runtimes.

### 5. Packaging and Build Process

#### 5.1 Objective
Provide two packaging targets (Python `.pyz`, TypeScript `.tgz`) with identical runtime behaviour.

#### 5.2 Inputs
- Tool source trees (`toolvault/tools/`, `src/tools/`).  
- Shared-types schemas (`libs/shared-types/`), maintained as JSON Schema master.

#### 5.3 Build Steps (Python)
1. Discover tools and parse signatures.  
2. Map annotations to JSON Schema or `$ref`.  
3. Generate MCP-compatible `index.json`.  
4. Generate Pydantic validation models.  
5. Package into `.pyz` with static SPA and FastAPI wrapper.  

#### 5.4 Build Steps (TypeScript)
1. Discover tools and parse signatures/types.  
2. Map types to JSON Schema or `$ref`.  
3. Generate MCP-compatible `index.json`.  
4. Generate AJV validation code from schemas.  
5. Bundle entire project (tools + deps + SPA) into single JS bundle with esbuild/webpack.  
6. Publish as `.tgz` with all dependencies vendored.  

#### 5.5 Runtime
- Both runtimes serve SPA and MCP endpoints.  
- CLI wrappers provide `list-tools` and `call-tool`.  
- Validation handled from shared-types schemas.

#### 5.6 Requirements
- [R1] Tools without type annotations must be rejected at build.
- [R2] Input/output validation must use generated Pydantic models.
- [R3] Discovery must follow MCP’s `tools/list` response schema.
- [R4] Execution must follow MCP’s `tools/call` request/response schema.
- [R5] Deployable must immediately serve welcome page and MCP endpoints when run with `serve` command.
### 6. Benefits
- Python `.pyz` = single file, standard for analysts in Python environments.  
- TypeScript `.tgz` = self-contained, OS-independent, works offline with Node runtime.  
- Both runtimes expose identical MCP-compatible interfaces.  
- Shared-types ensures absolute consistency across languages.  
