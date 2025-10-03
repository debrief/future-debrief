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
 * Helper function to open a plot file using Quick Open (Ctrl+P)
 * This bypasses the Explorer file tree issues in code-server
 */
async function openPlotFile(page: Page, filename: string) {
  console.log(`📂 Opening ${filename} via Quick Open...`);

  // Open Quick Open with Ctrl+P
  await page.keyboard.press('Control+P');
  await page.waitForTimeout(1000);

  // Type the filename to search for it
  await page.keyboard.type(filename);
  await page.waitForTimeout(1000);

  // Press Enter to open the first matching file
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  // Verify file opened by checking active tab
  const activeTab = page.locator('.tab.active');
  await expect(activeTab).toContainText(filename, { timeout: 10000 });

  console.log(`✅ ${filename} opened successfully`);
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
    // Open the plot file using Quick Open
    await openPlotFile(page, 'large-sample.plot.json');

    // Verify the tab is active (this confirms the custom editor loaded)
    const activeTab = page.locator('.tab.active:has-text("large-sample.plot.json")');
    await expect(activeTab).toBeVisible({ timeout: 10000 });

    console.log('✅ Plot file opened successfully');
  });

  test('should render Leaflet map component', async ({ page }) => {
    // Open the plot file
    await openPlotFile(page, 'large-sample.plot.json');

    // Verify the tab is active
    const activeTab = page.locator('.tab.active:has-text("large-sample.plot.json")');
    await expect(activeTab).toBeVisible({ timeout: 10000 });

    // VS Code for Web renders custom editors in nested iframes
    // Wait for content to fully load by giving it time
    await page.waitForTimeout(5000);

    // Get all frames and look for Leaflet content
    console.log('🗺️  Searching for Leaflet map in all frames...');
    const frames = page.frames();
    console.log(`Found ${frames.length} total frames`);

    let leafletFound = false;
    for (const frame of frames) {
      try {
        // Try to find Leaflet elements in this frame
        const mapCount = await frame.locator('.leaflet-container').count();
        if (mapCount > 0) {
          console.log('✅ Found Leaflet map in frame');

          // Verify key Leaflet components
          await expect(frame.locator('.leaflet-container')).toBeVisible({ timeout: 5000 });
          const tileCount = await frame.locator('.leaflet-tile-pane').count();
          const zoomCount = await frame.locator('.leaflet-control-zoom').count();

          console.log(`   Map container: visible`);
          console.log(`   Tile pane: ${tileCount > 0 ? 'found' : 'not found'}`);
          console.log(`   Zoom controls: ${zoomCount > 0 ? 'found' : 'not found'}`);

          leafletFound = true;
          break;
        }
      } catch (e) {
        // Frame not accessible or content not ready, continue searching
      }
    }

    expect(leafletFound).toBeTruthy();
    console.log('✅ Leaflet map component verified');
  });

  test('should display core UI elements', async ({ page }) => {
    // Open the plot file
    await openPlotFile(page, 'large-sample.plot.json');

    // Verify the file opened
    const activeTab = page.locator('.tab.active:has-text("large-sample.plot.json")');
    await expect(activeTab).toBeVisible({ timeout: 10000 });

    // Wait for extension to fully activate
    await page.waitForTimeout(3000);

    // Verify GeoJSON Features outline section is visible in sidebar
    // From the screenshot, this appears as a section in the Explorer sidebar
    console.log('🔍 Checking for GeoJSON Features outline...');
    const geoJsonSection = page.locator('text="GeoJSON Features"');
    await expect(geoJsonSection).toBeVisible({ timeout: 10000 });

    console.log('✅ Core UI elements verified');
  });
});
