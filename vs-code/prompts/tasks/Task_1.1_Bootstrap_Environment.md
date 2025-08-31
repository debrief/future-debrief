# APM Task Assignment: Complete Bootstrap Environment for Fly.io Deployment

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief Extension PR Preview Hosting with Fly.io project.

**Your Role:** As an Implementation Agent, your responsibility is to execute the assigned task diligently and log your work meticulously to maintain project continuity and knowledge transfer.

**Workflow:** You will receive task assignments from the Manager Agent (via the User) and must document all work in the Memory Bank upon completion.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 1: Bootstrap Environment` in the [Implementation Plan](../../docs/debrief-pr-preview-implementation-plan.md).

**Objective:** Complete the bootstrap environment setup by adding the missing Docker infrastructure needed for Fly.io deployment of code-server with the Debrief extension.

**Detailed Action Steps:**

1. **Verify existing project structure**
   - Confirm the existing VS Code extension is working (src/, package.json, workspace/ folder)
   - Review existing sample files in workspace/ (.rep files, .plot.json files)
   - Validate that the extension builds correctly with `npm run compile`

2. **Create code-server Dockerfile**
   - Create a Dockerfile that sets up a code-server environment
   - Install the Debrief extension from the built .vsix file
   - Copy workspace sample files into the container
   - Configure code-server to start with the workspace pre-loaded
   - Optimize for reasonable image size (target < 1 GB as per CI requirements)

3. **Add Docker support files**
   - Create .dockerignore file to exclude unnecessary files from build context
   - Add any additional configuration files needed for code-server setup

**Provide Necessary Context/Assets:**

- **Existing Assets:** The project already has:
  - Working VS Code extension in src/extension.ts and src/plotJsonEditor.ts
  - Sample data files in workspace/ (boat1.rep, boat2.rep, sample.plot.json, large-sample.plot.json)
  - Complete package.json with build scripts
  - README.md with project documentation
- **Missing Assets:** Need to create Docker infrastructure for code-server deployment
- The system will be accessible at `https://pr-<number>-futuredebrief.fly.dev`
- Must be stateless with no authentication required
- Sample files should be immediately available when the code-server starts

## 3. Expected Output & Deliverables

**Define Success:** Successful completion means having a complete Docker setup that:
- Builds a working code-server container with the Debrief extension pre-installed
- Includes all existing sample files from the workspace/ folder
- Is optimized for CI/CD deployment to Fly.io
- Can be locally tested before deployment

**Specify Deliverables:**
- `Dockerfile` for code-server setup with Debrief extension integration
- `.dockerignore` file to optimize build context
- Any additional Docker configuration files needed
- Verification that the Docker container builds and runs locally
- Documentation of any Docker-specific setup requirements

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to Phase 1: Bootstrap Environment in the Implementation Plan
- The complete Dockerfile configuration with explanations
- Key decisions made regarding code-server setup and extension installation
- Any challenges encountered with Docker optimization or extension integration
- Confirmation of successful Docker build and local testing results

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.