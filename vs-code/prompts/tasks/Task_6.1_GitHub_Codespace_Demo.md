# APM Task Assignment: GitHub Codespace Demo Environment

## 1. Agent Role & APM Context

* **Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.
* **Your Role:** Execute assigned tasks diligently and log work meticulously to the Memory Bank.
* **Workflow:** You interact with the Manager Agent via the User and must maintain detailed records in the Memory Bank for project continuity.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to implementing the GitHub Codespace demo environment as described in [docs/debrief-codespace-strategy.md](../../docs/debrief-codespace-strategy.md).
* **Objective:** Create a zero-install, browser-based demonstration environment using GitHub Codespaces where stakeholders can review the VS Code extension capabilities with sample data and guided workflows.

* **Detailed Action Steps:**

  1. **Create Codespace Configuration Structure:**
     * Create `.devcontainer/` directory in the repo root (if not already present)
     * Create `devcontainer.json` configuration file with the following requirements:
       - Use GitHub's universal dev container image: `mcr.microsoft.com/devcontainers/universal`
       - Set workspace folder to `/workspace`
       - Configure postCreateCommand to install the extension: `"postCreateCommand": "code --install-extension ./"`
       - Set startup editor to readme for guided experience
       - Name the container "Debrief Codespace"

  2. **Create Sample Workspace Directory:**
     * Create `workspace/` directory in repo root
     * Add curated sample files:
       - `large-sample.plot.json` - A representative GeoJSON file with maritime or military track data
       - `boat1.rep` and `boat2.rep` - Sample replay files in Debrief format
       - `README.md` - Step-by-step walkthrough for stakeholders
     * Ensure sample files demonstrate the extension's key capabilities (map visualization, timeline, properties)

  3. **Develop Stakeholder Instructions:**
     * Create comprehensive `workspace/README.md` with:
       - Welcome message explaining the demo purpose
       - Step-by-step instructions for opening and exploring sample files
       - Guided workflow: import → plot → annotate → explore features
       - Clear explanations of what stakeholders should observe
       - Links for providing feedback (GitHub Issues or direct contact)
       - Instructions for trying different features (map editor, timeline, properties panel)

  4. **Configure Extension Installation Process:**
     * Verify the extension can be installed from the repo root using `code --install-extension ./`
     * Ensure package.json and extension manifest are properly configured for installation
     * Test that the extension activates correctly in the Codespace environment
     * Verify all dependencies are available in the universal dev container

  5. **Create Branch Strategy Documentation:**
     * Document the maintenance model with `main` (stable) and `dev` (experimental) branches
     * Ensure the Codespace configuration works on both branches
     * Create instructions for maintaining and updating the demo environment

* **Provide Necessary Context/Assets:**
  * Review existing extension structure in `src/` directory
  * Reference the package.json for extension manifest configuration
  * Use the debrief-codespace-strategy.md as the primary requirements document
  * Ensure compatibility with the existing VS Code extension architecture
  * Sample data should be realistic but not contain sensitive information

## 3. Expected Output & Deliverables

* **Define Success:** A fully functional GitHub Codespace that launches in a browser, automatically installs the Debrief extension, and provides stakeholders with guided access to sample data and workflows.

* **Specify Deliverables:**
  * `.devcontainer/devcontainer.json` - Complete Codespace configuration
  * `workspace/` directory with sample files:
    - `sample1.geojson` - Representative GeoJSON data
    - `demo.rep` - Sample replay file
    - `README.md` - Complete stakeholder walkthrough
  * Updated repo README.md with Codespace launch instructions
  * Verification that extension installs and functions correctly in Codespace environment

* **Format:** Standard GitHub Codespace configuration following devcontainer specification, markdown documentation following project conventions.

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
* A reference to this assigned task (Task 6.1 - GitHub Codespace Demo Environment)
* A clear description of the actions taken
* Configuration files created and their key settings
* Sample files created and their purpose
* Any key decisions made or challenges encountered
* Confirmation of successful execution (Codespace launches, extension installs, sample files accessible)
* Testing results from launching the Codespace environment

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.