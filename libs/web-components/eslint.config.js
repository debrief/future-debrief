import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  {
    // Main TypeScript files in src
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Prevent explicit any usage - this is our main requirement
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Additional TypeScript rules for better code quality
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-inferrable-types': 'error',
      
      // React specific rules
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off', // We use TypeScript for prop validation
      'react/display-name': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // General code quality - allow console.error and console.warn 
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
    settings: {
      react: {
        version: 'detect', // Auto-detect React version
      },
    },
  },
  {
    // Configuration for files outside the main TypeScript project (stories, tests, config files)
    files: ['**/*.stories.tsx', '**/*.stories.ts', '**/*.test.tsx', '**/*.test.ts', 'tests/**/*.ts', '*.js', '*.ts'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      // Allow any types in Storybook stories and test files for demonstration purposes
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade from error to warning
      'react/display-name': 'off', // Storybook components often don't need display names
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Downgrade for test files
      'no-undef': 'off', // Disable for config files that might use Node.js globals
    },
  },
  {
    // Ignore build output, node_modules, and Storybook build
    ignores: [
      'dist/**',
      'node_modules/**',
      '.storybook/**',
      'storybook-static/**',
      '**/*.js.map',
    ],
  },
];