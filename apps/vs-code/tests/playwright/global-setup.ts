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
      console.log('   Removed existing container\n');
    } catch {
      // No existing container, that's fine
      console.log('   No existing container to remove\n');
    }

    // Build Docker image from repository root
    console.log('🔨 Building Docker image...');
    console.log('   (This may take 2-5 minutes on first run)\n');

    const repoRoot = path.resolve(__dirname, '../../../../..');
    const dockerfilePath = path.join(
      repoRoot,
      'apps/vs-code/Dockerfile'
    );

    try {
      execSync(
        `docker build -t ${CONTAINER_NAME} ` +
          `--build-arg GITHUB_SHA=playwright-test ` +
          `--build-arg PR_NUMBER=test ` +
          `-f ${dockerfilePath} ${repoRoot}`,
        {
          stdio: 'inherit',
          cwd: repoRoot,
        }
      );
      console.log('✅ Docker image built successfully\n');
    } catch {
      throw new Error(
        `❌ Failed to build Docker image. Check build logs above for details.`
      );
    }

    // Start Docker container
    console.log('🚢 Starting Docker container...');

    let containerId: string;
    try {
      containerId = execSync(
        `docker run -d --name ${CONTAINER_NAME} ` +
          `-p ${VS_CODE_PORT}:8080 ` +
          `-p ${WEBSOCKET_PORT}:60123 ` +
          `-p ${TOOL_VAULT_PORT}:60124 ` +
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
