import { describe, it, expect } from '@jest/globals';
import {
    MCPError,
    WebSocketConnectionError,
    ToolVaultError,
    InvalidParameterError,
    RetryExhaustedError,
    ResourceNotFoundError,
    MultiplePlotsError,
    isRetryableError,
    wrapError,
    getErrorCode,
    getUserFriendlyMessage
} from '../../../services/utils/errors';

describe('MCPError Classes', () => {
    describe('MCPError', () => {
        it('should create error with code and message', () => {
            const error = new MCPError(-32000, 'Test error');
            expect(error.code).toBe(-32000);
            expect(error.message).toBe('Test error');
            expect(error.data).toBeUndefined();
        });

        it('should create error with data', () => {
            const error = new MCPError(-32000, 'Test error', { foo: 'bar' });
            expect(error.data).toEqual({ foo: 'bar' });
        });

        it('should convert to JSON correctly', () => {
            const error = new MCPError(-32000, 'Test error');
            const json = error.toJSON();
            expect(json).toEqual({
                code: -32000,
                message: 'Test error'
            });
        });

        it('should include data in JSON when present', () => {
            const error = new MCPError(-32000, 'Test error', { foo: 'bar' });
            const json = error.toJSON();
            expect(json).toEqual({
                code: -32000,
                message: 'Test error',
                data: { foo: 'bar' }
            });
        });
    });

    describe('WebSocketConnectionError', () => {
        it('should have correct error code -32000', () => {
            const error = new WebSocketConnectionError();
            expect(error.code).toBe(-32000);
        });

        it('should have default message', () => {
            const error = new WebSocketConnectionError();
            expect(error.message).toBe('Failed to connect to WebSocket bridge');
        });

        it('should accept custom message', () => {
            const error = new WebSocketConnectionError('Custom message');
            expect(error.message).toBe('Custom message');
        });
    });

    describe('ToolVaultError', () => {
        it('should have correct error code -32001', () => {
            const error = new ToolVaultError();
            expect(error.code).toBe(-32001);
        });

        it('should have default message', () => {
            const error = new ToolVaultError();
            expect(error.message).toBe('Tool Vault service unavailable');
        });
    });

    describe('InvalidParameterError', () => {
        it('should have correct error code -32002', () => {
            const error = new InvalidParameterError('Bad param');
            expect(error.code).toBe(-32002);
        });

        it('should use provided message', () => {
            const error = new InvalidParameterError('Invalid input');
            expect(error.message).toBe('Invalid input');
        });
    });

    describe('RetryExhaustedError', () => {
        it('should have correct error code -32003', () => {
            const error = new RetryExhaustedError('Failed', 3);
            expect(error.code).toBe(-32003);
        });

        it('should include attempts in data', () => {
            const error = new RetryExhaustedError('Failed', 3);
            expect(error.data).toEqual({
                attempts: 3,
                lastError: undefined
            });
        });

        it('should include last error message in data', () => {
            const lastError = new Error('Connection timeout');
            const error = new RetryExhaustedError('Failed', 3, lastError);
            expect(error.data).toEqual({
                attempts: 3,
                lastError: 'Connection timeout'
            });
        });
    });

    describe('ResourceNotFoundError', () => {
        it('should have correct error code -32004', () => {
            const error = new ResourceNotFoundError('Plot');
            expect(error.code).toBe(-32004);
        });

        it('should format message with resource only', () => {
            const error = new ResourceNotFoundError('Plot');
            expect(error.message).toBe('Plot not found');
        });

        it('should format message with identifier', () => {
            const error = new ResourceNotFoundError('Plot', 'file.plot.json');
            expect(error.message).toBe('Plot not found: file.plot.json');
        });
    });

    describe('MultiplePlotsError', () => {
        it('should have correct error code -32005', () => {
            const plots = [
                { filename: 'plot1.plot.json', title: 'Plot 1' },
                { filename: 'plot2.plot.json', title: 'Plot 2' }
            ];
            const error = new MultiplePlotsError(plots);
            expect(error.code).toBe(-32005);
        });

        it('should include available plots in data', () => {
            const plots = [
                { filename: 'plot1.plot.json', title: 'Plot 1' }
            ];
            const error = new MultiplePlotsError(plots);
            expect(error.data).toEqual({ available_plots: plots });
        });
    });
});

