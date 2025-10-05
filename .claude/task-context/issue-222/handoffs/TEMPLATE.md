# Phase {N} Handoff Document Template

**Phase Name**: {Phase Name}
**Agent**: {Agent Name}
**Completed By**: {Your Name/Agent ID}
**Completion Date**: {YYYY-MM-DD}
**Duration**: {Actual time spent}
**Status**: {Completed/Partial/Blocked}

---

## 🎯 Phase Objectives (What was supposed to be done)

- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

---

## ✅ Completed Deliverables

### Deliverable 1: {Name}
- **Location**: `path/to/file.ts`
- **Description**: Brief description
- **Key Changes**:
  - Change 1
  - Change 2

### Deliverable 2: {Name}
- **Location**: `path/to/file.ts`
- **Description**: Brief description
- **Key Changes**:
  - Change 1
  - Change 2

---

## 🏗️ Architectural Decisions Made

### Decision 1: {Title}
- **Date**: {YYYY-MM-DD}
- **Rationale**: Why this decision was made
- **Impact**: What this affects downstream
- **Alternatives Considered**: Other options that were rejected
- **Dependencies**: What depends on this decision

### Decision 2: {Title}
- **Date**: {YYYY-MM-DD}
- **Rationale**: Why this decision was made
- **Impact**: What this affects downstream

---

## 🔧 Implementation Details

### New Functions/Classes
```typescript
// Example code snippet
export function newFunction(param: Type): ReturnType {
  // implementation
}
```

### Key Interfaces/Types
```typescript
interface NewInterface {
  field1: Type;
  field2: Type;
}
```

### Error Codes Introduced
| Code | Name | Description | Retry? |
|------|------|-------------|--------|
| -32000 | ErrorName | Description | Yes/No |

---

## 📊 Test Results

### Unit Tests
- **Coverage**: {X}%
- **Tests Added**: {N} tests
- **Location**: `path/to/tests`
- **All Passing**: ✅ Yes / ❌ No (explain failures)

### Integration Tests
- **Scenarios Tested**: {N}
- **Location**: `path/to/integration-tests`
- **Results**: Description of test results

### Performance Benchmarks
- **Metric 1**: {value} (target: {target}) - ✅ Met / ❌ Not Met
- **Metric 2**: {value} (target: {target}) - ✅ Met / ❌ Not Met

---

## 🚨 Issues & Blockers

### Issue 1: {Title}
- **Severity**: High/Medium/Low
- **Description**: What's the problem
- **Workaround**: Temporary solution if any
- **Recommendation**: How next phase should handle this

### Issue 2: {Title}
- **Severity**: High/Medium/Low
- **Description**: What's the problem

---

## 🔄 Handoff to Next Phase

### What the Next Agent Needs to Know
1. **Critical Information**: Key points that must be understood
2. **Dependencies**: What files/functions they'll need to work with
3. **Open Questions**: Things that need to be decided
4. **Gotchas**: Tricky areas to watch out for

### Files Modified
- `path/to/file1.ts` - Description of changes
- `path/to/file2.ts` - Description of changes

### Files Created
- `path/to/newfile.ts` - Purpose and description

### Integration Points
- **API Endpoints**: New endpoints or changes to existing ones
- **Type Contracts**: New interfaces that other phases will use
- **Error Handling**: Error patterns that should be followed

### Next Phase Prerequisites
- [ ] Prerequisite 1 (e.g., "Review TimeState interface changes")
- [ ] Prerequisite 2 (e.g., "Understand retry logic implementation")
- [ ] Prerequisite 3 (e.g., "Familiarize with new error codes")

---

## 📈 Performance Impact Analysis

### Benchmarks Collected
- **Operation**: {Operation name}, **Latency**: {X}ms (target: {Y}ms)
- **Memory**: {X}MB baseline, {Y}MB under load

### Bottlenecks Identified
1. **Bottleneck**: Description and recommendation
2. **Bottleneck**: Description and recommendation

---

## 📝 Documentation Updates Required

- [ ] API documentation for new tools
- [ ] Type definitions documentation
- [ ] Error handling guide
- [ ] Integration examples
- [ ] Performance benchmarks

---

## 🎓 Lessons Learned

### What Went Well
- Success 1
- Success 2

### What Could Be Improved
- Improvement area 1
- Improvement area 2

### Recommendations for Future Phases
- Recommendation 1
- Recommendation 2

---

## 📎 References

- [Link to relevant PR](#)
- [Link to related issue](#)
- [Link to design doc](#)
- [Link to test results](#)

---

## ✍️ Sign-off

**Agent**: {Agent Name}
**Date**: {YYYY-MM-DD}
**Next Phase Can Begin**: ✅ Yes / ❌ No (explain why not)

**Next Agent**: Please review this handoff document before starting Phase {N+1}. Pay special attention to the "Handoff to Next Phase" section.
