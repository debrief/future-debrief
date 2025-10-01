import { test, expect } from '@playwright/test';

/**
 * Docker Startup Tests
 *
 * Validates that the Docker container starts correctly and the VS Code
 * web interface loads with the Debrief extension installed and enabled.
 */

test.describe('Docker Container Startup', () => {
  test('should start Docker container and load VS Code interface', async ({
    page,
  }) => {
    // Navigate to VS Code web interface
    await page.goto('/');

    // Wait for VS Code workbench to initialize
    // The monaco-workbench class is the main container for VS Code's UI
    await expect(page.locator('.monaco-workbench')).toBeVisible({
      timeout: 60000,
    });

    // Verify page title contains VS Code identifier
    await expect(page).toHaveTitle(/Visual Studio Code/i, {
      timeout: 10000,
    });
  });

  test('should load Debrief extension', async ({ page }) => {
    await page.goto('/');

    // Wait for workbench to be ready
    await expect(page.locator('.monaco-workbench')).toBeVisible({
      timeout: 60000,
    });

    // Open Extensions view using keyboard shortcut (Cmd+Shift+X / Ctrl+Shift+X)
    // This is more reliable than clicking the extensions icon
    await page.keyboard.press('Control+Shift+X');

    // Wait for extensions view to load
    await page.waitForSelector('[id="workbench.view.extensions"]', {
      timeout: 15000,
    });

    // Search for "debrief" in the search box
    const searchBox = page.locator(
      '[placeholder="Search Extensions in Workspace"]'
    );
    await searchBox.fill('debrief');
    await page.waitForTimeout(2000); // Give search time to filter

    // Check if Debrief extension is listed
    // The extension should appear in the installed extensions list
    const extensionRow = page.locator('.extension', {
      has: page.locator('text=/debrief/i'),
    });

    await expect(extensionRow).toBeVisible({ timeout: 10000 });

    // Verify extension is enabled (not disabled)
    // Disabled extensions typically show a "Disabled" badge or button
    const disabledBadge = extensionRow.locator(
      'text=/disabled/i'
    );
    await expect(disabledBadge).not.toBeVisible();
  });
});
