#!/usr/bin/env node

/**
 * Test that validates JSON Schema files are correct and can validate data
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const SCHEMA_DIR = path.join(__dirname, '..', '..', 'schema');
const TEST_DATA_DIR = path.join(__dirname, 'data');

const SCHEMA_FILES = [
  'track.schema.json',
  'point.schema.json',
  'annotation.schema.json',
  'featurecollection.schema.json'
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
  const schemaPath = path.join(SCHEMA_DIR, filename);
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
  if (filename === 'featurecollection.schema.json') {
    // Load and add the referenced schemas to AJV
    try {
      const trackSchema = loadSchema('track.schema.json');
      const pointSchema = loadSchema('point.schema.json');
      const annotationSchema = loadSchema('annotation.schema.json');
      
      // Remove $schema properties and add to AJV
      const trackForValidation = { ...trackSchema };
      delete trackForValidation.$schema;
      const pointForValidation = { ...pointSchema };
      delete pointForValidation.$schema;
      const annotationForValidation = { ...annotationSchema };
      delete annotationForValidation.$schema;
      
      ajv.addSchema(trackForValidation, 'track.schema.json');
      ajv.addSchema(pointForValidation, 'point.schema.json');
      ajv.addSchema(annotationForValidation, 'annotation.schema.json');
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
  // Check required JSON Schema properties
  const required = ['$schema', '$id', 'title', 'type'];
  for (const prop of required) {
    if (!schema[prop]) {
      throw new Error(`Schema ${filename} missing required property: ${prop}`);
    }
  }
  
  // Check JSON Schema version (accept draft-07 for compatibility)
  if (!schema.$schema.includes('draft-07') && !schema.$schema.includes('2020-12')) {
    throw new Error(`Schema ${filename} should use a supported JSON Schema version`);
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