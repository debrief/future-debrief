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
      range: [
        '2024-01-15T10:00:00Z', // Fixed start time
        '2024-01-15T12:00:00Z', // Fixed end time
      ],
    },
    isPlaying: false,
  },
};

export const Playing: Story = {
  args: {
    timeState: {
      current: '2024-01-15T10:00:00Z', // Fixed time at start of range
      range: [
        '2024-01-15T10:00:00Z', // Fixed start time
        '2024-01-15T12:00:00Z', // Fixed end time
      ],
    },
    isPlaying: true,
  },
};

const WithTimeRangeWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T12:00:00Z', // Fixed time in middle of range
    range: ['2024-01-15T10:00:00Z', '2024-01-15T14:00:00Z'],
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
    range: [
      '2024-01-15T08:00:00Z', // Fixed start time
      '2024-01-15T16:00:00Z', // Fixed end time (8 hour range)
    ],
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
      range: ['2024-01-15T10:00:00Z', '2024-01-15T14:00:00Z'],
    },
    isPlaying: false,
  },
};

export const MissingRangeStart: Story = {
  args: {
    timeState: {
      current: '2024-01-15T12:00:00Z',
      range: ['', '2024-01-15T14:00:00Z'],
    },
    isPlaying: false,
  },
};

export const MissingRangeEnd: Story = {
  args: {
    timeState: {
      current: '2024-01-15T12:00:00Z',
      range: ['2024-01-15T10:00:00Z', ''],
    },
    isPlaying: false,
  },
};