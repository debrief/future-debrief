/**
 * Main entry point for @debrief/shared-types
 * 
 * This package provides:
 * - JSON Schema definitions for Debrief feature types
 * - Generated TypeScript interfaces from schemas (in derived/ directory)
 * - Manual validators with cross-field validation logic (in validators/ directory)
 * 
 * Note: This is a source package - users should import directly from:
 * - derived/typescript/* for generated types
 * - validators/typescript/* for validation functions
 * - schema/* for JSON Schema definitions
 */

// This file serves as documentation and package metadata only
// Users should import directly from the specific directories they need

export const PACKAGE_INFO = {
  name: '@debrief/shared-types',
  version: '1.0.0',
  description: 'Shared types for Debrief ecosystem with constrained GeoJSON FeatureCollections',
  directories: {
    schema: 'schema/',
    derived: 'derived/',
    validators: 'validators/',
  },
};