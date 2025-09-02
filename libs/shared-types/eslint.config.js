const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Allow any in validator functions for type assertions, but warn elsewhere
      '@typescript-eslint/no-explicit-any': ['warn', { fixToUnknown: false }],
      
      // Additional TypeScript rules for better code quality
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-inferrable-types': 'error',
      
      // Allow console for debugging but warn
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Ignore generated files, build output, and test files
    ignores: [
      'dist/**',
      'derived/**',
      'node_modules/**',
      'tests/**',
      '**/*.js.map',
      'eslint.config.js', // Ignore ESLint config file itself
    ],
  },
];