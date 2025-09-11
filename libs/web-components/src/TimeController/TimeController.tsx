import React from 'react';
import { TimeState } from '@debrief/shared-types';
import { VscodeButton, VscodeLabel } from '@vscode-elements/react-elements';
import './TimeController.css';

export interface TimeControllerProps {
  onTimeChange?: (time: string) => void;
  timeState?: TimeState;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  className?: string;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  onTimeChange,
  timeState,
  isPlaying = false,
  onPlayPause,
  className = '',
}) => {
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

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onTimeChange) {
      const newTime = new Date(parseInt(event.target.value, 10)).toISOString();
      onTimeChange(newTime);
    }
  };

  return (
    <div className={`time-controller ${className}`} data-testid="time-controller">
      <div className="time-labels">
        <VscodeLabel className="current-time" data-testid="time-label">
          {new Date(currentTime).toLocaleString()}
        </VscodeLabel>
        
        <VscodeLabel className="time-range">
          {new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleString()}
        </VscodeLabel>
      </div>
      
      <input
        type="range"
        min={startTime}
        max={endTime}
        value={currentTime}
        onChange={handleTimeChange}
        className="time-slider"
        data-testid="time-slider"
      />
      
      {onPlayPause && (
        <div className="play-controls">
          <VscodeButton onClick={onPlayPause} data-testid="play-pause-button">
            {isPlaying ? 'Pause' : 'Play'}
          </VscodeButton>
        </div>
      )}
    </div>
  );
};