#!/usr/bin/env node

/**
 * Wheel Verification Script
 * 
 * This script verifies that the built Python wheel contains all expected files:
 * - Schemas (JSON files)
 * - Generated types (Python classes)  
 * - Validators (Python validation functions)
 * 
 * This helps catch build issues early instead of discovering them downstream.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST_DIR = 'dist/python';
const REQUIRED_FILES = {
    schemas: [
        'debrief/schemas/__init__.py',
        'debrief/schemas/Track.schema.json',
        'debrief/schemas/Point.schema.json', 
        'debrief/schemas/Annotation.schema.json',
        'debrief/schemas/FeatureCollection.schema.json',
        'debrief/schemas/TimeState.schema.json',
        'debrief/schemas/ViewportState.schema.json',
        'debrief/schemas/SelectionState.schema.json',
        'debrief/schemas/EditorState.schema.json',
        'debrief/schemas/CurrentState.schema.json'
    ],
    types: [
        'debrief/types/__init__.py',
        'debrief/types/track.py',
        'debrief/types/point.py',
        'debrief/types/annotation.py', 
        'debrief/types/featurecollection.py',
        'debrief/types/TimeState.py',
        'debrief/types/ViewportState.py',
        'debrief/types/SelectionState.py',
        'debrief/types/EditorState.py'
    ],
    validators: [
        'debrief/validators/__init__.py',
        'debrief/validators/track_validator.py',
        'debrief/validators/point_validator.py',
        'debrief/validators/annotation_validator.py',
        'debrief/validators/featurecollection_validator.py'
    ]
};

function findWheelFile() {
    if (!fs.existsSync(DIST_DIR)) {
        throw new Error(`Distribution directory ${DIST_DIR} does not exist. Run 'pnpm build:python-wheel' first.`);
    }
    
    const files = fs.readdirSync(DIST_DIR);
    const wheelFiles = files.filter(file => file.endsWith('.whl'));
    
    if (wheelFiles.length === 0) {
        throw new Error(`No .whl files found in ${DIST_DIR}. Run 'pnpm build:python-wheel' first.`);
    }
    
    if (wheelFiles.length > 1) {
        console.warn(`Multiple wheel files found: ${wheelFiles.join(', ')}. Using ${wheelFiles[0]}`);
    }
    
    return path.join(DIST_DIR, wheelFiles[0]);
}

function getWheelContents(wheelPath) {
    try {
        const output = execSync(`unzip -l "${wheelPath}"`, { encoding: 'utf8' });
        return output.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('Archive:') && !line.startsWith('Length') && !line.startsWith('-'))
            .map(line => {
                // Extract filename from unzip -l output (last column)
                const parts = line.split(/\s+/);
                return parts[parts.length - 1];
            })
            .filter(filename => filename && filename !== 'RECORD'); // Filter out metadata
    } catch (error) {
        throw new Error(`Failed to list wheel contents: ${error.message}`);
    }
}

function verifyWheelContents() {
    console.log('🔍 Verifying Python wheel contents...\n');
    
    const wheelPath = findWheelFile();
    console.log(`📦 Found wheel: ${wheelPath}`);
    
    const contents = getWheelContents(wheelPath);
    console.log(`📋 Wheel contains ${contents.length} files\n`);
    
    let hasErrors = false;
    const missing = [];
    const found = [];
    
    // Check each category of required files
    for (const [category, files] of Object.entries(REQUIRED_FILES)) {
        console.log(`🔎 Checking ${category}:`);
        
        for (const requiredFile of files) {
            if (contents.includes(requiredFile)) {
                console.log(`  ✅ ${requiredFile}`);
                found.push(requiredFile);
            } else {
                console.log(`  ❌ ${requiredFile} - MISSING`);
                missing.push(requiredFile);
                hasErrors = true;
            }
        }
        console.log();
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`  Found: ${found.length} files`);
    console.log(`  Missing: ${missing.length} files`);
    
    if (hasErrors) {
        console.log('\n❌ Wheel verification FAILED!');
        console.log('\nMissing files:');
        missing.forEach(file => console.log(`  - ${file}`));
        console.log('\n💡 This usually indicates:');
        console.log('  - Generated types were not copied to python-src/debrief/types/');
        console.log('  - setup.py is not properly copying files during build');
        console.log('  - The build process needs to run "pnpm generate:types" first');
        
        process.exit(1);
    }
    
    console.log('\n✅ Wheel verification PASSED! All required files are present.');
    
    // Additional checks
    console.log('\n🔍 Additional checks:');
    
    // Check that types __init__.py has proper exports
    const typesInit = contents.find(f => f === 'debrief/types/__init__.py');
    if (typesInit) {
        console.log('  ✅ Types package has __init__.py');
    }
    
    // Count total files by category
    const schemaCount = contents.filter(f => f.startsWith('debrief/schemas/') && f.endsWith('.json')).length;
    const typeCount = contents.filter(f => f.startsWith('debrief/types/') && f.endsWith('.py') && !f.endsWith('__init__.py')).length;
    const validatorCount = contents.filter(f => f.startsWith('debrief/validators/') && f.endsWith('.py') && !f.endsWith('__init__.py')).length;
    
    console.log(`  📄 ${schemaCount} schema files`);
    console.log(`  🏷️  ${typeCount} type files`);
    console.log(`  ✔️  ${validatorCount} validator files`);
    
    console.log('\n🎉 Wheel is ready for distribution!');
}

if (require.main === module) {
    try {
        verifyWheelContents();
    } catch (error) {
        console.error(`❌ Verification failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { verifyWheelContents };