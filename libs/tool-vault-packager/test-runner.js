#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_MODES = ['dev', 'pyz'];

async function runCommand(command, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function buildPyzIfNeeded() {
  if (!fs.existsSync('dist/toolvault.pyz')) {
    console.log('Building .pyz file...');
    await runCommand('npm', ['run', 'build']);
  } else {
    console.log('.pyz file exists, skipping build');
  }
}

async function runTestsForMode(mode) {
  console.log(`\n=== Running tests in ${mode.toUpperCase()} mode ===\n`);
  
  const env = {
    TEST_MODE: mode
  };
  
  if (mode === 'pyz') {
    await buildPyzIfNeeded();
  }
  
  try {
    await runCommand('npx', ['playwright', 'test'], env);
    console.log(`✅ Tests passed in ${mode.toUpperCase()} mode`);
    return true;
  } catch (error) {
    console.error(`❌ Tests failed in ${mode.toUpperCase()} mode:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🎭 ToolVault Playwright Test Suite');
  console.log('==================================\n');
  
  const results = {};
  
  for (const mode of TEST_MODES) {
    const success = await runTestsForMode(mode);
    results[mode] = success;
  }
  
  console.log('\n=== Test Results Summary ===');
  for (const [mode, success] of Object.entries(results)) {
    const status = success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${mode.toUpperCase()}: ${status}`);
  }
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed in both modes!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Allow running specific mode
if (process.argv.length > 2) {
  const requestedMode = process.argv[2];
  if (TEST_MODES.includes(requestedMode)) {
    runTestsForMode(requestedMode).then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.error(`Invalid mode: ${requestedMode}. Valid modes: ${TEST_MODES.join(', ')}`);
    process.exit(1);
  }
} else {
  main();
}