import type { Meta, StoryObj } from '@storybook/react';
import { TimeController } from './TimeController';

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
    currentTime: { control: 'date' },
    startTime: { control: 'date' },
    endTime: { control: 'date' },
    isPlaying: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    currentTime: new Date(),
    isPlaying: false,
  },
};

export const Playing: Story = {
  args: {
    currentTime: new Date(),
    isPlaying: true,
  },
};

export const WithTimeRange: Story = {
  args: {
    currentTime: new Date('2024-01-15T12:00:00Z'),
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T14:00:00Z'),
    isPlaying: false,
  },
};

export const Interactive: Story = {
  args: {
    currentTime: new Date(),
    isPlaying: false,
    onTimeChange: (time) => console.warn('Time changed to:', time),
    onPlayPause: () => console.warn('Play/Pause clicked'),
  },
};