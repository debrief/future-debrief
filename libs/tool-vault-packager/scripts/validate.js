#!/usr/bin/env node

/**
 * Cross-platform validation script for tool-vault-packager
 * Validates that .pyz package exists and basic functionality works
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors for cross-platform output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

function validatePackageExists() {
  log('blue', '🔍 Validating tool-vault-packager artifacts...');

  const pyzPath = 'dist/toolvault.pyz';

  if (!fs.existsSync(pyzPath)) {
    log('red', '❌ Missing .pyz package: dist/toolvault.pyz');
    return false;
  }

  const stat = fs.statSync(pyzPath);
  const sizeKB = Math.round(stat.size / 1024);
  log('green', `✅ Package exists: ${pyzPath} (${sizeKB} KB)`);
  return true;
}

function validateSPABuild() {
  log('blue', '🔍 Validating SPA build artifacts...');

  const spaDistPath = 'spa/dist';

  if (!fs.existsSync(spaDistPath)) {
    log('red', '❌ Missing SPA dist directory');
    return false;
  }

  const requiredFiles = [
    'spa/dist/index.html',
    'spa/dist/assets'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log('red', `❌ Missing SPA file: ${file}`);
      return false;
    }
  }

  log('green', '✅ SPA build artifacts present');
  return true;
}

function validateBasicFunctionality() {
  log('blue', '🔍 Testing basic functionality...');

  try {
    // Test that the package can list tools
    execSync('python dist/toolvault.pyz --help', { stdio: 'pipe' });
    log('green', '✅ Package executable and functional');
    return true;
  } catch (error) {
    log('red', '❌ Package not functional');
    return false;
  }
}

function main() {
  const startTime = Date.now();
  log('blue', '🚀 Starting tool-vault-packager validation (lightweight)...');

  const results = {
    package: validatePackageExists(),
    spa: validateSPABuild(),
    functionality: validateBasicFunctionality()
  };

  const allPassed = Object.values(results).every(Boolean);
  const duration = Math.round((Date.now() - startTime) / 1000);

  if (allPassed) {
    log('green', `🎉 All validations passed! (${duration}s)`);
    process.exit(0);
  } else {
    log('red', `❌ Validation failed (${duration}s)`);
    log('yellow', '💡 Suggested fixes:');

    if (!results.package || !results.spa) {
      log('yellow', '   - Run: npm run build');
    }
    if (!results.functionality) {
      log('yellow', '   - Check Python dependencies and package integrity');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validatePackageExists, validateSPABuild, validateBasicFunctionality };