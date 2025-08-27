# APM Task Assignment: Fly.io Infrastructure Setup

## 1. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 2: Fly.io Setup` in the [Implementation Plan](../../docs/debrief-pr-preview-implementation-plan.md).

**Objective:** Configure the Fly.io infrastructure foundation for deploying code-server instances with the Debrief extension for PR previews.

**Detailed Action Steps:**

1. **Install Fly CLI and run `fly launch`**
   - Install the Fly CLI tool locally
   - Initialize the base Fly.io application configuration
   - Ensure compatibility with the existing Docker setup from Phase 1

2. **Generate `fly.toml` for the base app**
   - Create a comprehensive `fly.toml` configuration file
   - Configure appropriate resource allocation for code-server workloads
   - Set up networking and port configurations
   - Include environment variables needed for code-server operation

3. **Create Fly.io app template with name pattern: `pr-<number>-futuredebrief`**
   - Establish the naming convention for dynamic PR-based deployments
   - Configure the base template that will be used for each PR deployment
   - Ensure the configuration supports the automatic scaling and destruction requirements

**Provide Necessary Context/Assets:**

- The system must support dynamic app creation with the pattern `pr-<pr_number>-futuredebrief`
- Each deployment will be accessible at `https://pr-<pr_number>-futuredebrief.fly.dev`
- The configuration must support stateless operation with no persistent storage
- Resource allocation should be optimized for cost while ensuring good performance
- CI Requirements specify that `FLY_API_TOKEN` will be available as a GitHub Actions Secret

## 2. Expected Output & Deliverables

**Define Success:** Successful completion means having a complete Fly.io configuration that:
- Supports dynamic PR-based app deployments
- Provides appropriate resource allocation for code-server
- Follows the established naming conventions
- Is ready for CI/CD integration

**Specify Deliverables:**
- `fly.toml` configuration file with complete app settings
- Documentation of the Fly.io setup process
- Verification that the base configuration works with the Docker setup
- Any additional Fly.io configuration files or scripts needed

## 3. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to Phase 2: Fly.io Setup in the Implementation Plan
- The complete `fly.toml` configuration with explanations
- Key decisions made regarding resource allocation and naming conventions
- Any challenges encountered with Fly CLI setup
- Confirmation of successful configuration and readiness for CI integration

## 4. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.