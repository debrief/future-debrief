import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Package Structure Verification', () => {
  const isPyzMode = process.env.TEST_MODE === 'pyz';
  const baseDir = '.'; // Both modes work with current directory structure

  test('should have proper package structure', async () => {
    if (isPyzMode) {
      // In .pyz mode, only check for the package file itself
      expect(fs.existsSync('dist/toolvault.pyz')).toBeTruthy();
    } else {
      // In dev mode, we check the source structure
      expect(fs.existsSync('tools')).toBeTruthy();
    }
  });

  test('should have index.json in root folder', async () => {
    const indexJsonPath = 'index.json'; // Both modes use same location
    
    // First check if file exists
    const fileExists = fs.existsSync(indexJsonPath);
    
    if (!fileExists && !isPyzMode) {
      // Generate index.json if it doesn't exist in dev mode
      const { execSync } = require('child_process');
      execSync('python -c "from discovery import discover_tools, generate_index_json; import json; tools = discover_tools(\'tools\'); index = generate_index_json(tools); open(\'index.json\', \'w\').write(json.dumps(index, indent=2))"');
    }
    
    expect(fs.existsSync(indexJsonPath)).toBeTruthy();
    
    // Validate JSON structure
    const indexContent = JSON.parse(fs.readFileSync(indexJsonPath, 'utf8'));
    expect(indexContent).toHaveProperty('tools');
    expect(Array.isArray(indexContent.tools)).toBeTruthy();
  });

  test('should have word-count tool folder with required files', async () => {
    const wordCountDir = path.join('tools', 'word_count'); // Same path for both modes
    
    expect(fs.existsSync(wordCountDir)).toBeTruthy();
    
    // Check for execute.py
    const executePath = path.join(wordCountDir, 'execute.py');
    expect(fs.existsSync(executePath)).toBeTruthy();
    
    // Check for inputs directory
    const inputsDir = path.join(wordCountDir, 'inputs');
    expect(fs.existsSync(inputsDir)).toBeTruthy();
    
    // Check for tool.json (if it exists)
    const toolJsonPath = path.join(wordCountDir, 'tool.json');
    if (fs.existsSync(toolJsonPath)) {
      const toolContent = JSON.parse(fs.readFileSync(toolJsonPath, 'utf8'));
      expect(toolContent).toHaveProperty('name');
    }
  });

  test('should have sample input files for word-count', async () => {
    const inputsDir = path.join('tools', 'word_count', 'inputs'); // Same path for both modes
    
    expect(fs.existsSync(inputsDir)).toBeTruthy();
    
    // Check for simple_text.json specifically
    const simpleTextPath = path.join(inputsDir, 'simple_text.json');
    expect(fs.existsSync(simpleTextPath)).toBeTruthy();
    
    // Validate simple_text.json content
    const simpleTextContent = JSON.parse(fs.readFileSync(simpleTextPath, 'utf8'));
    expect(simpleTextContent).toHaveProperty('text');
    expect(typeof simpleTextContent.text).toBe('string');
    
    // Count files in inputs directory
    const inputFiles = fs.readdirSync(inputsDir).filter(f => f.endsWith('.json'));
    expect(inputFiles.length).toBeGreaterThanOrEqual(3);
  });
});