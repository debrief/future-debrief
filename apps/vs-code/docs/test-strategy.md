# Test Strategy

## Purpose
This document defines the testing strategy for the monorepo.  
It specifies which kinds of tests apply to each project (`apps` and `libs`), the tools used, and how testing is integrated into CI.

## Scope
The strategy applies to all sub-projects in the repository:
- `/libs/*` (internal libraries)
- `/apps/*` (deployable applications)

## Principles
1. **Apps do not depend on other apps.** Only on libraries.
2. **Libraries provide contracts and components.** They require unit and integration tests.
3. **Apps deliver features to end users.** They require end-to-end testing in addition to unit and integration tests where appropriate.
4. **UI review split:**  
   - Component-level: Storybook under `web-components`  
   - End-to-end: Playwright against running apps

## Test Matrix

| Project            | Unit Tests | Integration Tests | E2E Tests | Notes |
|--------------------|------------|-------------------|-----------|-------|
| **/libs/shared-types** | ✅ ts-jest / vitest | ❌ | ❌ | Pure TS types and utils |
| **/libs/web-components** | ✅ React Testing Library / vitest | ✅ Storybook stories + interaction tests | ❌ | Storybook also used for visual regression |
| **/apps/vs-code** | ✅ Mocha/Jest for extension host | ✅ VS Code Extension Test Runner | ❌ | E2E handled by manual packaging checks |
| **/apps/albatross** | ✅ Vitest for state logic | ❌ | ✅ Playwright | Full workflow tests in browser |
| **/apps/replay** | ❌ (minimal logic) | ❌ | ✅ Playwright | Playback scenarios only |
| **/apps/stac** | ✅ Jest / supertest for API | ✅ API ↔ web-components preview | ✅ Playwright | Tests both API and preview UI |
| **/apps/toolvault** | ✅ Tool execution logic | ✅ API + shared-types checks | ✅ Playwright | Tests interactive tool browsing and execution UI |

## Tooling
- **Unit Tests**: Vitest or Jest depending on project  
- **Integration Tests**:  
  - React Testing Library (component composition)  
  - Storybook interaction tests (UI)  
  - Supertest (API)  
- **End-to-End Tests**: Playwright (apps with UI)  
- **Visual Regression**: Storybook + Chromatic (optional)

## CI Integration
- All `libs` run unit + integration tests on every PR.  
- Each `app` runs its own CI pipeline from `/apps/{name}/`, including Playwright E2E tests if applicable.  
- Root CI orchestrator builds `/libs` first, then `/apps` in parallel.  
- Lint rules enforce that `/apps/*` cannot import from another `/apps/*`.

---
