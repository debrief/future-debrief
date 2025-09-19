#!/usr/bin/env node

/**
 * Cross-platform validation script for @debrief/shared-types
 * Validates that build artifacts are up-to-date without rebuilding
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
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

function getFileModTime(filePath) {
  try {
    return fs.statSync(filePath).mtime;
  } catch (error) {
    return null;
  }
}

function getNewestFileInDir(dir, pattern = '**/*.py') {
  try {
    const glob = require('glob');
    const files = glob.sync(pattern, { cwd: dir, absolute: true });
    let newest = null;
    let newestTime = 0;

    for (const file of files) {
      const mtime = getFileModTime(file);
      if (mtime && mtime.getTime() > newestTime) {
        newest = file;
        newestTime = mtime.getTime();
      }
    }
    return { file: newest, mtime: newestTime ? new Date(newestTime) : null };
  } catch (error) {
    return { file: null, mtime: null };
  }
}

function validateBuildArtifacts() {
  log('blue', '🔍 Validating shared-types build artifacts...');

  const requiredFiles = [
    'derived/json-schema/features/track.schema.json',
    'derived/json-schema/features/point.schema.json',
    'derived/json-schema/features/annotation.schema.json',
    'src/types/features/track.ts',
    'src/types/features/point.ts',
    'src/types/features/annotation.ts',
    'dist/src/index.js',
    'dist/src/index.d.ts'
  ];

  const missingFiles = [];
  const outdatedFiles = [];

  // Find newest Pydantic source file
  const newestPydantic = getNewestFileInDir('python-src/debrief/types', '**/*.py');

  if (!newestPydantic.file) {
    log('red', '❌ No Pydantic source files found');
    return false;
  }

  log('blue', `📄 Newest Pydantic model: ${path.relative(process.cwd(), newestPydantic.file)}`);
  log('blue', `🕐 Source timestamp: ${newestPydantic.mtime.toISOString()}`);

  for (const file of requiredFiles) {
    const filePath = path.resolve(file);
    const mtime = getFileModTime(filePath);

    if (!mtime) {
      missingFiles.push(file);
      continue;
    }

    // Check if generated file is older than source
    if (mtime < newestPydantic.mtime) {
      outdatedFiles.push({
        file,
        generatedTime: mtime,
        sourceTime: newestPydantic.mtime
      });
    }
  }

  if (missingFiles.length > 0) {
    log('red', '❌ Missing build artifacts:');
    missingFiles.forEach(file => log('red', `   - ${file}`));
    return false;
  }

  if (outdatedFiles.length > 0) {
    log('yellow', '⚠️  Outdated build artifacts (regeneration needed):');
    outdatedFiles.forEach(({ file, generatedTime, sourceTime }) => {
      const timeDiff = Math.round((sourceTime - generatedTime) / 1000);
      log('yellow', `   - ${file} (${timeDiff}s older than source)`);
    });
    return false;
  }

  log('green', '✅ All build artifacts are up-to-date');
  return true;
}

function validateTests() {
  log('blue', '🧪 Running tests (without rebuilding)...');

  try {
    // Run tests without building
    execSync('npm test', { stdio: 'pipe' });
    log('green', '✅ All tests passed');
    return true;
  } catch (error) {
    log('red', '❌ Tests failed');
    log('red', error.stdout?.toString() || error.message);
    return false;
  }
}

function validateTypeCheck() {
  log('blue', '🔍 Type checking (without compilation)...');

  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    log('green', '✅ Type check passed');
    return true;
  } catch (error) {
    log('red', '❌ Type check failed');
    log('red', error.stdout?.toString() || error.message);
    return false;
  }
}

function main() {
  const startTime = Date.now();
  log('blue', '🚀 Starting shared-types validation (timestamp-based)...');

  const results = {
    artifacts: validateBuildArtifacts(),
    tests: validateTests(),
    typecheck: validateTypeCheck()
  };

  const allPassed = Object.values(results).every(Boolean);
  const duration = Math.round((Date.now() - startTime) / 1000);

  if (allPassed) {
    log('green', `🎉 All validations passed! (${duration}s)`);
    process.exit(0);
  } else {
    log('red', `❌ Validation failed (${duration}s)`);
    log('yellow', '💡 Suggested fixes:');

    if (!results.artifacts) {
      log('yellow', '   - Run: pnpm generate:types');
    }
    if (!results.tests) {
      log('yellow', '   - Fix test failures and run: pnpm test');
    }
    if (!results.typecheck) {
      log('yellow', '   - Fix type errors and run: pnpm typecheck');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateBuildArtifacts, validateTests, validateTypeCheck };