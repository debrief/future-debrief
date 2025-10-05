/**
 * TypeScript Type Guards and Runtime Validators
 *
 * Provides type-safe runtime validation for MCP tool parameters.
 * Type guards narrow unknown types to specific interfaces at runtime.
 */

import { TimeState } from '@debrief/shared-types';
import { ViewportState } from '@debrief/shared-types';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Type guard for TimeState
 *
 * Validates that an unknown value conforms to the TimeState interface.
 * TimeState requires three ISO 8601 date-time strings: current, start, end.
 *
 * @param value - Value to validate
 * @returns True if value is a valid TimeState, false otherwise
 *
 * @example
 * ```typescript
 * if (isTimeState(params.timeState)) {
 *   // TypeScript now knows params.timeState is TimeState
 *   const current = params.timeState.current; // Type-safe access
 * }
 * ```
 */
export function isTimeState(value: unknown): value is TimeState {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const obj = value as Record<string, unknown>;

    // Check required fields exist and are strings
    if (typeof obj.current !== 'string') {
        return false;
    }
    if (typeof obj.start !== 'string') {
        return false;
    }
    if (typeof obj.end !== 'string') {
        return false;
    }

    // Optional: Validate ISO 8601 date format
    // Note: This is basic validation, more strict parsing could use Date.parse()
    const isValidDateString = (str: string): boolean => {
        if (!str) return false;
        const date = new Date(str);
        return !isNaN(date.getTime());
    };

    if (!isValidDateString(obj.current)) {
        return false;
    }
    if (!isValidDateString(obj.start)) {
        return false;
    }
    if (!isValidDateString(obj.end)) {
        return false;
    }

    return true;
}

/**
 * Validate TimeState with detailed error messages
 *
 * Provides detailed validation feedback for debugging and user-facing errors.
 *
 * @param value - Value to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateTimeState(params.timeState);
 * if (!result.valid) {
 *   return { error: { message: result.error, code: 400 } };
 * }
 * ```
 */
export function validateTimeState(value: unknown): ValidationResult {
    if (!value) {
        return { valid: false, error: 'TimeState is required' };
    }

    if (typeof value !== 'object') {
        return { valid: false, error: 'TimeState must be an object' };
    }

    const obj = value as Record<string, unknown>;

    if (typeof obj.current !== 'string') {
        return {
            valid: false,
            error: 'TimeState.current is required and must be a string (ISO 8601 date-time)'
        };
    }

    if (typeof obj.start !== 'string') {
        return {
            valid: false,
            error: 'TimeState.start is required and must be a string (ISO 8601 date-time)'
        };
    }

    if (typeof obj.end !== 'string') {
        return {
            valid: false,
            error: 'TimeState.end is required and must be a string (ISO 8601 date-time)'
        };
    }

    // Validate date strings can be parsed
    const currentDate = new Date(obj.current);
    if (isNaN(currentDate.getTime())) {
        return {
            valid: false,
            error: `TimeState.current is not a valid ISO 8601 date-time: ${obj.current}`
        };
    }

    const startDate = new Date(obj.start);
    if (isNaN(startDate.getTime())) {
        return {
            valid: false,
            error: `TimeState.start is not a valid ISO 8601 date-time: ${obj.start}`
        };
    }

    const endDate = new Date(obj.end);
    if (isNaN(endDate.getTime())) {
        return {
            valid: false,
            error: `TimeState.end is not a valid ISO 8601 date-time: ${obj.end}`
        };
    }

    // Logical validation: start <= current <= end
    if (startDate > endDate) {
        return {
            valid: false,
            error: 'TimeState.start must be before or equal to TimeState.end'
        };
    }

    if (currentDate < startDate || currentDate > endDate) {
        // Note: This is a warning rather than hard error in some contexts
        // Keeping as validation for strict mode
        return {
            valid: false,
            error: 'TimeState.current must be between start and end times'
        };
    }

    return { valid: true };
}

/**
 * Type guard for ViewportState
 *
 * Validates that an unknown value conforms to the ViewportState interface.
 * ViewportState requires bounds as [west, south, east, north] tuple.
 *
 * @param value - Value to validate
 * @returns True if value is a valid ViewportState, false otherwise
 *
 * @example
 * ```typescript
 * if (isViewportState(params.viewportState)) {
 *   // TypeScript now knows params.viewportState is ViewportState
 *   const bounds = params.viewportState.bounds; // Type-safe access
 * }
 * ```
 */
