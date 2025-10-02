import { test, expect, Page } from '@playwright/test';

/**
 * Tool Vault Integration Tests
 *
 * Validates that the Tool Vault server starts correctly and responds
 * with proper structured JSON responses. Also verifies the WebSocket
 * bridge is accessible for Python integration.
 *
 * IMPORTANT: Tool Vault starts when the VS Code extension activates
 * (which happens on opening a .plot.json file).
 */

/**
 * Helper function to handle VS Code workspace trust dialog
 * This dialog appears when code-server first opens a workspace
 */
async function handleTrustDialog(page: Page) {
  try {
    // Wait for the trust button to appear (it may take a moment)
    const trustButton = page.locator('button:has-text("Yes, I trust the authors")');
    await trustButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click the trust button
    await trustButton.click();

    // Wait for dialog to fully dismiss and workspace to finish loading
    await page.waitForTimeout(3000);

    console.log('✅ Workspace trust dialog handled');
  } catch (error) {
    // Dialog didn't appear or already dismissed - that's fine
    console.log('ℹ️  No workspace trust dialog found (may have been auto-dismissed)');
  }
}

test.describe('Tool Vault Server Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to VS Code
    await page.goto('/');

    // Wait for VS Code to be ready
    await expect(page.locator('.monaco-workbench')).toBeVisible({
      timeout: 60000,
    });

    // Handle workspace trust dialog if it appears
    await handleTrustDialog(page);

    // Open a .plot.json file to trigger extension activation
    // This starts the Tool Vault server
    await page.keyboard.press('Control+P'); // Open Quick Open
    await page.waitForTimeout(1000);
    await page.keyboard.type('large-sample.plot.json');
    await page.keyboard.press('Enter');

    // Wait for the custom editor to start loading
    // This gives Tool Vault time to start up
    await page.waitForTimeout(5000);
  });

  test('should validate Tool Vault health endpoint with structured response', async ({
    request,
  }) => {
    // Tool Vault starts in background, so retry with exponential backoff
    let response;
    let lastError;
    const maxRetries = 10;
    const initialDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        response = await request.get('http://localhost:60124/health', {
          timeout: 5000,
        });
        if (response.ok()) {
          break; // Success!
        }
      } catch (error) {
        lastError = error;
        const delay = initialDelay * Math.pow(1.5, i);
        console.log(
          `⏳ Tool Vault not ready (attempt ${i + 1}/${maxRetries}), waiting ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!response || !response.ok()) {
      throw new Error(
        `Tool Vault health endpoint failed after ${maxRetries} attempts. Last error: ${lastError}`
      );
    }

    // Verify HTTP 200 status
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Parse JSON response
    const body = await response.json();

    // Validate response structure
    expect(body).toHaveProperty('status');
    expect(typeof body.status).toBe('string');

    console.log('✅ Tool Vault health response:', body);
  });

  test('should validate WebSocket bridge is accessible on port 60123', async () => {
    // Use Node.js WebSocket client to test connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebSocket = require('ws');

    // Attempt connection to WebSocket bridge
    const ws = new WebSocket('ws://localhost:60123');

    // Wait for connection to open or fail
    const connectionResult = await new Promise<{
      success: boolean;
      error?: Error;
    }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: new Error('Connection timeout') });
        ws.close();
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        resolve({ success: true });
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeout);
        resolve({ success: false, error });
      });
    });

    // Assert connection succeeded
    expect(connectionResult.success).toBeTruthy();
    if (!connectionResult.success) {
      throw connectionResult.error;
    }

    // Optionally: Test bidirectional communication with a ping/echo
    // Send a simple command to verify the bridge responds
    const echoTest = await new Promise<{ success: boolean; data?: unknown }>(
      (resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false });
        }, 5000);

        ws.on('message', (data: Buffer) => {
          clearTimeout(timeout);
          try {
            const parsed = JSON.parse(data.toString());
            resolve({ success: true, data: parsed });
          } catch {
            resolve({ success: false });
          }
        });

        // Send a test command (get_feature_collection is a safe read-only command)
        ws.send(
          JSON.stringify({
            command: 'get_feature_collection',
            params: {},
          })
        );
      }
    );

    // We expect either success or a structured error response
    // (the command might fail if no plot is open, but the bridge should respond)
    expect(echoTest.success).toBeTruthy();
    console.log('WebSocket echo test response:', echoTest.data);

    // Clean up
    ws.close();
  });
});
