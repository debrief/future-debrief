import React, { useCallback, useRef, useEffect } from 'react';
import { generateTickPositions, calculateTickPosition } from './timeUtils';

export interface TimeSliderProps {
  startTime: number;
  endTime: number;
  currentTime: number;
  onChange: (newTime: number) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * TimeSlider component - slider with circular knob and adaptive tick marks
 */
export const TimeSlider: React.FC<TimeSliderProps> = ({
  startTime,
  endTime,
  currentTime,
  onChange,
  className = '',
  'data-testid': testId = 'time-slider',
}) => {
  const sliderRef = useRef<HTMLInputElement>(null);
  const lastUpdateRef = useRef(0);
  const throttleMs = 16; // ~60fps

  // Generate tick positions based on time range
  const tickPositions = generateTickPositions(startTime, endTime);

  // Throttled change handler for smooth updates
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const now = Date.now();
      const newTime = parseInt(event.target.value, 10);

      // Throttle updates
      if (now - lastUpdateRef.current < throttleMs) {
        return;
      }

      lastUpdateRef.current = now;
      onChange(newTime);
    },
    [onChange, throttleMs]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const spanMs = endTime - startTime;
      const stepMs = spanMs / 100; // 1% of range

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          onChange(Math.max(startTime, currentTime - stepMs));
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          onChange(Math.min(endTime, currentTime + stepMs));
          break;
        case 'Home':
          event.preventDefault();
          onChange(startTime);
          break;
        case 'End':
          event.preventDefault();
          onChange(endTime);
          break;
        case 'PageUp':
          event.preventDefault();
          onChange(Math.min(endTime, currentTime + stepMs * 10));
          break;
        case 'PageDown':
          event.preventDefault();
          onChange(Math.max(startTime, currentTime - stepMs * 10));
          break;
      }
    },
    [startTime, endTime, currentTime, onChange]
  );

  // Add wheel event listener to wrapper for mouse wheel scrubbing
  useEffect(() => {
    const wrapper = sliderRef.current?.parentElement;
    if (!wrapper) return;

    const handleWheelEvent = (event: WheelEvent) => {
      event.preventDefault();
      const spanMs = endTime - startTime;
      const stepMs = spanMs / 100; // 1% of range per wheel notch
      const direction = event.deltaY > 0 ? -1 : 1;
      const newTime = currentTime + direction * stepMs;
      onChange(Math.max(startTime, Math.min(endTime, newTime)));
    };

    wrapper.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      wrapper.removeEventListener('wheel', handleWheelEvent);
    };
  }, [startTime, endTime, currentTime, onChange]);

  return (
    <div className={`time-slider-wrapper ${className}`}>
      <div className="time-slider-track">
        {/* Render tick marks */}
        <div className="time-slider-ticks" data-testid="time-slider-ticks">
          {tickPositions.map((tickMs) => {
            const position = calculateTickPosition(tickMs, startTime, endTime);
            return (
              <div
                key={tickMs}
                className="time-slider-tick"
                style={{ left: `${position}%` }}
                data-testid="time-slider-tick"
              />
            );
          })}
        </div>

        {/* Range input slider */}
        <input
          ref={sliderRef}
          type="range"
          min={startTime}
          max={endTime}
          value={currentTime}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="time-slider"
          data-testid={testId}
          aria-label="Time slider"
          aria-valuemin={startTime}
          aria-valuemax={endTime}
          aria-valuenow={currentTime}
        />
      </div>
    </div>
  );
};
