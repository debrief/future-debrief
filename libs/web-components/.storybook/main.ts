import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['./public'],
  previewHead: (head) => `
    ${head}
    <link id="vscode-codicon-stylesheet" rel="stylesheet" href="/codicon.css">
  `,
};

export default config;