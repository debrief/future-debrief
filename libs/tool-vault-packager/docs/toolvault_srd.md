# Software Requirements Document (SRD)
## ToolVault Packaging and Deployment

### 1. Scope
ToolVault is a self-contained module that packages Python tools, reference data, metadata, and a REST wrapper into a single deployable unit. The aim is to provide analysts and developers with a portable tool server that can be run locally or in constrained environments.

### 2. Context
ToolVault instances will be used in the Future Debrief ecosystem. Each instance:
- Contains Python tools with consistent interfaces.
- Provides metadata (`index.json`) for discovery and execution.
- Serves static SPA pages for browsing and running tools.
- Exposes a REST API for programmatic execution.
- Ensures input/output validation through schemas.

### 3. Functional Requirements

#### 3.1 Tools
- [F1] Each module in `toolvault/tools/` must contain one public function representing a tool.
- [F2] Each function must include type annotations for all parameters and return values.
- [F3] Missing annotations must cause the build to fail.

#### 3.2 Metadata (`index.json`)
- [F4] Build process must generate an `index.json` file containing:
  - ToolVault package name and version.
  - Tool name, description, parameters, return type.
  - `$ref` to shared-types schemas for complex types.
- [F5] Parameters and returns must be expressed in schema-compliant format.

#### 3.3 Validation Models
- [F6] Build process must generate `toolvault/metadata/models.py` containing Pydantic models for input and output of each tool.
- [F7] Pydantic models must be derived from shared-types schemas where applicable.
- [F8] All tool outputs must be wrapped in `{"result": ...}` for uniformity.

#### 3.4 Packaging
- [F9] Build process must bundle:
  - Python tools (`toolvault/tools/`).
  - Metadata (`toolvault/metadata/index.json`, `toolvault/metadata/models.py`).
  - Static SPA (`toolvault/static/`).
  - REST wrapper (`toolvault/rest.py`).
- [F10] Final deployable unit must be a `.pyz` (zipapp) file.

#### 3.5 Runtime
- [F11] Invoking `python toolvault.pyz serve --port <n>` must start a FastAPI server on the specified port.
- [F12] REST API endpoints:
  - `/api/index.json`: returns metadata.
  - `/api/run/{tool}`: validates input/output and executes tool.
- [F13] SPA must render welcome page and allow navigation through tools based on `index.json`.
- [F14] SPA must build tool forms dynamically from `$ref` schemas.

### 4. Non-Functional Requirements
- [N1] Must run with Python 3.9+ without external dependencies beyond declared requirements.
- [N2] Must function in offline/air-gapped environments (no internet required).
- [N3] Startup must complete in under 2 seconds on a modern laptop.
- [N4] REST responses must validate against Pydantic models before being returned.
- [N5] Index.json and metadata must remain backward-compatible across minor releases.

### 5. Packaging and Build Process

#### 5.1 Objective
Ensure that ToolVault can be distributed as a single deployable unit with reliable metadata and validation.

#### 5.2 Inputs
- Python tools source tree.
- Shared-types schemas (`libs/shared-types/`), maintained as JSON Schema master.

#### 5.3 Build Steps
1. Discover tools by scanning `toolvault/tools/`.
2. Extract signatures, docstrings, and type annotations.
3. Map annotations to JSON Schema types or `$ref` to shared-types.
4. Generate `index.json` describing all tools.
5. Generate Pydantic models (`models.py`) using shared-types for validation.
6. Package into `toolvault.pyz` containing tools, metadata, static SPA, and REST wrapper.

#### 5.4 Runtime
- REST wrapper auto-wires endpoints based on `index.json` and generated models.
- CLI runner allows direct invocation of tools with validation.
- SPA loads `index.json` and uses schemas for dynamic forms.

#### 5.5 Requirements
- [R1] Tools without type annotations must be rejected at build.
- [R2] Input/output validation must use generated Pydantic models.
- [R3] `index.json` must reference shared-types schemas wherever possible.
- [R4] Every tool response must be wrapped in `{"result": ...}`.
- [R5] Deployable must immediately serve welcome page when run with `serve` command.

### 6. Benefits
- Single-file deployment for portability.
- Schema-driven validation ensures analyst confidence.
- Shared-types guarantees cross-language consistency (Python, TS, REST).
- SPA and REST wrapper auto-adapt to new tools without manual changes.
