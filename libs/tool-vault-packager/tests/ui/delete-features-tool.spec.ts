import { test, expect } from '@playwright/test';

test.describe('Delete-Features Tool UI Functional Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui/');
    await page.waitForLoadState('networkidle');
  });

  test('should display delete-features tool in tool list', async ({ page }) => {
    const deleteToolElement = page.locator('[data-testid="tool-delete_features"]');
    await expect(deleteToolElement).toBeVisible({ timeout: 10000 });
  });

  test('should execute delete-features with empty selection', async ({ page }) => {
    const deleteToolLink = page.locator('[data-testid="tool-delete_features"]');
    await deleteToolLink.click();
    await page.waitForLoadState('networkidle');

    const executeTab = page.locator('[data-testid="tab-execute"]');
    if (await executeTab.isVisible()) {
      await executeTab.click();
      await page.waitForLoadState('networkidle');
    }

    const samplesDropdown = page.locator('#sample-select');
    await expect(samplesDropdown).toBeVisible({ timeout: 10000 });

    await samplesDropdown.selectOption('empty_selection');
    await page.waitForTimeout(1000);

    const executeButton = page.locator('[data-testid="execute-button"]');
    await expect(executeButton).toBeVisible();
    await expect(executeButton).toBeEnabled();

    await executeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const resultElement = page.locator('[data-testid="execution-result"]');
    await expect(resultElement).toBeVisible({ timeout: 10000 });

    const resultText = await resultElement.textContent();
    expect(resultText).toContain('deleteFeatures');
    expect(resultText).toContain('[]');
  });

  test('should execute delete-features with multiple features', async ({ page }) => {
    const deleteToolLink = page.locator('[data-testid="tool-delete_features"]');
    await deleteToolLink.click();
    await page.waitForLoadState('networkidle');

    const executeTab = page.locator('[data-testid="tab-execute"]');
    if (await executeTab.isVisible()) {
      await executeTab.click();
      await page.waitForLoadState('networkidle');
    }

    const samplesDropdown = page.locator('#sample-select');
    await expect(samplesDropdown).toBeVisible({ timeout: 10000 });

    await samplesDropdown.selectOption('multiple_features');
    await page.waitForTimeout(1000);

    const executeButton = page.locator('[data-testid="execute-button"]');
    await expect(executeButton).toBeVisible();
    await expect(executeButton).toBeEnabled();

    await executeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const resultElement = page.locator('[data-testid="execution-result"]');
    await expect(resultElement).toBeVisible({ timeout: 10000 });

    const resultText = await resultElement.textContent();
    expect(resultText).toContain('deleteFeatures');
    expect(resultText).toContain('track-001');
    expect(resultText).toContain('point-001');
  });
});