import { test, expect } from '@playwright/test';

test.describe('Server Integration Testing', () => {
  const isPyzMode = process.env.TEST_MODE === 'pyz';
  const baseURL = isPyzMode ? 'http://localhost:8080' : 'http://localhost:5173';

  test('should have server running and responding', async ({ page }) => {
    // Navigate to base URL
    await page.goto('/');
    
    // Check that we get a response (not 404 or connection error)
    const response = await page.request.get('/');
    expect(response.status()).toBeLessThan(500);
  });

  test('should serve static files correctly', async ({ page }) => {
    await page.goto('/');
    
    // Look for typical SPA elements
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    
    // Check for JavaScript loading (should not have script errors)
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for page to load and execute
    await page.waitForTimeout(2000);
    
    // Filter out known acceptable errors (like network requests that might fail in test)
    const criticalErrors = errors.filter(error => 
      !error.includes('net::') && // Network errors
      !error.includes('favicon') && // Favicon errors
      !error.includes('404') // Expected 404s
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should serve API endpoints correctly', async ({ request }) => {
    // Test tools list endpoint
    const toolsResponse = await request.get('/tools/list');
    expect(toolsResponse.status()).toBe(200);
    
    const tools = await toolsResponse.json();
    expect(Array.isArray(tools.tools)).toBeTruthy();
    expect(tools.tools.length).toBeGreaterThan(0);
    
    // Check that word_count tool is available
    const wordCountTool = tools.tools.find((tool: any) => tool.name === 'word_count');
    expect(wordCountTool).toBeTruthy();
  });

  test('should handle CORS correctly for API requests', async ({ request }) => {
    const response = await request.get('/tools/list', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    expect(response.status()).toBeLessThan(400);
  });

  test('should serve tool execution endpoint', async ({ request }) => {
    // Test word_count tool execution
    const executeResponse = await request.post('/tools/call', {
      data: {
        name: 'word_count',
        arguments: {
          text: 'Hello world'
        }
      }
    });
    
    expect(executeResponse.status()).toBe(200);
    const result = await executeResponse.json();
    
    expect(result).toHaveProperty('result');
    expect(result.isError).toBe(false);
    expect(result.result).toBe(2); // "Hello world" should return 2
  });
});