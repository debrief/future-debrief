import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeController } from './TimeController';
import { TimeState } from '@debrief/shared-types';

describe('TimeController', () => {
  const mockTimeState: TimeState = {
    current: '2025-09-05T12:00:00.000Z',
    start: '2025-09-05T10:00:00.000Z',
    end: '2025-09-05T14:00:00.000Z',
  };

  describe('Rendering', () => {
    it('renders the component with a slider when timeState is provided', () => {
      render(<TimeController timeState={mockTimeState} />);
      expect(screen.getByTestId('time-controller')).toBeInTheDocument();
      expect(screen.getByTestId('time-slider')).toBeInTheDocument();
    });

    it('displays the current time in plain format by default', () => {
      render(<TimeController timeState={mockTimeState} />);
      expect(screen.getByTestId('time-label')).toBeInTheDocument();
    });

    it('displays start and end times', () => {
      render(<TimeController timeState={mockTimeState} />);
      expect(screen.getByTestId('start-time-label')).toBeInTheDocument();
      expect(screen.getByTestId('end-time-label')).toBeInTheDocument();
    });

    it('renders a message when no time range is available', () => {
      render(<TimeController />);
      expect(screen.getByText('TimeController: No time range available')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<TimeController timeState={mockTimeState} className="custom-class" />);
      const component = screen.getByTestId('time-controller');
      expect(component).toHaveClass('time-controller', 'custom-class');
    });
  });

  describe('Time Formats', () => {
    it('displays time in plain format', () => {
      render(<TimeController timeState={mockTimeState} timeFormat="plain" />);
      const label = screen.getByTestId('time-label');
      expect(label).toBeInTheDocument();
      expect(label.textContent).toContain('UTC');
    });

    it('displays time in ISO 8601 format', () => {
      render(<TimeController timeState={mockTimeState} timeFormat="iso" />);
      const label = screen.getByTestId('time-label');
      expect(label).toBeInTheDocument();
      // ISO format should match: YYYY-MM-DDTHH:MM:SS.sssZ
      expect(label.textContent).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('displays time in RN short format', () => {
      render(<TimeController timeState={mockTimeState} timeFormat="rn-short" />);
      const label = screen.getByTestId('time-label');
      expect(label).toBeInTheDocument();
      // RN short format: DDHHMMZ (e.g., "051200Z")
      expect(label.textContent).toMatch(/^\d{6}Z$/);
    });

    it('displays time in RN long format', () => {
      render(<TimeController timeState={mockTimeState} timeFormat="rn-long" />);
      const label = screen.getByTestId('time-label');
      expect(label).toBeInTheDocument();
      // RN long format: "MMM DDHHMMZ" (e.g., "SEP 051200Z")
      expect(label.textContent).toMatch(/^[A-Z]{3} \d{6}Z$/);
    });
  });

  describe('Slider Interaction', () => {
    it('calls onTimeChange when slider is moved', () => {
      const onTimeChange = jest.fn();
      render(<TimeController timeState={mockTimeState} onTimeChange={onTimeChange} />);

      const slider = screen.getByTestId('time-slider');
      fireEvent.change(slider, { target: { value: new Date(mockTimeState.end).getTime() } });

      expect(onTimeChange).toHaveBeenCalledTimes(1);
      expect(onTimeChange).toHaveBeenCalledWith(mockTimeState.end);
    });

    it('renders tick marks', () => {
      render(<TimeController timeState={mockTimeState} />);
      const ticks = screen.getByTestId('time-slider-ticks');
      expect(ticks).toBeInTheDocument();
    });

    it('handles keyboard navigation', () => {
      const onTimeChange = jest.fn();
      render(<TimeController timeState={mockTimeState} onTimeChange={onTimeChange} />);

      const slider = screen.getByTestId('time-slider');

      // Test arrow keys
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(onTimeChange).toHaveBeenCalled();

      onTimeChange.mockClear();
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(onTimeChange).toHaveBeenCalled();

      // Test Home/End keys
      onTimeChange.mockClear();
      fireEvent.keyDown(slider, { key: 'Home' });
      expect(onTimeChange).toHaveBeenCalledWith(mockTimeState.start);

      onTimeChange.mockClear();
      fireEvent.keyDown(slider, { key: 'End' });
      expect(onTimeChange).toHaveBeenCalledWith(mockTimeState.end);
    });
  });


  describe('Edge Cases', () => {
    it('handles missing current time', () => {
      const invalidState = { ...mockTimeState, current: '' };
      render(<TimeController timeState={invalidState} />);
      expect(screen.getByText('TimeController: No time range available')).toBeInTheDocument();
    });

    it('handles missing start time', () => {
      const invalidState = { ...mockTimeState, start: '' };
      render(<TimeController timeState={invalidState} />);
      expect(screen.getByText('TimeController: No time range available')).toBeInTheDocument();
    });

    it('handles missing end time', () => {
      const invalidState = { ...mockTimeState, end: '' };
      render(<TimeController timeState={invalidState} />);
      expect(screen.getByText('TimeController: No time range available')).toBeInTheDocument();
    });

    it('handles very short time range', () => {
      const shortRange: TimeState = {
        current: '2025-09-05T12:00:00.000Z',
        start: '2025-09-05T12:00:00.000Z',
        end: '2025-09-05T12:05:00.000Z', // 5 minutes
      };
      render(<TimeController timeState={shortRange} />);
      expect(screen.getByTestId('time-slider')).toBeInTheDocument();
    });

    it('handles very long time range', () => {
      const longRange: TimeState = {
        current: '2025-01-15T12:00:00.000Z',
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-12-31T23:59:59.000Z', // Full year
      };
      render(<TimeController timeState={longRange} />);
      expect(screen.getByTestId('time-slider')).toBeInTheDocument();
    });
  });
});