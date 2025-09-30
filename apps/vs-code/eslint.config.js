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
    // CommonJS/Node.js configuration files
    files: ['*.cjs', '*.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off', // TypeScript handles this better for .ts files
    },
  },
  {
    // Ignore build output, bundled files, and node_modules
    ignores: [
      'dist/**',
      'out/**',
      'node_modules/**',
      '**/*.js.map',
      'eslint.config.js', // Ignore ESLint config file itself
      'media/**', // Bundled from libs/web-components (linted at source)
      'schemas/**', // JSON schema files (not JS/TS)
      '**/*.vsix', // Binary package files
    ],
  },
];