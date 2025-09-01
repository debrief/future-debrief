# Software Requirements Document (SRD)

## Project: Debrief Extension PR Preview Hosting with Fly.io

---

## 1. Purpose

This system enables the automatic deployment of a live, browser-based VS Code environment — powered by `code-server` — that includes the Debrief extension and curated sample data. It allows stakeholders to review pull requests (PRs) by interacting directly with the extension, without installing any software or needing a GitHub account.

---

## 2. Scope

This system covers:
- CI-based PR previews using GitHub Actions
- Dockerized `code-server` instances, each built per PR
- Deployment to Fly.io using default subdomains
- Inclusion of standard demo files (`.rep`, `.geojson`) in all environments
- Stateless, anonymous access to each preview via unique URL
- Auto-destruction of environments upon PR closure

---

## 3. Stakeholders

- Govt analysts & reviewers
- Defence contractors and collaborators
- Internal QA and dev teams

---

## 4. Functional Requirements

### 4.1. Preview Creation
- Triggered on PR open, update, or reopen
- Builds the Debrief extension as a `.vsix`
- Installs it into a `code-server` Docker image
- Deploys to Fly.io under a unique subdomain

### 4.2. Preview Access
- Opens at `https://pr-<number>-futuredebrief.fly.dev`
- Loads the latest Debrief extension and sample data
- Requires no login or password

### 4.3. Preview Destruction
- Triggered on PR close or merge
- Tears down the Fly.io deployment for that PR

---

## 5. Non-Functional Requirements

- Clean startup on every session (no saved state)
- Fast CI/CD cycle (< 3 minutes per deployment)
- CI uses public Fly.io infrastructure with GitHub Actions
- Fly.io API token stored in GitHub Secrets
- Open, public accessibility of previews

---

## 6. Assumptions

- Preview deployments are ephemeral and disposable
- Stakeholders do not require GitHub accounts
- Standard `.geojson` and `.rep` demo files are stored in `main` and copied into each preview
- Only one preview deployment per PR is active at a time

---

## 7. Out of Scope

- Custom domain hosting or TLS certificates
- Per-user authentication or analytics
- Long-term persistence of user edits
