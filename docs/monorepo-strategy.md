# Monorepo Strategy — Future Debrief

## Purpose
This document describes the **general strategy** for managing the Future Debrief monorepo.  
It defines principles, structure, workflows, and governance decisions that apply across all projects in the repository.

---

## Principles
1. **Apps are releaseable units**  
   Each folder under `/apps/*` is a standalone deliverable (extension, service, container, or web app).  
   Each app has its own build and deployment pipeline.

2. **Libs provide shared functionality**  
   Folders under `/libs/*` contain reusable code (shared types, UI components).  
   Apps may depend on libs, but never on other apps.

3. **Single source of truth**  
   All related projects live in one monorepo for easier dependency management and CI/CD optimisation.

4. **Separation of concerns**  
   Apps = products delivered externally.  
   Libs = internal-only, implementation details.

5. **Staged refactoring**  
   Initial phase prioritises structure and CI stability.  
   Later phases progressively separate tightly coupled code into clean app/lib boundaries.

---

## Repo Structure

```
/apps
  /vs-code             ← VS Code extension
  /review-container    ← Docker container + Fly.io deployment (to be extracted in Phase 2)
  /albatross           ← (future) browser analysis editor
  /replay              ← (future) playback tool
  /stac                ← (future) STAC datastore + preview
  /toolvault           ← (future) tool service

/libs
  /shared-types        ← TypeScript contracts, enums
  /web-components      ← React + Leaflet UI components

/.github/workflows/    ← root workflows (trigger entrypoints)
/docs                  ← system docs + ADRs
```

---

## CI/CD Strategy
- **Root workflows** live in `.github/workflows/`.  
- Workflows call into app-specific scripts/actions where needed.  
- **Path filters** ensure only affected apps/libs trigger builds.  
- **Turborepo** manages dependency graph and incremental builds.  
- **Phase 1**: CI ensures VS Code + review-container still build and deploy.  
- **Later phases**: stricter lint, test, Storybook, Playwright added.

---

## Testing Strategy
- **Libs**: unit + integration tests (e.g. React Testing Library, Storybook).  
- **Apps**: unit + end-to-end tests (Playwright).  
- **Phase 1**: copy tests as-is, refactor later.

---

## Versioning & Releases
- **Apps**: independent semantic versions, tagged (`vs-code-v1.0.0`, etc.).  
- **Libs**: internal only, not versioned externally.  
- GitHub Releases tied to tags, with auto-generated changelogs.

---

## Branching
- `main` = stable branch.  
- Long-lived `monorepo-refactor` branch supports the migration.  
- Small PRs merge into the refactor branch, then refactor merges into `main` in one go.

---

## Governance
- CI/CD lives at repo root but each app is responsible for its own logic.  
- ESLint rules will enforce dependency boundaries (apps → libs only).  
- Code reviews handled per PR; CODEOWNERS optional.  
- Documentation: root README + per-app READMEs.  
- ADRs capture specific design decisions; system docs capture overall strategy.

---

## Success Criteria
- VS Code extension and review-container continue to build/deploy with no regressions.  
- CI pipelines run cleanly.  
- Repo structure is stable enough to support future libs and apps without further reshuffle.
