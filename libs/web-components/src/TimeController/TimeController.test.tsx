import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeController } from './TimeController';

describe('TimeController', () => {
  it('renders the component', () => {
    render(<TimeController />);
    expect(screen.getByTestId('time-controller')).toBeInTheDocument();
    expect(screen.getByText('TimeController Placeholder')).toBeInTheDocument();
  });

  it('displays current time when provided', () => {
    const currentTime = new Date('2024-01-15T12:00:00Z');
    render(<TimeController currentTime={currentTime} />);
    expect(screen.getByText('Current Time: 2024-01-15T12:00:00.000Z')).toBeInTheDocument();
  });

  it('displays not set when no current time provided', () => {
    render(<TimeController />);
    expect(screen.getByText('Current Time: Not set')).toBeInTheDocument();
  });

  it('displays playing state correctly', () => {
    render(<TimeController isPlaying={true} />);
    expect(screen.getByText('Playing: Yes')).toBeInTheDocument();
    
    const { rerender } = render(<TimeController isPlaying={false} />);
    expect(screen.getByText('Playing: No')).toBeInTheDocument();
  });

  it('renders play/pause button when onPlayPause is provided', () => {
    const mockOnPlayPause = jest.fn();
    render(<TimeController onPlayPause={mockOnPlayPause} isPlaying={false} />);
    
    const button = screen.getByTestId('play-pause-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Play');
  });

  it('calls onPlayPause when button is clicked', () => {
    const mockOnPlayPause = jest.fn();
    render(<TimeController onPlayPause={mockOnPlayPause} />);
    
    const button = screen.getByTestId('play-pause-button');
    fireEvent.click(button);
    
    expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
  });

  it('shows pause text when playing', () => {
    const mockOnPlayPause = jest.fn();
    render(<TimeController onPlayPause={mockOnPlayPause} isPlaying={true} />);
    
    const button = screen.getByTestId('play-pause-button');
    expect(button).toHaveTextContent('Pause');
  });

  it('applies custom className', () => {
    render(<TimeController className="custom-class" />);
    const component = screen.getByTestId('time-controller');
    expect(component).toHaveClass('time-controller', 'custom-class');
  });
});