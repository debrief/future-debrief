/**
 * MCP Retry Logic Utilities
 *
 * Provides retry functionality with exponential backoff for transient failures.
 * Configuration: Base delay 1000ms, max 3 retries, exponential backoff (1s, 2s, 4s)
 */

import { isRetryableError, RetryExhaustedError, logError } from './errors';

/**
 * Options for retry behavior
 */
export interface RetryOptions {
    /**
     * Maximum number of retry attempts (default: 3)
     */
    maxRetries?: number;

    /**
     * Base delay in milliseconds before first retry (default: 1000ms)
     */
    baseDelay?: number;

    /**
     * Maximum delay in milliseconds between retries (default: 10000ms)
     */
    maxDelay?: number;

    /**
     * Callback invoked before each retry attempt
     * @param attempt - Current retry attempt number (1-indexed)
     * @param error - The error that triggered the retry
     */
    onRetry?: (attempt: number, error: Error) => void;

    /**
     * Context string for logging
     */
    context?: string;
}

/**
 * Default retry configuration per TAP requirements
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'context'>> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
};

/**
 * Calculates delay for a given retry attempt using exponential backoff
 * Formula: min(baseDelay * 2^(attempt-1), maxDelay)
 * Examples (baseDelay=1000ms): 1s, 2s, 4s, 8s, ...
 *
 * @param attempt - Retry attempt number (1-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number
): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, maxDelay);
}

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with retry logic and exponential backoff
 *
 * Only retries errors classified as retryable by isRetryableError().
 * Non-retryable errors are thrown immediately without retry.
 *
 * @template T - Return type of the function
 * @param fn - Async function to execute with retry logic
 * @param options - Retry configuration options
 * @returns Promise resolving to function result
 * @throws RetryExhaustedError if max retries exceeded
 * @throws Original error if non-retryable
 *
 * @example
 * ```typescript
 * const result = await callWithRetry(
 *   () => websocketCall('getTime', params),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     context: 'getTime',
 *     onRetry: (attempt, error) => {
 *       console.warn(`Retry attempt ${attempt} after error: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function callWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const config = {
        ...DEFAULT_RETRY_OPTIONS,
        ...options
    };

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
        try {
            // First attempt (attempt = 0) and all retry attempts
            return await fn();
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            lastError = err;

            // Check if error is retryable
            if (!isRetryableError(err)) {
                // Non-retryable error, throw immediately
                logError(
                    err,
                    config.context || 'callWithRetry',
                    { retryable: false, attempt }
                );
                throw err;
            }

            // Check if we've exhausted retries
            if (attempt >= config.maxRetries) {
                // Max retries reached
                const exhaustedError = new RetryExhaustedError(
                    `Failed after ${config.maxRetries} retry attempts`,
                    attempt + 1,
                    err
                );
                logError(
                    exhaustedError,
                    config.context || 'callWithRetry',
                    { originalError: err.message }
                );
                throw exhaustedError;
            }

            // We will retry
            attempt++;
            const delay = calculateBackoffDelay(attempt, config.baseDelay, config.maxDelay);

            // Log retry attempt
            console.warn(
                `[Retry] Attempt ${attempt}/${config.maxRetries} after ${delay}ms delay` +
                (config.context ? ` (${config.context})` : '') +
                `: ${err.message}`
            );

            // Invoke retry callback if provided
            if (options.onRetry) {
                options.onRetry(attempt, err);
            }

            // Wait before retrying
            await sleep(delay);
        }
    }

    // Should never reach here, but TypeScript needs this
    throw new RetryExhaustedError(
        `Failed after ${config.maxRetries} retry attempts`,
        attempt,
        lastError
    );
}

/**
 * Retry configuration preset for quick get operations
 * Faster retries for lightweight operations (500ms base, 2 retries)
 */
export const QUICK_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000
};

/**
 * Retry configuration preset for slower set operations
 * Standard retries for operations that modify state (1000ms base, 3 retries)
 */
export const STANDARD_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
};

/**
 * Retry configuration preset for heavy operations
 * Longer delays for resource-intensive operations (2000ms base, 3 retries)
 */
export const HEAVY_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 15000
};

/**
 * Circuit breaker state for preventing cascading failures
 */
interface CircuitBreakerState {
    failures: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
    /**
     * Number of consecutive failures before opening circuit (default: 5)
     */
    failureThreshold?: number;

    /**
     * Time in milliseconds to wait before attempting to close circuit (default: 30000ms / 30s)
     */
    timeout?: number;

    /**
     * Number of successful requests needed to close circuit from half-open (default: 3)
     */
    halfOpenRequests?: number;
}

/**
 * Simple circuit breaker implementation for protecting services
 *
 * States:
 * - Closed: Normal operation, requests pass through
 * - Open: Circuit is broken, requests fail immediately
 * - Half-open: Testing if service recovered, limited requests allowed
 *
 * @example
 * ```typescript
 * const breaker = createCircuitBreaker({ failureThreshold: 5, timeout: 30000 });
 *
 * try {
 *   await breaker.execute(() => callExternalService());
 * } catch (error) {
 *   // Handle circuit open or service failure
 * }
 * ```
 */
export function createCircuitBreaker(options: CircuitBreakerOptions = {}) {
    const config = {
        failureThreshold: options.failureThreshold || 5,
        timeout: options.timeout || 30000,
        halfOpenRequests: options.halfOpenRequests || 3
    };

    const state: CircuitBreakerState = {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed'
    };

    let successfulHalfOpenRequests = 0;

    return {
        async execute<T>(fn: () => Promise<T>): Promise<T> {
            // Check if circuit should transition from open to half-open
            if (state.state === 'open') {
                const timeSinceFailure = Date.now() - state.lastFailureTime;
                if (timeSinceFailure > config.timeout) {
                    console.warn('[CircuitBreaker] Transitioning to half-open state');
                    state.state = 'half-open';
                    successfulHalfOpenRequests = 0;
                } else {
                    throw new Error('Circuit breaker is open');
                }
            }

            try {
                const result = await fn();

                // Success - reset failure count or increment half-open successes
                if (state.state === 'half-open') {
                    successfulHalfOpenRequests++;
                    if (successfulHalfOpenRequests >= config.halfOpenRequests) {
                        console.warn('[CircuitBreaker] Closing circuit after successful half-open requests');
                        state.state = 'closed';
                        state.failures = 0;
                    }
                } else if (state.state === 'closed') {
                    state.failures = 0;
                }

                return result;
            } catch (error) {
                // Failure - increment failure count or open circuit
                state.failures++;
                state.lastFailureTime = Date.now();

                if (state.state === 'half-open' || state.failures >= config.failureThreshold) {
                    console.error(`[CircuitBreaker] Opening circuit after ${state.failures} failures`);
                    state.state = 'open';
                }

                throw error;
            }
        },

        getState(): 'closed' | 'open' | 'half-open' {
            return state.state;
        },

        reset(): void {
            state.failures = 0;
            state.lastFailureTime = 0;
            state.state = 'closed';
            successfulHalfOpenRequests = 0;
        }
    };
}
