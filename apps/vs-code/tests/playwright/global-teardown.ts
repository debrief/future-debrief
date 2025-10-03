import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright tests - stops and removes Docker container.
 *
 * This script:
 * 1. Reads container ID from setup
 * 2. Stops the running container
 * 3. Removes the container
 * 4. Cleans up temporary files
 */

const CONTAINER_NAME = 'debrief-playwright-test';
const CONTAINER_ID_FILE = path.join(__dirname, '.container-id');

async function globalTeardown() {
  console.log('\n🧹 Starting Docker cleanup...\n');

  try {
    // Read container ID if it exists
    let containerId: string | undefined;
    if (fs.existsSync(CONTAINER_ID_FILE)) {
      containerId = fs.readFileSync(CONTAINER_ID_FILE, 'utf-8').trim();
      console.log(`   Found container ID: ${containerId.substring(0, 12)}`);
    }

    // Stop and remove container by name (more reliable than ID)
    try {
      console.log(`   Stopping container ${CONTAINER_NAME}...`);
      execSync(`docker stop ${CONTAINER_NAME}`, {
        stdio: 'pipe',
        timeout: 30000,
      });
      console.log('   ✅ Container stopped');

      console.log(`   Removing container ${CONTAINER_NAME}...`);
      execSync(`docker rm ${CONTAINER_NAME}`, { stdio: 'pipe' });
      console.log('   ✅ Container removed');
    } catch (error) {
      console.warn(
        `   ⚠️  Could not stop/remove container by name: ${error}`
      );

      // Try by ID if name failed
      if (containerId) {
        try {
          execSync(`docker rm -f ${containerId}`, { stdio: 'pipe' });
          console.log(`   ✅ Container removed by ID: ${containerId.substring(0, 12)}`);
        } catch {
          console.warn('   ⚠️  Could not remove container by ID either');
        }
      }
    }

    // Clean up container ID file
    if (fs.existsSync(CONTAINER_ID_FILE)) {
      fs.unlinkSync(CONTAINER_ID_FILE);
      console.log('   ✅ Cleaned up temporary files');
    }

    console.log('\n✅ Docker cleanup complete!\n');
  } catch (error) {
    console.error('\n❌ Teardown failed:', error);
    console.error(
      'You may need to manually stop the container with: docker stop ' +
        CONTAINER_NAME
    );
  }
}

export default globalTeardown;
