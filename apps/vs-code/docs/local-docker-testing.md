# Local Docker Testing Guide

This guide provides step-by-step instructions for building and testing the Debrief VS Code extension in a Docker container locally, without deploying to fly.io.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Build Instructions](#build-instructions)
- [Running the Container](#running-the-container)
- [Accessing the Extension](#accessing-the-extension)
- [Testing Core Features](#testing-core-features)
- [Troubleshooting](#troubleshooting)
- [Differences from fly.io Deployment](#differences-from-flyio-deployment)

## Prerequisites

Before you begin, ensure you have the following tools installed:

1. **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop)
   - Ensure Docker daemon is running (check with `docker ps`)
   - Minimum version: Docker 20.10+

2. **Node.js** - Version specified in `.nvmrc` at the repository root
   - Use `nvm use` to switch to the correct version
   - Check your version: `node --version`

3. **pnpm** - Version 10.14.0 (as specified in root `package.json`)
   - Install: `npm install -g pnpm@10.14.0`
   - Check your version: `pnpm --version`

4. **Python 3.10+** - Required for building shared-types wheel
   - Check your version: `python3 --version`

## Quick Start

For those familiar with the codebase, here's the fastest path to a running container:

```bash
# From repository root
pnpm install
pnpm build:shared-types
pnpm build:web-components

# From apps/vs-code directory
cd apps/vs-code
pnpm build:docker
pnpm docker:build
pnpm docker:run
```

Then open your browser to: `http://localhost:8080`

**Bonus:** Use `pnpm docker:logs:follow` to watch container logs, and `pnpm docker:stop` to stop and remove the container.

## Build Instructions

### Step 1: Install Dependencies

From the repository root:

```bash
pnpm install
```

This installs all workspace dependencies for the monorepo.

### Step 2: Build Shared Types

The shared-types package must be built first, as it generates TypeScript types and Python wheels needed by other packages:

```bash
pnpm --filter @debrief/shared-types build
```

This will:
- Generate JSON schemas from Pydantic models
- Generate TypeScript types from schemas
- Build the Python wheel (`debrief_types-1.0.0-py3-none-any.whl`)
- Copy generated files to dependent packages

**Expected output location:** `libs/shared-types/dist/python/*.whl`

### Step 3: Build Web Components

The VS Code extension uses React components from the web-components package:

```bash
pnpm --filter @debrief/web-components build
```

This creates the vanilla JavaScript bundles needed by the extension webviews.

### Step 4: Package the Extension

Navigate to the VS Code extension directory and create the VSIX package:

```bash
cd apps/vs-code
npx @vscode/vsce package --no-dependencies
```

**Important:** Use the `--no-dependencies` flag because this is a pnpm monorepo. The vsce tool will try to use npm by default, which causes errors with pnpm workspaces.

**Output location:** `apps/vs-code/vs-code-0.0.1.vsix`

### Step 4.5: Copy VSIX to Repository Root

The Dockerfile expects the VSIX at the repository root. Copy it there:

```bash
cp vs-code-0.0.1.vsix ../../
cd ../..
```

Now the VSIX is at `./vs-code-0.0.1.vsix` (repository root), which the Docker build will find.

### Step 5: Build the Docker Image

From the repository root, build the Docker image:

```bash
docker build -t debrief-vscode-local \
  --build-arg GITHUB_SHA=local \
  --build-arg PR_NUMBER=dev \
  -f apps/vs-code/Dockerfile .
```

**Build Arguments:**
- `GITHUB_SHA=local` - Identifies this as a local build (used in labels)
- `PR_NUMBER=dev` - Development identifier (not a real PR number)
- `STATUS_WEBHOOK=""` - Optional webhook for build status notifications (omitted for local builds)

**Build Context:** The build context is the repository root (`.`), not `apps/vs-code`. This is required because the Dockerfile needs access to `libs/shared-types/`.

**Build Time:** Approximately 2-5 minutes depending on your system and network speed.

### What the Docker Build Does

The Dockerfile uses a multi-stage build:

1. **Stage 1 (shared-types-builder):**
   - Based on `python:3.11-slim`
   - Copies `libs/shared-types/` directory
   - Installs Python build dependencies
   - Builds the debrief-types wheel

2. **Stage 2 (main image):**
   - Based on `codercom/code-server:latest`
   - Installs Python 3, pip, and venv
   - Copies the entire project (respecting `.dockerignore`)
   - Copies the shared-types wheel from stage 1
   - Installs the pre-built VSIX extension
   - Installs the Python extension for VS Code
   - Creates workspace directory with sample files
   - Sets up Python virtual environment with test dependencies
   - Configures VS Code to use the virtual environment

## Running the Container

Start the container with port mapping:

```bash
docker run -p 8080:8080 -p 60123:60123 -p 60124:60124 debrief-vscode-local
```

**Port Mapping:**
- `-p 8080:8080` - Maps container port 8080 to host port 8080 (code-server web interface)
- `-p 60123:60123` - Maps WebSocket bridge port for Python-to-VS Code integration
- `-p 60124:60124` - Maps Tool Vault MCP-compatible REST endpoints

**Note:** If you only need the web interface, you can omit the `-p 60123:60123 -p 60124:60124` flags. These ports are only needed if you want to access the WebSocket bridge or Tool Vault API from outside the container.

**Container Startup:**
- The container runs `code-server` with no authentication
- Workspace directory: `/home/coder/workspace`
- Default user: `coder` (non-root)

**Optional: Run in Background**

```bash
docker run -d -p 8080:8080 -p 60123:60123 -p 60124:60124 --name debrief-test debrief-vscode-local
```

- `-d` - Detached mode (runs in background)
- `--name debrief-test` - Names the container for easy reference

**Viewing Logs:**

```bash
docker logs debrief-test
docker logs -f debrief-test  # Follow mode
```

**Stopping the Container:**

```bash
docker stop debrief-test
docker rm debrief-test  # Remove the container
```

## Accessing the Extension

Once the container is running:

1. **Open your browser** to: `http://localhost:8080`

2. **You should see:** The code-server interface with the workspace already loaded

3. **Verify the workspace:** You should see sample files including:
   - `*.plot.json` files for testing the custom editor
   - `README.md` with usage instructions
   - `tests/` directory with Python test scripts

## Testing Core Features

### 1. Extension Loading

Verify the Debrief extension is installed:

1. Click on the **Extensions** icon in the left sidebar (or press `Ctrl+Shift+X`)
2. Search for "debrief" or look in the installed extensions list
3. You should see the Debrief extension listed and enabled

### 2. Plot JSON Editor

Test the custom `.plot.json` editor:

1. In the Explorer, navigate to one of the `.plot.json` files in the workspace
2. Click on the file to open it
3. The custom Plot JSON editor should load with a Leaflet map
4. Verify that GeoJSON features render on the map

**Expected Features:**
- Interactive Leaflet map with zoom controls
- GeoJSON features (tracks, points, annotations) rendered on map
- Feature selection via clicking
- Integration with outline view (see below)

### 3. Map Rendering

Verify that maps render correctly:

1. Open a `.plot.json` file
2. Wait for the map to load (may take 1-2 seconds)
3. Verify:
   - Map tiles load properly
   - Zoom controls work
   - Features are visible and styled appropriately
   - Clicking features highlights them

**Troubleshooting:** If map tiles don't load, check browser console for network errors.

### 4. Outline View Integration

Test the GeoJSON outline view:

1. Open a `.plot.json` file
2. Look for the **Debrief Outline** view in the left sidebar
3. The outline should show a tree of features from the open plot file
4. Click on a feature in the outline - it should highlight in the map editor
5. Click on a feature in the map - it should select in the outline

### 5. WebSocket Integration

Test Python-to-VS Code integration:

1. In the code-server interface, open a terminal (`` Ctrl+` `` or Terminal > New Terminal)
2. Navigate to the tests directory:
   ```bash
   cd tests
   ```
3. Run a test script:
   ```bash
   venv/bin/python test_integration.py
   ```
4. The script should:
   - Connect to the WebSocket bridge on port 60123
   - Send commands to VS Code
   - Receive responses

**Expected Behavior:**
- The test script exits with code 0 (success)
- No connection errors in the output
- Commands execute and return expected responses

**Common Test Scripts:**
- `test_integration.py` - Comprehensive integration tests
- `test_notify_command.py` - Tests VS Code notifications
- `test_plot_api.py` - Tests plot manipulation API
- `move_point_north_simple.py` - Interactive example script

### 6. Python Environment

Verify the Python virtual environment is set up correctly:

1. Open a terminal in code-server
2. Check the Python version:
   ```bash
   /home/coder/workspace/tests/venv/bin/python --version
   ```
3. Verify debrief-types is installed:
   ```bash
   /home/coder/workspace/tests/venv/bin/pip list | grep debrief
   ```

**Expected Output:**
```
debrief-types    1.0.0
```

### 7. Tool Vault Integration

Verify the Tool Vault server configuration:

1. **Check Tool Vault file exists:**
   ```bash
   ls -lh /home/coder/tool-vault/toolvault.pyz
   ```
   Expected: File should be approximately 213KB

2. **Check environment variable:**
   ```bash
   echo $DEBRIEF_TOOL_VAULT_PATH
   ```
   Expected output: `/home/coder/tool-vault/toolvault.pyz`

3. **Verify Tool Vault path in VS Code:**
   - The VS Code extension will automatically detect the Tool Vault package via the `DEBRIEF_TOOL_VAULT_PATH` environment variable
   - The Tool Vault server starts automatically when the extension activates
   - Port 60124 is used for Tool Vault MCP-compatible REST endpoints

**Tool Vault Ports:**
- Port 60123: WebSocket bridge for Python-to-VS Code integration
- Port 60124: Tool Vault MCP-compatible REST endpoints

**Testing Tool Vault Functionality:**

Once a `.plot.json` file is open and the extension is activated, the Tool Vault server should be running. You can verify this by checking:

```bash
# From inside the container terminal
curl http://localhost:60124/health
```

Expected response: `{"status":"ok"}`

**Note:** The Tool Vault server is started by the VS Code extension during activation. If the health check fails, ensure:
- A `.plot.json` file is open in the editor
- The Debrief extension has activated successfully
- Check the extension host logs for any Tool Vault startup errors

## Troubleshooting

### Docker Build Failures

**Problem:** `Error: Pre-built vs-code-0.0.1.vsix missing`

**Solution:** Build the VSIX and copy it to the repository root before building the Docker image:
```bash
cd apps/vs-code
npx @vscode/vsce package --no-dependencies
cp vs-code-0.0.1.vsix ../../
cd ../..
```

The Dockerfile expects the VSIX at the repository root, not in `apps/vs-code/`.

---

**Problem:** `Error: debrief-types wheel not found`

**Solution:** Build shared-types before building Docker:
```bash
pnpm --filter @debrief/shared-types build
```

---

**Problem:** `Cannot connect to the Docker daemon`

**Solution:** Start Docker Desktop and ensure the Docker daemon is running:
```bash
docker ps  # Should list running containers, not error
```

---

**Problem:** Build hangs or takes extremely long

**Solution:** Check Docker Desktop resource allocation (CPU/memory). Increase if needed in Docker Desktop settings.

### Runtime Issues

**Problem:** Port 8080 already in use

**Solution:** Either stop the conflicting service or use a different port:
```bash
docker run -p 8888:8080 debrief-vscode-local
# Access at http://localhost:8888
```

---

**Problem:** Map tiles don't load in the Plot JSON editor

**Solution:**
- Check browser console for CORS or network errors
- Verify internet connectivity from the container
- Try refreshing the page

---

**Problem:** WebSocket connection refused on port 60123

**Solution:**
- Ensure a `.plot.json` file is open in VS Code (extension activates on `.plot.json` files)
- Check the extension host log: Help > Toggle Developer Tools > Console
- Look for WebSocket server startup messages

---

**Problem:** Python test scripts fail with "Connection refused"

**Solution:**
- Verify the Debrief extension is activated (open a `.plot.json` file)
- Check that the WebSocket server started successfully
- Ensure you're running the script from inside the container

---

**Problem:** Extension doesn't load or shows errors

**Solution:**
- Check the extension host log: Help > Toggle Developer Tools > Console
- Look for JavaScript errors or missing dependencies
- Verify the VSIX was built correctly (check file size, should be ~500KB)

### Development Workflow Issues

**Problem:** Changes to source code don't appear in the container

**Solution:** Rebuild the Docker image after making changes:
```bash
# Rebuild dependencies if needed
pnpm --filter @debrief/shared-types build
pnpm --filter @debrief/web-components build

# Rebuild VSIX and copy to repository root
cd apps/vs-code && npx @vscode/vsce package --no-dependencies && cp vs-code-0.0.1.vsix ../../ && cd ../..

# Rebuild Docker image
docker build -t debrief-vscode-local --build-arg GITHUB_SHA=local --build-arg PR_NUMBER=dev -f apps/vs-code/Dockerfile .
```

---

**Problem:** `pnpm` commands fail with "workspace not found"

**Solution:** Ensure you're running commands from the repository root, not from a subdirectory.

## Differences from fly.io Deployment

Understanding these differences helps when transitioning between local testing and production deployment:

| Aspect | Local Docker | fly.io Deployment |
|--------|-------------|-------------------|
| **Build Args** | `GITHUB_SHA=local`, `PR_NUMBER=dev` | `GITHUB_SHA=<commit>`, `PR_NUMBER=<actual-pr>` |
| **STATUS_WEBHOOK** | Empty string (no notifications) | Webhook URL for build status updates |
| **URL** | `http://localhost:8080` | `https://pr-<number>-futuredebrief.fly.dev` |
| **HTTPS** | No (plain HTTP) | Yes (automatic TLS) |
| **Persistence** | Ephemeral (lost on container restart) | Ephemeral (stateless design) |
| **Resource Limits** | Docker Desktop settings | fly.toml configuration (1 CPU, 1GB RAM) |
| **Auto-scaling** | No | Yes (can scale to 0 when idle) |
| **DNS** | localhost | fly.io subdomain |
| **Authentication** | None (--auth none) | None (public preview) |
| **Build Context** | Local repository | GitHub Actions runner |
| **Build Trigger** | Manual command | Automated on PR open/update |

**Key Similarity:** Both use the exact same Dockerfile and build process, ensuring parity between local and deployed environments.

## Additional Resources

- **Dockerfile:** `apps/vs-code/Dockerfile` - Multi-stage build with shared-types and code-server
- **fly.io Setup:** `apps/vs-code/docs/flyio-setup.md` - Deployment guide for fly.io
- **VS Code Extension Docs:** `apps/vs-code/CLAUDE.md` - Development guide for the extension
- **WebSocket Protocol:** `apps/vs-code/docs/ADRs/0002-websocket-port-conflict-resolution.md` - Port 60123 integration details
- **Sample Test Scripts:** `apps/vs-code/workspace/tests/` - Python examples for WebSocket integration

## Playwright Testing

Automated end-to-end tests validate that the Docker deployment works correctly. Tests cover extension startup, Tool Vault integration, and plot rendering functionality.

### Quick Start

Run the full test suite from the `apps/vs-code` directory:

```bash
cd apps/vs-code
pnpm test:playwright
```

**What happens:**
1. Playwright automatically builds the Docker image (if not already built)
2. Starts a container with all required port mappings
3. Runs all test scenarios against the running container
4. Cleans up the container when tests complete

**Test duration:** Approximately 3-5 minutes (includes Docker build time on first run)

### Available Test Commands

```bash
# Standard test run (headless)
pnpm test:playwright

# Interactive UI mode (for test development)
pnpm test:playwright:ui

# Headed mode (see browser during tests)
pnpm test:playwright:headed

# Debug mode (step through tests)
pnpm test:playwright:debug
```

### Test Coverage

The test suite includes:

1. **Docker Startup Tests** (`docker-startup.spec.ts`)
   - Container starts successfully
   - VS Code interface loads
   - Debrief extension is installed and enabled

2. **Tool Vault Integration Tests** (`tool-vault-integration.spec.ts`)
   - Health endpoint responds with structured JSON
   - WebSocket bridge is accessible on port 60123
   - Bidirectional communication works correctly

3. **Plot Rendering Tests** (`plot-rendering.spec.ts`)
   - Plot JSON files open successfully
   - Leaflet map renders with tiles and controls
   - Outline view displays GeoJSON features
   - UI elements are present and functional

### Test Architecture

Tests use a global setup/teardown pattern:

- **Global Setup** (`tests/playwright/global-setup.ts`)
  - Builds Docker image from repository root
  - Starts container with port mappings (8080, 60123, 60124)
  - Waits for VS Code interface to be ready
  - Stores container ID for cleanup

- **Global Teardown** (`tests/playwright/global-teardown.ts`)
  - Stops the Docker container
  - Removes the container
  - Cleans up temporary files

**Important:** Tests run sequentially (not in parallel) because they share a single Docker instance.

### Troubleshooting Tests

**Problem:** Docker daemon not running

**Solution:** Start Docker Desktop and verify with `docker ps`

---

**Problem:** Port conflicts (8080, 60123, or 60124 already in use)

**Solution:** Stop services using these ports or configure different ports in test setup

---

**Problem:** Build failures in test setup

**Solution:** Ensure dependencies are built first:
```bash
pnpm install
pnpm build:shared-types
pnpm build:web-components
```

---

**Problem:** Tests time out waiting for VS Code

**Solution:**
- Check Docker has sufficient resources (CPU/memory)
- Check container logs: `docker logs debrief-playwright-test`
- Increase timeout in `playwright.config.ts` if needed

---

**Problem:** Orphaned test containers

**Solution:** Manually clean up with:
```bash
docker stop debrief-playwright-test
docker rm debrief-playwright-test
```

### CI/CD Integration

The Playwright test suite provides:
- **Pre-deployment confidence** - Catch Docker-specific issues before fly.io deployment
- **Fast local feedback** - Developers can validate changes quickly
- **Automated regression testing** - Prevent breaking changes to core functionality

Future enhancement (Phase 2): GitHub Actions integration for automated PR testing.

## Next Steps

After successful local testing:

1. **Make Changes:** Modify extension source code in `apps/vs-code/src/`
2. **Rebuild:** Follow the build instructions above to rebuild the VSIX and Docker image
3. **Test Again:** Verify your changes work in the local container
4. **Run Tests:** Validate with `pnpm test:playwright` to catch regressions
5. **Deploy:** Use the fly.io deployment workflow to test in a production-like environment

---

**Questions or Issues?** Check the existing documentation in `apps/vs-code/docs/` or open an issue on GitHub.