export function isViewportState(value: unknown): value is ViewportState {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const obj = value as Record<string, unknown>;

    // Check bounds field exists and is array
    if (!Array.isArray(obj.bounds)) {
        return false;
    }

    // Check bounds has exactly 4 elements
    if (obj.bounds.length !== 4) {
        return false;
    }

    // Check all elements are numbers
    if (!obj.bounds.every(item => typeof item === 'number' && !isNaN(item))) {
        return false;
    }

    return true;
}

/**
 * Validate ViewportState with detailed error messages
 *
 * Provides detailed validation feedback including geographic bounds checks.
 *
 * @param value - Value to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateViewportState(params.viewportState);
 * if (!result.valid) {
 *   return { error: { message: result.error, code: 400 } };
 * }
 * ```
 */
export function validateViewportState(value: unknown): ValidationResult {
    if (!value) {
        return { valid: false, error: 'ViewportState is required' };
    }

    if (typeof value !== 'object') {
        return { valid: false, error: 'ViewportState must be an object' };
    }

    const obj = value as Record<string, unknown>;

    if (!obj.bounds) {
        return {
            valid: false,
            error: 'ViewportState.bounds is required'
        };
    }

    if (!Array.isArray(obj.bounds)) {
        return {
            valid: false,
            error: 'ViewportState.bounds must be an array'
        };
    }

    if (obj.bounds.length !== 4) {
        return {
            valid: false,
            error: `ViewportState.bounds must have exactly 4 elements [west, south, east, north], got ${obj.bounds.length}`
        };
    }

    // Validate all elements are numbers
    for (let i = 0; i < 4; i++) {
        if (typeof obj.bounds[i] !== 'number' || isNaN(obj.bounds[i] as number)) {
            const labels = ['west', 'south', 'east', 'north'];
            return {
                valid: false,
                error: `ViewportState.bounds[${i}] (${labels[i]}) must be a valid number, got ${typeof obj.bounds[i]}`
            };
        }
    }

    const [west, south, east, north] = obj.bounds as [number, number, number, number];

    // Validate geographic bounds
    // Latitude: -90 to 90, Longitude: -180 to 180
    if (south < -90 || south > 90) {
        return {
            valid: false,
            error: `ViewportState.bounds[1] (south) must be between -90 and 90 degrees, got ${south}`
        };
    }

    if (north < -90 || north > 90) {
        return {
            valid: false,
            error: `ViewportState.bounds[3] (north) must be between -90 and 90 degrees, got ${north}`
        };
    }

    if (west < -180 || west > 180) {
        return {
            valid: false,
            error: `ViewportState.bounds[0] (west) must be between -180 and 180 degrees, got ${west}`
        };
    }

    if (east < -180 || east > 180) {
        return {
            valid: false,
            error: `ViewportState.bounds[2] (east) must be between -180 and 180 degrees, got ${east}`
        };
    }

    // Logical validation: south <= north
    if (south > north) {
        return {
            valid: false,
            error: `ViewportState.bounds: south (${south}) must be less than or equal to north (${north})`
        };
    }

    // Note: west > east is valid for bounds crossing the antimeridian (e.g., Pacific region)
    // So we don't validate west <= east

    return { valid: true };
}

/**
 * Type guard for optional filename parameter
 *
 * @param value - Value to validate
 * @returns True if value is undefined or a non-empty string
 */
export function isOptionalFilename(value: unknown): value is string | undefined {
    return value === undefined || (typeof value === 'string' && value.length > 0);
}

/**
 * Validate filename parameter
 *
 * @param value - Value to validate
 * @param required - Whether filename is required (default: false)
 * @returns Validation result
 */
export function validateFilename(value: unknown, required = false): ValidationResult {
    if (value === undefined || value === null) {
        if (required) {
            return { valid: false, error: 'Filename is required' };
        }
        return { valid: true };
    }

    if (typeof value !== 'string') {
        return { valid: false, error: 'Filename must be a string' };
    }

    if (value.trim().length === 0) {
        return { valid: false, error: 'Filename cannot be empty' };
    }

    return { valid: true };
}
