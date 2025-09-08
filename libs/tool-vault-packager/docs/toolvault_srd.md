# Software Requirements Document (SRD)
## ToolVault Packaging and Deployment (MCP-Compatible)

### 1. Scope
ToolVault is a self-contained module that packages Python tools, reference data, metadata, and an MCP-compatible REST/WebSocket wrapper into a single deployable unit. The deployable provides both a human-facing SPA and an MCP-standard interface for AI supervisors.

### 2. Context
ToolVault instances will be used in the Future Debrief ecosystem and may also be consumed by external AI supervisors via the **Model Context Protocol (MCP)**. Each instance:
- Contains Python tools with consistent interfaces.
- Provides discovery metadata (`tools/list`) per MCP.
- Exposes a uniform execution method (`tools/call`) per MCP.
- Validates inputs/outputs against shared JSON Schemas.

### 3. Functional Requirements

#### 3.1 Tools
- [F1] Each module in `toolvault/tools/` must contain one public function representing a tool.
- [F2] Each function must include type annotations for all parameters and return values.
- [F3] Missing annotations must cause the build to fail.

#### 3.2 Discovery (`tools/list`)
- [F4] ToolVault must expose a `tools/list` endpoint, per MCP spec.
- [F5] Response must enumerate all tools with:
  - Name
  - Description
  - Input schema (inline or `$ref` to shared-types)
  - Output schema (inline or `$ref` to shared-types)

#### 3.3 Execution (`tools/call`)
- [F6] ToolVault must expose a `tools/call` endpoint, per MCP spec.
- [F7] Request body must specify tool `name` and `arguments` (validated JSON object).
- [F8] Response must include `result`, validated against declared output schema.
- [F9] Error responses must follow MCP error structure.

#### 3.4 Validation Models
- [F10] Build process must generate `toolvault/metadata/models.py` containing Pydantic models for input and output of each tool.
- [F11] Pydantic models must be derived from shared-types schemas where applicable.
- [F12] All tool outputs must be wrapped in `{"result": ...}` for uniformity.

#### 3.5 Packaging
- [F13] Build process must bundle:
  - Python tools (`toolvault/tools/`).
  - Metadata (`toolvault/metadata/index.json`, `toolvault/metadata/models.py`).
  - Static SPA (`toolvault/static/`).
  - MCP-compatible REST/WebSocket wrapper (`toolvault/rest.py`).
- [F14] Final deployable unit must be a `.pyz` (zipapp) file.

#### 3.6 Runtime
- [F15] Invoking `python toolvault.pyz serve --port <n>` must start a FastAPI/uvicorn server on the specified port.
- [F16] Endpoints exposed:
  - `POST /tools/list` — returns discovery metadata.
  - `POST /tools/call` — validates input/output and executes tool.
- [F17] SPA must render welcome page and allow navigation through tools based on `tools/list` response.
- [F18] SPA may call `tools/call` to execute tools.

### 4. Non-Functional Requirements
- [N1] Must run with Python 3.9+ without external dependencies beyond declared requirements.
- [N2] Must function in offline/air-gapped environments (no internet required).
- [N3] Startup must complete in under 2 seconds on a modern laptop.
- [N4] REST responses must validate against Pydantic models before being returned.
- [N5] Discovery and execution formats must remain MCP-compliant for compatibility with AI supervisors.

### 5. Packaging and Build Process

#### 5.1 Objective
Ensure ToolVault deployables are MCP-compatible from the outset, serving both human-facing SPA and MCP consumers.

#### 5.2 Inputs
- Python tools source tree.
- Shared-types schemas (`libs/shared-types/`), maintained as JSON Schema master.

#### 5.3 Build Steps
1. Discover tools in `toolvault/tools/`.
2. Extract signatures, docstrings, and type annotations.
3. Map annotations to JSON Schema primitives or `$ref` to shared-types schemas.
4. Generate MCP-compatible discovery JSON (used by `tools/list`).
5. Generate Pydantic validation models (`models.py`) using shared-types where applicable.
6. Package into `toolvault.pyz` containing tools, metadata, static SPA, and MCP wrapper.

#### 5.4 Runtime
- REST/WebSocket wrapper must serve MCP methods `tools/list` and `tools/call`.
- SPA must rely on these same methods for tool discovery and execution.
- CLI runner must provide equivalent functionality.

#### 5.5 Requirements
- [R1] Tools without type annotations must be rejected at build.
- [R2] Input/output validation must use generated Pydantic models.
- [R3] Discovery must follow MCP’s `tools/list` response schema.
- [R4] Execution must follow MCP’s `tools/call` request/response schema.
- [R5] Deployable must immediately serve welcome page and MCP endpoints when run with `serve` command.

### 6. Benefits
- MCP-compliance ensures ToolVault can be immediately consumed by AI supervisors without adapters.
- Single-file deployment (`.pyz`) for portability.
- Shared-types guarantees cross-language consistency (Python, TS, REST).
- SPA and MCP clients share the same discovery and execution interface, avoiding divergence.
