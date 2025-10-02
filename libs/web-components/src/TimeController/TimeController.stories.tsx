import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { TimeController } from './TimeController';
import { TimeState } from '@debrief/shared-types';
import { TimeFormat } from './timeUtils';

const meta: Meta<typeof TimeController> = {
  title: 'Components/TimeController',
  component: TimeController,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onTimeChange: { action: 'time changed' },
    onOpenSettings: { action: 'settings opened' },
    timeFormat: {
      control: 'select',
      options: ['plain', 'iso', 'rn-short', 'rn-long'],
    },
    timeState: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const initialTimeState: TimeState = args.timeState || {
      current: '2024-01-15T11:00:00Z',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T12:00:00Z',
    };

    const [timeState, setTimeState] = useState<TimeState>(initialTimeState);

    const handleTimeChange = (newTime: string) => {
      setTimeState(prev => ({ ...prev, current: newTime }));
    };

    return (
      <TimeController
        timeState={timeState}
        timeFormat={args.timeFormat || 'plain'}
        onTimeChange={handleTimeChange}
      />
    );
  },
  args: {
    timeFormat: 'plain',
    timeState: {
      current: '2024-01-15T11:00:00Z',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T12:00:00Z',
    },
  },
};

export const Interactive: Story = {
  render: (args) => {
    const initialTimeState: TimeState = args.timeState || {
      current: '2024-01-15T12:00:00Z',
      start: '2024-01-15T08:00:00Z',
      end: '2024-01-15T16:00:00Z',
    };

    const [timeState, setTimeState] = useState<TimeState>(initialTimeState);

    const handleTimeChange = (newTime: string) => {
      setTimeState(prev => ({ ...prev, current: newTime }));
      console.warn('Time changed to:', newTime);
    };

    return (
      <TimeController
        timeState={timeState}
        timeFormat={args.timeFormat || 'plain'}
        onTimeChange={handleTimeChange}
      />
    );
  },
  args: {
    timeFormat: 'plain',
    timeState: {
      current: '2024-01-15T12:00:00Z',
      start: '2024-01-15T08:00:00Z',
      end: '2024-01-15T16:00:00Z',
    },
  },
};

const VSCodeThemingWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T12:00:00Z',
    start: '2024-01-15T08:00:00Z',
    end: '2024-01-15T16:00:00Z',
  };

  const [timeState, setTimeState] = useState<TimeState>(initialTimeState);

  const handleTimeChange = (newTime: string) => {
    setTimeState(prev => ({ ...prev, current: newTime }));
  };

  return (
    <div style={{ padding: '20px', background: 'var(--vscode-editor-background, #1e1e1e)', minHeight: '400px' }}>
      <h3 style={{ color: 'var(--vscode-editor-foreground, #cccccc)', marginBottom: '16px' }}>VS Code Elements Integration - TimeController</h3>
      <p style={{ color: 'var(--vscode-descriptionForeground, #cccccc)', marginBottom: '20px' }}>
        TimeController uses native vscode-elements for labels with VS Code themed slider controls.
      </p>
      <div style={{ border: '1px solid var(--vscode-panel-border, #3e3e3e)', borderRadius: '4px', padding: '16px' }}>
        <TimeController
          timeState={timeState}
          timeFormat="rn-short"
          onTimeChange={handleTimeChange}
        />
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #cccccc)' }}>
        <strong>Features:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>VscodeLabel for time displays</li>
          <li>VS Code themed range slider with hover effects</li>
          <li>Automatic theme adaptation</li>
          <li>Mouse wheel scrubbing support</li>
        </ul>
      </div>
    </div>
  );
};

export const VSCodeTheming: Story = {
  render: () => <VSCodeThemingWrapper />,
};

export const NoTimeRange: Story = {
  args: {
    timeState: undefined,
  },
};

export const MissingCurrentTime: Story = {
  args: {
    timeState: {
      current: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T14:00:00Z',
    },
  },
};

export const MissingRangeStart: Story = {
  args: {
    timeState: {
      current: '2024-01-15T12:00:00Z',
      start: '',
      end: '2024-01-15T14:00:00Z',
    },
  },
};

export const MissingRangeEnd: Story = {
  args: {
    timeState: {
      current: '2024-01-15T12:00:00Z',
      start: '2024-01-15T10:00:00Z',
      end: '',
    },
  },
};

// Time Format Stories
const PlainEnglishWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T14:30:00Z',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T18:00:00Z',
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="plain"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

const ISOFormatWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T14:30:00Z',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T18:00:00Z',
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="iso"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

const RoyalNavyShortWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T14:30:00Z',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T18:00:00Z',
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="rn-short"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

const RoyalNavyLongWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T14:30:00Z',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T18:00:00Z',
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="rn-long"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

export const PlainEnglishFormat: Story = {
  render: () => <PlainEnglishWrapper />,
};

