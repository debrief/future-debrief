# Implement Task

This command will also accept the name of a markdown file under ./prompts/tasks/ and implement the task as specified in that file.  Or, if a number is provided, it will implement the task as specified in the file ./prompts/tasks/Task_Issue_{issue_number}.md.

## Branch Verification
Verify you're on the correct branch for this issue:

1. Check current branch: `git branch --show-current` (should show `issue-{issue_number}` or similar)
2. If not on the correct branch, switch to it: `git checkout issue-{issue_number}`

## Task Implementation
Read and implement the task assignment prompt at prompts/tasks/Task_Issue_{issue_number}.md. Follow all instructions in the prompt including:

1. Execute the detailed action steps as specified
2. Deliver the expected outputs and deliverables
3. Test the implementation to ensure it works correctly
4. Log the completed work to Memory_Bank.md following the specified format
5. Run lint and typecheck commands if available to ensure code quality

## Create Pull Request

Note: when creating the PR, do not attribute `Claude Code`, `Claude`, or `anthropic` to the changes.

Once development work is complete in the worktree:

1. Invite me to add the changes
2. Use `tell-me-about-it` to generate a commit message
3. Push the branch: `git push -u origin issue-{issue_number}`
4. Create PR using `create-pr` command

Complete the task thoroughly, document all work performed, and send a status report when the task is complete.