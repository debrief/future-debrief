import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Docker-based VS Code extension testing.
 *
 * Tests validate the Dockerized extension works correctly:
 * - VS Code interface loads and extension activates
 * - Tool Vault server integration works
 * - Plot JSON editor renders correctly
 *
 * IMPORTANT: Tests must run sequentially (fullyParallel: false) because they
 * share a single Docker instance managed by global setup/teardown.
 */
export default defineConfig({
  testDir: './tests/playwright',

  // Tests involve Docker startup which takes time
  timeout: 120000, // 2 minutes per test

  // Sequential execution required (shared Docker instance)
  fullyParallel: false,
  workers: 1,

  // Retry on CI, not locally (Docker issues should be caught immediately)
  retries: process.env.CI ? 2 : 0,

  // Reporters for different contexts
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],

  // Global setup/teardown for Docker lifecycle
  globalSetup: require.resolve('./tests/playwright/global-setup'),
  globalTeardown: require.resolve('./tests/playwright/global-teardown'),

  use: {
    // Base URL for VS Code web interface with workspace folder
    baseURL: 'http://localhost:8080/?folder=/home/coder/workspace',

    // Screenshot on failure for debugging
    screenshot: 'only-on-failure',

    // Video on failure for complex issues
    video: 'retain-on-failure',

    // Trace for detailed debugging
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
