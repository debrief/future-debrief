import { describe, it, expect } from '@jest/globals';
import {
    isTimeState,
    validateTimeState,
    isViewportState,
    validateViewportState,
    isOptionalFilename,
    validateFilename
} from '../../../services/utils/validators';

describe('TimeState Validators', () => {
    describe('isTimeState', () => {
        it('should return true for valid TimeState', () => {
            const validState = {
                current: '2025-10-05T12:00:00Z',
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            expect(isTimeState(validState)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isTimeState(null)).toBe(false);
        });

        it('should return false for non-object', () => {
            expect(isTimeState('not an object')).toBe(false);
            expect(isTimeState(123)).toBe(false);
        });

        it('should return false for missing current', () => {
            const invalid = {
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            expect(isTimeState(invalid)).toBe(false);
        });

        it('should return false for non-string fields', () => {
            const invalid = {
                current: 123,
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            expect(isTimeState(invalid)).toBe(false);
        });

        it('should return false for invalid date strings', () => {
            const invalid = {
                current: 'not-a-date',
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            expect(isTimeState(invalid)).toBe(false);
        });
    });

    describe('validateTimeState', () => {
        it('should validate correct TimeState', () => {
            const validState = {
                current: '2025-10-05T12:00:00Z',
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            const result = validateTimeState(validState);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject null/undefined', () => {
            const result = validateTimeState(null);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('TimeState is required');
        });

        it('should reject non-object', () => {
            const result = validateTimeState('not an object');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('TimeState must be an object');
        });

        it('should reject missing current field', () => {
            const invalid = {
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            const result = validateTimeState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('TimeState.current is required');
        });

        it('should reject invalid ISO 8601 date', () => {
            const invalid = {
                current: '2025-13-45T12:00:00Z', // Invalid month/day
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            const result = validateTimeState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not a valid ISO 8601 date-time');
        });

        it('should reject start > end', () => {
            const invalid = {
                current: '2025-10-05T12:00:00Z',
                start: '2025-10-05T14:00:00Z', // After end
                end: '2025-10-05T10:00:00Z'
            };
            const result = validateTimeState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('start must be before or equal to');
        });

        it('should reject current outside range', () => {
            const invalid = {
                current: '2025-10-05T16:00:00Z', // After end
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            const result = validateTimeState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('must be between start and end times');
        });

        it('should accept current at start boundary', () => {
            const validState = {
                current: '2025-10-05T10:00:00Z',
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            const result = validateTimeState(validState);
            expect(result.valid).toBe(true);
        });

        it('should accept current at end boundary', () => {
            const validState = {
                current: '2025-10-05T14:00:00Z',
                start: '2025-10-05T10:00:00Z',
                end: '2025-10-05T14:00:00Z'
            };
            const result = validateTimeState(validState);
            expect(result.valid).toBe(true);
        });
    });
});

describe('ViewportState Validators', () => {
    describe('isViewportState', () => {
        it('should return true for valid ViewportState', () => {
            const validState = {
                bounds: [-10, 50, 2, 58] // [west, south, east, north]
            };
            expect(isViewportState(validState)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isViewportState(null)).toBe(false);
        });

        it('should return false for non-object', () => {
            expect(isViewportState('not an object')).toBe(false);
        });

        it('should return false for missing bounds', () => {
            expect(isViewportState({})).toBe(false);
        });

        it('should return false for non-array bounds', () => {
            const invalid = { bounds: 'not an array' };
            expect(isViewportState(invalid)).toBe(false);
        });

        it('should return false for wrong array length', () => {
            const invalid = { bounds: [1, 2, 3] }; // Only 3 elements
            expect(isViewportState(invalid)).toBe(false);
        });

        it('should return false for non-numeric elements', () => {
            const invalid = { bounds: [-10, '50', 2, 58] };
            expect(isViewportState(invalid)).toBe(false);
        });

        it('should return false for NaN elements', () => {
            const invalid = { bounds: [-10, NaN, 2, 58] };
            expect(isViewportState(invalid)).toBe(false);
        });
    });

    describe('validateViewportState', () => {
        it('should validate correct ViewportState', () => {
            const validState = {
                bounds: [-10, 50, 2, 58]
            };
            const result = validateViewportState(validState);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject null/undefined', () => {
            const result = validateViewportState(null);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('ViewportState is required');
        });

        it('should reject non-object', () => {
            const result = validateViewportState('not an object');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('ViewportState must be an object');
        });

        it('should reject missing bounds', () => {
            const result = validateViewportState({});
            expect(result.valid).toBe(false);
            expect(result.error).toBe('ViewportState.bounds is required');
        });

        it('should reject wrong array length', () => {
            const invalid = { bounds: [1, 2, 3] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('must have exactly 4 elements');
        });

        it('should reject non-numeric south', () => {
            const invalid = { bounds: [-10, '50', 2, 58] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('south) must be a valid number');
        });

        it('should reject south out of range (< -90)', () => {
            const invalid = { bounds: [-10, -95, 2, 58] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('south) must be between -90 and 90');
        });

        it('should reject south out of range (> 90)', () => {
            const invalid = { bounds: [-10, 95, 2, 58] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('south) must be between -90 and 90');
        });

        it('should reject north out of range', () => {
            const invalid = { bounds: [-10, 50, 2, 95] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('north) must be between -90 and 90');
        });

        it('should reject west out of range', () => {
            const invalid = { bounds: [-200, 50, 2, 58] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('west) must be between -180 and 180');
        });

        it('should reject east out of range', () => {
            const invalid = { bounds: [-10, 50, 200, 58] };
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('east) must be between -180 and 180');
        });

        it('should reject south > north', () => {
            const invalid = { bounds: [-10, 60, 2, 50] }; // South > north
            const result = validateViewportState(invalid);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('south (60) must be less than or equal to north (50)');
        });

        it('should allow west > east (antimeridian crossing)', () => {
            const validState = { bounds: [170, 50, -170, 58] }; // Pacific crossing
            const result = validateViewportState(validState);
            expect(result.valid).toBe(true);
        });

        it('should accept bounds at exact limits', () => {
            const validState = { bounds: [-180, -90, 180, 90] };
            const result = validateViewportState(validState);
            expect(result.valid).toBe(true);
        });
    });
});

describe('Filename Validators', () => {
    describe('isOptionalFilename', () => {
        it('should return true for undefined', () => {
            expect(isOptionalFilename(undefined)).toBe(true);
        });

        it('should return true for valid string', () => {
            expect(isOptionalFilename('file.plot.json')).toBe(true);
        });

        it('should return false for null', () => {
            expect(isOptionalFilename(null)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isOptionalFilename('')).toBe(false);
        });

        it('should return false for number', () => {
            expect(isOptionalFilename(123)).toBe(false);
        });
    });

    describe('validateFilename', () => {
        it('should accept undefined when not required', () => {
            const result = validateFilename(undefined, false);
            expect(result.valid).toBe(true);
        });

        it('should reject undefined when required', () => {
            const result = validateFilename(undefined, true);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Filename is required');
        });

        it('should accept valid string', () => {
            const result = validateFilename('file.plot.json');
            expect(result.valid).toBe(true);
        });

        it('should reject non-string', () => {
            const result = validateFilename(123);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Filename must be a string');
        });

        it('should reject empty string', () => {
            const result = validateFilename('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Filename cannot be empty');
        });

        it('should reject whitespace-only string', () => {
            const result = validateFilename('   ');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Filename cannot be empty');
        });
    });
});
