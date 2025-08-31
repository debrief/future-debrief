# APM Task Assignment: Auto-Cleanup Implementation

## 1. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4: Auto-Cleanup` in the [Implementation Plan](../../docs/debrief-pr-preview-implementation-plan.md).

**Objective:** Implement automated cleanup functionality that removes Fly.io preview deployments when pull requests are closed or merged, ensuring efficient resource management and cost control.

**Detailed Action Steps:**

1. **Create GitHub Action for PR Closure**
   - Create `.github/workflows/destroy-preview.yml` workflow file
   - Configure trigger for PR close events (both merge and manual close)
   - Ensure the workflow can identify which Fly.io app to destroy

2. **Implement Fly.io App Destruction Logic**
   - Use `fly apps destroy` command to remove the preview environment
   - Generate the correct app name using the pattern `pr-<pr_number>-futuredebrief`
   - Handle cases where the app might not exist or already be destroyed
   - Implement proper error handling and logging

3. **Resource Cleanup Verification**
   - Verify that all associated resources are properly cleaned up
   - Handle any edge cases where destruction might fail
   - Provide feedback on cleanup success/failure

4. **Integration with Existing Workflows**
   - Ensure the cleanup workflow works seamlessly with the PR preview workflow
   - Handle concurrent operations (e.g., if a PR is updated then immediately closed)
   - Test the complete lifecycle: create → update → destroy

**Provide Necessary Context/Assets:**

- The cleanup must be triggered on PR close events (both merge and manual close)
- The system must handle cases where previews might not exist
- Resource management is critical for cost control on Fly.io
- The workflow must use the same `FLY_API_TOKEN` from GitHub Actions Secrets
- The cleanup should be robust and not fail the entire workflow if the app doesn't exist
- Consider rate limiting and API quotas for Fly.io operations

## 2. Expected Output & Deliverables

**Define Success:** Successful completion means having a reliable cleanup system that:
- Automatically triggers when PRs are closed or merged
- Successfully destroys the corresponding Fly.io preview apps
- Handles edge cases gracefully without workflow failures
- Provides clear logging of cleanup operations
- Integrates seamlessly with the existing PR preview system

**Specify Deliverables:**
- `.github/workflows/destroy-preview.yml` - GitHub Actions cleanup workflow
- Any additional cleanup scripts or configuration files
- Documentation of the cleanup process and error handling
- Testing verification that the complete PR lifecycle works correctly

## 3. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to Phase 4: Auto-Cleanup in the Implementation Plan
- The complete cleanup workflow configuration
- Key decisions made regarding error handling and edge cases
- Any challenges encountered with Fly.io app destruction
- Test results demonstrating the complete PR lifecycle
- Confirmation of successful integration with the existing preview system

## 4. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.