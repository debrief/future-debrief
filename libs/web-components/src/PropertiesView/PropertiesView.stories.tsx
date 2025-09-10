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
    onPropertyChange: (key, value) => console.warn('Property changed:', key, '=', value),
  },
};

export const VSCodeTheming: Story = {
  render: () => (
    <div style={{ padding: '20px', background: 'var(--vscode-editor-background, #1e1e1e)', minHeight: '400px' }}>
      <h3 style={{ color: 'var(--vscode-editor-foreground, #cccccc)', marginBottom: '16px' }}>VS Code Elements Integration - PropertiesView</h3>
      <p style={{ color: 'var(--vscode-descriptionForeground, #cccccc)', marginBottom: '20px' }}>
        PropertiesView now uses native vscode-elements with proper form controls for different data types.
      </p>
      <div style={{ border: '1px solid var(--vscode-panel-border, #3e3e3e)', borderRadius: '4px', padding: '16px', maxWidth: '400px' }}>
        <PropertiesView
          title="Maritime Track Properties"
          properties={[
            { key: 'vessel_name', value: 'HMS Daring' },
            { key: 'speed_knots', value: 18.5 },
            { key: 'heading_degrees', value: 135 },
            { key: 'is_friendly', value: true },
            { key: 'classification', value: 'destroyer' },
            { key: 'radar_active', value: false },
          ]}
          onPropertyChange={(key, value) => console.log('Property changed:', key, '=', value)}
        />
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #cccccc)' }}>
        <strong>Features:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>VscodeLabel for property names and headers</li>
          <li>VscodeTextfield for string and number inputs</li>
          <li>VscodeCheckbox for boolean properties</li>
          <li>VscodeDivider for visual separation</li>
          <li>Read-only mode with visual indicators</li>
        </ul>
      </div>
    </div>
  ),
};