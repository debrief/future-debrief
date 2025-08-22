# Hosted Debrief Codespace Demo Strategy

## 📌 Business Requirement

Provide a **browser-based, zero-install environment** where stakeholders across MOD, DSTL, NATO, and industry can:
- Try new Debrief UI features
- Explore curated `.geojson` and `.rep` files
- Follow guided workflows (e.g., import → plot → annotate)
- Give feedback in structured or direct conversations

This platform will act as a **persistent, living demo**, allowing stakeholders to evaluate progress and usability throughout the project's development lifecycle.

---

## 🧭 Strategy Summary

We will use **GitHub Codespaces** to host a full VS Code environment, preloaded with:
- The Debrief extension (installed from the repo root)
- Sample data
- A walkthrough and instructions
- Functional editing tools for multiple plots

### Why GitHub Codespaces?
- Zero install, browser-accessible
- Faster startup using GitHub’s **standard container image**
- GitHub-native integration
- Branch-based previews (`main` vs `dev`)

---

## 🧱 Technologies in Use

| Component | Technology |
|----------|-------------|
| Hosting | GitHub Codespaces |
| Editor Platform | VS Code Web |
| Extension | Debrief custom editor (Leaflet + React) — installed from repo root |
| Data Formats | `.geojson`, `.rep` |
| Dev Environment | GitHub's universal dev container (`mcr.microsoft.com/devcontainers/universal`) |
| Feedback | Direct verbal, optional GitHub Issues |

---

## 🛠️ Implementation Steps

### 1. Repo Structure

The GitHub repo will have this structure:

```
future-debrief-codespace/
├── .devcontainer/
│   └── devcontainer.json
├── src/                        ← Your extension source code
├── package.json                ← Extension manifest
├── workspace/
│   ├── sample1.geojson
│   ├── demo.rep
│   └── README.md
└── README.md                  ← Repo landing page
```

### 2. `.devcontainer/devcontainer.json`

```json
{
  "name": "Debrief Codespace",
  "image": "mcr.microsoft.com/devcontainers/universal",
  "postCreateCommand": "code --install-extension ./",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "settings": {
        "workbench.startupEditor": "readme"
      }
    }
  }
}
```

### 3. Sample Workspace Files

Add curated sample content to `/workspace`:
- `sample1.geojson`
- `demo.rep`
- `README.md` with guided steps

---

## 🔁 Testing & Review Process

| Role | Test Action |
|------|-------------|
| Reviewer | Open Codespace via GitHub UI |
|          | Follow README instructions |
|          | Load and explore `.geojson` and `.rep` files |
|          | Use map editor, timeline, and properties |
| Facilitator | Observe, gather feedback in conversation |
| Optionally | Review GitHub Issues created via feedback link |

---

## 🔄 Maintenance Model

| Component | Strategy |
|----------|----------|
| Codespace branches | `main` (stable), `dev` (experimental) |
| Extension updates | Just commit changes to the repo |
| Session persistence | Ephemeral — reset on close |
| Feedback | Primarily verbal; GitHub Issues optional |

---

## ✅ Summary

This Codespace demo offers a low-friction, zero-install way for stakeholders to evaluate Future Debrief — supporting trusted review, practical feedback, and long-term confidence in its roadmap.

Using GitHub’s **standard dev container** avoids build delays and enables fast, reliable launch on any device.
