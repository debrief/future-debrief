import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HeadedPanel } from './HeadedPanel';

const meta: Meta<typeof HeadedPanel> = {
  title: 'Components/HeadedPanel',
  component: HeadedPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HeadedPanel>;

export const Default: Story = {
  args: {
    title: 'Panel Title',
    children: (
      <div style={{ padding: '16px' }}>
        <p>This is the panel content.</p>
        <p>It can contain any React components.</p>
      </div>
    ),
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Outline',
    icon: '📋',
    children: (
      <div style={{ padding: '16px' }}>
        <p>Panel with an icon in the header.</p>
      </div>
    ),
  },
};

export const MultiplePanels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', height: '600px' }}>
      <div style={{ flex: 1 }}>
        <HeadedPanel title="Outline" icon="📋">
          <div style={{ padding: '16px' }}>
            <p>Outline panel content</p>
          </div>
        </HeadedPanel>
      </div>
      <div style={{ flex: 1 }}>
        <HeadedPanel title="Properties" icon="⚙️">
          <div style={{ padding: '16px' }}>
            <p>Properties panel content</p>
          </div>
        </HeadedPanel>
      </div>
      <div style={{ flex: 1 }}>
        <HeadedPanel title="Current State" icon="📊">
          <div style={{ padding: '16px' }}>
            <p>Current state panel content</p>
          </div>
        </HeadedPanel>
      </div>
    </div>
  ),
};

export const WithScrollableContent: Story = {
  args: {
    title: 'Long Content',
    icon: '📄',
    children: (
      <div style={{ padding: '16px' }}>
        {Array.from({ length: 50 }, (_, i) => (
          <p key={i}>Line {i + 1} of scrollable content</p>
        ))}
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ height: '400px' }}>
        <Story />
      </div>
    ),
  ],
};
