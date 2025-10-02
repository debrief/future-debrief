import React, { useCallback } from 'react';
import { TimeState } from '@debrief/shared-types';
import { VscodeLabel, VscodeButton } from '@vscode-elements/react-elements';
import { TimeDisplay } from './TimeDisplay';
import { TimeSlider } from './TimeSlider';
import { TimeFormat } from './timeUtils';
import './TimeController.css';

export interface TimeControllerProps {
  onTimeChange?: (time: string) => void;
  timeState?: TimeState;
  timeFormat?: TimeFormat;
  onOpenSettings?: () => void;
  className?: string;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  onTimeChange,
  timeState,
  timeFormat = 'rn-short',
  onOpenSettings,
  className = '',
}) => {
  // Define hooks before any conditional returns
  const handleSliderChange = useCallback(
    (newTimeMs: number) => {
      if (onTimeChange) {
        const newTime = new Date(newTimeMs).toISOString();
        onTimeChange(newTime);
      }
    },
    [onTimeChange]
  );

  if (!timeState || !timeState.start || !timeState.end || !timeState.current) {
    return (
      <div className={`time-controller no-data ${className}`} data-testid="time-controller">
        <VscodeLabel>TimeController: No time range available</VscodeLabel>
      </div>
    );
  }

  const { start, end, current } = timeState;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const currentTime = new Date(current).getTime();

  return (
    <div className={`time-controller ${className}`} data-testid="time-controller">
      {/* Header row with current time and settings button */}
      <div className="time-header-row">
        <TimeDisplay
          time={new Date(currentTime)}
          format={timeFormat}
          className="current-time"
          data-testid="time-label"
        />
        {onOpenSettings && (
          <VscodeButton
            onClick={onOpenSettings}
            className="settings-button"
            data-testid="settings-button"
            aria-label="Open Time Controller Settings"
          >
            <span className="codicon codicon-settings-gear"></span>
          </VscodeButton>
        )}
      </div>

      {/* Row 2: Slider with tick marks */}
      <div className="time-slider-row">
        <TimeSlider
          startTime={startTime}
          endTime={endTime}
          currentTime={currentTime}
          onChange={handleSliderChange}
        />
      </div>

      {/* Row 3: Start and end times (left and right) */}
      <div className="time-range-row">
        <TimeDisplay
          time={new Date(startTime)}
          format={timeFormat}
          className="start-time"
          data-testid="start-time-label"
        />
        <TimeDisplay
          time={new Date(endTime)}
          format={timeFormat}
          className="end-time"
          data-testid="end-time-label"
        />
      </div>
    </div>
  );
};