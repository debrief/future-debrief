# Implementation Plan

## Project: Debrief Extension PR Preview Hosting with Fly.io

---

## 1. Overview

This implementation plan defines the technical steps to deliver automated PR previews of the Debrief extension using `code-server` hosted on Fly.io. The previews will allow stakeholders to access a browser-based version of the extension, test new features, and provide feedback.

---

## 2. Goals

- Deploy a fresh preview for each open pull request
- Include the latest `.vsix` build of the extension
- Provide public access via Fly.io default subdomains
- Include sample `.rep` and `.geojson` files in each instance
- Automatically remove the environment when the PR closes

---

## 3. Technical Stack

- **Fly.io** – App hosting platform
- **code-server** – Browser-accessible VS Code
- **GitHub Actions** – CI automation for PR lifecycle
- **Docker** – Containerization of code-server and extension
- **vsce** – Tool for packaging the VS Code extension

---

## 4. Implementation Phases

### Phase 1: Bootstrap Environment
- [ ] Initialize GitHub repo with basic folder structure
- [ ] Add workspace files (e.g., `.geojson`, `.rep`, `README.md`)
- [ ] Add a simple `code-server` Dockerfile

### Phase 2: Fly.io Setup
- [ ] Install Fly CLI and run `fly launch`
- [ ] Generate `fly.toml` for the base app
- [ ] Create Fly.io app template with name pattern: `pr-<number>-futuredebrief`

### Phase 3: CI Setup
- [ ] Create GitHub Action to:
  - Checkout code
  - Build `.vsix` from the extension
  - Copy it into the Docker context
  - Build and deploy a new Fly.io app per PR
- [ ] Add logic to generate app names and inject PR number
- [ ] Output deployment URL as a PR comment

### Phase 4: Auto-Cleanup
- [ ] Add GitHub Action triggered on PR close
- [ ] Use `fly apps destroy` to remove the preview environment

---

## 5. CI Requirements

- `FLY_API_TOKEN` must be added as a GitHub Actions Secret
- The extension build must not rely on interactive prompts
- Docker image size should be optimized (< 1 GB preferred)

---

## 6. Naming Convention

- App Name: `pr-<pr_number>-futuredebrief`
- Domain: `https://pr-<pr_number>-futuredebrief.fly.dev`

---

## 7. Security & Access

- Publicly accessible with no authentication (for ease of access)
- Clean workspace reset per deployment
- No persistence of user changes or credentials

---

## 8. Estimated Timeline

| Task | Duration |
|------|----------|
| Initial setup and testing | 1 day |
| CI pipeline config | 1–2 days |
| Fly.io deployment | <1 day |
| PR comment integration | <1 day |
| Final testing and documentation | 1 day |

---

## 9. Deliverables

- `Dockerfile` for `code-server` with embedded `.vsix`
- `fly.toml` for app configuration
- `.github/workflows/pr-preview.yml`
- Optional: `destroy-preview.yml`
- README instructions for maintainers

