/**
 * Time formatting and utility functions for TimeController
 */

export type TimeFormat = 'plain' | 'iso' | 'rn-short' | 'rn-long';

/**
 * Format a date according to specified format
 */
export function formatTime(date: Date, format: TimeFormat): string {
  switch (format) {
    case 'plain':
      // Plain English format: "Jan 15, 2024, 14:30:00 UTC"
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      }) + ' UTC';

    case 'iso':
      // ISO 8601 format: "2024-01-15T14:30:00.000Z"
      return date.toISOString();

    case 'rn-short':
      // RN short format: "151430Z"
      return formatRNShort(date);

    case 'rn-long':
      // RN long format: "JAN 151430Z"
      return formatRNLong(date);

    default:
      return date.toISOString();
  }
}

/**
 * Format time in Royal Navy short format: "DDHHMM Z"
 * Example: "151430Z" for 15th day, 14:30 UTC
 */
function formatRNShort(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${day}${hours}${minutes}Z`;
}

/**
 * Format time in Royal Navy long format: "MMM DDHHMMZ"
 * Example: "JAN 151430Z" for January 15th, 14:30 UTC
 */
function formatRNLong(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${month} ${day}${hours}${minutes}Z`;
}

/**
 * Calculate tick interval based on time range span
 * Returns milliseconds between ticks
 */
export function calculateTickInterval(startMs: number, endMs: number): number {
  const spanMs = endMs - startMs;
  const spanHours = spanMs / (1000 * 60 * 60);
  const spanDays = spanHours / 24;

  // Very short range (< 1 hour): 5 minute ticks
  if (spanHours < 1) {
    return 5 * 60 * 1000;
  }
  // Short range (1-6 hours): 30 minute ticks
  if (spanHours < 6) {
    return 30 * 60 * 1000;
  }
  // Medium range (6-24 hours): 2 hour ticks
  if (spanHours < 24) {
    return 2 * 60 * 60 * 1000;
  }
  // Day range (1-7 days): 6 hour ticks
  if (spanDays < 7) {
    return 6 * 60 * 60 * 1000;
  }
  // Week range (7-30 days): 1 day ticks
  if (spanDays < 30) {
    return 24 * 60 * 60 * 1000;
  }
  // Month range (30-90 days): 7 day ticks
  if (spanDays < 90) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  // Long range (> 90 days): 30 day ticks
  return 30 * 24 * 60 * 60 * 1000;
}

/**
 * Generate tick positions for the slider
 * Returns array of timestamp positions for tick marks
 */
export function generateTickPositions(startMs: number, endMs: number): number[] {
  const interval = calculateTickInterval(startMs, endMs);
  const ticks: number[] = [];

  // Always include start and end
  ticks.push(startMs);

  // Add intermediate ticks
  let currentTick = startMs + interval;
  while (currentTick < endMs) {
    ticks.push(currentTick);
    currentTick += interval;
  }

  // Always include end (if not too close to last tick)
  if (endMs - ticks[ticks.length - 1] > interval * 0.3) {
    ticks.push(endMs);
  }

  return ticks;
}

/**
 * Calculate percentage position of a timestamp within a range
 */
export function calculateTickPosition(tickMs: number, startMs: number, endMs: number): number {
  const spanMs = endMs - startMs;
  if (spanMs === 0) return 0;
  return ((tickMs - startMs) / spanMs) * 100;
}
