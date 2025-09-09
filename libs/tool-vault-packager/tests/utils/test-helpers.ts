import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export class TestHelpers {
  static isPyzMode(): boolean {
    return process.env.TEST_MODE === 'pyz';
  }

  static getBaseURL(): string {
    return this.isPyzMode() ? 'http://localhost:8080' : 'http://localhost:5173';
  }

  static getToolsPath(): string {
    return this.isPyzMode() 
      ? path.join('debug-package-contents') 
      : 'tools';
  }

  static async waitForAppLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    // Additional wait for app initialization
    await page.waitForTimeout(1000);
  }

  static async findWordCountTool(page: Page): Promise<any> {
    // Try multiple selectors to find word count tool
    const selectors = [
      'text=word_count',
      'text=word count', 
      'text=word-count',
      '[data-testid*="word"]',
      '[data-tool="word_count"]',
      '.tool-item:has-text("word")'
    ];

    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        return element;
      }
    }
    
    return null;
  }

  static async verifyToolStructure(toolName: string): Promise<void> {
    const toolDir = path.join(this.getToolsPath(), toolName);
    
    // Check tool directory exists
    expect(fs.existsSync(toolDir)).toBeTruthy();
    
    // Check for execute.py
    const executePath = path.join(toolDir, 'execute.py');
    expect(fs.existsSync(executePath)).toBeTruthy();
    
    // Check for inputs directory
    const inputsDir = path.join(toolDir, 'inputs');
    expect(fs.existsSync(inputsDir)).toBeTruthy();
    
    // Count input files
    const inputFiles = fs.readdirSync(inputsDir).filter(f => f.endsWith('.json'));
    expect(inputFiles.length).toBeGreaterThanOrEqual(1);
  }

  static async makeApiRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    const baseURL = this.getBaseURL();
    const url = `${baseURL}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async executeWordCountTool(text: string): Promise<any> {
    return this.makeApiRequest('/api/tools/execute', 'POST', {
      name: 'word_count',
      arguments: { text }
    });
  }

  static async getAvailableTools(): Promise<any> {
    return this.makeApiRequest('/api/tools');
  }

  static validateWordCountResult(result: any, expectedCount: number): void {
    expect(result).toHaveProperty('result');
    expect(result.isError).toBe(false);
    expect(result.result).toBe(expectedCount);
  }
}