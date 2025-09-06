import React from 'react';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';

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
  if (!timeState || !timeState.range || !timeState.current || 
      !timeState.range[0] || !timeState.range[1]) {
    return (
      <div className={`time-controller ${className}`} data-testid="time-controller">
        <div>TimeController: No time range available</div>
      </div>
    );
  }

  const { range, current } = timeState;
  const startTime = new Date(range[0]).getTime();
  const endTime = new Date(range[1]).getTime();
  const currentTime = new Date(current).getTime();

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onTimeChange) {
      const newTime = new Date(parseInt(event.target.value, 10)).toISOString();
      onTimeChange(newTime);
    }
  };

  return (
    <div className={`time-controller ${className}`} data-testid="time-controller">
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          Current Time: {new Date(currentTime).toLocaleString()}
        </div>
        
        <div style={{ marginBottom: '5px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
            Start Time: {new Date(startTime).toLocaleString()}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
            End Time: {new Date(endTime).toLocaleString()}
          </div>
        </div>
      </div>
      
      <input
        type="range"
        min={startTime}
        max={endTime}
        value={currentTime}
        onChange={handleTimeChange}
        className="time-slider"
        data-testid="time-slider"
        style={{ width: '100%', marginBottom: '10px' }}
      />
      
      {onPlayPause && (
        <button onClick={onPlayPause} data-testid="play-pause-button">
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      )}
    </div>
  );
};