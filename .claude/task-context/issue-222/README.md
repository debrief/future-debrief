# Shared Context for Issue #222: Phase 2 - Enhanced MCP Features

This directory contains shared context and handoff documents for the multi-agent implementation of Issue #222.

## 📁 Directory Structure

```
.claude/task-context/issue-222/
├── README.md              # This file - explains the context system
├── context.yaml           # Shared project state, constraints, and decisions
├── phase-1-requirements.md # Detailed Phase 1 task breakdown
└── handoffs/
    ├── TEMPLATE.md        # Template for phase handoff documents
    ├── phase-1.md         # Phase 1 completion handoff (created when done)
    ├── phase-2.md         # Phase 2 completion handoff (created when done)
    ├── phase-3.md         # Phase 3 completion handoff (created when done)
    ├── phase-4.md         # Phase 4 completion handoff (created when done)
    ├── phase-5.md         # Phase 5 completion handoff (created when done)
    └── phase-6.md         # Phase 6 completion handoff (created when done)
```

## 🎯 Purpose

This context system enables:

1. **Shared Understanding**: All agents work from the same source of truth
2. **Seamless Handoffs**: Clear deliverables and integration points between phases
3. **Context Preservation**: Architectural decisions and learnings are captured
4. **Reduced Rework**: Next agent knows exactly what was done and why

## 📖 How to Use This Context

### Before Starting Your Phase

1. **Read `context.yaml`**
   - Understand project state, constraints, and performance targets
   - Review prior decisions from Phase 1
   - Familiarize yourself with shared interfaces and error codes

2. **Check Dependencies**
   - Verify that all prerequisite phases are complete
   - Read handoff documents from prior phases
   - Understand what has been built so far

3. **Review Requirements**
   - Read your phase-specific requirements document
   - Understand your deliverables
   - Note what you need to hand off to the next phase

### During Your Phase

1. **Update `context.yaml`**
   - Add architectural decisions as you make them
   - Log performance metrics as you collect them
   - Document new error codes or interfaces

2. **Track Progress**
   - Check off tasks in the GitHub issue as you complete them
   - Update phase status in `context.yaml`
   - Note any blockers or issues

3. **Prepare for Handoff**
   - Document your implementation decisions
   - Create clear integration examples
   - Note any gotchas or edge cases

### After Completing Your Phase

1. **Create Handoff Document**
   - Copy `handoffs/TEMPLATE.md` to `handoffs/phase-{n}.md`
   - Fill in all sections with detailed information
   - Include code examples and integration points

2. **Update Shared Context**
   - Mark your phase as "completed" in `context.yaml`
   - Add final architectural decisions
   - Log final performance metrics

3. **Enable Next Phase**
   - Ensure all deliverables are committed
   - Run tests to verify everything works
   - Comment on GitHub issue that your phase is complete

## 🔄 Multi-Agent Workflow

```
Phase 1 (Backend)
    ↓ (creates handoff document)
Phase 2 (TypeScript)
    ↓ (creates handoff document)
Phase 3 (Backend - Error Handling)
    ↓ (creates handoff document)
Phase 4 (Testing)
    ↓ (creates handoff document)
Phase 5 (Frontend - Copilot Integration)
    ↓ (creates handoff document)
Phase 6 (Documentation)
    ↓
Release!
```

Each phase builds on the previous, with clear handoff points.

## 🎯 Success Criteria

Your phase is complete when:

- ✅ All tasks in your phase checklist are done
- ✅ All tests pass (unit, integration, performance)
- ✅ Handoff document is complete and detailed
- ✅ `context.yaml` is updated with your decisions
- ✅ Next phase agent can start without asking questions

## 🚨 Important Notes

1. **Never skip the handoff document** - The next agent depends on it!
2. **Document WHY, not just WHAT** - Explain your reasoning
3. **Update context.yaml in real-time** - Don't wait until the end
4. **Test before handing off** - The next phase assumes your code works
5. **Be specific in handoffs** - "Review the TimeState interface" is better than "Review types"

## 📊 Phase Overview

| Phase | Agent | Status | Duration | Deliverables |
|-------|-------|--------|----------|--------------|
| 1 | backend-developer | Not Started | 4-5h | MCP tools implementation |
| 2 | typescript-developer | Blocked | 2-3h | Type contracts & guards |
| 3 | backend-developer | Blocked | 3-4h | Error handling layer |
| 4 | test-developer | Blocked | 4-5h | Test suite & benchmarks |
| 5 | frontend-developer | Blocked | 3-4h | Copilot integration |
| 6 | code-documenter | Blocked | 2-3h | Documentation & release |

## 🆘 Questions or Issues?

If you encounter issues:

1. Check prior handoff documents for context
2. Review architectural decisions in `context.yaml`
3. Look at Phase 1 implementation for patterns
4. Document the issue in your handoff for the next agent
5. Update the "Issues & Blockers" section

## 📝 Quick Start Commands

```bash
# Start Phase 1
do-this 222 --phase 1

# Check status
do-this 222 --status

# View context
do-this 222 --show-context

# Start specific agent phase
do-this 222 --agent backend-developer
```

---

**Remember**: This context system is your collaboration tool. The more thorough you are, the smoother the next phase will go!
