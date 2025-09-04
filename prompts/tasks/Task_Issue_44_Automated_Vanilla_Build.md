# APM Task Assignment: Replace Manual vanilla.ts with Automated Build Configuration

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief Web Components project.

**Your Role:** Execute assigned tasks diligently focusing on replacing the manually created vanilla.ts file with an automated build process that generates vanilla JavaScript from React components, and log work meticulously to maintain project continuity.

**Workflow:** You will interact with the Manager Agent (via the User) and contribute your work findings to the Memory Bank for future reference and handoffs.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to GitHub Issue #44: "Replace manually created vanilla.ts file with automated build configuration to output IIFE code that does not depend on React"

**Objective:** Eliminate the hand-written vanilla.ts file and implement an automated build process that generates vanilla JavaScript (IIFE format) from React components, following VS Code extension best practices for webview components.

**Detailed Action Steps:**

1. **Analyze Current Architecture:**
   - Review the existing React components in `libs/web-components/src/` (excluding vanilla.ts)
   - Document the current manual vanilla.ts implementation patterns and API surface
   - Identify which React components need vanilla equivalents
   - Map the component props and interfaces that must be preserved

2. **Design Build Transformation Strategy:**
   - Research and select appropriate build tools/plugins for React-to-vanilla transformation
   - Design the component wrapper pattern that will work for both React and vanilla consumption
   - Plan the automated generation approach (build-time transformation vs. wrapper components vs. custom elements)
   - Guidance: Prioritize esbuild-based solutions for consistency with existing build pipeline

3. **Implement Automated Build Configuration:**
   - Modify `libs/web-components/package.json` build scripts to generate vanilla versions automatically
   - Create build-time transformation logic that converts React components to vanilla JavaScript
   - Ensure IIFE output format is maintained for VS Code webview compatibility  
   - Configure TypeScript declaration generation for vanilla output
   - Guidance: Use esbuild's plugin system or create custom transform logic

4. **Create Component Abstraction Layer:**
   - Implement a component factory pattern that can instantiate both React and vanilla versions
   - Ensure API parity between React and vanilla versions (same props, same methods, same events)
   - Create wrapper components that handle the React/vanilla abstraction
   - Maintain backward compatibility with existing vanilla.ts API surface
   - Guidance: Follow the custom element pattern used in the current vanilla.ts for consistency

5. **Verify and Test Build Output:**
   - Ensure generated vanilla components work identically to manually written ones
   - Verify IIFE bundle format and global exposure (window.DebriefWebComponents)
   - Test component lifecycle (create, update, destroy) in both React and vanilla contexts
   - Validate TypeScript declarations are generated correctly
   - Confirm VS Code webview integration works with generated components

**Provide Necessary Context/Assets:**

- **Current Build Setup:** esbuild configuration in `libs/web-components/package.json` line 25 already outputs IIFE format
- **Existing Manual Implementation:** `libs/web-components/src/vanilla.ts` contains the target API and component implementations
- **React Components:** MapComponent, TimeController, PropertiesView, CurrentStateTable in React format
- **VS Code Best Practices:** Components must work as IIFE bundles in webview contexts with CSP restrictions
- **Package Exports:** Current `package.json` exports structure at lines 13-17 defines dual consumption pattern

## 3. Expected Output & Deliverables

**Define Success:** 
- Manual `vanilla.ts` file is completely removed
- Build process automatically generates equivalent vanilla JavaScript components
- Generated components maintain exact API compatibility with manual implementation
- VS Code extension can consume generated components without modification
- Build performance remains fast (esbuild-based)

**Specify Deliverables:**
1. **Removed:** `libs/web-components/src/vanilla.ts` (manual implementation)
2. **Modified:** `libs/web-components/package.json` with updated build scripts
3. **New:** Build transformation logic/configuration files
4. **New:** Component abstraction layer (factory/wrapper pattern)
5. **Generated:** `dist/vanilla/index.js` and `dist/vanilla/index.d.ts` via automated build
6. **Verified:** All existing tests pass and VS Code integration works

**Format:** Standard TypeScript/JavaScript files following existing code conventions in the web-components library, with generated output matching IIFE format requirements.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #44 and this task assignment
- A clear description of the transformation approach selected and implemented
- Key code snippets for the build configuration and component abstraction patterns
- Architectural decisions made regarding React-to-vanilla transformation
- Confirmation of successful execution (build generates equivalent components, tests pass)
- Performance comparison between manual and automated approaches
- Any challenges encountered during the transformation implementation

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The preferred transformation strategy (build-time vs. runtime vs. hybrid approaches)
- API compatibility requirements and acceptable breaking changes
- Testing strategy for validating generated components match manual behavior
- Performance requirements and build time constraints