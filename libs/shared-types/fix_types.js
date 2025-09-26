#!/usr/bin/env node

/**
 * Enhanced post-processing script to add missing type definitions to all TypeScript files
 */

const fs = require('fs');
const path = require('path');

function addMissingTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip files that already have been processed to avoid duplicates
  if (content.includes('// Enhanced post-processed - missing type definitions added')) {
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

  // Find insertion point (after header comment and leading imports)
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('*/') && i > 0 && lines[i - 1].includes('DO NOT MODIFY')) {
      insertIndex = i + 1;
      break;
    }
  }

  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '*/' || lines[i].startsWith('export ') || lines[i].startsWith('//')) {
        insertIndex = i + 1;
        break;
      }
    }
  }

  if (insertIndex === -1) insertIndex = 6;

  // Ensure we add definitions after any leading imports or post-processing markers
  while (insertIndex < lines.length) {
    const trimmedLine = lines[insertIndex].trim();
    if (trimmedLine === '') {
      insertIndex++;
      continue;
    }
    if (trimmedLine.startsWith('// Post-processed by post_process_typescript.js')) {
      insertIndex++;
      continue;
    }
    if (trimmedLine.startsWith('import')) {
      insertIndex++;
      continue;
    }
    break;
  }

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
    'Timestamp': 'export type Timestamp = string;',
    'LogLevel': 'export type LogLevel = "debug" | "info" | "warning" | "error";',
    'Version': 'export type Version = string;',
    'Description2': 'export type Description2 = string;',
    'Tools': 'export type Tools = any;',
    'Arguments': 'export type Arguments = any;',
    'Iserror': 'export type Iserror = boolean;',
    'ToolUrl': 'export type ToolUrl = string;',
    'JSONSchemaType': 'export type JSONSchemaType = string;',
    'Additionalproperties': 'export type Additionalproperties = boolean;',
    'Allowedgeometrytypes': 'export type Allowedgeometrytypes = string[];',
    'Alloweddatatypes': 'export type Alloweddatatypes = string[];',

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
    'JSONSchema': 'export type JSONSchema = any;',
    'JSONSchema1': 'export type JSONSchema1 = any;',
    'ToolVaultCommand': 'export type ToolVaultCommand = any;',
    'ShowImagePayload': 'export type ShowImagePayload = any;',
    'Feature': 'export interface Feature { type: "Feature"; geometry: Geometry; properties: Properties; }',

    // Complex imported types that need to be defined here
    'ToolFileReference': 'export interface ToolFileReference { path: Path; description: Description; type: Type; }',
    'ToolFileReference1': 'export interface ToolFileReference1 { path: Path; description: Description; type: Type; }',
    'ToolFileReference2': 'export interface ToolFileReference2 { path: Path; description: Description; type: Type; }',
    'ToolFilesCollection': 'export interface ToolFilesCollection { execute: ToolFileReference; source_code: ToolFileReference1; git_history: ToolFileReference2; inputs?: Inputs; schemas?: Schemas; }',
    'ToolStatsModel': 'export interface ToolStatsModel { sample_inputs_count?: SampleInputsCount; git_commits_count?: GitCommitsCount; source_code_length?: SourceCodeLength; }',
    'GitHistory': 'export type GitHistory = any;',
    'PackageInfo': 'export type PackageInfo = any;',
    'TimeState': 'export interface TimeState { current?: Current; start?: Start; end?: End; }',
    'ViewportState': 'export interface ViewportState { bounds?: Bounds; center?: Position; zoom?: number; }',
    'SelectionState': 'export interface SelectionState { selectedIds?: Selectedids; }',
    'DebriefFeatureCollection': 'export interface DebriefFeatureCollection { type?: Type; features: Features; bbox?: Bbox9; properties?: FeatureCollectionProperties | null; }',

    // Individual feature types that are missing from debrief_feature_collection
    'DebriefTrackFeature': 'export interface DebriefTrackFeature { type: "Feature"; geometry: Geometry; properties: TrackProperties; }',
    'DebriefPointFeature': 'export interface DebriefPointFeature { type: "Feature"; geometry: Geometry; properties: PointProperties; }',
    'DebriefAnnotationFeature': 'export interface DebriefAnnotationFeature { type: "Feature"; geometry: Geometry; properties: AnnotationProperties; }',
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
