import { test, expect, Page } from '@playwright/test';

/**
 * Docker Startup Tests
 *
 * Validates that the Docker container starts correctly and the VS Code
 * web interface loads with the Debrief extension installed and enabled.
 */

/**
 * Helper function to handle VS Code workspace trust dialog
 * This dialog appears when code-server first opens a workspace
 */
async function handleTrustDialog(page: Page) {
  try {
    // Try multiple button text variations
    const trustVariations = [
      'Yes, I trust the authors',
      'Trust',
      'Yes',
      'Continue',
    ];

    let handled = false;
    for (const buttonText of trustVariations) {
      try {
        const trustButton = page.locator(`button:has-text("${buttonText}")`);
        await trustButton.waitFor({ state: 'visible', timeout: 3000 });
        await trustButton.click({ force: true }); // Force click to bypass modal overlay
        handled = true;
        console.log(`✅ Workspace trust dialog handled (clicked "${buttonText}")`);
        break;
      } catch {
        // Try next variation
      }
    }

    if (!handled) {
      // Try pressing Escape to dismiss any modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Wait for dialog to fully dismiss
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log('ℹ️  No workspace trust dialog found');
  }
}

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

    // Handle workspace trust dialog BEFORE checking title
    // This is critical as the dialog blocks other UI interactions
    await handleTrustDialog(page);

    // Verify page title contains VS Code or code-server identifier
    // code-server may use slightly different title format
    await expect(page).toHaveTitle(/(Visual Studio Code|code-server)/i, {
      timeout: 10000,
    });

    // Additional verification: Check that workspace is loaded in Explorer
    const workspaceSection = page.locator('h3.title:has-text("workspace")');
    await expect(workspaceSection).toBeVisible({ timeout: 5000 });
  });

  test('should load Debrief extension', async ({ page }) => {
    await page.goto('/');

    // Wait for workbench to be ready
    await expect(page.locator('.monaco-workbench')).toBeVisible({
      timeout: 60000,
    });

    // Handle workspace trust dialog if it appears
    await handleTrustDialog(page);

    // Open Extensions view by clicking the activity bar icon
    // Use aria-label to find the Extensions icon in the activity bar
    const extensionsIcon = page.locator(
      '.activitybar a[aria-label="Extensions (Ctrl+Shift+X)"]'
    );
    await extensionsIcon.click();

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
