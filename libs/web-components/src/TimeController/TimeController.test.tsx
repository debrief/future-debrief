import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeController } from './TimeController';
import { TimeState } from '@debrief/shared-types/src/types/states/time_state';

describe('TimeController', () => {
  const mockTimeState: TimeState = {
    current: '2025-09-05T12:00:00.000Z',
    start: '2025-09-05T10:00:00.000Z',
    end: '2025-09-05T14:00:00.000Z',
  };

  it('renders the component with a slider when timeState is provided', () => {
    render(<TimeController timeState={mockTimeState} />);
    expect(screen.getByTestId('time-controller')).toBeInTheDocument();
    expect(screen.getByTestId('time-slider')).toBeInTheDocument();
  });

  it('displays the current time', () => {
    render(<TimeController timeState={mockTimeState} />);
    const expectedTime = new Date(mockTimeState.current).toLocaleString();
    expect(screen.getByTestId('time-label')).toHaveTextContent(expectedTime);
  });

  it('renders a message when no time range is available', () => {
    render(<TimeController />);
    expect(screen.getByText('TimeController: No time range available')).toBeInTheDocument();
  });

  it('calls onTimeChange when slider is moved', () => {
    const onTimeChange = jest.fn();
    render(<TimeController timeState={mockTimeState} onTimeChange={onTimeChange} />);

    const slider = screen.getByTestId('time-slider');
    fireEvent.change(slider, { target: { value: new Date(mockTimeState.end).getTime() } });

    expect(onTimeChange).toHaveBeenCalledTimes(1);
    expect(onTimeChange).toHaveBeenCalledWith(mockTimeState.end);
  });

  it('displays playing state correctly', () => {
    render(<TimeController timeState={mockTimeState} isPlaying={true} onPlayPause={() => {}} />);
    expect(screen.getByText('Pause')).toBeInTheDocument();
    
    render(<TimeController timeState={mockTimeState} isPlaying={false} onPlayPause={() => {}} />);
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('renders play/pause button when onPlayPause is provided', () => {
    const mockOnPlayPause = jest.fn();
    render(<TimeController timeState={mockTimeState} onPlayPause={mockOnPlayPause} isPlaying={false} />);
    
    const button = screen.getByTestId('play-pause-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Play');
  });

  it('calls onPlayPause when button is clicked', () => {
    const mockOnPlayPause = jest.fn();
    render(<TimeController timeState={mockTimeState} onPlayPause={mockOnPlayPause} />);
    
    const button = screen.getByTestId('play-pause-button');
    fireEvent.click(button);
    
    expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
  });

  it('shows pause text when playing', () => {
    const mockOnPlayPause = jest.fn();
    render(<TimeController timeState={mockTimeState} onPlayPause={mockOnPlayPause} isPlaying={true} />);
    
    const button = screen.getByTestId('play-pause-button');
    expect(button).toHaveTextContent('Pause');
  });

  it('applies custom className', () => {
    render(<TimeController timeState={mockTimeState} className="custom-class" />);
    const component = screen.getByTestId('time-controller');
    expect(component).toHaveClass('time-controller', 'custom-class');
  });
});