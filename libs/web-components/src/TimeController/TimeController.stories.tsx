import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { TimeController } from './TimeController';
import { TimeState } from '@debrief/shared-types';

const meta: Meta<typeof TimeController> = {
  title: 'Components/TimeController',
  component: TimeController,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onTimeChange: { action: 'time changed' },
    onPlayPause: { action: 'play/pause clicked' },
    isPlaying: { control: 'boolean' },
    timeState: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    timeState: {
      current: '2024-01-15T10:00:00Z', // Fixed time at start of range
      start: '2024-01-15T10:00:00Z', // Fixed start time
      end: '2024-01-15T12:00:00Z', // Fixed end time
    },
    isPlaying: false,
  },
};

export const Playing: Story = {
  args: {
    timeState: {
      current: '2024-01-15T10:00:00Z', // Fixed time at start of range
      start: '2024-01-15T10:00:00Z', // Fixed start time
      end: '2024-01-15T12:00:00Z', // Fixed end time
    },
    isPlaying: true,
  },
};

const WithTimeRangeWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T12:00:00Z', // Fixed time in middle of range
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T14:00:00Z',
  };

  const [timeState, setTimeState] = useState<TimeState>(initialTimeState);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTimeChange = (newTime: string) => {
    setTimeState(prev => ({ ...prev, current: newTime }));
  };

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  return (
    <TimeController
      timeState={timeState}
      isPlaying={isPlaying}
      onTimeChange={handleTimeChange}
      onPlayPause={handlePlayPause}
    />
  );
};

export const WithTimeRange: Story = {
  render: () => <WithTimeRangeWrapper />,
};

const InteractiveWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T08:00:00Z', // Fixed time at start of range
    start: '2024-01-15T08:00:00Z', // Fixed start time
    end: '2024-01-15T16:00:00Z', // Fixed end time (8 hour range)
  };

  const [timeState, setTimeState] = useState<TimeState>(initialTimeState);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTimeChange = (newTime: string) => {
    setTimeState(prev => ({ ...prev, current: newTime }));
    console.warn('Time changed to:', newTime);
  };

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
    console.warn('Play/Pause clicked');
  };

  return (
    <TimeController
      timeState={timeState}
      isPlaying={isPlaying}
      onTimeChange={handleTimeChange}
      onPlayPause={handlePlayPause}
    />
  );
};

export const Interactive: Story = {
  render: () => <InteractiveWrapper />,
};

export const VSCodeTheming: Story = {
  render: () => (
    <div style={{ padding: '20px', background: 'var(--vscode-editor-background, #1e1e1e)', minHeight: '400px' }}>
      <h3 style={{ color: 'var(--vscode-editor-foreground, #cccccc)', marginBottom: '16px' }}>VS Code Elements Integration - TimeController</h3>
      <p style={{ color: 'var(--vscode-descriptionForeground, #cccccc)', marginBottom: '20px' }}>
        TimeController now uses native vscode-elements for buttons and labels with VS Code themed slider controls.
      </p>
      <div style={{ border: '1px solid var(--vscode-panel-border, #3e3e3e)', borderRadius: '4px', padding: '16px' }}>
        <WithTimeRangeWrapper />
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #cccccc)' }}>
        <strong>Features:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>VscodeButton for play/pause controls</li>
          <li>VscodeLabel for time displays</li>
          <li>VS Code themed range slider with hover effects</li>
          <li>Automatic theme adaptation</li>
        </ul>
      </div>
    </div>
  ),
};

export const NoTimeRange: Story = {
  args: {
    timeState: undefined,
    isPlaying: false,
  },
};

export const MissingCurrentTime: Story = {
  args: {
    timeState: {
      current: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T14:00:00Z',
    },
    isPlaying: false,
  },
};

export const MissingRangeStart: Story = {
  args: {
    timeState: {
      current: '2024-01-15T12:00:00Z',
      start: '',
      end: '2024-01-15T14:00:00Z',
    },
    isPlaying: false,
  },
};

export const MissingRangeEnd: Story = {
  args: {
    timeState: {
      current: '2024-01-15T12:00:00Z',
      start: '2024-01-15T10:00:00Z',
      end: '',
    },
    isPlaying: false,
  },
};