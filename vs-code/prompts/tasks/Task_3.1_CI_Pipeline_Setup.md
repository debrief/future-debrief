# APM Task Assignment: CI Pipeline Setup for PR Previews

## 1. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 3: CI Setup` in the [Implementation Plan](../../docs/debrief-pr-preview-implementation-plan.md).

**Objective:** Create a comprehensive GitHub Actions workflow that automatically builds the Debrief extension, packages it into a Docker container with code-server, and deploys it to Fly.io for each pull request.

**Detailed Action Steps:**

1. **Create GitHub Action for PR Preview Deployment**
   - Create `.github/workflows/pr-preview.yml` workflow file
   - Configure triggers for PR open, update, and reopen events
   - Set up proper job dependencies and error handling

2. **Implement Extension Build Process**
   - Checkout code from the PR branch
   - Build the Debrief extension as a `.vsix` file using `vsce`
   - Ensure the build process is non-interactive and CI-friendly
   - Handle any dependencies needed for the extension build

3. **Docker Integration and Deployment**
   - Copy the built `.vsix` file into the Docker context
   - Build the Docker image with code-server and the extension
   - Optimize the Docker build process for speed and size

4. **Fly.io Deployment Orchestration**
   - Generate unique app names using the pattern `pr-<number>-futuredebrief`
   - Inject PR number dynamically into the deployment configuration
   - Deploy the new Fly.io app with the built Docker image
   - Handle deployment failures gracefully

5. **PR Comment Integration**
   - Generate the deployment URL: `https://pr-<pr_number>-futuredebrief.fly.dev`
   - Post a comment on the PR with the preview URL
   - Include status information and access instructions

**Provide Necessary Context/Assets:**

- CI Requirements from the Implementation Plan:
  - `FLY_API_TOKEN` must be used from GitHub Actions Secrets
  - Extension build must not rely on interactive prompts
  - Docker image size should be optimized (< 1 GB preferred)
  - Fast CI/CD cycle target: < 3 minutes per deployment
- The workflow must handle the complete lifecycle from code to deployed preview
- Each PR should have only one active preview deployment
- The system must be robust against common CI/CD failure scenarios

## 2. Expected Output & Deliverables

**Define Success:** Successful completion means having a fully functional CI pipeline that:
- Automatically triggers on PR events
- Successfully builds and packages the Debrief extension
- Deploys working code-server instances to Fly.io
- Provides accessible preview URLs via PR comments
- Completes deployments within the 3-minute target

**Specify Deliverables:**
- `.github/workflows/pr-preview.yml` - Complete GitHub Actions workflow
- Any additional CI configuration files or scripts
- Documentation of the CI process and troubleshooting
- Verification that the workflow handles edge cases (build failures, deployment issues)

## 3. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to Phase 3: CI Setup in the Implementation Plan
- The complete GitHub Actions workflow configuration
- Key decisions made regarding build optimization and error handling
- Any challenges encountered with the CI/CD integration
- Performance metrics if available (build times, image sizes)
- Confirmation of successful workflow execution and PR preview generation

## 4. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.