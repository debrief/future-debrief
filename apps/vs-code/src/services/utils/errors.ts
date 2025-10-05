/**
 * MCP Error Handling Utilities
 *
 * Custom error classes and utilities for MCP tool error handling.
 * Error codes follow JSON-RPC 2.0 spec with custom extensions for MCP.
 */

/**
 * Base class for all MCP-related errors
 */
export class MCPError extends Error {
    public readonly code: number;
    public readonly data?: unknown;

    constructor(code: number, message: string, data?: unknown) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.data = data;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON(): { code: number; message: string; data?: unknown } {
        const result: { code: number; message: string; data?: unknown } = {
            code: this.code,
            message: this.message
        };
        if (this.data !== undefined) {
            result.data = this.data;
        }
        return result;
    }
}

/**
 * WebSocket connection error (-32000)
 * Retryable error indicating the WebSocket bridge is unavailable
 */
export class WebSocketConnectionError extends MCPError {
    constructor(message: string = 'Failed to connect to WebSocket bridge', data?: unknown) {
        super(-32000, message, data);
    }
}

/**
 * Tool Vault service error (-32001)
 * Retryable error indicating Tool Vault service is unavailable or returned an error
 */
export class ToolVaultError extends MCPError {
    constructor(message: string = 'Tool Vault service unavailable', data?: unknown) {
        super(-32001, message, data);
    }
}

/**
 * Invalid parameter error (-32002)
 * Non-retryable error indicating input validation failed
 */
export class InvalidParameterError extends MCPError {
    constructor(message: string, data?: unknown) {
        super(-32002, message, data);
    }
}

/**
 * Retry exhausted error (-32003)
 * Non-retryable error indicating max retries were exceeded
 */
export class RetryExhaustedError extends MCPError {
    constructor(message: string, attempts: number, lastError?: Error) {
        super(-32003, message, {
            attempts,
            lastError: lastError?.message
        });
    }
}

/**
 * Resource not found error (-32004)
 * Non-retryable error indicating a requested resource doesn't exist
 */
export class ResourceNotFoundError extends MCPError {
    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} not found: ${identifier}`
            : `${resource} not found`;
        super(-32004, message, { resource, identifier });
    }
}

/**
 * Multiple plots error (-32005)
 * Special error for multi-plot scenarios requiring filename specification
 */
export class MultiplePlotsError extends MCPError {
    constructor(availablePlots: Array<{ filename: string; title: string }>) {
        super(
            -32005,
            'Multiple plot files are open. Please specify which file to use.',
            { available_plots: availablePlots }
        );
    }
}

/**
 * Error classification utilities
 */

/**
 * Determines if an error is retryable
 * Retryable errors: WebSocket connection failures, Tool Vault 503s, network timeouts
 * Non-retryable: validation errors, 404s, authentication errors
 */
export function isRetryableError(error: Error | MCPError): boolean {
    // MCP-specific errors
    if (error instanceof WebSocketConnectionError) {
        return true;
    }
    if (error instanceof ToolVaultError) {
        return true;
    }
    if (error instanceof InvalidParameterError) {
        return false;
    }
    if (error instanceof RetryExhaustedError) {
        return false;
    }
    if (error instanceof ResourceNotFoundError) {
        return false;
    }
    if (error instanceof MultiplePlotsError) {
        return false;
    }

    // Network errors (typically retryable)
    if (error.message.includes('ECONNREFUSED')) {
        return true;
    }
    if (error.message.includes('ETIMEDOUT')) {
        return true;
    }
    if (error.message.includes('ENOTFOUND')) {
        return false; // DNS failure, not retryable
    }

    // HTTP status-like errors in message
    if (error.message.includes('503')) {
        return true; // Service unavailable
    }
    if (error.message.includes('404')) {
        return false; // Not found
    }
    if (error.message.includes('400')) {
        return false; // Bad request
    }
    if (error.message.includes('401') || error.message.includes('403')) {
        return false; // Authentication/authorization
    }

    // Default to non-retryable for safety
    return false;
}

/**
 * Wraps a standard Error into an appropriate MCPError
 */
export function wrapError(error: Error, context?: string): MCPError {
    // Already an MCP error
    if (error instanceof MCPError) {
        return error;
    }

    // Connection-related errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        return new WebSocketConnectionError(
            context ? `${context}: ${error.message}` : error.message
        );
    }

    // Validation errors
    if (error.message.includes('Invalid') || error.message.includes('validation')) {
        return new InvalidParameterError(
            context ? `${context}: ${error.message}` : error.message
        );
    }

    // Not found errors
    if (error.message.includes('not found') || error.message.includes('404')) {
        return new ResourceNotFoundError(
            context || 'Resource',
            error.message
        );
    }

    // Default to generic internal error (-32603 per JSON-RPC spec)
    return new MCPError(
        -32603,
        context ? `${context}: ${error.message}` : error.message,
        { originalError: error.message }
    );
}

/**
 * Extracts error code from various error types
 */
export function getErrorCode(error: Error | MCPError): number {
    if (error instanceof MCPError) {
        return error.code;
    }
    // Default to internal error
    return -32603;
}

/**
 * Creates a user-friendly error message
 * Hides internal details while providing actionable information
 */
export function getUserFriendlyMessage(error: Error | MCPError): string {
    if (error instanceof WebSocketConnectionError) {
        return 'Could not connect to plot. Is a .plot.json file open?';
    }
    if (error instanceof ToolVaultError) {
        return 'Tool Vault service is currently unavailable. Please try again.';
    }
    if (error instanceof InvalidParameterError) {
        return `Invalid input: ${error.message}`;
    }
    if (error instanceof RetryExhaustedError) {
        return 'Operation failed after multiple attempts. Please try again later.';
    }
    if (error instanceof ResourceNotFoundError) {
        return error.message; // Already user-friendly
    }
    if (error instanceof MultiplePlotsError) {
        return error.message; // Already user-friendly with available plots
    }
    if (error instanceof MCPError) {
        return error.message;
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Logs error with appropriate level and context
 */
export function logError(
    error: Error | MCPError,
    context: string,
    additionalData?: Record<string, unknown>
): void {
    const errorCode = getErrorCode(error);
    const isRetryable = isRetryableError(error);

    console.error(
        `[MCP Error] ${context}:`,
        {
            code: errorCode,
            message: error.message,
            retryable: isRetryable,
            stack: error.stack,
            ...additionalData
        }
    );
}
