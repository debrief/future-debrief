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
    // This starts the Tool Vault server and WebSocket bridge
    await page.keyboard.press('Control+P'); // Open Quick Open
    await page.waitForTimeout(1000);
    await page.keyboard.type('large-sample.plot.json');
    await page.keyboard.press('Enter');

    // Wait for the custom editor to start loading
    // This gives Tool Vault and WebSocket bridge time to start up
    await page.waitForTimeout(5000);
  });

  test('should verify Debrief WebSocket bridge is activated', async ({ page }) => {
    console.log('🔍 Verifying Debrief WebSocket bridge is available...');

    // Wait for extension to fully activate
    await page.waitForTimeout(3000);

    // Check for error notifications
    const pageText = await page.textContent('body');

    // Look for fatal errors (not "already in use" which means it's running from a previous test)
    if (pageText?.includes('Failed to start WebSocket server') ||
        pageText?.includes('WebSocket bridge startup failed')) {
      console.error('❌ WebSocket server failed to start - fatal error detected');
      throw new Error('WebSocket bridge failed to start. Check extension activation logs.');
    }

    // Check if we got an "already in use" message - this means it's already running, which is OK
    if (pageText?.includes('already in use') || pageText?.includes('EADDRINUSE')) {
      console.log('ℹ️  WebSocket server already running from previous test (expected in test suite)');
    }

    // Look for success notification (may not always be present if already running)
    const hasSuccessMessage = pageText?.includes('WebSocket bridge started') ||
                             pageText?.includes('started on port 60123');

    if (hasSuccessMessage) {
      console.log('✅ Found WebSocket bridge activation notification');
    } else {
      console.log('⚠️  WebSocket activation notification not in page text (may be already running)');
    }

    // Verify by connecting to the WebSocket
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebSocket = require('ws');

    console.log('🔌 Attempting to connect to WebSocket bridge...');
    const ws = new WebSocket('ws://localhost:60123');

    const connectionResult = await new Promise<{ success: boolean, error?: string }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
        ws.close();
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connection established');
        ws.close();
        resolve({ success: true });
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      });
    });

    if (!connectionResult.success) {
      throw new Error(`WebSocket bridge connection failed: ${connectionResult.error}`);
    }

    console.log('✅ Debrief WebSocket bridge is activated and accepting connections');
  });

  test('should validate Tool Vault health endpoint with structured response', async ({
    request,
  }) => {
    // Tool Vault starts in background during container startup
    // Give it sufficient time to initialize, then retry with longer intervals
    console.log('⏳ Waiting for Tool Vault to fully initialize...');
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Initial 10s wait

    let response;
    let lastError;
    const maxRetries = 15;
    const retryDelay = 3000; // 3 seconds between retries

    for (let i = 0; i < maxRetries; i++) {
      try {
        response = await request.get('http://localhost:60124/health', {
          timeout: 5000,
        });
        if (response.ok()) {
          console.log(`✅ Tool Vault responded on attempt ${i + 1}`);
          break; // Success!
        }
      } catch (error) {
        lastError = error;
        console.log(
          `⏳ Tool Vault not ready (attempt ${i + 1}/${maxRetries}), waiting ${retryDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
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
    // WebSocket server starts when extension activates
    // The extension activates when VS Code starts (we already opened it in beforeEach)
    // Give it time to fully initialize
    console.log('⏳ Waiting for WebSocket server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Use Node.js WebSocket client to test connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebSocket = require('ws');

    console.log('🔌 Attempting WebSocket connection on port 60123...');

    // Retry connection with exponential backoff
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ws: any = null;
    let connectionResult: { success: boolean; error?: Error } = {
      success: false,
      error: new Error('Not attempted')
    };
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`   Attempt ${attempt}/${maxRetries}...`);

      ws = new WebSocket('ws://localhost:60123');

      connectionResult = await new Promise<{
        success: boolean;
        error?: Error;
      }>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: new Error(`Connection timeout on attempt ${attempt}`),
          });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          ws.close();
        }, 5000);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        ws.on('open', () => {
          clearTimeout(timeout);
          console.log(`   ✅ Connection succeeded on attempt ${attempt}`);
          resolve({ success: true });
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          console.log(`   ❌ Connection failed on attempt ${attempt}: ${error.message}`);
          resolve({ success: false, error });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          ws.close();
        });
      });

      if (connectionResult.success) {
        break; // Keep ws open for echo test
      }

      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Assert connection succeeded
    expect(connectionResult.success).toBeTruthy();
    if (!connectionResult.success) {
      throw connectionResult.error;
    }

    console.log('✅ WebSocket bridge connection verified');

    // Test bidirectional communication with a ping/echo
    // Send a simple command to verify the bridge responds
    const echoTest = await new Promise<{ success: boolean; data?: unknown }>(
      (resolve) => {
        const timeout = setTimeout(() => {
          console.log('⚠️  Echo test timed out (this is OK if no plot is open)');
          resolve({ success: false });
        }, 5000);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        ws.on('message', (data: Buffer) => {
          clearTimeout(timeout);
          try {
            const parsed = JSON.parse(data.toString()) as unknown;
            console.log('✅ WebSocket echo test response:', parsed);
            resolve({ success: true, data: parsed });
          } catch {
            resolve({ success: false });
          }
        });

        // Send a test command (get_feature_collection is a safe read-only command)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

    // Clean up
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ws.close();
    console.log('✅ WebSocket bridge fully verified');
  });
});
