#!/usr/bin/env node

/**
 * Test that validates JSON Schema files are correct and can validate data
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const FEATURES_SCHEMA_DIR = path.join(__dirname, '..', '..', 'derived', 'json-schema', 'features');
const GEOJSON_SCHEMA_DIR = path.join(__dirname, '..', '..', 'derived', 'json-schema', 'geojson');
const TEST_DATA_DIR = path.join(__dirname, 'data');

const SCHEMA_FILES = [
  'track.schema.json',
  'point.schema.json',
  'annotation.schema.json',
  'debrief_feature_collection.schema.json'
];

/**
 * Load test data from JSON files
 */
function loadTestData(schemaFilename) {
  const baseName = schemaFilename.replace('.schema.json', '');
  const validPath = path.join(TEST_DATA_DIR, `${baseName}-valid.json`);
  const invalidPath = path.join(TEST_DATA_DIR, `${baseName}-invalid.json`);
  
  let valid = null;
  let invalid = null;
  
  try {
    if (fs.existsSync(validPath)) {
      valid = JSON.parse(fs.readFileSync(validPath, 'utf8'));
    }
  } catch (error) {
    console.log(`⚠ Warning: Could not load valid test data for ${baseName}: ${error.message}`);
  }
  
  try {
    if (fs.existsSync(invalidPath)) {
      invalid = JSON.parse(fs.readFileSync(invalidPath, 'utf8'));
    }
  } catch (error) {
    console.log(`⚠ Warning: Could not load invalid test data for ${baseName}: ${error.message}`);
  }
  
  return { valid, invalid };
}