export const ISOFormat: Story = {
  render: () => <ISOFormatWrapper />,
};

export const RoyalNavyShortFormat: Story = {
  render: () => <RoyalNavyShortWrapper />,
};

export const RoyalNavyLongFormat: Story = {
  render: () => <RoyalNavyLongWrapper />,
};

// Time Range Stories
const ShortRangeWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T12:15:00Z',
    start: '2024-01-15T12:00:00Z',
    end: '2024-01-15T12:30:00Z', // 30 minutes
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="plain"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

const MediumRangeWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T12:00:00Z',
    start: '2024-01-15T08:00:00Z',
    end: '2024-01-15T16:00:00Z', // 8 hours
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="plain"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

const LongRangeWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T12:00:00Z',
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z', // 1 month
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="plain"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

const VeryLongRangeWrapper = () => {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-06-15T12:00:00Z',
    start: '2024-01-01T00:00:00Z',
    end: '2024-12-31T23:59:59Z', // 1 year
  });
  return (
    <TimeController
      timeState={timeState}
      timeFormat="plain"
      onTimeChange={(time) => setTimeState(prev => ({ ...prev, current: time }))}
    />
  );
};

export const ShortRange: Story = {
  render: () => <ShortRangeWrapper />,
};

export const MediumRange: Story = {
  render: () => <MediumRangeWrapper />,
};

export const LongRange: Story = {
  render: () => <LongRangeWrapper />,
};

export const VeryLongRange: Story = {
  render: () => <VeryLongRangeWrapper />,
};

// Interactive Story with Format Switching
const InteractiveWithFormatWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T12:00:00Z',
    start: '2024-01-15T08:00:00Z',
    end: '2024-01-15T16:00:00Z',
  };

  const [timeState, setTimeState] = useState<TimeState>(initialTimeState);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('plain');

  const handleTimeChange = (newTime: string) => {
    setTimeState(prev => ({ ...prev, current: newTime }));
    console.warn('Time changed to:', newTime);
  };

  return (
    <div style={{ padding: '20px', background: 'var(--vscode-editor-background, #1e1e1e)', minHeight: '400px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ color: 'var(--vscode-editor-foreground, #cccccc)', marginRight: '10px' }}>
          Time Format:
        </label>
        <select
          value={timeFormat}
          onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
          style={{
            padding: '4px 8px',
            background: 'var(--vscode-dropdown-background, #3c3c3c)',
            color: 'var(--vscode-dropdown-foreground, #cccccc)',
            border: '1px solid var(--vscode-dropdown-border, #3e3e3e)',
            borderRadius: '2px',
          }}
        >
          <option value="plain">Plain English</option>
          <option value="iso">ISO 8601</option>
          <option value="rn-short">RN Short (DDHHMMZ)</option>
          <option value="rn-long">RN Long (MMM DDHHMMZ)</option>
        </select>
      </div>
      <TimeController
        timeState={timeState}
        timeFormat={timeFormat}
        onTimeChange={handleTimeChange}
      />
      <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #cccccc)' }}>
        <strong>Features Demonstrated:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>3-row layout (current time / slider / start-end times)</li>
          <li>Adaptive tick marks based on time range</li>
          <li>Keyboard navigation (arrow keys, Home, End, PageUp/Down)</li>
          <li>Multiple time format support</li>
          <li>Live time scrubbing with throttling</li>
          <li>VS Code theme integration</li>
        </ul>
      </div>
    </div>
  );
};

export const InteractiveWithFormats: Story = {
  render: () => <InteractiveWithFormatWrapper />,
};

// Settings Button Demo
const SettingsButtonWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T12:00:00Z',
    start: '2024-01-15T08:00:00Z',
    end: '2024-01-15T16:00:00Z',
  };

  const [timeState, setTimeState] = useState<TimeState>(initialTimeState);
  const [settingsClicked, setSettingsClicked] = useState(false);

  const handleTimeChange = (newTime: string) => {
    setTimeState(prev => ({ ...prev, current: newTime }));
  };

  const handleOpenSettings = () => {
    setSettingsClicked(true);
    console.warn('Settings button clicked!');
    setTimeout(() => setSettingsClicked(false), 2000);
  };

  return (
    <div style={{ padding: '20px', background: 'var(--vscode-editor-background, #1e1e1e)', minHeight: '300px' }}>
      <TimeController
        timeState={timeState}
        timeFormat="rn-short"
        onTimeChange={handleTimeChange}
        onOpenSettings={handleOpenSettings}
      />
      {settingsClicked && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: 'var(--vscode-inputValidation-infoBackground, #007acc)',
          color: 'var(--vscode-inputValidation-infoForeground, #ffffff)',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          Settings button clicked! In VS Code, this would open the time format preference.
        </div>
      )}
    </div>
  );
};

export const WithSettingsButton: Story = {
  render: () => <SettingsButtonWrapper />,
};