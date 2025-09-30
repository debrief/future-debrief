const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Prevent explicit any usage - this is our main requirement
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Additional TypeScript rules for better code quality
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-inferrable-types': 'error',
      'no-case-declarations': 'error',
      
      // VS Code extension specific rules - allow console for debugging but warn
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Ignore build output and node_modules
    ignores: [
      'dist/**',
      'out/**',
      'node_modules/**',
      '**/*.js.map',
      'eslint.config.js', // Ignore ESLint config file itself
      'media/**', // Ignore generated web components
      'schemas/**', // Ignore generated JSON schemas
      'scripts/**', // Ignore validation scripts
      'jest.config.cjs', // Ignore Jest config
      '**/*.vsix', // Ignore VSIX packages
    ],
  },
];