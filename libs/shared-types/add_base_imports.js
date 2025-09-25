#!/usr/bin/env node

/**
 * Script to add base-types imports to all generated TypeScript files
 */

const fs = require('fs');
const path = require('path');

function addBaseImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip files that already have base-types import
  if (content.includes('from \'../base-types\';') || content.includes('from \'./base-types\';')) {
    return false;
  }

  // Skip the base-types file itself
  if (filePath.includes('base-types.ts')) {
    return false;
  }

  const lines = content.split('\n');
  let insertIndex = -1;

  // Find insertion point after the header comment
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('*/') && i > 0 && lines[i - 1].includes('DO NOT MODIFY')) {
      insertIndex = i + 1;
      break;
    }
  }

  // Fallback: insert after any closing comment
  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '*/') {
        insertIndex = i + 1;
        break;
      }
    }
  }

  // Final fallback
  if (insertIndex === -1) insertIndex = 6;

  // Determine import path based on file location
  const relativePath = path.relative(process.cwd(), filePath);
  let importPath;

  if (relativePath.includes('src/types/features/') || relativePath.includes('src/types/states/')) {
    importPath = '../base-types';
  } else if (relativePath.includes('src/types/tools/')) {
    importPath = '../base-types';
  } else {
    importPath = './base-types';
  }

  const importLine = `import * as BaseTypes from '${importPath}';`;

  // Insert the import
  lines.splice(insertIndex, 0, '', importLine, '');

  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent);
  console.log(`Added base-types import to ${path.relative(process.cwd(), filePath)}`);
  return true;
}

function processAllFiles() {
  console.log('Adding base-types imports to all TypeScript files...');

  const srcTypesDir = 'src/types';
  if (!fs.existsSync(srcTypesDir)) {
    console.log('src/types directory not found');
    return;
  }

  function findTSFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...findTSFiles(fullPath));
      } else if (item.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const tsFiles = findTSFiles(srcTypesDir);
  let processedCount = 0;

  for (const filePath of tsFiles) {
    try {
      if (addBaseImports(filePath)) {
        processedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`Base imports added to ${processedCount} files.`);
}

if (require.main === module) {
  processAllFiles();
}