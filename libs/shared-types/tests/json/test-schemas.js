#!/usr/bin/env node

/**
 * Test that validates JSON Schema files are correct and can validate data
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const FEATURES_SCHEMA_DIR = path.join(__dirname, '..', '..', 'derived', 'json-schema', 'features');
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


function testSchemaValidation(filename, schema) {
  // Create a copy without $schema to avoid AJV meta-schema issues
  const schemaForValidation = { ...schema };
  delete schemaForValidation.$schema;
  
  const ajv = new Ajv({ 
    strict: false, 
    validateFormats: true,
    loadSchema: false,
    meta: false
  });
  addFormats(ajv);
  
  // For featurecollection schema, we need to add the referenced schemas
  if (filename === 'FeatureCollection.schema.json') {
    // Load and add the referenced schemas to AJV
    try {
      const trackSchema = loadSchema('Track.schema.json');
      const pointSchema = loadSchema('Point.schema.json');
      const annotationSchema = loadSchema('Annotation.schema.json');
      
      // Remove $schema properties and add to AJV
      const trackForValidation = { ...trackSchema };
      delete trackForValidation.$schema;
      const pointForValidation = { ...pointSchema };
      delete pointForValidation.$schema;
      const annotationForValidation = { ...annotationSchema };
      delete annotationForValidation.$schema;
      
      ajv.addSchema(trackForValidation, 'Track.schema.json');
      ajv.addSchema(pointForValidation, 'Point.schema.json');
      ajv.addSchema(annotationForValidation, 'Annotation.schema.json');
    } catch (error) {
      console.log(`⚠ Warning: Could not add referenced schemas: ${error.message}`);
    }
  }
  
  let validate;
  try {
    validate = ajv.compile(schemaForValidation);
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


function runTests() {
  console.log('Testing JSON Schema files...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const filename of SCHEMA_FILES) {
    try {
      const schema = loadSchema(filename);
      testSchemaStructure(filename, schema);
      testSchemaValidation(filename, schema);
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
  runTests();
}

module.exports = { runTests };