# APM Task Assignment: VS Code Extension Bundling Optimization Implementation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the VS Code Extension Bundling Optimization project.

**Your Role:** As an Implementation Agent, you will execute assigned tasks diligently and log your work meticulously. Your primary responsibility is to implement the esbuild bundling solution as specified in the comprehensive analysis report to eliminate the CI performance warning.

**Workflow:** You will interact with the Manager Agent (via the User) and must maintain detailed logs in the Memory Bank to ensure continuity and knowledge preservation for this project.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to the implementation phase following GitHub Issue #9: "Investigate VS Code extension bundling optimization"

**Prerequisite Analysis:** The comprehensive bundling analysis has been completed and delivered the following key findings:
- **Root Cause**: Extension packages 4,342+ JavaScript files including node_modules dependencies
- **Recommended Solution**: esbuild bundling for 10-100x faster builds with minimal configuration
- **Expected Impact**: Reduce from 219 files to ~15-25 essential files (~80-85% reduction)
- **Architecture Compatibility**: WebSocket server, custom editors, and webviews support bundling

**Objective:** Implement esbuild bundling for the VS Code extension following the detailed 3-phase implementation roadmap to resolve CI performance warning while maintaining all current functionality including WebSocket bridge, custom Plot JSON editor, and outline views.

**Detailed Action Steps:**

### Phase 1: Setup and Configuration (2-4 hours)

1. **Install esbuild Dependency** (30 minutes)
   - Run `npm install --save-dev esbuild` to add esbuild as development dependency
   - Verify installation by running `npx esbuild --version`

2. **Update package.json Scripts** (30 minutes)
   - Replace existing build scripts with esbuild-based equivalents:
     ```json
     {
       "scripts": {
         "esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node",
         "compile": "npm run esbuild-base -- --sourcemap",
         "watch": "npm run esbuild-base -- --sourcemap --watch",
         "vscode:prepublish": "npm run esbuild-base -- --minify",
         "typecheck": "tsc --noEmit"
       }
     }
     ```
   - Update main entry point from `"./out/extension.js"` to `"./dist/extension.js"`

3. **Create Build Infrastructure** (15 minutes)
   - Create `dist/` directory for bundled output
   - Add `dist/` to `.gitignore` file
   - Ensure `out/` directory can be safely removed after transition

4. **Initial Build and Test** (2 hours)
   - Run `npm run compile` to create first bundled build
   - Test extension functionality in Extension Development Host (F5)
   - Verify WebSocket server starts correctly on port 60123
   - Test custom Plot JSON editor opens and displays maps correctly
   - Verify outline view synchronization works
   - Test all WebSocket commands using existing Python integration tests

### Phase 2: Optimization and Testing (3-5 hours)

1. **Advanced Configuration** (1 hour)
   - Fine-tune esbuild settings for optimal performance
   - Implement separate development vs production configurations
   - Configure watch mode for efficient development workflow

2. **Comprehensive Integration Testing** (2-3 hours)
   - **WebSocket Bridge Testing**: Run all tests in `workspace/tests/`:
     - `python test_integration.py` - Full integration test suite
     - `python test_notify_command.py` - VS Code notifications
     - `python test_plot_api.py` - Plot manipulation API
     - `python test_optional_filename.py` - Optional filename functionality
   - **Extension Lifecycle Testing**: Verify activate/deactivate functions work correctly
   - **Custom Editor Testing**: Test Plot JSON editor with various .plot.json files
   - **Feature Communication**: Verify bidirectional communication between outline view and editor
   - **Performance Measurement**: Compare bundle size and startup time vs current build

3. **Development Workflow Integration** (1 hour)
   - Update VS Code tasks.json if necessary for new build process
   - Verify debugging works correctly with source maps
   - Test watch mode during development

### Phase 3: Cleanup and Documentation (1-2 hours)

1. **Update .vscodeignore** (30 minutes)
   - Implement optimized exclusion patterns:
     ```
     .vscode/**
     .vscode-test/**
     src/**
     out/**
     .gitignore
     .yarnrc
     vsc-extension-quickstart.md
     **/tsconfig.json
     **/.eslintrc.json
     **/*.map
     **/*.ts
     **/__pycache__/**
     Dockerfile
     Memory_Bank.md
     prompts/**
     # Preserve workspace/tests/ - essential Python integration examples
     # Preserve sample .rep and .plot.json files for testing
     ```

