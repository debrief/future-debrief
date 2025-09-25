#!/usr/bin/env node

/**
 * Script to fix type references in all generated TypeScript files
 * by replacing them with qualified references to BaseTypes
 */

const fs = require('fs');
const path = require('path');

function fixTypeReferences(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Skip files that don't need fixing
  if (filePath.includes('base-types.ts')) {
    return false;
  }

  // Define type mappings - map unqualified type names to BaseTypes references
  const typeMapping = {
    // GeoJSON types
    'Position': 'BaseTypes.Position',
    'Point': 'BaseTypes.Point',
    'LineString': 'BaseTypes.LineString',
    'Polygon': 'BaseTypes.Polygon',
    'MultiPoint': 'BaseTypes.MultiPoint',
    'MultiLineString': 'BaseTypes.MultiLineString',
    'MultiPolygon': 'BaseTypes.MultiPolygon',
    'GeometryCollection': 'BaseTypes.GeometryCollection',
    'Geometry': 'BaseTypes.Geometry',
    'Feature': 'BaseTypes.Feature',
    'Properties': 'BaseTypes.Properties',
    'Bbox': 'BaseTypes.Bbox',
    'Bbox9': 'BaseTypes.Bbox9',

    // Basic types
    'Type': 'BaseTypes.Type',
    'Name': 'BaseTypes.Name',
    'Description': 'BaseTypes.Description',
    'Description2': 'BaseTypes.Description2',
    'Path': 'BaseTypes.Path',
    'File': 'BaseTypes.File',
    'Data': 'BaseTypes.Data',
    'Hash': 'BaseTypes.Hash',
    'Message': 'BaseTypes.Message',
    'Commit': 'BaseTypes.Commit',
    'Author': 'BaseTypes.Author',
    'Email': 'BaseTypes.Email',
    'Builddate': 'BaseTypes.Builddate',
    'ModulePath': 'BaseTypes.ModulePath',
    'ToolDir': 'BaseTypes.ToolDir',
    'SourceCode': 'BaseTypes.SourceCode',
    'ToolName': 'BaseTypes.ToolName',
    'ToolUrl': 'BaseTypes.ToolUrl',
    'Version': 'BaseTypes.Version',
    'Id': 'BaseTypes.Id',
    'Timestamp': 'BaseTypes.Timestamp',
    'LogLevel': 'BaseTypes.LogLevel',
    'JSONSchemaType': 'BaseTypes.JSONSchemaType',
    'Additionalproperties': 'BaseTypes.Additionalproperties',
    'Arguments': 'BaseTypes.Arguments',
    'Iserror': 'BaseTypes.Iserror',

    // Collection types
    'Features': 'BaseTypes.Features',
    'Commits': 'BaseTypes.Commits',
    'SampleInputs': 'BaseTypes.SampleInputs',
    'Inputs': 'BaseTypes.Inputs',
    'Schemas': 'BaseTypes.Schemas',
    'Tools': 'BaseTypes.Tools',
    'Selectedids': 'BaseTypes.Selectedids',
    'Allowedgeometrytypes': 'BaseTypes.Allowedgeometrytypes',
    'Alloweddatatypes': 'BaseTypes.Alloweddatatypes',

    // Numeric types
    'SampleInputsCount': 'BaseTypes.SampleInputsCount',
    'GitCommitsCount': 'BaseTypes.GitCommitsCount',
    'SourceCodeLength': 'BaseTypes.SourceCodeLength',
    'Current': 'BaseTypes.Current',
    'Start': 'BaseTypes.Start',
    'End': 'BaseTypes.End',
    'Bounds': 'BaseTypes.Bounds',

    // Property types
    'FeatureCollectionProperties': 'BaseTypes.FeatureCollectionProperties',
    'AnnotationProperties': 'BaseTypes.AnnotationProperties',
    'PointProperties': 'BaseTypes.PointProperties',
    'TrackProperties': 'BaseTypes.TrackProperties',

    // Complex types
    'JSONSchema': 'BaseTypes.JSONSchema',
    'JSONSchema1': 'BaseTypes.JSONSchema1',
    'ToolVaultCommand': 'BaseTypes.ToolVaultCommand',
    'ShowImagePayload': 'BaseTypes.ShowImagePayload',
    'GitHistory': 'BaseTypes.GitHistory',
    'PackageInfo': 'BaseTypes.PackageInfo',

    // Interface types
    'TimeState': 'BaseTypes.TimeState',
    'ViewportState': 'BaseTypes.ViewportState',
    'SelectionState': 'BaseTypes.SelectionState',
    'ToolFileReference': 'BaseTypes.ToolFileReference',
    'ToolFileReference1': 'BaseTypes.ToolFileReference1',
    'ToolFileReference2': 'BaseTypes.ToolFileReference2',
    'ToolFilesCollection': 'BaseTypes.ToolFilesCollection',
    'ToolStatsModel': 'BaseTypes.ToolStatsModel',
    'DebriefFeatureCollection': 'BaseTypes.DebriefFeatureCollection',
    'DebriefTrackFeature': 'BaseTypes.DebriefTrackFeature',
    'DebriefPointFeature': 'BaseTypes.DebriefPointFeature',
    'DebriefAnnotationFeature': 'BaseTypes.DebriefAnnotationFeature'
  };

  // Replace type references in the content
  for (const [typeName, qualifiedName] of Object.entries(typeMapping)) {
    // Match type references but not when they're already qualified or in comments
    const patterns = [
      // Type annotations: : TypeName
      new RegExp(`(:\\s*)${typeName}(?=\\s*[;,\\]})\\|&>])`, 'g'),
      // Generic parameters: <TypeName>
      new RegExp(`(<\\s*)${typeName}(?=\\s*[>,])`, 'g'),
      // Union types: | TypeName
      new RegExp(`(\\|\\s*)${typeName}(?=\\s*[;,\\]})\\|&>])`, 'g'),
      // Array types: TypeName[]
      new RegExp(`${typeName}(?=\\[\\])`, 'g'),
      // Property types: property: TypeName
      new RegExp(`(\\s+)${typeName}(?=\\s*[;,\\]})\\|&>])`, 'g'),
    ];

    for (const pattern of patterns) {
      const newContent = content.replace(pattern, `$1${qualifiedName}`);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    // Special case for standalone type references in interface bodies
    const standalonePattern = new RegExp(`\\b${typeName}\\b(?![\\w\\.]|\\s*=)`, 'g');
    const newContent = content.replace(standalonePattern, (match, offset) => {
      // Check if this is already qualified or in a comment
      const before = content.substring(Math.max(0, offset - 20), offset);
      if (before.includes('BaseTypes.') || before.includes('//') || before.includes('*')) {
        return match;
      }
      modified = true;
      return qualifiedName;
    });
    content = newContent;
  }

  // Fix specific issues
  // Fix Required<any> to Required<any>
  content = content.replace(/Required\s*(?=[,;])/g, 'Required<any>');
  modified = true;

  // Fix module import issues
  content = content.replace(/from '\.\.\/features\/debrief-feature'/g, "from '../base-types'");

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed type references in ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

function processAllFiles() {
  console.log('Fixing type references in all TypeScript files...');

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
      if (fixTypeReferences(filePath)) {
        processedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`Type references fixed in ${processedCount} files.`);
}

if (require.main === module) {
  processAllFiles();
}