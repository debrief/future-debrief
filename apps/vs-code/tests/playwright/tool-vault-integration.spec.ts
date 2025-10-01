import { test, expect } from '@playwright/test';

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

test.describe('Tool Vault Server Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to VS Code
    await page.goto('/');

    // Wait for VS Code to be ready
    await expect(page.locator('.monaco-workbench')).toBeVisible({
      timeout: 60000,
    });

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
    // Hit the Tool Vault health endpoint
    const response = await request.get('http://localhost:60124/health');

    // Verify HTTP 200 status
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Parse JSON response
    const body = await response.json();

    // Validate response structure
    // Tool Vault health endpoints typically return { "status": "ok" } or similar
    expect(body).toHaveProperty('status');
    expect(typeof body.status).toBe('string');

    // Log response for debugging
    console.log('Tool Vault health response:', body);
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
