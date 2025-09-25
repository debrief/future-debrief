#!/usr/bin/env node

/**
 * Post-process TypeScript files to add imports for external references.
 * This addresses the missing type definitions when using --no-declareExternallyReferenced
 */

const fs = require('fs');
const path = require('path');

function addImportsToTypeScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Find the end of the header comments (after the "DO NOT MODIFY" comment)
  let insertIndex = lines.findIndex(line => line.includes('DO NOT MODIFY')) + 3;
  if (insertIndex < 0) insertIndex = 0;

  const imports = [];
  const typeReferences = new Set();

  // Scan for undefined types that need imports
  const typeRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
  let match;

  for (const line of lines) {
    if (line.trim().startsWith('export')) continue; // Skip export lines
    if (line.trim().startsWith('/**') || line.trim().startsWith(' *') || line.trim().startsWith(' */')) continue; // Skip comments

    while ((match = typeRegex.exec(line)) !== null) {
      const typeName = match[1];
      // Skip primitive types and common TS types
      if (['String', 'Number', 'Boolean', 'Object', 'Array', 'Date', 'RegExp', 'Error'].includes(typeName)) continue;
      typeReferences.add(typeName);
    }
  }

  // Determine which imports we need based on the file path and referenced types
  let relativePath;
  if (process.cwd().endsWith('src/types')) {
    relativePath = path.relative('.', filePath);
  } else {
    relativePath = path.relative('derived/typescript', filePath);
  }
  const isToolFile = relativePath.startsWith('tools/');
  const isFeatureFile = relativePath.startsWith('features/');
  const isStateFile = relativePath.startsWith('states/');

  // Add imports for common types referenced in different contexts
  if (typeReferences.has('Command')) {
    imports.push('export type Command = string;');
  }

  if (typeReferences.has('Payload')) {
    if (isToolFile && relativePath.includes('add_features_command')) {
      imports.push('import type { DebriefFeature } from "../features/debrief-feature";');
      imports.push('export type Payload = DebriefFeature[];');
    } else {
      imports.push('export type Payload = unknown[];');
    }
  }

  // If we have imports to add, insert them
  if (imports.length > 0) {
    lines.splice(insertIndex, 0, '', ...imports, '');
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`Added ${imports.length} imports to ${relativePath}`);
  }
}

function processAllTypeScriptFiles() {
  console.log('Post-processing TypeScript files to add imports...');

  // Check for TypeScript directory (could be derived/typescript or current directory)
  let tsDir = 'derived/typescript';
  if (!fs.existsSync(tsDir)) {
    // If we're running from src/types directory
    if (process.cwd().endsWith('src/types')) {
      tsDir = '.';
    } else {
      console.log('No TypeScript directory found, skipping post-processing');
      return;
    }
  }

  // Find all .ts files
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

  const tsFiles = findTSFiles(tsDir);
  let processedCount = 0;

  for (const filePath of tsFiles) {
    try {
      addImportsToTypeScript(filePath);
      processedCount++;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`Post-processed ${processedCount} TypeScript files`);
}

// Only run if called directly
if (require.main === module) {
  processAllTypeScriptFiles();
}

module.exports = { processAllTypeScriptFiles };