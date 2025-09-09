# Software Requirements Document (SRD)
## ToolVault SPA for Tool Discovery and Execution

### 1. Scope
This SRD defines the requirements for the ToolVault Single Page Application (SPA) that provides analysts with an interface for discovering, understanding, and running tools packaged inside a ToolVault instance. The SPA leverages the rich metadata structure and navigation indexes created by the ToolVault packager to provide comprehensive tool analysis capabilities.

### 2. Context
- ToolVault instances are packaged and idempotent with rich embedded metadata.  
- Tools are exposed via MCP endpoints (`tools/list`, `tools/call`) for execution.  
- Rich metadata structure includes global and per-tool navigation indexes, git history, formatted source code, and sample inputs.  
- The SPA leverages both MCP endpoints and the embedded metadata structure for comprehensive tool analysis.  
- Analysts require a sophisticated interface to:  
  - Browse tools and comprehensive metadata  
  - View provenance, development history, and formatted source code  
  - Run tools against bundled samples or custom input  
  - Analyze tool statistics and development context
  - Inspect and preview results with rich formatting

### 3. Functional Requirements

#### 3.1 Application Initialization and Data Loading
- [F1] SPA initializes by loading the global `index.json` file containing MCP-compatible tool schemas
- [F2] Global index provides tool inventory, version information, and navigation structure
- [F3] Per-tool metadata loaded dynamically via tool-specific `index.json` files
- [F4] SPA falls back to MCP endpoints (`tools/list`, `tools/call`) for execution when needed

#### 3.2 Welcome Page
- [F5] Display ToolVault metadata from global index (name, version, description)
- [F6] Show total number of tools and aggregate statistics from global index
- [F7] Display package-level provenance and build information
- [F8] Provide dashboard-style overview with tool categories and usage statistics
- [F9] Sidebar navigation with tool list and enhanced search capabilities
- [F10] Clicking ToolVault name in sidebar returns to welcome page

#### 3.3 Enhanced Sidebar Navigation
- [F11] List tools with name, description, and metadata-derived tags from tool indexes
- [F12] Support advanced search across names, descriptions, tags, and source code content
- [F13] Display tool statistics (file counts, git commits, source code length) from tool indexes
- [F14] Always scrollable with performance optimization for large tool collections
- [F15] Show tool status indicators (sample count, git history availability, complexity metrics)
- [F16] Support filtering by tool characteristics (has samples, has git history, complexity level)

#### 3.4 Tool Pages with Rich Metadata Integration
Each tool has four tabs: **Info**, **Execute**, **Code**, **Analysis**.

- **Info Tab (Enhanced with Tool Index Data)**  
  - [F17] Show comprehensive tool metadata from tool-specific `index.json`
  - [F18] Display tool statistics (sample inputs count, git commits count, source code length)
  - [F19] Show development provenance with rich git history from `metadata/git_history.json`
  - [F20] Expandable commit details with author, date, message, and hash information
  - [F21] Display file structure overview from tool index navigation data
  - [F22] Show tool complexity metrics and development timeline

- **Execute Tab (Enhanced with Bundled Samples)**  
  - [F23] Left panel: schema-driven form generation from MCP schemas or JSON editor
  - [F24] Enhanced sample management using bundled `inputs/*.json` files from tool index
  - [F25] Dropdown for multiple samples with descriptive names and preview capabilities
  - [F26] Sample editing with reset functionality and validation against tool schemas
  - [F27] Right panel: Run button with MCP endpoint integration (`tools/call`)
  - [F28] Output display with multiple view modes:  
    - JSON (raw result with syntax highlighting)  
    - Preview (type-aware rendering for complex data structures)
    - Export capabilities for results
  - [F29] Execution runs asynchronously with progress indicators and timing metrics
  - [F30] Error handling with detailed MCP error response display
  - [F31] No run history persisted (maintaining idempotent instance behavior)

- **Code Tab (Enhanced with Pre-formatted Source)**  
  - [F32] Display tool source code using pre-generated `metadata/source_code.html`
  - [F33] Rich HTML formatting with professional syntax highlighting and styling
  - [F34] Read-only display with copy-to-clipboard functionality
  - [F35] Code navigation with line numbers and search within source
  - [F36] Integration with git history to show code evolution context

- **Analysis Tab (New - Leveraging Rich Metadata)**  
  - [F37] Tool development metrics dashboard using statistics from tool index
  - [F38] Git commit timeline visualization from git history metadata
  - [F39] Sample input analysis and pattern recognition
  - [F40] Tool usage complexity assessment based on schema analysis
  - [F41] Integration patterns analysis (how tool fits within broader ToolVault ecosystem)
  - [F42] Export capabilities for analysis data and reports  

#### 3.5 Error Handling and User Feedback
- [F43] Show concise error messages with contextual styling and severity indicators
- [F44] Expandable panels for detailed error information including MCP response details
- [F45] Progressive error disclosure (summary → details → raw JSON)
- [F46] Error correlation with tool metadata (link errors to specific code sections when possible)
- [F47] Graceful degradation when metadata files are missing or corrupted

#### 3.6 Sample Data Management (Enhanced)
- [F48] Leverage per-tool `inputs/` folders with bundled sample files from tool indexes
- [F49] Dynamic sample loading using file references from tool-specific `index.json`
- [F50] If single sample exists, auto-load; if multiple, provide descriptive dropdown with previews
- [F51] Sample editing with real-time validation against tool input schemas
- [F52] Sample templates and generators based on schema analysis
- [F53] Samples remain editable in-session but cannot be persisted (maintaining package immutability)  

### 4. Non-Functional Requirements

