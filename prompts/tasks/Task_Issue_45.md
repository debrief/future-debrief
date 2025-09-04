# APM Task Assignment: Integrate PropertiesView Web Component into VS Code Extension

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Future Debrief VS Code extension integration project.

**Your Role:** You will execute this assigned task diligently by replacing custom HTML properties viewer code with the standardized PropertiesView web component, ensuring proper integration and functionality.

**Workflow:** You will work with the Manager Agent (via the User) and document your progress meticulously in the Memory Bank upon completion.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to [GitHub Issue #45: Use properties viewer from web-components](https://github.com/debrief/future-debrief/issues/45).

**Objective:** Replace the custom HTML implementation in `propertiesViewProvider.ts` with the PropertiesView React component from the `@debrief/web-components` library that has already been bundled into `media/web-components.*` files.

**Current State Analysis:**
- The `PropertiesViewProvider` class in `apps/vs-code/src/providers/panels/propertiesViewProvider.ts:180-351` contains extensive custom HTML template code
- The PropertiesView component exists in `libs/web-components/src/PropertiesView/PropertiesView.tsx` with interface definition
- Web components have already been bundled into `apps/vs-code/media/web-components.js` and `apps/vs-code/media/web-components.css`
- The current implementation handles feature properties display, geometry information, and feature ID presentation

**Detailed Action Steps:**

1. **Analyze Current Implementation:**
   - Review the existing `_getHtmlForWebview()` method in `propertiesViewProvider.ts:180-351`
   - Document the current feature property display logic, styling, and message handling
   - Identify the data format expected by the webview for feature display

2. **Examine PropertiesView Component Interface:**
   - Study the `PropertiesViewProps` interface in the web-components library
   - Map the current feature data structure to the component's expected `Property[]` format
   - Understand the component's event handling for `onPropertyChange`

3. **Implement Web Component Integration:**
   - Replace the custom HTML template in `_getHtmlForWebview()` with a minimal HTML structure that:
     - Loads the web-components CSS and JS files from the media directory
     - Creates a React root container element
     - Initializes the PropertiesView React component
   - Transform feature data from the current format to match the `Property[]` interface expected by PropertiesView
   - Ensure proper CSP (Content Security Policy) compliance for the webview

4. **Update Message Handling:**
   - Modify the `displayFeatureProperties()` JavaScript function to work with the React component
   - Ensure the `featureSelected` message type properly updates the PropertiesView component
   - Maintain backward compatibility with existing message protocols

5. **Configure Webview Resources:**
   - Update webview resource loading to include the web-components assets
   - Verify CSP settings allow loading of the bundled JavaScript and CSS files
   - Test that the webview can properly initialize the React component

6. **Preserve Existing Functionality:**
   - Ensure feature properties, geometry information, and feature ID display remain functional
   - Maintain the existing styling and user experience
   - Preserve the property change event handling (even though it's currently a TODO)

**Technical Requirements:**
- Use the existing web-components bundle files in `media/web-components.js` and `media/web-components.css`
- Maintain the current data flow from GlobalController through the webview messaging system
- Preserve VS Code theming integration
- Ensure the component properly handles null/empty feature states

**Key Files to Modify:**
- `apps/vs-code/src/providers/panels/propertiesViewProvider.ts` (primary changes in `_getHtmlForWebview` method)

**Key Files to Reference:**
- `libs/web-components/src/PropertiesView/PropertiesView.tsx` (component interface)
- `apps/vs-code/media/web-components.js` (bundled component code)
- `apps/vs-code/media/web-components.css` (bundled component styles)

## 3. Expected Output & Deliverables

**Define Success:** The PropertiesViewProvider successfully displays feature properties using the PropertiesView React component instead of custom HTML, maintaining all existing functionality while leveraging the standardized web component.

**Specify Deliverables:**
- Modified `propertiesViewProvider.ts` file with web component integration
- Working properties panel that displays feature information using the React component
- Preserved message handling and data transformation logic
- Maintained VS Code theming and styling consistency

**Verification Steps:**
- Properties panel loads without errors when a feature is selected
- Feature properties, geometry, and ID information display correctly
- Component properly handles empty/null feature states
- VS Code theme integration remains functional

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank file. Adhere strictly to the established logging format and ensure your log includes:

- A reference to GitHub Issue #45 and this task assignment
- A clear description of the integration approach taken
- Code snippets showing the key changes made to the webview HTML generation
- Documentation of the data transformation logic between feature objects and Property[] format
- Any challenges encountered during React component integration in VS Code webview context
- Confirmation of successful testing with feature selection and properties display

## 5. Clarification Instruction

If any part of this task assignment is unclear, particularly regarding the PropertiesView component interface, webview integration patterns, or data transformation requirements, please state your specific questions before proceeding.