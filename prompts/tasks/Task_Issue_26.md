# APM Task Assignment: Create Web-Components Library with Dual Consumption Support

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Future Debrief monorepo project.

**Your Role:** As an Implementation Agent, your responsibility is to execute assigned tasks diligently and log your work meticulously in the Memory Bank. You will follow the detailed instructions provided and ensure all deliverables meet the specified requirements.

**Workflow:** You interact with the Manager Agent (via the User) and must maintain comprehensive documentation of your work in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to GitHub issue #26: "Create web-components library with dual consumption support" - establishing foundational architecture for UI component sharing across the monorepo.

**Objective:** Create a new `libs/web-components` library that extracts webview components from the VS Code extension and provides a foundation for sharing UI components across the monorepo with dual consumption support (React and HTML/JS).

**Detailed Action Steps:**

### Phase 1: Library Setup & Infrastructure (Priority 1)

1. **Create Library Structure:**
   - Create `libs/web-components/` directory structure following monorepo conventions
   - Setup `package.json` with dual build configuration for React and vanilla JS outputs
   - Configure TypeScript for React + vanilla JS outputs using appropriate compiler options
   - Setup esbuild for dual bundling (React components + vanilla JS widgets)
   - Create basic `src/index.ts` entry point for component exports

2. **Build Pipeline Integration:**
   - Add web-components to root `package.json` workspaces configuration
   - Create build scripts: `build:web-components` in root package.json
   - Configure dual output directories:
     - `dist/react/` - React components for consumption by other React apps
     - `dist/vanilla/` - Vanilla JS/HTML widgets for VS Code webviews
   - Update root build script to include web-components library in build process

3. **Development Tooling Setup:**
   - Install Storybook as dev dependency and initialize configuration in `libs/web-components/`
   - Setup basic testing framework (Jest + React Testing Library) as dev dependencies
   - Configure development scripts (`dev`, `build`, `test`, `storybook`) in package.json
   - Ensure all necessary dev dependencies are added: `@storybook/react`, `@storybook/addon-essentials`, `jest`, `@testing-library/react`, etc.

### Phase 2: Component Extraction & Migration (Priority 2)

4. **Extract TimeController Component:**
   - Create `libs/web-components/src/TimeController/TimeController.tsx` as React component
   - Implement as placeholder: `<div>TimeController Placeholder</div>`
   - Create Storybook story: `TimeController.stories.tsx` for development preview
   - Export component from `src/index.ts`
   - Build dual outputs (React component + vanilla JS widget wrapper)

5. **Extract PropertiesView Component:**
   - Create `libs/web-components/src/PropertiesView/PropertiesView.tsx` as React component
   - Implement as placeholder: `<div>PropertiesView Placeholder</div>`
   - Create Storybook story: `PropertiesView.stories.tsx` for development preview
   - Export component from `src/index.ts`
   - Build dual outputs (React component + vanilla JS widget wrapper)

6. **Update VS Code Extension Integration:**
   - Add `@debrief/web-components` dependency to `apps/vs-code/package.json`
   - Update `plotJsonEditor.ts` HTML template (lines 304-335) to include placeholder divs
   - Import vanilla JS widgets directly in `plotJsonEditor.ts` from `@debrief/web-components/vanilla`
   - Mount components directly in TypeScript code, eliminating the need for `media/plotJsonEditor.js`
   - Replace current component implementations with library placeholders

### Phase 3: Storybook & Testing (Priority 3)

7. **Storybook Implementation:**
   - Configure Storybook build process for component library
   - Create comprehensive stories for TimeController and PropertiesView components
   - Setup Storybook development server for component iteration
   - Integrate Storybook build into CI pipeline if applicable

8. **Testing Implementation:**
   - Setup Jest + React Testing Library in web-components library
   - Write basic rendering tests for TimeController and PropertiesView components
   - Configure test coverage reporting
   - Integrate tests into existing CI pipeline

**Provide Necessary Context/Assets:**

- **Current VS Code Implementation:** The existing webview implementation lives in `apps/vs-code/`:
  - HTML structure generated in `plotJsonEditor.ts` lines 304-335
  - JavaScript logic in `media/plotJsonEditor.js` with Leaflet-based map (can be eliminated by direct import)
  - TimeController and PropertiesView are not yet implemented (placeholders needed)
  - Goal: Import components directly in `plotJsonEditor.ts` instead of using separate media files

- **Monorepo Structure:** Follow the established `/libs` pattern for reusable code consumed by apps (albatross, replay, stac, toolvault, vs-code)

- **Build System:** The project uses pnpm workspaces and esbuild for fast bundling as documented in `apps/vs-code/CLAUDE.md`

- **Dual Consumption Pattern Example:**
  ```typescript
  // React component export
  export const TimeController: React.FC<TimeControllerProps> = ({ onTimeChange }) => {
    return <div>TimeController Placeholder</div>;
  };
  
  // Vanilla JS widget wrapper
  export function createTimeController(container: HTMLElement, props: TimeControllerProps) {
    // Mount React component in vanilla JS environment for VS Code webviews
  }
  ```

## 3. Expected Output & Deliverables

**Define Success:** Successful completion requires:
- New `libs/web-components` library with complete build pipeline
- TimeController and PropertiesView components extracted with placeholder implementations
- Storybook integration for component development
- Dual build outputs (React + vanilla JS) functioning correctly
- VS Code extension successfully using new library components
- All tests passing and build pipeline working end-to-end

**Specify Deliverables:**
1. Complete `libs/web-components/` directory with all source files and configuration
2. Updated `apps/vs-code/package.json` with web-components dependency
3. Modified `plotJsonEditor.ts` to directly import and use library components (eliminating `media/plotJsonEditor.js`)
4. Working Storybook setup with component stories
5. Basic test suite with Jest + React Testing Library
6. Updated root workspace configuration to include new library
7. Documentation: `libs/web-components/README.md` with comprehensive usage instructions for both consumption patterns

**Format:** All code should follow existing TypeScript/React conventions in the codebase. Maintain consistency with the established pnpm workspace structure and esbuild configuration patterns.

**Documentation Requirements:** The `README.md` must document both consumption patterns:

1. **React Component Consumption (for albatross and future React apps):**
   ```typescript
   // Install as workspace dependency
   import { TimeController, PropertiesView } from '@debrief/web-components';
   
   // Use in React components
   function App() {
     return <TimeController onTimeChange={handleTimeChange} />;
   }
   ```

2. **Compiled HTML/JS/CSS Consumption (for VS Code webviews):**
   ```typescript
   // Direct import in plotJsonEditor.ts (no separate media files needed)
   import { createTimeController, createPropertiesView } from '@debrief/web-components/vanilla';
   
   // Mount in webview DOM containers
   const timeController = createTimeController(document.getElementById('time-controller'), {
     onTimeChange: handleTimeChange
   });
   ```

Include build output structure, installation instructions, API documentation for both patterns, and examples for each target project type in the monorepo.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub issue #26 and this task assignment
- A clear description of all actions taken across each phase
- Code snippets for key component implementations and configurations
- Any key architectural decisions made or challenges encountered
- Confirmation of successful execution (build pipeline working, components rendering, tests passing)
- File paths and structure of all created deliverables

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This includes questions about:
- Specific build configuration requirements
- Integration patterns with the existing VS Code extension
- Component interface specifications
- Testing requirements or CI integration details