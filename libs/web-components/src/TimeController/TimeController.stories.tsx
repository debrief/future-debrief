import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { TimeController } from './TimeController';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';

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
      current: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Start at beginning of range
      range: [
        new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      ],
    },
    isPlaying: false,
  },
};

export const Playing: Story = {
  args: {
    timeState: {
      current: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Start at beginning of range
      range: [
        new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      ],
    },
    isPlaying: true,
  },
};

const WithTimeRangeWrapper = () => {
  const initialTimeState: TimeState = {
    current: '2024-01-15T10:00:00Z', // Start at beginning of range
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
    current: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Start at beginning of range
    range: [
      new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
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