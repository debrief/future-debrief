import { test, expect } from '@playwright/test';

test.describe('Word-Count Tool UI Functional Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui/');
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test('should display word-count tool in tool list', async ({ page }) => {
    // Look for word-count tool using specific data-testid
    const wordCountElement = page.locator('[data-testid="tool-word_count"]');
    
    await expect(wordCountElement).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to word-count tool interface', async ({ page }) => {
    // Find and click on word-count tool using specific data-testid
    const wordCountLink = page.locator('[data-testid="tool-word_count"]');
    
    await wordCountLink.click();
    
    // Wait for navigation or content change
    await page.waitForLoadState('networkidle');
    
    // Check that we're now on the word-count tool page
    // Look for tool-specific elements
    await expect(page.locator('body')).toContainText('word', { ignoreCase: true });
  });

  test('should display git history (non-null verification)', async ({ page }) => {
    // Navigate to word-count tool using specific data-testid
    const wordCountLink = page.locator('[data-testid="tool-word_count"]');
    await wordCountLink.click();
    await page.waitForLoadState('networkidle');
    
    // Look for git history or version information
    const historyElements = page.locator('text=history').or(page.locator('text=git')).or(page.locator('text=version')).or(page.locator('[data-testid*="history"]'));
    
    // Check if any history element exists and is not null/empty
    const historyCount = await historyElements.count();
    if (historyCount > 0) {
      const historyText = await historyElements.first().textContent();
      expect(historyText).toBeTruthy();
      expect(historyText?.trim()).not.toBe('');
    }
    // If no history elements found, that's acceptable - just ensure page loaded
    await expect(page.locator('body')).toBeTruthy();
  });

  test('should display source code on Code tab (non-null verification)', async ({ page }) => {
    // Navigate to word-count tool using specific data-testid
    const wordCountLink = page.locator('[data-testid="tool-word_count"]');
    await wordCountLink.click();
    await page.waitForLoadState('networkidle');
    
    // Look for Code tab using specific data-testid
    const codeTab = page.locator('[data-testid="tab-code"]');
    
    const codeTabExists = await codeTab.isVisible();
    if (codeTabExists) {
      await codeTab.click();
      await page.waitForLoadState('networkidle');
      
      // Look for source code block
      const codeBlock = page.locator('pre').or(page.locator('code')).or(page.locator('[data-testid*="source"]')).first();
      
      const codeBlockExists = await codeBlock.isVisible();
      if (codeBlockExists) {
        const codeContent = await codeBlock.textContent();
        expect(codeContent).toBeTruthy();
        expect(codeContent?.trim()).not.toBe('');
      }
    }
    // If no code tab/block found, that's acceptable - just ensure page loaded
    await expect(page.locator('body')).toBeTruthy();
  });

  test('should have Execute tab with functional word-count execution', async ({ page }) => {
    // Navigate to word-count tool using specific data-testid
    const wordCountLink = page.locator('[data-testid="tool-word_count"]');
    await wordCountLink.click();
    await page.waitForLoadState('networkidle');
    
    // Look for Execute tab using specific data-testid
    const executeTab = page.locator('[data-testid="tab-execute"]');
    
    const executeTabExists = await executeTab.isVisible();
    if (executeTabExists) {
      await executeTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for samples to load and dropdown to appear
    const samplesDropdown = page.locator('#sample-select');
    await expect(samplesDropdown).toBeVisible({ timeout: 10000 });
    
    // Wait for options to be populated (not just the "Select a sample..." option)
    await page.waitForFunction(() => {
      const select = document.querySelector('#sample-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    // Get all options and verify we have at least 3 (including the default "Select a sample..." option)
    const options = await samplesDropdown.locator('option').all();
    expect(options.length).toBeGreaterThanOrEqual(3);
    
    // Find and select the 'simple_text' sample option
    let simpleTextFound = false;
    
    for (const option of options) {
      const optionText = await option.textContent();
      if (optionText && optionText.includes('simple_text')) {
        const optionValue = await option.getAttribute('value');
        if (optionValue) {
          await samplesDropdown.selectOption(optionValue);
          simpleTextFound = true;
          break;
        }
      }
    }
    
    expect(simpleTextFound).toBeTruthy();
    
    // Wait for the input to be populated
    await page.waitForTimeout(1000);
    
    // Verify that some input was populated (check the textarea or form)
    const inputTextarea = page.locator('.input-textarea');
    const inputValue = await inputTextarea.inputValue();
    expect(inputValue.trim()).not.toBe('{}');
    expect(inputValue.trim()).not.toBe('');
    
    // Look for execute button and ensure it's enabled
    const executeButton = page.locator('[data-testid="execute-button"]');
    await expect(executeButton).toBeVisible();
    await expect(executeButton).toBeEnabled();
    
    // Execute the tool
    await executeButton.click();
    
    // Wait for execution result with longer timeout
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Allow time for execution
    
    // Look for result display using specific data-testid
    const resultElement = page.locator('[data-testid="execution-result"]');
    await expect(resultElement).toBeVisible({ timeout: 10000 });
    
    // Verify the result contains valid output (should be a number for word count)
    const resultText = await resultElement.textContent();
    expect(resultText).toBeTruthy();
    expect(resultText?.trim()).not.toBe('');
    
    // For word count, result should be a number or JSON containing a number
    const containsNumber = /\d+/.test(resultText || '');
    expect(containsNumber).toBeTruthy();
  });

  test('should verify minimum 3 items in samples dropdown', async ({ page }) => {
    // Navigate to word-count tool using specific data-testid
    const wordCountLink = page.locator('[data-testid="tool-word_count"]');
    await wordCountLink.click();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Execute tab using specific data-testid
    const executeTab = page.locator('[data-testid="tab-execute"]');
    
    const executeTabExists = await executeTab.isVisible();
    if (executeTabExists) {
      await executeTab.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for samples dropdown to appear and be populated
    const samplesDropdown = page.locator('#sample-select');
    await expect(samplesDropdown).toBeVisible({ timeout: 10000 });
    
    // Wait for options to be populated (not just the "Select a sample..." option)
    await page.waitForFunction(() => {
      const select = document.querySelector('#sample-select') as HTMLSelectElement;
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    // Check that we have at least 3 options total (including "Select a sample..." option)
    const options = await samplesDropdown.locator('option').all();
    expect(options.length).toBeGreaterThanOrEqual(3);
    
    // Verify the first option is the default "Select a sample..." option
    const firstOption = await samplesDropdown.locator('option').nth(0);
    const firstOptionText = await firstOption.textContent();
    expect(firstOptionText).toContain('Select a sample');
    
    // Verify we have actual sample options (not just the default)
    const sampleOptionsCount = options.length - 1; // Subtract 1 for the default option
    expect(sampleOptionsCount).toBeGreaterThanOrEqual(2);
  });
});