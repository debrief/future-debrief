import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Playwright tests - builds and starts Docker container.
 *
 * This script:
 * 1. Builds the Docker image using the production Dockerfile
 * 2. Starts the container with required port mappings
 * 3. Waits for VS Code web interface to be ready
 * 4. Stores container ID for cleanup in teardown
 *
 * Build happens from repository root (not apps/vs-code/) as per Dockerfile requirements.
 */

const CONTAINER_NAME = 'debrief-playwright-test';
const CONTAINER_ID_FILE = path.join(__dirname, '.container-id');
const VS_CODE_PORT = 8080;
const WEBSOCKET_PORT = 60123;
const TOOL_VAULT_PORT = 60124;
const READINESS_TIMEOUT_MS = 180000; // 3 minutes for full startup
const POLL_INTERVAL_MS = 2000;

async function globalSetup() {
  console.log('🚀 Starting Docker-based VS Code extension test setup...\n');

  try {
    // Check if Docker daemon is running
    try {
      execSync('docker info', { stdio: 'pipe' });
    } catch {
      throw new Error(
        '❌ Docker daemon is not running. Please start Docker and try again.'
      );
    }

    // Clean up any existing container with the same name
    console.log('🧹 Cleaning up any existing test containers...');
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'pipe' });
      console.log('   Removed existing container');
      // Wait for ports to be released
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('   Ports released\n');
    } catch {
      // No existing container, that's fine
      console.log('   No existing container to remove\n');
    }

    // Check port availability - fail if ports are in use rather than killing arbitrary processes
    console.log('🔍 Checking port availability...');
    const portsInUse: Array<{ port: number; pids: string }> = [];

    for (const port of [VS_CODE_PORT, WEBSOCKET_PORT, TOOL_VAULT_PORT]) {
      try {
        const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
        if (output) {
          portsInUse.push({ port, pids: output });
        }
      } catch {
        // Port is free (lsof returns non-zero when no processes found)
      }
    }

    if (portsInUse.length > 0) {
      console.error('\n❌ Required ports are already in use:\n');
      for (const { port, pids } of portsInUse) {
        console.error(`   Port ${port}: process(es) ${pids}`);
        try {
          const processInfo = execSync(`ps -p ${pids.split('\n')[0]} -o comm=`, {
            encoding: 'utf-8',
            stdio: 'pipe'
          }).trim();
          console.error(`   (${processInfo})`);
        } catch {
          // Process info not available
        }
      }
      console.error('\nPlease stop these processes before running tests.');
      console.error('Common solutions:');
      console.error('  - Stop any running Docker containers: docker stop debrief-playwright-test');
      console.error('  - Check for other VS Code instances or web servers');
      throw new Error('Required ports are in use. Tests cannot proceed.');
    }

    console.log('   All ports available\n');

    // Find repository root using git (works with worktrees)
    let repoRoot: string;
    try {
      repoRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        cwd: __dirname,
      }).trim();
    } catch {
      throw new Error(
        '❌ Could not find git repository root. Are you in a git repo?'
      );
    }

    // Build VSIX with current code
    console.log('📦 Building VSIX with current extension code...');
    const vsCodeDir = path.join(repoRoot, 'apps/vs-code');
    const vsixPath = path.join(vsCodeDir, 'vs-code-0.0.1.vsix');

    try {
      execSync('pnpm build', {
        cwd: vsCodeDir,
        stdio: 'inherit',
      });
      console.log('✅ VSIX built successfully\n');
    } catch {
      throw new Error(
        '❌ Failed to build VSIX. Ensure dependencies are built first:\n' +
          '   pnpm --filter @debrief/shared-types build\n' +
          '   pnpm --filter @debrief/web-components build'
      );
    }

    // Check if Docker image exists, build only if missing
    console.log('🔍 Checking if Docker image exists...');
    let imageExists = false;
    try {
      execSync(`docker image inspect ${CONTAINER_NAME}`, { stdio: 'pipe' });
      imageExists = true;
      console.log('✅ Docker image already exists, skipping build\n');
    } catch {
      console.log('📦 Image not found, building...\n');
    }

    if (!imageExists) {
      // Build Docker image from repository root (one-time build)
      console.log('🔨 Building Docker image (this only happens once)...');
      console.log('   Future test runs will reuse this image\n');

      const dockerfilePath = path.join(
        repoRoot,
        'apps/vs-code/Dockerfile.playwright'
      );

      try {
        execSync(
          `docker build -t ${CONTAINER_NAME} ` +
            `--build-arg GITHUB_SHA=playwright-test ` +
            `--build-arg PR_NUMBER=test ` +
            `-f "${dockerfilePath}" "${repoRoot}"`,
          {
            stdio: 'inherit',
            cwd: repoRoot,
          }
        );
        console.log('✅ Docker image built successfully\n');
        console.log(
          `💡 Tip: To rebuild the image, run: docker rmi ${CONTAINER_NAME}\n`
        );
      } catch {
        throw new Error(
          `❌ Failed to build Docker image. Check build logs above for details.`
        );
      }
    }

    // Start Docker container with VSIX volume mount
    console.log('🚢 Starting Docker container with VSIX volume mount...');

    let containerId: string;

    try {
      // Create a temporary directory for mounting VSIX
      const vsixMountDir = path.join(vsCodeDir, '.playwright-vsix');
      if (!fs.existsSync(vsixMountDir)) {
        fs.mkdirSync(vsixMountDir, { recursive: true });
      }

      // Copy VSIX to mount directory
      execSync(`cp "${vsixPath}" "${vsixMountDir}/vs-code-0.0.1.vsix"`, {
        stdio: 'pipe',
      });

      // Start container with volume mount
      // The Dockerfile.playwright's startup script will install the VSIX
      containerId = execSync(
        `docker run -d --name ${CONTAINER_NAME} ` +
          `-p ${VS_CODE_PORT}:8080 ` +
          `-p ${WEBSOCKET_PORT}:60123 ` +
          `-p ${TOOL_VAULT_PORT}:60124 ` +
          `-v "${vsixMountDir}:/home/coder/vsix:ro" ` +
          `${CONTAINER_NAME}`,
        { encoding: 'utf-8' }
      ).trim();

      console.log(`✅ Container started: ${containerId.substring(0, 12)}\n`);

      // Store container ID for teardown
      fs.writeFileSync(CONTAINER_ID_FILE, containerId);
    } catch (error) {
      throw new Error(
        `❌ Failed to start Docker container. Error: ${error}`
      );
    }

    // Wait for VS Code to be ready
    console.log(
      `⏳ Waiting for VS Code interface to be ready at http://localhost:${VS_CODE_PORT}...`
    );

    const startTime = Date.now();
    let isReady = false;

    while (!isReady && Date.now() - startTime < READINESS_TIMEOUT_MS) {
      try {
        const response = await fetch(`http://localhost:${VS_CODE_PORT}`);
        if (response.ok) {
          isReady = true;
          console.log('✅ VS Code interface is ready!\n');
        }
      } catch {
        // Not ready yet, continue polling
        await new Promise((resolve) =>
          setTimeout(resolve, POLL_INTERVAL_MS)
        );
      }
    }

    if (!isReady) {
      // Show container logs for debugging
      console.error('\n❌ VS Code interface did not become ready in time.');
      console.error('Container logs:');
      try {
        const logs = execSync(`docker logs ${CONTAINER_NAME}`, {
          encoding: 'utf-8',
        });
        console.error(logs);
      } catch {
        console.error('Could not retrieve container logs');
      }

      throw new Error(
        `VS Code interface failed to start within ${READINESS_TIMEOUT_MS / 1000}s`
      );
    }

    // Wait additional time for extension to activate and WebSocket server to start
    console.log('⏳ Waiting for Debrief extension to activate...');
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds for extension activation

    // Verify WebSocket server is running by checking container logs
    console.log('🔍 Verifying WebSocket server started...');
    try {
      const logs = execSync(`docker logs ${CONTAINER_NAME} 2>&1`, {
        encoding: 'utf-8',
      });

      if (logs.includes('WebSocket server port 60123 is already in use')) {
        throw new Error(
          '❌ WebSocket server failed to start - port conflict detected.\n' +
          '   This should not happen after cleanup. Check container logs.'
        );
      }

      if (logs.includes('WebSocket server listening on port 60123')) {
        console.log('✅ WebSocket server is running\n');
      } else {
        console.warn('⚠️  Could not confirm WebSocket server status from logs\n');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('port conflict')) {
        throw error;
      }
      console.warn('⚠️  Could not verify WebSocket server status\n');
    }

    console.log('✅ Docker setup complete. Tests can now run.\n');
    console.log('📋 Container details:');
    console.log(`   Name: ${CONTAINER_NAME}`);
    console.log(`   ID: ${containerId.substring(0, 12)}`);
    console.log(`   VS Code: http://localhost:${VS_CODE_PORT}`);
    console.log(`   WebSocket: ws://localhost:${WEBSOCKET_PORT}`);
    console.log(`   Tool Vault: http://localhost:${TOOL_VAULT_PORT}\n`);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);

    // Clean up on failure
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}

export default globalSetup;
