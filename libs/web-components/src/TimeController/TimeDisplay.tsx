import React from 'react';
import { VscodeLabel } from '@vscode-elements/react-elements';
import { formatTime, TimeFormat } from './timeUtils';

export interface TimeDisplayProps {
  time: Date;
  format: TimeFormat;
  className?: string;
  'data-testid'?: string;
}

/**
 * TimeDisplay component - formats and displays a single time value
 */
export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  time,
  format,
  className = '',
  'data-testid': testId,
}) => {
  const formattedTime = formatTime(time, format);

  return (
    <VscodeLabel className={className} data-testid={testId}>
      {formattedTime}
    </VscodeLabel>
  );
};
