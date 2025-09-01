# APM Task Assignment: VS Code Extension Bundling Optimization Investigation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the VS Code Extension Bundling Optimization project.

**Your Role:** As an Implementation Agent, you will execute assigned tasks diligently and log your work meticulously. Your primary responsibility is to conduct a comprehensive analysis and research task to optimize the VS Code extension bundling for performance.

**Workflow:** You will interact with the Manager Agent (via the User) and must maintain detailed logs in the Memory Bank to ensure continuity and knowledge preservation for this project.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to GitHub Issue #9: "Investigate VS Code extension bundling optimization"

**Objective:** Conduct a comprehensive investigation into VS Code extension bundling optimization to address the CI performance warning: "This extension consists of 219 files, out of which 107 are JavaScript files. For performance reasons, you should bundle your extension."

**Detailed Action Steps:**

1. **Current State Analysis**
   - Analyze the current bundle composition (219 files total, 107 JavaScript files)
   - Use tools to identify the largest contributors to bundle size and file count
   - Document the current build process by examining `package.json`, `tsconfig.json`, and any existing build scripts
   - Review the current `.vscodeignore` file (if it exists) and identify what files are currently excluded
   - Generate a detailed breakdown of file types, sizes, and their purposes in the extension

2. **Bundling Solutions Research**
   - Research and compare **at least 3 bundling approaches** suitable for VS Code extensions:
     - Webpack (traditional choice for VS Code extensions)
     - esbuild (faster alternative)  
     - Other relevant bundlers (rollup, vite, etc.)
   - For each bundling solution, evaluate:
     - Performance implications (build time, bundle size reduction)
     - Development workflow impact (hot reload, debugging capabilities)
     - Compatibility with the extension's architecture (WebSocket server, custom editors, webviews)
     - Configuration complexity and maintenance overhead
     - Integration with TypeScript compilation

3. **Architecture-Specific Considerations**
   - Analyze how bundling will affect the current extension architecture documented in `CLAUDE.md`:
     - WebSocket bridge (`src/debriefWebSocketServer.ts`)
     - Plot JSON editor (`src/plotJsonEditor.ts`) 
     - Custom outline provider (`src/customOutlineTreeProvider.ts`)
     - Webview communication and message passing
   - Identify any special handling needed for webview assets, WebSocket dependencies, or dynamic imports

4. **Implementation Roadmap Creation**
   - Provide a step-by-step implementation plan for the recommended bundling solution
   - Include timeline estimates for each phase
   - Identify potential risks and mitigation strategies
   - Specify testing procedures to ensure bundled extension maintains full functionality
   - Document any breaking changes to development workflow and how to address them

5. **.vscodeignore Optimization**
   - Review the VS Code ignore patterns guide: https://aka.ms/vscode-vscodeignore
   - Identify files and directories that can be safely excluded from the extension package
   - Provide specific recommendations for `.vscodeignore` entries

## 3. Expected Output & Deliverables

**Define Success:** Successful completion means delivering a comprehensive analysis document that provides clear, actionable guidance for implementing VS Code extension bundling optimization.

**Specify Deliverables:**
- A detailed analysis report covering all action steps above
- Specific recommendation for bundling approach with clear justification
- Step-by-step implementation roadmap with timelines
- Updated `.vscodeignore` recommendations
- Risk assessment with mitigation strategies
- Estimated performance improvements (file count reduction, bundle size reduction)

**Format:** The deliverable should be a well-structured markdown document that can serve as a blueprint for implementation.

## 4. Provide Necessary Context/Assets

**Current Extension Architecture:** Review the `CLAUDE.md` file for complete architecture documentation, paying special attention to:
- WebSocket integration on port 60123
- Custom Plot JSON editor with Leaflet maps
- GeoJSON outline view integration
- Extension lifecycle management

**Key Files to Analyze:**
- `src/extension.ts` (main entry point)
- `src/debriefWebSocketServer.ts` (WebSocket bridge)
- `src/plotJsonEditor.ts` (custom editor)
- `src/customOutlineTreeProvider.ts` (outline provider)
- `package.json` (dependencies and scripts)
- `tsconfig.json` (TypeScript configuration)

**Resource Links:**
- [VS Code Bundle Extension Guide](https://aka.ms/vscode-bundle-extension)
- [VS Code Ignore Guide](https://aka.ms/vscode-vscodeignore)

**Constraints:**
- This is preventive maintenance - no immediate performance issues reported
- Priority is low (best practice compliance)
- Must maintain all current functionality including WebSocket server, custom editors, and webviews
- Development workflow should remain as smooth as possible

## 5. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #9 and this assigned task
- A clear description of the analysis methodology and actions taken
- Key findings from current state analysis
- Summary of bundling solutions researched and comparison results
- The final recommendation with justification
- Implementation roadmap summary
- Any key decisions made or challenges encountered during research
- Confirmation of successful completion of all deliverables

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This is a research and analysis task, so focus on thoroughness and providing actionable recommendations rather than immediate implementation.