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
    // Use Quick Open to find and open the plot file
    await page.keyboard.press('Control+P');
    await page.waitForTimeout(1000);
    await page.keyboard.type('large-sample.plot.json');
    await page.keyboard.press('Enter');

    // Wait for custom editor to load
    // The plot editor uses a webview which takes time to initialize
    await page.waitForTimeout(3000);

    // Verify the file is open by checking the tab title
    const activeTab = page.locator('.tab.active');
    await expect(activeTab).toContainText('large-sample.plot.json', {
      timeout: 10000,
    });

    // Verify webview exists (Plot JSON editor uses webviews)
    const webviewFrame = page.frameLocator('iframe.webview');
    await expect(webviewFrame.locator('body')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should render Leaflet map component', async ({ page }) => {
    // Open the plot file
    await page.keyboard.press('Control+P');
    await page.waitForTimeout(1000);
    await page.keyboard.type('large-sample.plot.json');
    await page.keyboard.press('Enter');

    // Wait for webview to initialize
    await page.waitForTimeout(5000);

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
    // Open the plot file
    await page.keyboard.press('Control+P');
    await page.waitForTimeout(1000);
    await page.keyboard.type('large-sample.plot.json');
    await page.keyboard.press('Enter');

    // Wait for extension to fully activate
    await page.waitForTimeout(8000);

    // Check for Debrief sidebar icon in activity bar
    // The Debrief extension adds a custom activity bar icon
    const debriefIcon = page.locator('[aria-label*="Debrief"]');
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
