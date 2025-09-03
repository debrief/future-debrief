# APM Task Assignment: Live Rebuild of Web Components

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Future Debrief project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned development tasks with precision and thoroughness, focusing on creating robust development workflows that enhance the developer experience across different contexts.

**Workflow:** You will receive this assignment through the User (acting as Manager Agent) and must log all work completed to the project's Memory Bank for future reference and tracking.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to [GitHub Issue #33: Live rebuild of web-components](https://github.com/debrief/future-debrief/issues/33).

**Objective:** Implement live rebuild capabilities for web-components to support two distinct and independent development modes:
1. **Component-level development in Storybook** - for isolated component development (independent of any consuming application)
2. **VS Code extension development** - for feature-level development using the web-components

**Current Development Context:**
- The project uses a monorepo structure with pnpm workspaces
- Shared types library at `libs/shared-types/` that provides common type definitions
- Web components library at `libs/web-components/` with React and vanilla JS builds (depends on shared-types)
- VS Code extension at `apps/vs-code/` that depends on both shared-types and web-components
- Existing Storybook setup for component development
- Current build scripts: `build:shared-types`, `build:web-components`, `build:vs-code`
- Project aims to use pnpm and turborepo for efficient dependency management and build orchestration

**Detailed Action Steps:**

1. **Analyze Current Development Workflow:**
   - Review existing build scripts in root `package.json` and component-specific scripts
   - Examine current VS Code launch configurations in `apps/vs-code/.vscode/launch.json`
   - Understand the full dependency chain: shared-types → web-components → vs-code extension
   - Note that both web-components and vs-code depend on shared-types, requiring coordinated rebuilds

2. **Implement Turborepo Configuration:**
   - Set up `turbo.json` configuration file to define build pipelines (without explicit dependencies)
   - Configure turborepo to automatically infer dependencies from package.json workspace relationships
   - Configure turborepo tasks for `dev`, `build`, and `typecheck` that respect package.json dependencies
   - Ensure shared-types changes trigger rebuilds of both web-components and vs-code through automatic dependency resolution
   - Leverage turborepo's incremental builds and caching for efficient development

3. **Update VS Code Extension Development Launch Configuration:**
   - Update launch configuration specifically for VS Code extension development context
   - Integrate with turborepo dev mode to handle dependency rebuilds automatically
   - Configure the launch to rebuild shared-types → web-components → vs-code extension in proper sequence
   - The workflow must ensure dependencies rebuild in correct order when any source changes

4. **Create Separate Storybook Development Configuration:**
   - Set up launch.json and tasks.json in `libs/web-components/.vscode/` for Storybook development
   - Create watch-mode scripts for isolated component development in Storybook
   - Ensure Storybook can hot-reload when web-components source files change
   - Include shared-types dependency watching so Storybook updates when types change
   - Verify both React and vanilla JS builds are properly watched
   - This should be completely independent of VS Code extension development

5. **Implement Turborepo-based Watch Mode Scripts:**
   - Create `dev:shared-types` script using turborepo for shared types development
   - Create `dev:web-components` script that uses turborepo to watch shared-types and web-components
   - Create `dev:vs-code` script that orchestrates shared-types → web-components → vs-code rebuilds
   - Leverage pnpm workspaces and turborepo's dependency graph for efficient rebuilds
   - Ensure proper file watching excludes `dist/`, `node_modules/`, and other build artifacts

6. **Create Launch Configurations:**
   - Add VS Code tasks in `apps/vs-code/.vscode/tasks.json` (if needed) to support VS Code extension development
   - Add VS Code tasks in `libs/web-components/.vscode/tasks.json` for Storybook development
   - Create specific launch configurations:
     - In `libs/web-components/.vscode/launch.json`: "Develop Web Components (Storybook)" - launches Storybook with watch mode for isolated component development
     - In `apps/vs-code/.vscode/launch.json`: "Develop VS Code Extension" - launches extension with live rebuild of dependencies

7. **Test and Validate:**
   - Verify that changes to shared-types trigger rebuilds of both web-components and vs-code
   - **Storybook Development Mode**: Verify that changes to shared-types and web-components trigger Storybook hot-reload
   - **VS Code Extension Development Mode**: Verify that changes to web-components trigger VS Code extension reload
   - Test turborepo's incremental builds and caching work correctly in both development modes
   - Ensure both development workflows are completely independent and can run simultaneously
   - Ensure no build artifacts are included in version control
   - Test that both development experiences are smooth and responsive with minimal rebuild times

**Technical Constraints:**
- Must maintain existing build output structure (`dist/react/` and `dist/vanilla/`)
- Must preserve current esbuild configuration for performance
- VS Code extension uses esbuild bundling, ensure compatibility
- Watch mode should be efficient and leverage turborepo's caching to minimize rebuilds
- Solution must use pnpm and turborepo as the primary build orchestration tools
- Dependency graph should be automatically inferred from package.json dependencies, not manually defined in turbo.json

**Provide Necessary Context/Assets:**
- Current package.json scripts show sequential builds: `build:shared-types && build:web-components && build:vs-code`
- Shared-types is a foundational dependency required by both web-components and vs-code
- Package.json dependencies already define the workspace relationships (use `"workspace:^1.0.0"` format)
- Web components use esbuild for both React and vanilla builds
- VS Code extension has existing launch configuration with `preLaunchTask: "pnpm: compile"`
- Storybook is configured to run on port 6006
- Project should leverage pnpm workspaces and turborepo for optimal build performance
- Turborepo should automatically respect existing package.json dependency declarations

## 3. Expected Output & Deliverables

**Define Success:** Successful completion requires:
- Two distinct and independent development workflows that provide live rebuilding
- Smooth developer experience with minimal build times in both workflows
- Proper file watching that rebuilds dependencies in correct order
- Both workflows can run simultaneously without conflicts
- No regression in existing build processes

**Specify Deliverables:**
1. New `turbo.json` configuration defining build pipelines (with automatic dependency inference)
2. Enhanced package.json scripts with turborepo-based watch capabilities
3. VS Code tasks and launch configurations for web-components Storybook development (`libs/web-components/.vscode/`)
4. VS Code tasks and launch configurations for VS Code extension development (`apps/vs-code/.vscode/`)
5. Updated documentation explaining both independent development workflows
6. Verification that both development modes work correctly with proper dependency rebuilding

**Format:** 
- All configuration files should use proper JSON formatting
- Scripts should use pnpm commands consistently with existing patterns
- Documentation should be clear and concise

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank. Adhere strictly to established logging format and ensure your log includes:

- A reference to this assigned task (GitHub Issue #33)
- Clear description of all configuration changes made
- Turborepo configuration and dependency graph setup
- Any new scripts or launch configurations created
- Turborepo configuration leveraging automatic dependency inference from package.json
- Key decisions made regarding pnpm/turborepo integration and build orchestration
- Confirmation of successful testing for both development modes with proper dependency handling
- Any challenges encountered with shared-types integration and how they were resolved

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The exact workflow desired for VS Code extension development
- Turborepo configuration with automatic dependency inference setup
- How shared-types changes should propagate to dependent packages
- Clear separation between Storybook (component development) and VS Code extension development modes
- Performance requirements for the watch processes and turborepo caching strategy