#### 4.1 Performance and Responsiveness
- [N1] SPA must run fully offline with all assets embedded in `.pyz` / `.tgz` packages
- [N2] Must be responsive across desktop, tablet, and mobile devices with adaptive layouts
- [N3] SPA initialization within 1s after load using efficient index.json loading
- [N4] Lazy loading of tool-specific metadata and content for scalability
- [N5] Efficient caching strategy for frequently accessed metadata and source code
- [N6] Progressive loading of rich content (git history, source code) with loading indicators

#### 4.2 User Experience and Accessibility
- [N7] Support comprehensive theme switching (light/dark/high-contrast)
- [N8] Keyboard navigation support for all interactive elements
- [N9] Screen reader compatibility and ARIA label compliance
- [N10] Consistent design language aligned with professional tool analysis interfaces
- [N11] Progressive disclosure of complex information (summary → details → raw data)

#### 4.3 Data Integrity and Reliability
- [N12] Graceful handling of missing or corrupted metadata files
- [N13] Fallback mechanisms when index.json files are unavailable
- [N14] Consistent behavior across different package formats and deployment scenarios
- [N15] Immutable package principle - no persistent state changes to package contents

### 5. Architecture and Data Flow

#### 5.1 Enhanced Packaging and Build Process
- [P1] SPA assets embedded in package with comprehensive metadata integration
- [P2] Primary data source: Global and tool-specific `index.json` files for navigation and metadata
- [P3] Secondary data source: MCP endpoints (`tools/list`, `tools/call`) for execution
- [P4] Rich content integration: HTML source code, JSON git history, structured sample inputs
- [P5] Static asset optimization for offline deployment with minimal footprint

#### 5.2 Data Loading Strategy
- [P6] Initialize with global `index.json` for application structure and tool inventory
- [P7] Load tool-specific `index.json` files on-demand for detailed tool exploration
- [P8] Fetch rich content (source code HTML, git history) progressively as needed
- [P9] Cache strategy for metadata to minimize redundant loading
- [P10] Fallback to MCP endpoints when file-based metadata is unavailable  

### 6. Enhanced Benefits and Value Proposition

#### 6.1 Analyst Productivity Enhancements
- Provides analysts with comprehensive, metadata-rich tool discovery and analysis capabilities
- Schema-driven form generation eliminates manual JSON crafting for tool execution
- Rich provenance information enables thorough tool assessment and trust evaluation
- Professional source code display with syntax highlighting for in-depth code review
- Sample-driven testing reduces time-to-understanding for new tools

#### 6.2 Integration and Compatibility
- Mirrors MCP interface foundation ensuring compatibility with AI supervisors and automated systems
- Leverages existing packager metadata structure without requiring additional build steps
- Maintains package immutability while providing rich interactive experiences
- Supports both human analyst workflows and programmatic tool integration

#### 6.3 Enterprise and Security Benefits
- Fully offline operation suitable for air-gapped and high-security environments
- Comprehensive audit trail through git history integration and provenance tracking
- No external dependencies or network requirements after package deployment
- Professional interface suitable for regulated industries and compliance requirements

#### 6.4 Development and Maintenance Advantages
- Leverages existing packager infrastructure without duplicating metadata generation
- Modular architecture allows incremental feature development and updates
- Comprehensive error handling and graceful degradation for robust operation
- Future-proof design accommodating additional metadata types and analysis capabilities

### 7. Technical Implementation Specifications

#### 7.1 Data Structure Integration Patterns

**Global Index Structure (`/index.json`)**
```typescript
interface GlobalIndex {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: JSONSchema;
    outputSchema?: JSONSchema;
  }>;
  version: string;
  description: string;
  // Additional metadata for SPA navigation
  packageInfo?: {
    buildDate: string;
    commit: string;
    author: string;
  };
}
```

**Tool-Specific Index Structure (`/tools/{tool}/index.json`)**
```typescript
interface ToolIndex {
  tool_name: string;
  description: string;
  files: {
    execute: FileReference;
    source_code: FileReference;
    git_history: FileReference;
    inputs: Array<InputFileReference>;
  };
  stats: {
    sample_inputs_count: number;
    git_commits_count: number;
    source_code_length: number;
  };
}

interface FileReference {
  path: string;
  description: string;
  type: 'python' | 'html' | 'json';
}
```

#### 7.2 Data Loading and Caching Strategy

**Primary Data Flow:**
1. Initialize → Load `/index.json` (global tool inventory)
2. Tool Selection → Load `/tools/{tool}/index.json` (tool metadata)
3. Content Access → Load specific files as referenced in tool index
4. Execution → Use MCP `POST /tools/call` endpoint

**Caching Implementation:**
- Browser localStorage for index.json files (with TTL)
- Memory cache for frequently accessed source code and git history
- Lazy loading with progressive disclosure for large datasets

#### 7.3 Integration Points with Existing Infrastructure

**File Serving Requirements:**
- Packager serves static files at relative paths matching index.json references
- SPA assets embedded alongside tool metadata in package structure
- Standard HTTP serving for all `.json`, `.html`, and static assets

**MCP Endpoint Integration:**
- Tool execution exclusively through existing `POST /tools/call`
- Schema validation using inputSchema from global index
- Error handling aligned with MCP response format standards

#### 7.4 Progressive Enhancement Architecture

**Core Functionality (Always Available):**
- Tool listing and basic metadata (from global index)
- Tool execution (via MCP endpoints)
- Basic error handling

**Enhanced Features (Available when metadata present):**
- Rich git history visualization
- Formatted source code display
- Sample input management
- Development analytics dashboard

**Graceful Degradation:**
- Missing tool-specific index → Basic tool info from global index only
- Missing git history → Show basic tool metadata without development context  
- Missing source code HTML → Fall back to basic tool description
- Missing sample inputs → Manual JSON input only  
