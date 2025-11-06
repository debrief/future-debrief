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
      console.log('ℹ️  HTTP server already running from previous test (expected in test suite)');
    }

    // Look for success notification (may not always be present if already running)
    const hasSuccessMessage = pageText?.includes('HTTP bridge started') ||
                             pageText?.includes('started on port 60123');

    if (hasSuccessMessage) {
      console.log('✅ Found HTTP bridge activation notification');
    } else {
      console.log('⚠️  HTTP activation notification not in page text (may be already running)');
    }

    // Verify by making HTTP requests to the bridge
    console.log('🔌 Attempting to connect to HTTP bridge...');

    try {
      // First try the health endpoint
      const healthResponse = await fetch('http://localhost:60123/health');

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ HTTP health endpoint responded:', healthData);

        // Verify expected health response structure
        if (healthData.status === 'healthy' && healthData.transport === 'http') {
          console.log('✅ Health check passed with correct structure');
        }
      } else {
        throw new Error(`Health endpoint returned status ${healthResponse.status}`);
      }

      // Also verify the main POST endpoint works
      const testResponse = await fetch('http://localhost:60123/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'list_open_plots',
          params: {}
        })
      });

      if (!testResponse.ok) {
        throw new Error(`POST endpoint returned status ${testResponse.status}`);
      }

      const responseData = await testResponse.json();
      console.log('✅ HTTP POST endpoint responded successfully');

      // Should have either result or error
      if (!('result' in responseData) && !('error' in responseData)) {
        throw new Error('Invalid response format - missing result or error field');
      }

    } catch (error) {
      throw new Error(`HTTP bridge connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('✅ Debrief State bridge is activated and accepting connections');
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

  test('should validate MCP server is accessible on port 60123', async () => {
    // MCP server starts when extension activates
    // The extension activates when VS Code starts (we already opened it in beforeEach)
    // Give it time to fully initialize
    console.log('⏳ Waiting for MCP server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔌 Attempting MCP server connection on port 60123...');

    // Retry connection with exponential backoff
    let connectionResult: { success: boolean; error?: Error; status?: number } = {
      success: false,
      error: new Error('Not attempted')
    };
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`   Attempt ${attempt}/${maxRetries}...`);

      try {
        // Test health endpoint
        const response = await fetch('http://localhost:60123/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          console.log(`   ✅ Health check succeeded on attempt ${attempt}`);
          connectionResult = { success: true, status: response.status };
          break;
        } else {
          console.log(`   ❌ Health check failed on attempt ${attempt}: HTTP ${response.status}`);
          connectionResult = { success: false, error: new Error(`HTTP ${response.status}`), status: response.status };
        }
      } catch (error) {
        console.log(`   ❌ Connection failed on attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
        connectionResult = { success: false, error: error instanceof Error ? error : new Error(String(error)) };
      }

      // Wait before retry
      if (attempt < maxRetries && !connectionResult.success) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Assert connection succeeded
    expect(connectionResult.success).toBeTruthy();
    if (!connectionResult.success) {
      throw connectionResult.error;
    }

    console.log('✅ MCP server health check verified');

    // Test MCP communication with a tools/list request
    console.log('🧪 Testing MCP protocol communication...');

    try {
      const mcpResponse = await fetch('http://localhost:60123/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        }),
        signal: AbortSignal.timeout(5000)
      });

      expect(mcpResponse.ok).toBeTruthy();

      // Parse response (could be JSON or SSE format)
      const contentType = mcpResponse.headers.get('content-type');
      let mcpData: unknown;

      if (contentType?.includes('text/event-stream')) {
        // Parse SSE format
        const text = await mcpResponse.text();
        const lines = text.split('\n');
        const dataLine = lines.find(line => line.startsWith('data: '));
        if (dataLine) {
          mcpData = JSON.parse(dataLine.substring(6));
        }
      } else {
        // Parse JSON format
        mcpData = await mcpResponse.json();
      }

      console.log('✅ MCP server response received');
      expect(mcpData).toBeDefined();

      // Verify it's a valid JSON-RPC response
      const response = mcpData as { jsonrpc?: string; id?: number; result?: { tools?: unknown[] } };
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      console.log(`✅ MCP server returned ${response.result?.tools?.length ?? 0} tools`);
    } catch (error) {
      console.error('❌ MCP protocol test failed:', error);
      throw error;
    }

    console.log('✅ MCP server fully verified');
  });
});
