#!/usr/bin/env node

/**
 * Post-process TypeScript files to add imports for external references.
 * This addresses the missing type definitions when using --no-declareExternallyReferenced
 */

const fs = require('fs');
const path = require('path');

function addImportsToTypeScript(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip files that already have post-processing marker to avoid duplicates
  if (content.includes('// Post-processed by post_process_typescript.js')) {
    return;
  }

  const lines = content.split('\n');

  // Find the end of the header comments (after the "DO NOT MODIFY" comment)
  let insertIndex = lines.findIndex(line => line.includes('DO NOT MODIFY')) + 3;
  if (insertIndex < 0) insertIndex = 0;

  const imports = [];
  const typeReferences = new Set();

  // Scan for undefined types that need imports or definitions
  const typeRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
  let match;

  for (const line of lines) {
    if (line.trim().startsWith('export')) continue; // Skip export lines
    if (line.trim().startsWith('/**') || line.trim().startsWith(' *') || line.trim().startsWith(' */')) continue; // Skip comments

    while ((match = typeRegex.exec(line)) !== null) {
      const typeName = match[1];
      // Skip primitive types, common TS types, and already defined types
      if (['String', 'Number', 'Boolean', 'Object', 'Array', 'Date', 'RegExp', 'Error'].includes(typeName)) continue;
      if (content.includes(`export interface ${typeName}`) || content.includes(`export type ${typeName}`)) continue;
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

  // Add marker to indicate post-processing
  imports.push('// Post-processed by post_process_typescript.js');

  // Handle specific cases based on file type and content
  if (isToolFile && relativePath.includes('add_features_command')) {
    imports.push('import type { DebriefFeature } from "../features/debrief-feature";');
    if (typeReferences.has('Command') || content.includes('Command')) {
      imports.push('export type Command = string;');
    }
    if (typeReferences.has('Payload') || content.includes('Payload')) {
      imports.push('export type Payload = DebriefFeature[];');
    }
  } else if (isStateFile && relativePath.includes('current_state')) {
    // Handle missing types in current_state.ts
    if (typeReferences.has('Editorid') || content.includes('Editorid')) {
      imports.push('export type Editorid = string;');
    }
    if (typeReferences.has('Filename') || content.includes('Filename')) {
      imports.push('export type Filename = string;');
    }
    if (typeReferences.has('Historycount') || content.includes('Historycount')) {
      imports.push('export type Historycount = number;');
    }
    if (typeReferences.has('EditorState') || content.includes('EditorState')) {
      imports.push('import type { EditorState } from "./editor_state";');
    }
  } else if (isStateFile && relativePath.includes('editor_state')) {
    // Handle missing types in editor_state.ts
    if (typeReferences.has('DebriefFeatureCollection') || content.includes('DebriefFeatureCollection')) {
      imports.push('import type { DebriefFeatureCollection } from "../features/debrief_feature_collection";');
    }
  } else {
    // General handling for other files
    if (typeReferences.has('Command') || content.includes('Command')) {
      imports.push('export type Command = string;');
    }

    if (typeReferences.has('Payload') || content.includes('Payload')) {
      imports.push('export type Payload = unknown[];');
    }

    // Add basic GeoJSON types if referenced but not defined
    const basicTypes = {
      'Bbox': 'export type Bbox = [number, number, number, number] | [number, number, number, number, number, number];',
      'Position': 'export type Position = [number, number] | [number, number, number];',
      'Position2D': 'export type Position2D = [number, number];',
      'Position3D': 'export type Position3D = [number, number, number];',
      'Type': 'export type Type = string;',
      'Properties': 'export type Properties = { [key: string]: any; } | null;'
    };

    for (const [typeName, definition] of Object.entries(basicTypes)) {
      if ((typeReferences.has(typeName) || content.includes(typeName)) && !content.includes(`export type ${typeName}`)) {
        imports.push(definition);
      }
    }

    // Handle GeoJSON geometry types
    const geometryTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
    const referencedGeometryTypes = geometryTypes.filter(type =>
      (typeReferences.has(type) || content.includes(type)) && !content.includes(`export interface ${type}`)
    );

    if (referencedGeometryTypes.length > 0) {
      imports.push('// Basic GeoJSON geometry types');
      if (referencedGeometryTypes.includes('Point')) {
        imports.push('export interface Point { type: "Point"; coordinates: Position; }');
      }
      if (referencedGeometryTypes.includes('LineString')) {
        imports.push('export interface LineString { type: "LineString"; coordinates: Position[]; }');
      }
      if (referencedGeometryTypes.includes('Polygon')) {
        imports.push('export interface Polygon { type: "Polygon"; coordinates: Position[][]; }');
      }
      if (referencedGeometryTypes.includes('MultiPoint')) {
        imports.push('export interface MultiPoint { type: "MultiPoint"; coordinates: Position[]; }');
      }
      if (referencedGeometryTypes.includes('MultiLineString')) {
        imports.push('export interface MultiLineString { type: "MultiLineString"; coordinates: Position[][]; }');
      }
      if (referencedGeometryTypes.includes('MultiPolygon')) {
        imports.push('export interface MultiPolygon { type: "MultiPolygon"; coordinates: Position[][][]; }');
      }
      if (referencedGeometryTypes.includes('GeometryCollection')) {
        imports.push('export interface GeometryCollection { type: "GeometryCollection"; geometries: Geometry[]; }');
      }

      // Add union type for Geometry if any geometry types are referenced
      imports.push('export type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon | GeometryCollection;');
    }
  }

  // If we have imports to add, insert them
  if (imports.length > 1) { // More than just the marker comment
    lines.splice(insertIndex, 0, '', ...imports, '');
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`Added ${imports.length - 1} imports/types to ${relativePath}`);
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