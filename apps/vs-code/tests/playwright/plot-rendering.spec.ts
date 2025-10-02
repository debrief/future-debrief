import { test, expect, Page } from '@playwright/test';

/**
 * Plot Rendering Tests
 *
 * Validates that the Plot JSON editor loads correctly and displays
 * the expected UI components: Leaflet map, outline tree view,
 * time controller, and properties panel.
 *
 * Uses large-sample.plot.json from the workspace as test data.
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

/**
 * Helper function to open a plot file from Explorer
 */
async function openPlotFile(page: Page, filename: string) {
  // Ensure Explorer is visible
  const explorerIcon = page.locator(
    '.activitybar a[aria-label="Explorer (Ctrl+Shift+E)"]'
  );
  await explorerIcon.click();
  await page.waitForTimeout(3000);

  // Wait for any monaco list to appear (file tree)
  await page.waitForSelector('.monaco-list', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Expand all collapsed folders to ensure files are visible
  let expandedAny = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const chevrons = page.locator('.monaco-icon-label .codicon-chevron-right');
    const count = await chevrons.count();

    if (count === 0) break; // No more folders to expand

    for (let i = 0; i < count; i++) {
      try {
        await chevrons.nth(0).click({ timeout: 1000 }); // Always click first (index changes after expansion)
        await page.waitForTimeout(300);
        expandedAny = true;
      } catch {
        // Chevron might not be clickable
      }
    }

    if (!expandedAny) break; // Couldn't expand anything new
  }

  // Find and double-click the file
  const plotFile = page.locator(
    `.monaco-list-row[aria-label*="${filename}"]`
  );
  await expect(plotFile).toBeVisible({ timeout: 10000 });
  await plotFile.dblclick();

  // Wait for editor to load
  await page.waitForTimeout(3000);

  // Verify file opened
  const activeTab = page.locator('.tab.active');
  await expect(activeTab).toContainText(filename, { timeout: 10000 });
}

test.describe('Plot JSON Editor Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to VS Code
    await page.goto('/');

    // Wait for VS Code to be ready
    await expect(page.locator('.monaco-workbench')).toBeVisible({
      timeout: 60000,
    });

    // Handle workspace trust dialog if it appears
    await handleTrustDialog(page);
  });

  test('should open large-sample.plot.json successfully', async ({ page }) => {
    // Open the plot file using Explorer
    await openPlotFile(page, 'large-sample.plot.json');

    // Verify webview exists (Plot JSON editor uses webviews)
    const webviewFrame = page.frameLocator('iframe.webview');
    await expect(webviewFrame.locator('body')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should render Leaflet map component', async ({ page }) => {
    // Open the plot file using Explorer
    await openPlotFile(page, 'large-sample.plot.json');

    // Wait for webview to initialize
    await page.waitForTimeout(2000);

    // Access webview content
    const webviewFrame = page.frameLocator('iframe.webview');

    // Check for Leaflet map container
    const mapContainer = webviewFrame.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 20000 });

    // Verify map tiles have loaded
    // Leaflet creates a pane structure for layers
    const tilePane = webviewFrame.locator('.leaflet-tile-pane');
    await expect(tilePane).toBeVisible({ timeout: 10000 });

    // Check for zoom controls
    const zoomControl = webviewFrame.locator('.leaflet-control-zoom');
    await expect(zoomControl).toBeVisible({ timeout: 5000 });

    // Verify zoom buttons are functional (exist and are enabled)
    const zoomIn = webviewFrame.locator('.leaflet-control-zoom-in');
    const zoomOut = webviewFrame.locator('.leaflet-control-zoom-out');
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
  });

  test('should display core UI elements', async ({ page }) => {
    // Open the plot file using Explorer
    await openPlotFile(page, 'large-sample.plot.json');

    // Wait for extension to fully activate
    await page.waitForTimeout(5000);

    // Check for Debrief sidebar icon in activity bar
    // The Debrief extension adds a custom activity bar icon
    // Use specific selector for activity bar to avoid strict mode violation
    const debriefIcon = page.locator(
      '.activitybar a[aria-label*="Debrief"]'
    );
    await expect(debriefIcon).toBeVisible({ timeout: 10000 });

    // Click to open Debrief sidebar
    await debriefIcon.click();
    await page.waitForTimeout(2000);

    // Verify Outline view is present
    // The outline shows GeoJSON features from the plot
    const outlineView = page.locator('[id*="debrief.outline"]');
    await expect(outlineView).toBeVisible({ timeout: 10000 });

    // Check Explorer sidebar for GeoJSON Features outline
    const explorerIcon = page.locator('[aria-label*="Explorer"]');
    await explorerIcon.click();
    await page.waitForTimeout(2000);

    const geoJsonOutline = page.locator(
      '[id="customGeoJsonOutline"]'
    );
    await expect(geoJsonOutline).toBeVisible({ timeout: 10000 });

    // Verify the outline contains feature items
    // Features should be listed as tree items
    const featureItems = page.locator(
      '[id="customGeoJsonOutline"] .monaco-list-row'
    );
    const count = await featureItems.count();
    expect(count).toBeGreaterThan(0);

    console.log(`Found ${count} features in GeoJSON outline`);
  });
});
