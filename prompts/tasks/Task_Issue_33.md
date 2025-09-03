# APM Task Assignment: Live Rebuild of Web Components

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Future Debrief project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned development tasks with precision and thoroughness, focusing on creating robust development workflows that enhance the developer experience across different contexts.

**Workflow:** You will receive this assignment through the User (acting as Manager Agent) and must log all work completed to the project's Memory Bank for future reference and tracking.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to [GitHub Issue #33: Live rebuild of web-components](https://github.com/debrief/future-debrief/issues/33).

**Objective:** Implement live rebuild capabilities for web-components to support two distinct development modes:
1. Component-level development in Storybook
2. Feature-level development in VS Code extension

**Current Development Context:**
- The project uses a monorepo structure with pnpm workspaces
- Web components library at `libs/web-components/` with React and vanilla JS builds
- VS Code extension at `apps/vs-code/` that depends on the web components
- Existing Storybook setup for component development
- Current build scripts: `build:shared-types`, `build:web-components`, `build:vs-code`

**Detailed Action Steps:**

1. **Analyze Current Development Workflow:**
   - Review existing build scripts in root `package.json` and component-specific scripts
   - Examine current VS Code launch configurations in `apps/vs-code/.vscode/launch.json`
   - Understand the dependency chain: shared-types → web-components → vs-code extension

2. **Update VS Code Development Launch Configuration:**
   - Update launch configuration specifically for web-components development within VS Code extension context
   - Ensure this configuration triggers automatic rebuilding of web-components when changes are detected
   - Configure the launch to then rebuild and reload the VS Code extension
   - The workflow must ensure web-components rebuild first, then the VS Code extension updates

3. **Enhance Storybook Development Experience:**
   - Create or enhance watch-mode scripts for Storybook development
   - Ensure Storybook can hot-reload when web-components source files change
   - Verify both React and vanilla JS builds are properly watched

4. **Implement Watch Mode Scripts:**
   - Create `dev:web-components` script that watches source files and rebuilds on changes
   - Create `dev:vs-code` script that watches both web-components and VS Code extension files
   - Ensure proper file watching excludes `dist/`, `node_modules/`, and other build artifacts

5. **Create Launch Configurations:**
   - Add VS Code tasks in `.vscode/tasks.json` (if needed) to support the launch configurations
   - Create specific launch configurations for:
     - "Develop Web Components (Storybook)" - launches Storybook with watch mode
     - "Develop VS Code Extension with Web Components" - launches extension with live rebuild

6. **Test and Validate:**
   - Verify that changes to web-components automatically rebuild and update in Storybook
   - Verify that changes to web-components trigger VS Code extension reload
   - Ensure no build artifacts are included in version control
   - Test that the development experience is smooth and responsive

**Technical Constraints:**
- Must maintain existing build output structure (`dist/react/` and `dist/vanilla/`)
- Must preserve current esbuild configuration for performance
- VS Code extension uses esbuild bundling, ensure compatibility
- Watch mode should be efficient and not cause excessive CPU usage

**Provide Necessary Context/Assets:**
- Current package.json scripts show sequential builds: `build:shared-types && build:web-components && build:vs-code`
- Web components use esbuild for both React and vanilla builds
- VS Code extension has existing launch configuration with `preLaunchTask: "pnpm: compile"`
- Storybook is configured to run on port 6006

## 3. Expected Output & Deliverables

**Define Success:** Successful completion requires:
- Two distinct development workflows that provide live rebuilding
- Smooth developer experience with minimal build times
- Proper file watching that rebuilds dependencies in correct order
- No regression in existing build processes

**Specify Deliverables:**
1. Updated VS Code launch configurations for both development modes
2. Enhanced package.json scripts with watch capabilities
3. VS Code tasks configuration (if required)
4. Updated documentation explaining the new development workflows
5. Verification that both development modes work correctly

**Format:** 
- All configuration files should use proper JSON formatting
- Scripts should use pnpm commands consistently with existing patterns
- Documentation should be clear and concise

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank. Adhere strictly to established logging format and ensure your log includes:

- A reference to this assigned task (GitHub Issue #33)
- Clear description of all configuration changes made
- Any new scripts or launch configurations created
- Key decisions made regarding file watching and build orchestration
- Confirmation of successful testing for both development modes
- Any challenges encountered and how they were resolved

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The exact workflow desired for VS Code extension development
- File watching scope and exclusions
- Integration points between Storybook and VS Code development modes
- Performance requirements for the watch processes