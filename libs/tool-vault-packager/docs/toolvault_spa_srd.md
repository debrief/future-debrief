# Software Requirements Document (SRD)
## ToolVault SPA for Tool Discovery and Execution

### 1. Scope
This SRD defines the requirements for the ToolVault Single Page Application (SPA) that provides analysts with an interface for discovering, understanding, and running tools packaged inside a ToolVault instance. The SPA complements the MCP API by giving a human-facing view.

### 2. Context
- ToolVault instances are packaged and idempotent.  
- Tools are exposed via MCP endpoints (`tools/list`, `tools/call`).  
- The SPA consumes these endpoints to render discovery and execution UI.  
- Analysts require a clear interface to:  
  - Browse tools and metadata  
  - View provenance and code  
  - Run tools against sample or custom input  
  - Inspect and preview results

### 3. Functional Requirements

#### 3.1 Welcome Page
- [F1] Display ToolVault name, version, last modified date, and provenance (commit, author, build date, changelog link).  
- [F2] Show total number of tools available.  
- [F3] Sidebar navigation with tool list and search box.  
- [F4] Clicking ToolVault name in sidebar returns to welcome page.

#### 3.2 Sidebar
- [F5] List tools with name, description, and tags.  
- [F6] Support search across names, descriptions, and tags.  
- [F7] Always scrollable; search scales to long lists.  
- [F8] Tags are extracted from method comments and displayed under tool names.

#### 3.3 Tool Pages
Each tool has three tabs: **Info**, **Execute**, **Code**.

- **Info Tab**  
  - [F9] Show tool name, description, tags.  
  - [F10] Show provenance: git history (full changelog with expandable commits).  

- **Execute Tab**  
  - [F11] Left panel: schema-driven form (or JSON editor).  
  - [F12] Dropdown to load bundled sample input(s); reset button restores defaults.  
  - [F13] Right panel: Run button at top; output below with two tabs:  
    - JSON (raw result)  
    - Preview (type-aware, map for GeoJSON, table for tabular, etc).  
  - [F14] Phase 1: only JSON viewer required.  
  - [F15] Execution runs asynchronously, with progress indicator.  
  - [F16] Execution time shown inline next to run button.  
  - [F17] No run history persisted (idempotent instance).  

- **Code Tab**  
  - [F18] Display method source file with syntax highlighting.  
  - [F19] Read-only, no edits.  

#### 3.4 Errors
- [F20] Show concise error messages styled distinctly.  
- [F21] Expandable panel for raw error JSON.  

#### 3.5 Samples
- [F22] Packager must include an `inputs/` folder per tool with bundled sample files.  
- [F23] If one sample exists, load it directly; if multiple, show dropdown.  
- [F24] Samples are editable in-session but cannot be saved back.  

### 4. Non-Functional Requirements
- [N1] SPA must run fully offline with assets embedded in `.pyz` / `.tgz`.  
- [N2] Must be responsive across desktop, tablet, and phone.  
- [N3] Must support theme switching (light/dark).  
- [N4] SPA must initialise by calling `tools/list`.  
- [N5] SPA must render within 1s after load.  

### 5. Packaging and Build Process
- [P1] SPA assets embedded in package and served locally.  
- [P2] SPA uses MCP endpoints exclusively (`tools/list`, `tools/call`).  
- [P3] Tool source files and sample inputs bundled by packager for display.  

### 6. Benefits
- Provides analysts with intuitive, schema-driven discovery and execution.  
- Mirrors MCP interface so SPA and AI supervisors share same foundation.  
- Delivers provenance and transparency by exposing git history and code.  
- Works fully offline, suitable for air-gapped deployments.  
