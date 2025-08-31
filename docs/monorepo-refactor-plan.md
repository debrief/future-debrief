# Monorepo Refactor Plan — Future Debrief

## Purpose
Restructure the current single-repo (VS Code extension + Fly.io review container) into a monorepo.  
This provides a foundation for future apps and shared libraries, while keeping the existing workflows working without regression.

## Scope (Phase 1)
- Move existing **VS Code extension** into `/apps/vs-code`.
- Include the **review-container** (Docker + Fly.io deploy configs) inside `/apps-vs-code` for now, since both are tightly coupled.
- Configure root-level CI workflows that call app-local CI configs.
- Ensure VS Code extension still builds and deploys through the container on Fly.io.
- Do **not** introduce new apps or libs yet.

## Future Scope (later phases)
- Add `libs/shared-types` (contracts, enums, state structures).
- Add `libs/web-components` (React + Leaflet + Storybook).
- Expand `/apps` to include `albatross`, `replay`, `stac`, `toolvault`.

---

## Principles
1. **Apps are releaseable units** (`/apps/*`), each with its own deploy pipeline.
2. **Libs are internal only** (`/libs/*`), no external publishing.
3. **Apps never depend on other apps.**  
   Only `libs` may be shared between them.
4. CI/CD workflows **live at repo root** (`.github/workflows/`), but app-specific logic lives inside each `/apps/{name}/ci/` folder.
5. Monorepo orchestration uses **pnpm workspaces + Turborepo**.
6. Refactor happens in a long-lived `monorepo-refactor` branch, fed by small PRs.  
   Final merge to `main` once stable.

---

## Repo Structure (Phase 1)

```
/apps
  /vs-code             ← contains current extension + container deploy configs

/libs
  /shared-types        ← placeholder only
  /web-components      ← placeholder only

/.github/workflows/    ← root workflows (wrappers that call app-local CI)
/docs                  ← system docs + ADRs
```

---

## Phase 1 Migration Method (Strategy B — Single Move then Extract)
- Move the **entire current repo** into `/apps/vs-code`.
- Keep **review-container** deployment code (Docker, Fly.io) inside `/apps/vs-code` during Phase 1.
- CI remains unchanged except for paths, ensuring build + deploy still work.
- Do **not** duplicate code into `/apps/review-container` yet.

### Phase 2
- Create `/apps/review-container`.
- Move Dockerfile + Fly.io configs into that folder.
- Update `review-container` to consume the `vs-code` build artifact (e.g. `.vsix` or dist).
- Clean `/apps/vs-code` so it contains only extension code.
- CI: `vs-code` produces artifact → `review-container` builds Docker → deploy.

This staged approach keeps history intact, avoids duplication, and cleanly separates concerns only once the structure is stable.

---

## CI/CD Approach
- Workflows at root, filtered by `paths` so they only trigger for relevant apps/libs.
- App-local configs under `/apps/{name}/ci/`, referenced from root.
- Turborepo pipeline:
  ```json
  {
    "pipeline": {
      "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
      "test": { "dependsOn": ["^build"] },
      "lint": {}
    }
  }
  ```
- Dependency graph inferred from `package.json` (later `review-container` depends on `vs-code`).

---

## Testing Strategy
- **Phase 1**: Keep existing tests as-is. CI runs them unchanged.
- **Later**: Apply test strategy by project type:
  - Libs → unit + integration (Storybook).
  - Apps → unit + E2E (Playwright).

---

## Versioning & Releases
- **Apps**: independent semantic versions, tagged (`vs-code-v1.0.0`, etc.).
- **Libs**: internal only, not versioned externally.
- GitHub Releases tied to tags, with auto-generated notes.

---

## Success Criteria
1. ✅ VS Code extension (with container configs) still builds and deploys with no regressions.
2. ✅ CI pipelines run clean for vs-code.  
3. ✅ Repo structure is stable enough to later extract review-container and add libs/apps.

---

## Next Steps After Phase 1
- Extract `/apps/review-container` from `/apps/vs-code`.
- Scaffold `libs/shared-types` (stub only).
- Scaffold `libs/web-components` (with React/Leaflet + Storybook).
- Introduce stricter CI rules: linting, ESLint dependency checks, formatting.
- Add additional apps (`albatross`, `replay`, `stac`, `toolvault`) as needed.