2. **Update Documentation** (30 minutes)
   - Update `CLAUDE.md` with new build process instructions
   - Document any development workflow changes
   - Update testing instructions if necessary

3. **Legacy Cleanup** (30 minutes)
   - Remove `out/` directory after confirming bundled version works
   - Clean up any temporary build artifacts
   - Run final verification tests

## 3. Provide Necessary Context/Assets

**Architecture-Specific Considerations:**

- **WebSocket Server (`src/debriefWebSocketServer.ts`)**: Complex server with 822 lines handling JSON command protocol. Critical that all WebSocket functionality remains intact including:
  - Port 60123 binding and error handling
  - Client connection management
  - Command routing for plot manipulation
  - Document synchronization with VS Code APIs

- **Custom Plot JSON Editor (`src/plotJsonEditor.ts`)**: Webview-based editor using Leaflet maps. Ensure:
  - Webview HTML generation continues to work
  - Message passing between extension and webview remains functional
  - State management for multiple plot files works correctly
  - Selection synchronization with outline view maintained

- **Extension Entry Point (`src/extension.ts`)**: Main activation logic including:
  - WebSocket server lifecycle management (start/stop)
  - Custom editor registration
  - Tree view provider registration
  - Command registration and event handlers

**Key Dependencies to Bundle Correctly:**
- `ws` library for WebSocket functionality
- Node.js built-in modules (`http`, `fs`, `path`)
- VS Code API (must remain external via `--external:vscode`)

**Critical Configuration Parameters:**
- `--platform=node` for Node.js environment compatibility
- `--format=cjs` for CommonJS module format required by VS Code
- `--external:vscode` to exclude VS Code API from bundle
- `--sourcemap` for development debugging support

## 4. Expected Output & Deliverables

**Define Success:** Successful completion means the VS Code extension loads and functions identically to the current version while being packaged as a single bundled JavaScript file that eliminates the CI performance warning.

**Specify Deliverables:**
- Updated `package.json` with esbuild-based build scripts and correct entry point
- Functional bundled extension in `dist/extension.js` 
- Updated `.vscodeignore` with optimized exclusion patterns
- Updated development documentation in `CLAUDE.md`
- Clean removal of legacy `out/` directory
- All integration tests passing without modification
- Performance measurements documenting build time and package size improvements

**Acceptance Criteria:**
- Extension Development Host launches successfully with bundled extension
- All WebSocket commands work via Python test suite
- Custom Plot JSON editor displays maps and handles file operations correctly  
- Outline view synchronizes with editor selection
- File count reduced from 219 to ~15-25 files
- Build process completes in <5 seconds vs previous longer TypeScript compilation

## 5. Risk Assessment & Mitigation

**High Risk Areas:**
- **WebSocket Server Functionality**: Complex server logic must work identically
  - *Mitigation*: Run comprehensive Python test suite before/after implementation
- **Webview Communication**: Message passing between extension and custom editor
  - *Mitigation*: Test all bidirectional communication scenarios

**Medium Risk Areas:**
- **Extension Lifecycle**: Activation/deactivation timing and resource cleanup
  - *Mitigation*: Test extension reload scenarios and error handling
- **Development Workflow**: New build process must not disrupt developer experience
  - *Mitigation*: Verify watch mode, debugging, and hot reload functionality

**Low Risk Areas:**
- **TypeScript Compilation**: Well-established bundling process
  - *Mitigation*: Maintain separate type checking with `tsc --noEmit`

## 6. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to this implementation task and the preceding GitHub Issue #9 analysis
- A clear description of each phase completed and actions taken
- Key configuration changes made to package.json and build process
- Performance improvements achieved (file count reduction, build speed)
- Any challenges encountered during WebSocket or webview testing
- Confirmation of all integration tests passing
- Final verification of CI warning resolution

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This implementation builds directly on the comprehensive analysis completed for Issue #9, so refer to `docs/VS_Code_Extension_Bundling_Optimization_Analysis.md` for additional technical details and architectural context.