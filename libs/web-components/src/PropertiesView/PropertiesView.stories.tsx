import type { Meta, StoryObj } from '@storybook/react';
import { PropertiesView } from './PropertiesView';

const meta: Meta<typeof PropertiesView> = {
  title: 'Components/PropertiesView',
  component: PropertiesView,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onPropertyChange: { action: 'property changed' },
    readonly: { control: 'boolean' },
    title: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Properties',
    properties: [],
  },
};

export const WithProperties: Story = {
  args: {
    title: 'Track Properties',
    properties: [
      { key: 'name', value: 'HMS Victory' },
      { key: 'speed', value: 12.5 },
      { key: 'heading', value: 270 },
      { key: 'active', value: true },
    ],
  },
};

export const ReadOnly: Story = {
  args: {
    title: 'Read-Only Properties',
    readonly: true,
    properties: [
      { key: 'id', value: 'track-001' },
      { key: 'type', value: 'naval_vessel' },
      { key: 'classification', value: 'friendly' },
    ],
  },
};

export const EmptyState: Story = {
  args: {
    title: 'No Properties',
    properties: [],
  },
};

export const Interactive: Story = {
  args: {
    title: 'Editable Properties',
    readonly: false,
    properties: [
      { key: 'name', value: 'Sample Track' },
      { key: 'priority', value: 5 },
      { key: 'visible', value: true },
    ],
    onPropertyChange: (key, value) => console.log('Property changed:', key, '=', value),
  },
};