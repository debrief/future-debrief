import { describe, it, expect } from '@jest/globals';
import {
  ServerIndicatorError,
  HealthCheckTimeoutError,
  ServerStartupError,
  PortConflictError,
  HealthCheckFailureError,
  ServerCallbackError,
  isServerIndicatorError,
  isPortConflictError
} from '../../types/ServerIndicatorErrors';
import { ServerState } from '../../types/ServerState';

describe('ServerIndicatorErrors', () => {
  describe('ServerIndicatorError', () => {
    it('should create error with message, serverName, and state', () => {
      const error = new ServerIndicatorError('Test error', 'Test Server', ServerState.Error);

      expect(error.message).toBe('Test error');
      expect(error.serverName).toBe('Test Server');
      expect(error.state).toBe(ServerState.Error);
      expect(error.name).toBe('ServerIndicatorError');
    });

    it('should be instance of Error', () => {
      const error = new ServerIndicatorError('Test', 'Server', ServerState.Error);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new ServerIndicatorError('Test', 'Server', ServerState.Error);
      expect(error.stack).toBeDefined();
    });
  });

  describe('HealthCheckTimeoutError', () => {
    it('should create timeout error with default timeout', () => {
      const error = new HealthCheckTimeoutError('Debrief State');

      expect(error.message).toContain('Health check timeout');
      expect(error.message).toContain('Debrief State');
      expect(error.message).toContain('30000ms');
      expect(error.serverName).toBe('Debrief State');
      expect(error.state).toBe(ServerState.Error);
      expect(error.name).toBe('HealthCheckTimeoutError');
    });

    it('should create timeout error with custom timeout', () => {
      const error = new HealthCheckTimeoutError('Tool Vault', 60000);

      expect(error.message).toContain('60000ms');
      expect(error.serverName).toBe('Tool Vault');
    });

    it('should be instance of ServerIndicatorError', () => {
      const error = new HealthCheckTimeoutError('Server');
      expect(error).toBeInstanceOf(ServerIndicatorError);
    });
  });

  describe('ServerStartupError', () => {
    it('should create startup error with cause', () => {
      const error = new ServerStartupError('Debrief State', 'Port in use');

      expect(error.message).toContain('Failed to start');
      expect(error.message).toContain('Debrief State');
      expect(error.message).toContain('Port in use');
      expect(error.serverName).toBe('Debrief State');
      expect(error.cause).toBe('Port in use');
      expect(error.state).toBe(ServerState.Error);
      expect(error.name).toBe('ServerStartupError');
    });

    it('should be instance of ServerIndicatorError', () => {
      const error = new ServerStartupError('Server', 'Cause');
      expect(error).toBeInstanceOf(ServerIndicatorError);
    });
  });

  describe('PortConflictError', () => {
    it('should create port conflict error with port number', () => {
      const error = new PortConflictError('Debrief State', 60123);

      expect(error.message).toContain('Port 60123');
      expect(error.message).toContain('already in use');
      expect(error.message).toContain('Debrief State');
      expect(error.serverName).toBe('Debrief State');
      expect(error.port).toBe(60123);
      expect(error.state).toBe(ServerState.Error);
      expect(error.name).toBe('PortConflictError');
    });

    it('should be instance of ServerIndicatorError', () => {
      const error = new PortConflictError('Server', 8080);
      expect(error).toBeInstanceOf(ServerIndicatorError);
    });

    it('should work with different port numbers', () => {
      const error1 = new PortConflictError('Tool Vault', 60124);
      expect(error1.port).toBe(60124);
      expect(error1.message).toContain('60124');

      const error2 = new PortConflictError('Custom Server', 3000);
      expect(error2.port).toBe(3000);
      expect(error2.message).toContain('3000');
    });
  });

  describe('HealthCheckFailureError', () => {
    it('should create health check failure error with reason', () => {
      const error = new HealthCheckFailureError('Tool Vault', 'HTTP 500: Internal Server Error');

      expect(error.message).toContain('Health check failed');
      expect(error.message).toContain('Tool Vault');
      expect(error.message).toContain('HTTP 500');
      expect(error.serverName).toBe('Tool Vault');
      expect(error.reason).toBe('HTTP 500: Internal Server Error');
      expect(error.state).toBe(ServerState.Error);
      expect(error.name).toBe('HealthCheckFailureError');
    });

    it('should be instance of ServerIndicatorError', () => {
      const error = new HealthCheckFailureError('Server', 'Connection refused');
      expect(error).toBeInstanceOf(ServerIndicatorError);
    });
  });

  describe('ServerCallbackError', () => {
    it('should create callback error with original error', () => {
      const originalError = new Error('Original failure');
      const error = new ServerCallbackError('Debrief State', 'onStart', originalError);

      expect(error.message).toContain('onStart');
      expect(error.message).toContain('Debrief State');
      expect(error.message).toContain('Original failure');
      expect(error.serverName).toBe('Debrief State');
      expect(error.callbackName).toBe('onStart');
      expect(error.originalError).toBe(originalError);
      expect(error.state).toBe(ServerState.Error);
      expect(error.name).toBe('ServerCallbackError');
    });

    it('should work with different callback names', () => {
      const originalError = new Error('Stop failed');
      const error = new ServerCallbackError('Tool Vault', 'onStop', originalError);

      expect(error.callbackName).toBe('onStop');
      expect(error.message).toContain('onStop');
    });

    it('should be instance of ServerIndicatorError', () => {
      const error = new ServerCallbackError('Server', 'onRestart', new Error('Test'));
      expect(error).toBeInstanceOf(ServerIndicatorError);
    });
  });

  describe('isServerIndicatorError type guard', () => {
    it('should return true for ServerIndicatorError', () => {
      const error = new ServerIndicatorError('Test', 'Server', ServerState.Error);
      expect(isServerIndicatorError(error)).toBe(true);
    });

    it('should return true for HealthCheckTimeoutError', () => {
      const error = new HealthCheckTimeoutError('Server');
      expect(isServerIndicatorError(error)).toBe(true);
    });

    it('should return true for ServerStartupError', () => {
      const error = new ServerStartupError('Server', 'Cause');
      expect(isServerIndicatorError(error)).toBe(true);
    });

    it('should return true for PortConflictError', () => {
      const error = new PortConflictError('Server', 8080);
      expect(isServerIndicatorError(error)).toBe(true);
    });

    it('should return true for HealthCheckFailureError', () => {
      const error = new HealthCheckFailureError('Server', 'Reason');
      expect(isServerIndicatorError(error)).toBe(true);
    });

    it('should return true for ServerCallbackError', () => {
      const error = new ServerCallbackError('Server', 'onStart', new Error('Test'));
      expect(isServerIndicatorError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isServerIndicatorError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isServerIndicatorError('error')).toBe(false);
      expect(isServerIndicatorError(123)).toBe(false);
      expect(isServerIndicatorError(null)).toBe(false);
      expect(isServerIndicatorError(undefined)).toBe(false);
      expect(isServerIndicatorError({})).toBe(false);
      expect(isServerIndicatorError([])).toBe(false);
    });

    it('should correctly narrow type in TypeScript', () => {
      const error: unknown = new ServerIndicatorError('Test', 'Server', ServerState.Error);

      if (isServerIndicatorError(error)) {
        // TypeScript should know error has serverName and state
        expect(error.serverName).toBe('Server');
        expect(error.state).toBe(ServerState.Error);
      }
    });
  });

  describe('isPortConflictError type guard', () => {
    it('should return true for PortConflictError', () => {
      const error = new PortConflictError('Server', 8080);
      expect(isPortConflictError(error)).toBe(true);
    });

    it('should return false for other ServerIndicatorErrors', () => {
      expect(isPortConflictError(new ServerIndicatorError('Test', 'Server', ServerState.Error))).toBe(false);
      expect(isPortConflictError(new HealthCheckTimeoutError('Server'))).toBe(false);
      expect(isPortConflictError(new ServerStartupError('Server', 'Cause'))).toBe(false);
      expect(isPortConflictError(new HealthCheckFailureError('Server', 'Reason'))).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isPortConflictError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isPortConflictError('error')).toBe(false);
      expect(isPortConflictError(null)).toBe(false);
      expect(isPortConflictError(undefined)).toBe(false);
    });

    it('should correctly narrow type in TypeScript', () => {
      const error: unknown = new PortConflictError('Server', 60123);

      if (isPortConflictError(error)) {
        // TypeScript should know error has port property
        expect(error.port).toBe(60123);
        expect(error.serverName).toBe('Server');
      }
    });
  });

  describe('error inheritance chain', () => {
    it('should maintain correct inheritance chain', () => {
      const error = new HealthCheckTimeoutError('Server');

      expect(error).toBeInstanceOf(HealthCheckTimeoutError);
      expect(error).toBeInstanceOf(ServerIndicatorError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should work with instanceof checks for all error types', () => {
      const errors = [
        new HealthCheckTimeoutError('Server'),
        new ServerStartupError('Server', 'Cause'),
        new PortConflictError('Server', 8080),
        new HealthCheckFailureError('Server', 'Reason'),
        new ServerCallbackError('Server', 'onStart', new Error('Test'))
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(ServerIndicatorError);
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
