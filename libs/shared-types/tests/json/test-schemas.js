#!/usr/bin/env node

/**
 * Test that validates JSON Schema files are correct and can validate data
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const SCHEMA_DIR = path.join(__dirname, '..', '..', 'schema');

const SCHEMA_FILES = [
  'track.schema.json',
  'point.schema.json',
  'annotation.schema.json',
  'featurecollection.schema.json'
];

// Test data for each schema
const TEST_DATA = {
  'track.schema.json': {
    valid: {
      type: 'Feature',
      id: 'track-1',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-1.0, 51.0],
          [-0.9, 51.1],
          [-0.8, 51.2]
        ]
      },
      properties: {
        timestamps: [
          '2024-01-01T10:00:00Z',
          '2024-01-01T10:01:00Z',
          '2024-01-01T10:02:00Z'
        ],
        name: 'Test Track'
      }
    },
    invalid: {
      type: 'Feature',
      // missing id
      geometry: {
        type: 'Point', // wrong geometry type
        coordinates: [-1.0, 51.0]
      },
      properties: {}
    }
  },
  
  'point.schema.json': {
    valid: {
      type: 'Feature',
      id: 'point-1',
      geometry: {
        type: 'Point',
        coordinates: [-1.0, 51.0]
      },
      properties: {
        time: '2024-01-01T10:00:00Z',
        name: 'Test Point'
      }
    },
    invalid: {
      type: 'Feature',
      id: 'point-1',
      geometry: {
        type: 'LineString', // wrong geometry type
        coordinates: [[-1.0, 51.0], [-0.9, 51.1]]
      },
      properties: {}
    }
  },
  
  'annotation.schema.json': {
    valid: {
      type: 'Feature',
      id: 'annotation-1',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.0, 51.0],
          [-0.5, 51.0],
          [-0.5, 51.5],
          [-1.0, 51.5],
          [-1.0, 51.0]
        ]]
      },
      properties: {
        annotationType: 'area',
        text: 'Important area',
        color: '#FF0000',
        name: 'Test Annotation'
      }
    },
    invalid: {
      type: 'Feature',
      id: 'annotation-1',
      geometry: {
        type: 'Polygon',
        coordinates: [] // invalid coordinates
      },
      properties: {
        annotationType: 'invalid-type', // invalid annotation type
        color: 'red' // invalid color format
      }
    }
  },
  
  'featurecollection.schema.json': {
    valid: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'track-1',
          geometry: {
            type: 'LineString',
            coordinates: [[-1.0, 51.0], [-0.9, 51.1]]
          },
          properties: { name: 'Track 1' }
        }
      ],
      properties: {
        name: 'Test Collection',
        created: '2024-01-01T10:00:00Z'
      }
    },
    invalid: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          // missing id
          geometry: {
            type: 'LineString',
            coordinates: [[-1.0, 51.0], [-0.9, 51.1]]
          },
          properties: {}
        }
      ]
    }
  }
};


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
  
  let validate;
  try {
    validate = ajv.compile(schemaForValidation);
    console.log(`✓ Schema compiles: ${filename}`);
  } catch (error) {
    throw new Error(`Schema compilation failed for ${filename}: ${error.message}`);
  }
  
  // Test valid data
  const testData = TEST_DATA[filename];
  if (testData) {
    const validResult = validate(testData.valid);
    if (!validResult) {
      throw new Error(`Valid data failed validation for ${filename}: ${JSON.stringify(validate.errors, null, 2)}`);
    }
    console.log(`✓ Valid data passes: ${filename}`);
    
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