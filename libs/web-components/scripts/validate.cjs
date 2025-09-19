#!/usr/bin/env node

/**
 * Cross-platform validation script for @debrief/web-components
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

function getNewestFileInDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  try {
    const files = [];

    function walkDir(currentPath) {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          walkDir(fullPath);
        } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }

    walkDir(dir);

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
  log('blue', '🔍 Validating web-components build artifacts...');

  const requiredFiles = [
    'dist/vanilla/index.js',
    'dist/vanilla/index.css',
    'dist/vanilla/vanilla-generated.d.ts'
  ];

  const missingFiles = [];
  const outdatedFiles = [];

  // Find newest source file
  const newestSource = getNewestFileInDir('src');

  if (!newestSource.file) {
    log('red', '❌ No source files found in src/');
    return false;
  }

  log('blue', `📄 Newest source file: ${path.relative(process.cwd(), newestSource.file)}`);
  log('blue', `🕐 Source timestamp: ${newestSource.mtime.toISOString()}`);

  for (const file of requiredFiles) {
    const filePath = path.resolve(file);
    const mtime = getFileModTime(filePath);

    if (!mtime) {
      missingFiles.push(file);
      continue;
    }

    // Check if built file is older than source
    if (mtime < newestSource.mtime) {
      outdatedFiles.push({
        file,
        builtTime: mtime,
        sourceTime: newestSource.mtime
      });
    }
  }

  if (missingFiles.length > 0) {
    log('red', '❌ Missing build artifacts:');
    missingFiles.forEach(file => log('red', `   - ${file}`));
    return false;
  }

  if (outdatedFiles.length > 0) {
    log('yellow', '⚠️  Outdated build artifacts (rebuild needed):');
    outdatedFiles.forEach(({ file, builtTime, sourceTime }) => {
      const timeDiff = Math.round((sourceTime - builtTime) / 1000);
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
    execSync('npm test', { stdio: 'pipe' });
    log('green', '✅ All tests passed');
    return true;
  } catch (error) {
    log('red', '❌ Tests failed');
    // Don't show full output to keep it clean
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
    return false;
  }
}

function main() {
  const startTime = Date.now();
  log('blue', '🚀 Starting web-components validation (timestamp-based)...');

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
      log('yellow', '   - Run: pnpm build');
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