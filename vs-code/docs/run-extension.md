# Running the Debrief VS Code Extension

This guide walks you through launching and viewing your custom VS Code extension.

---

## ✅ 1. Open the Extension Folder

Open the extension folder (e.g., `vs-code/`) in VS Code:

```bash
cd path/to/your/mono-repo/vs-code
code .
```

---

## ✅ 2. Build the Webviews (Outline & Timeline)

If using Vite for your React sidebar apps:

```bash
npm run build
```

This should output:

```
dist/extension.js
dist/extension.js.map
```

Make sure these are loaded into your webview HTML.

---

## ✅ 3. Start the Extension in Debug Mode

In VS Code:

1. Press `F5`  
   _or_  
   Run: `> Debug: Start Debugging` from the Command Palette

This will launch a new **Extension Development Host** window.

---

## ✅ 4. Open the Debrief Sidebar

In the Extension Development Host window:

1. Click the **Debrief** icon in the Activity Bar (left side)
2. You should see your **Outline** and **Timeline** side views
3. These will show the placeholder React content from your build

---

## 🔍 Debug Tips

### Backend (Extension)
Use `console.log()` — messages appear in the **“Extension”** debug console.

### Frontend (Webview React app)
1. Use `console.log()` as normal
2. Open Webview DevTools:
   ```
   > Developer: Open Webview Developer Tools
   ```
3. Click your webview to open its DevTools and inspect logs/elements.

---

## ✅ Summary

| Task                      | Command or Action                     |
|---------------------------|----------------------------------------|
| Open project              | `code .` in `vs-code/` folder         |
| Build webviews            | `npm run build`                       |
| Launch extension          | `F5` or `> Debug: Start Debugging`    |
| Open sidebar              | Click **Debrief** in Activity Bar     |
| Open Webview DevTools     | `> Developer: Open Webview DevTools`  |