function loadSchema(filename) {
  const schemaPath = path.join(FEATURES_SCHEMA_DIR, filename);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${filename}`);
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  try {
    const schema = JSON.parse(schemaContent);
    console.log(`✓ Schema loaded: ${filename}`);
    return schema;
  } catch (error) {
    throw new Error(`Invalid JSON in schema ${filename}: ${error.message}`);
  }
}

function loadGeoJsonSchema(filename) {
  const schemaPath = path.join(GEOJSON_SCHEMA_DIR, filename);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`GeoJSON schema file not found: ${filename}`);
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  try {
    const schema = JSON.parse(schemaContent);
    return schema;
  } catch (error) {
    throw new Error(`Invalid JSON in GeoJSON schema ${filename}: ${error.message}`);
  }
}


async function testSchemaValidation(filename, schema) {
  // Create a copy without $schema to avoid AJV meta-schema issues
  const schemaForValidation = { ...schema };
  delete schemaForValidation.$schema;
  
  // Custom schema loader for AJV
  async function loadExternalSchema(uri) {
    // console.log(`  Loading external schema: ${uri}`);

    // Handle GeoJSON schema references (both relative and HTTP URLs)
    if (uri.startsWith('../geojson/') || uri.startsWith('geojson/') || uri.startsWith('https://schemas.debrief.com/geojson/')) {
      let filename;
      if (uri.startsWith('https://schemas.debrief.com/geojson/')) {
        filename = uri.replace('https://schemas.debrief.com/geojson/', '');
      } else {
        filename = uri.replace(/^(\.\.\/)?(geojson\/)/, '');
      }
      try {
        const schema = loadGeoJsonSchema(filename);
        const schemaForValidation = { ...schema };
        delete schemaForValidation.$schema;
        delete schemaForValidation.$id;
        // console.log(`  ✓ Loaded GeoJSON schema: ${filename}`);
        return schemaForValidation;
      } catch (error) {
        throw new Error(`Could not load GeoJSON schema ${uri}: ${error.message}`);
      }
    }

    // Handle feature schema references (HTTP URLs)
    if (uri.startsWith('https://schemas.debrief.com/features/')) {
      let schemaName;
      if (uri === 'https://schemas.debrief.com/features/debrief-feature.schema.json') {
        // Special case for DebriefFeature union schema
        schemaName = 'debrief_feature.schema.json';
      } else {
        // Regular feature schemas
        schemaName = uri.replace('https://schemas.debrief.com/features/', '').replace('-feature.schema.json', '.schema.json');
      }
      try {
        const schema = loadSchema(schemaName);
        const schemaForValidation = { ...schema };
        delete schemaForValidation.$schema;
        delete schemaForValidation.$id;
        // console.log(`  ✓ Loaded feature schema: ${schemaName}`);
        return schemaForValidation;
      } catch (error) {
        throw new Error(`Could not load feature schema ${uri}: ${error.message}`);
      }
    }

    // Handle DebriefFeature schema reference
    if (uri === 'debrief-feature.schema.json') {
      try {
        const schema = loadSchema('debrief_feature.schema.json');
        const schemaForValidation = { ...schema };
        delete schemaForValidation.$schema;
        delete schemaForValidation.$id;
        // console.log(`  ✓ Loaded DebriefFeature union schema`);
        return schemaForValidation;
      } catch (error) {
        throw new Error(`Could not load DebriefFeature schema: ${error.message}`);
      }
    }

    throw new Error(`Unknown external schema: ${uri}`);
  }

  const ajv = new Ajv({
    strict: false,
    validateFormats: true,
    loadSchema: loadExternalSchema,
    meta: false
  });
  addFormats(ajv);

  // GeoJSON schemas will be loaded on-demand by the loadExternalSchema function

  // For feature collection schema, load other feature schemas
  if (filename === 'debrief_feature_collection.schema.json') {
    const featureSchemas = ['track.schema.json', 'point.schema.json', 'annotation.schema.json'];
    for (const featureFile of featureSchemas) {
      try {
        const featureSchema = loadSchema(featureFile);
        const schemaForValidation = { ...featureSchema };
        delete schemaForValidation.$schema;
        ajv.addSchema(schemaForValidation, featureFile);
      } catch (error) {
        console.log(`⚠ Warning: Could not load feature schema ${featureFile}: ${error.message}`);
      }
    }
  }
  
  // Debug: show what schemas AJV has loaded (commented out for cleaner output)
  // console.log('  AJV schemas:', Object.keys(ajv.schemas || {}));

  let validate;
  try {
    validate = await ajv.compileAsync(schemaForValidation);
    console.log(`✓ Schema compiles: ${filename}`);
  } catch (error) {
    throw new Error(`Schema compilation failed for ${filename}: ${error.message}`);
  }
  
  // Test valid data
  const testData = loadTestData(filename);
  if (testData.valid) {
    const validResult = validate(testData.valid);
    if (!validResult) {
      throw new Error(`Valid data failed validation for ${filename}: ${JSON.stringify(validate.errors, null, 2)}`);
    }
    console.log(`✓ Valid data passes: ${filename}`);
  }
  
  if (testData.invalid) {
    const invalidResult = validate(testData.invalid);
    if (invalidResult) {
      throw new Error(`Invalid data incorrectly passed validation for ${filename}`);
    }
    console.log(`✓ Invalid data rejected: ${filename}`);
  }
}


function testSchemaStructure(filename, schema) {
  // For Pydantic-generated schemas, be more lenient on required properties
  // Check that it at least has a type property
  if (!schema.type && !schema.anyOf && !schema.oneOf) {
    throw new Error(`Schema ${filename} should have a type, anyOf, or oneOf property`);
  }

  // If $schema is present, check version compatibility
  if (schema.$schema && !schema.$schema.includes('draft-07') && !schema.$schema.includes('2020-12')) {
    console.warn(`⚠ Schema ${filename} uses unsupported JSON Schema version: ${schema.$schema}`);
  }

  // Check that it has some structure (properties, definitions, etc.)
  if (!schema.properties && !schema.$defs && !schema.definitions && !schema.anyOf && !schema.oneOf) {
    throw new Error(`Schema ${filename} appears to be empty or invalid`);
  }

  console.log(`✓ Schema structure valid: ${filename}`);
}


async function runTests() {
  console.log('Testing JSON Schema files...\n');

  let passedTests = 0;
  let failedTests = 0;

  for (const filename of SCHEMA_FILES) {
    try {
      const schema = loadSchema(filename);
      testSchemaStructure(filename, schema);
      await testSchemaValidation(filename, schema);
      passedTests++;
    } catch (error) {
      console.error(`✗ ${error.message}`);
      failedTests++;
    }
  }
  
  console.log(`\nTest Results:`);
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.error('\nSome schema tests failed.');
    process.exit(1);
  }
  
  console.log('\n🎉 All JSON Schema tests passed!');
}


// Only run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };