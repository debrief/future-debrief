#!/usr/bin/env node

/**
 * Test that validates TypeScript validators work correctly
 * Note: This is a Node.js test file that imports TypeScript validators
 */

const fs = require('fs');
const path = require('path');

// Since we can't directly import TypeScript in Node.js without transpilation,
// we'll test that the validator files exist and have expected structure
const VALIDATORS_DIR = path.join(__dirname, '..', '..', 'src', 'validators');

const VALIDATOR_FILES = [
  'track-validator.ts',
  'point-validator.ts',
  'annotation-validator.ts',
  'featurecollection-validator.ts',
  'index.ts'
];

const EXPECTED_EXPORTS = {
  'track-validator.ts': [
    'validateTimestampsLength',
    'validateTrackFeature',
    'validateTrackFeatureComprehensive'
  ],
  'point-validator.ts': [
    'validateTimeProperties',
    'validatePointFeature',
    'validatePointFeatureComprehensive'
  ],
  'annotation-validator.ts': [
    'validateColorFormat',
    'validateAnnotationType',
    'validateAnnotationFeature',
    'validateAnnotationFeatureComprehensive'
  ],
  'featurecollection-validator.ts': [
    'validateBbox',
    'validateFeatureCollection',
    'validateFeatureCollectionComprehensive'
  ],
  'index.ts': [
    'validateTimestampsLength',
    'validateTimeProperties',
    'validateColorFormat',
    'validateBbox'
  ]
};


function testValidatorFileExists(filename) {
  const filePath = path.join(VALIDATORS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Validator file missing: ${filename}`);
  }
  console.log(`✓ Validator file exists: ${filename}`);
  return filePath;
}


function testValidatorContent(filename, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.length === 0) {
    throw new Error(`Validator file is empty: ${filename}`);
  }
  
  // Check for expected exports
  const expectedExports = EXPECTED_EXPORTS[filename] || [];
  for (const exportName of expectedExports) {
    // For index.ts, look for re-exports
    if (filename === 'index.ts') {
      const reExportPattern = new RegExp(`export\\s*{[^}]*${exportName}[^}]*}`);
      if (!reExportPattern.test(content)) {
        throw new Error(`Missing expected re-export '${exportName}' in ${filename}`);
      }
    } else {
      const exportPattern = new RegExp(`export\\s+(function\\s+)?${exportName}`);
      if (!exportPattern.test(content)) {
        throw new Error(`Missing expected export '${exportName}' in ${filename}`);
      }
    }
  }
  
  // Check that it imports from generated types (either derived or copied to src)
  if (filename !== 'index.ts'
    && !content.includes('../../derived/typescript/')
    && !content.includes('../types/')
    && !content.includes('../index')) {
    throw new Error(`Validator ${filename} should import from generated types`);
  }
  
  console.log(`✓ Validator content valid: ${filename}`);
}


function testTypeScriptSyntax(filename, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic TypeScript syntax checks
  const checks = [
    { pattern: /export\s+function\s+\w+/, desc: 'exported functions' },
    { pattern: /:\s*boolean/, desc: 'boolean return types' },
    { pattern: /interface\s+\w+|type\s+\w+/, desc: 'type definitions' }
  ];
  
  for (const check of checks) {
    if (!check.pattern.test(content)) {
      console.warn(`⚠ File ${filename} missing expected ${check.desc}`);
    }
  }
  
  // Check for TypeScript-specific features
  if (!content.includes('export') && filename !== 'index.ts') {
    throw new Error(`File ${filename} should export validator functions`);
  }
  
  console.log(`✓ TypeScript validator syntax valid: ${filename}`);
}


function testValidatorLogic() {
  // Test some basic validator logic patterns by examining the code
  const trackValidatorPath = path.join(VALIDATORS_DIR, 'track-validator.ts');
  const content = fs.readFileSync(trackValidatorPath, 'utf8');
  
  // Check for critical validation logic
  const criticalChecks = [
    { pattern: /timestamps.*length/i, desc: 'timestamps length validation' },
    { pattern: /coordinates.*length/i, desc: 'coordinates length validation' },
    { pattern: /LineString|MultiLineString/i, desc: 'geometry type validation' }
  ];
  
  for (const check of criticalChecks) {
    if (!check.pattern.test(content)) {
      throw new Error(`Track validator missing critical logic: ${check.desc}`);
    }
  }
  
  console.log(`✓ Validator logic patterns present`);
}


function testCrossFieldValidation() {
  // Test that cross-field validation is implemented
  const trackValidatorPath = path.join(VALIDATORS_DIR, 'track-validator.ts');
  const content = fs.readFileSync(trackValidatorPath, 'utf8');
  
  // Look for the key cross-field validation: timestamps length vs coordinates
  if (!content.includes('validateTimestampsLength')) {
    throw new Error(`Missing critical cross-field validation function`);
  }
  
  // Check that it validates against coordinate count
  if (!content.includes('coordinates.length')) {
    throw new Error(`Timestamps validation should check against coordinates length`);
  }
  
  console.log(`✓ Cross-field validation implemented`);
}


function runTests() {
  console.log('Testing TypeScript validators...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test individual validator files
  for (const filename of VALIDATOR_FILES) {
    try {
      const filePath = testValidatorFileExists(filename);
      testValidatorContent(filename, filePath);
      testTypeScriptSyntax(filename, filePath);
      passedTests++;
    } catch (error) {
      console.error(`✗ ${error.message}`);
      failedTests++;
    }
  }
  
  // Test validator logic patterns
  try {
    testValidatorLogic();
    testCrossFieldValidation();
    passedTests++;
  } catch (error) {
    console.error(`✗ ${error.message}`);
    failedTests++;
  }
  
  console.log(`\nTest Results:`);
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.error('\nSome validator tests failed.');
    process.exit(1);
  }
  
  console.log('\n🎉 All TypeScript validator tests passed!');
  console.log('\nNote: For runtime testing, compile TypeScript files and run with a test runner like Jest.');
}


// Only run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };