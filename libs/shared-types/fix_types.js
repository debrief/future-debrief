#!/usr/bin/env node

/**
 * Enhanced post-processing script to add missing type definitions to all TypeScript files
 */

const fs = require('fs');
const path = require('path');

function addMissingTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip files that already have been processed to avoid duplicates
  if (content.includes('// Enhanced post-processed')) {
    return false;
  }

  const lines = content.split('\n');
  const imports = [];
  const typeReferences = new Set();

  // Scan for all capitalized words that look like types
  const typeRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
  let match;

  for (const line of lines) {
    if (line.trim().startsWith('export')) continue;
    if (line.trim().startsWith('/**') || line.trim().startsWith(' *') || line.trim().startsWith(' */')) continue;

    while ((match = typeRegex.exec(line)) !== null) {
      const typeName = match[1];
      // Skip known primitive types and already defined types
      if (['String', 'Number', 'Boolean', 'Object', 'Array', 'Date', 'RegExp', 'Error', 'Function', 'Promise'].includes(typeName)) continue;
      if (content.includes(`export interface ${typeName}`) || content.includes(`export type ${typeName}`)) continue;
      typeReferences.add(typeName);
    }
  }

  // Find insertion point (after header comment)
  let insertIndex = lines.findIndex(line => line.includes('DO NOT MODIFY')) + 3;
  if (insertIndex < 0) insertIndex = 0;

  imports.push('// Enhanced post-processed - missing type definitions added');

  // Add common missing types based on what we found
  const commonTypes = {
    // Basic types
    'Command': 'export type Command = string;',
    'Payload': 'export type Payload = any;',
    'Id': 'export type Id = string | number;',
    'Type': 'export type Type = string;',
    'Name': 'export type Name = string;',
    'Email': 'export type Email = string;',
    'Path': 'export type Path = string;',
    'File': 'export type File = string;',
    'Data': 'export type Data = any;',
    'Description': 'export type Description = string;',
    'Hash': 'export type Hash = string;',
    'Message': 'export type Message = string;',
    'Commit': 'export type Commit = string;',
    'Author': 'export type Author = string;',
    'Builddate': 'export type Builddate = string;',
    'ToolName': 'export type ToolName = string;',
    'ModulePath': 'export type ModulePath = string;',
    'ToolDir': 'export type ToolDir = string;',
    'SourceCode': 'export type SourceCode = string;',
    'SampleInputsCount': 'export type SampleInputsCount = number;',
    'GitCommitsCount': 'export type GitCommitsCount = number;',
    'SourceCodeLength': 'export type SourceCodeLength = number;',

    // GeoJSON types
    'Position': 'export type Position = [number, number] | [number, number, number];',
    'Bbox': 'export type Bbox = [number, number, number, number] | [number, number, number, number, number, number];',
    'Bbox9': 'export type Bbox9 = Bbox;',
    'Properties': 'export type Properties = { [key: string]: any; } | null;',

    // Collection types
    'Features': 'export type Features = any[];',
    'Commits': 'export type Commits = any[];',
    'SampleInputs': 'export type SampleInputs = any[];',
    'Inputs': 'export type Inputs = any;',
    'Schemas': 'export type Schemas = any;',

    // Specific property types
    'FeatureCollectionProperties': 'export type FeatureCollectionProperties = { [key: string]: any; };',
    'AnnotationProperties': 'export type AnnotationProperties = { dataType: "annotation"; [key: string]: any; };',
    'PointProperties': 'export type PointProperties = { dataType: "point"; time?: string | number; [key: string]: any; };',
    'TrackProperties': 'export type TrackProperties = { dataType: "track"; times?: (string | number)[]; [key: string]: any; };',

    // State types
    'Selectedids': 'export type Selectedids = (string | number)[];',
    'Current': 'export type Current = string | number;',
    'Start': 'export type Start = string | number;',
    'End': 'export type End = string | number;',
    'Bounds': 'export type Bounds = [number, number, number, number];',

    // Tool types
    'Parameters': 'export type Parameters<T = any> = T;',
    'ReturnType': 'export type ReturnType<T = any> = T;',
  };

  // Geometry types (more complex)
  if (typeReferences.has('Point') && !content.includes('export interface Point')) {
    imports.push('export interface Point { type: "Point"; coordinates: Position; }');
  }
  if (typeReferences.has('LineString') && !content.includes('export interface LineString')) {
    imports.push('export interface LineString { type: "LineString"; coordinates: Position[]; }');
  }
  if (typeReferences.has('Polygon') && !content.includes('export interface Polygon')) {
    imports.push('export interface Polygon { type: "Polygon"; coordinates: Position[][]; }');
  }
  if (typeReferences.has('MultiPoint') && !content.includes('export interface MultiPoint')) {
    imports.push('export interface MultiPoint { type: "MultiPoint"; coordinates: Position[]; }');
  }
  if (typeReferences.has('MultiLineString') && !content.includes('export interface MultiLineString')) {
    imports.push('export interface MultiLineString { type: "MultiLineString"; coordinates: Position[][]; }');
  }
  if (typeReferences.has('MultiPolygon') && !content.includes('export interface MultiPolygon')) {
    imports.push('export interface MultiPolygon { type: "MultiPolygon"; coordinates: Position[][][]; }');
  }
  if (typeReferences.has('GeometryCollection') && !content.includes('export interface GeometryCollection')) {
    imports.push('export interface GeometryCollection { type: "GeometryCollection"; geometries: Geometry[]; }');
  }

  // Add Geometry union type if any geometry types are referenced
  const geometryTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
  const hasGeometryTypes = geometryTypes.some(type => typeReferences.has(type) || content.includes(type));
  if ((typeReferences.has('Geometry') || hasGeometryTypes) && !content.includes('export type Geometry')) {
    imports.push('export type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon | GeometryCollection;');
  }

  // Add common types that are referenced
  for (const [typeName, definition] of Object.entries(commonTypes)) {
    if (typeReferences.has(typeName) && !content.includes(`export type ${typeName}`) && !content.includes(`export interface ${typeName}`)) {
      imports.push(definition);
    }
  }

  // If we have imports to add, insert them
  if (imports.length > 1) { // More than just the marker comment
    lines.splice(insertIndex, 0, '', ...imports, '');
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`Added ${imports.length - 1} type definitions to ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

function processAllFiles() {
  console.log('Processing all TypeScript files to add missing types...');

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
      if (addMissingTypes(filePath)) {
        processedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`Enhanced post-processing complete. Updated ${processedCount} files.`);
}

if (require.main === module) {
  processAllFiles();
}