describe('Error Utility Functions', () => {
    describe('isRetryableError', () => {
        it('should return true for WebSocketConnectionError', () => {
            const error = new WebSocketConnectionError();
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return true for ToolVaultError', () => {
            const error = new ToolVaultError();
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return false for InvalidParameterError', () => {
            const error = new InvalidParameterError('Bad input');
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for RetryExhaustedError', () => {
            const error = new RetryExhaustedError('Failed', 3);
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for ResourceNotFoundError', () => {
            const error = new ResourceNotFoundError('Plot');
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for MultiplePlotsError', () => {
            const plots = [{ filename: 'plot1.plot.json', title: 'Plot 1' }];
            const error = new MultiplePlotsError(plots);
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return true for ECONNREFUSED', () => {
            const error = new Error('ECONNREFUSED');
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return true for ETIMEDOUT', () => {
            const error = new Error('ETIMEDOUT');
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return false for ENOTFOUND (DNS failure)', () => {
            const error = new Error('ENOTFOUND');
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return true for 503 status', () => {
            const error = new Error('503 Service Unavailable');
            expect(isRetryableError(error)).toBe(true);
        });

        it('should return false for 404 status', () => {
            const error = new Error('404 Not Found');
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for 400 status', () => {
            const error = new Error('400 Bad Request');
            expect(isRetryableError(error)).toBe(false);
        });

        it('should return false for unknown errors', () => {
            const error = new Error('Unknown error');
            expect(isRetryableError(error)).toBe(false);
        });
    });

    describe('wrapError', () => {
        it('should return MCPError unchanged', () => {
            const error = new WebSocketConnectionError();
            const wrapped = wrapError(error);
            expect(wrapped).toBe(error);
        });

        it('should wrap ECONNREFUSED as WebSocketConnectionError', () => {
            const error = new Error('ECONNREFUSED');
            const wrapped = wrapError(error);
            expect(wrapped).toBeInstanceOf(WebSocketConnectionError);
            expect(wrapped.message).toContain('ECONNREFUSED');
        });

        it('should add context to wrapped errors', () => {
            const error = new Error('ECONNREFUSED');
            const wrapped = wrapError(error, 'getTime');
            expect(wrapped.message).toContain('getTime');
            expect(wrapped.message).toContain('ECONNREFUSED');
        });

        it('should wrap validation errors as InvalidParameterError', () => {
            const error = new Error('Invalid input');
            const wrapped = wrapError(error);
            expect(wrapped).toBeInstanceOf(InvalidParameterError);
        });

        it('should wrap not found errors as ResourceNotFoundError', () => {
            const error = new Error('Plot not found');
            const wrapped = wrapError(error);
            expect(wrapped).toBeInstanceOf(ResourceNotFoundError);
        });

        it('should wrap unknown errors as generic MCPError', () => {
            const error = new Error('Unknown error');
            const wrapped = wrapError(error);
            expect(wrapped).toBeInstanceOf(MCPError);
            expect(wrapped.code).toBe(-32603); // Internal error
        });
    });

    describe('getErrorCode', () => {
        it('should return code from MCPError', () => {
            const error = new WebSocketConnectionError();
            expect(getErrorCode(error)).toBe(-32000);
        });

        it('should return -32603 for standard Error', () => {
            const error = new Error('Standard error');
            expect(getErrorCode(error)).toBe(-32603);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return friendly message for WebSocketConnectionError', () => {
            const error = new WebSocketConnectionError();
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Could not connect to plot. Is a .plot.json file open?');
        });

        it('should return friendly message for ToolVaultError', () => {
            const error = new ToolVaultError();
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Tool Vault service is currently unavailable. Please try again.');
        });

        it('should return prefixed message for InvalidParameterError', () => {
            const error = new InvalidParameterError('Bad input');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Invalid input: Bad input');
        });

        it('should return friendly message for RetryExhaustedError', () => {
            const error = new RetryExhaustedError('Failed', 3);
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Operation failed after multiple attempts. Please try again later.');
        });

        it('should return error message for ResourceNotFoundError', () => {
            const error = new ResourceNotFoundError('Plot', 'file.plot.json');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Plot not found: file.plot.json');
        });

        it('should return error message for MultiplePlotsError', () => {
            const plots = [{ filename: 'plot1.plot.json', title: 'Plot 1' }];
            const error = new MultiplePlotsError(plots);
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Multiple plot files are open. Please specify which file to use.');
        });

        it('should return generic message for standard Error', () => {
            const error = new Error('Internal error');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('An unexpected error occurred. Please try again.');
        });
    });
});
