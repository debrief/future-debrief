import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ServerLifecycleManager } from '../../services/ServerLifecycleManager';
import { ServerIndicatorConfig } from '../../types/ServerIndicatorConfig';
import {
  PortConflictError,
  ServerStartupError,
  ServerCallbackError,
  HealthCheckTimeoutError
} from '../../types/ServerIndicatorErrors';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('ServerLifecycleManager', () => {
  let manager: ServerLifecycleManager;
  let mockConfig: ServerIndicatorConfig;

  beforeEach(() => {
    manager = new ServerLifecycleManager();
    mockConfig = {
      name: 'Test Server',
      healthCheckUrl: 'http://localhost:8080/health',
      onStart: jest.fn(),
      onStop: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should call onStart callback', async () => {
      await manager.start(mockConfig);

      expect(mockConfig.onStart).toHaveBeenCalledTimes(1);
    });

    it('should throw PortConflictError on EADDRINUSE', async () => {
      const portError = new Error('Port in use');
      (portError as NodeJS.ErrnoException).code = 'EADDRINUSE';
      (mockConfig.onStart as jest.Mock).mockRejectedValue(portError);

      await expect(manager.start(mockConfig)).rejects.toThrow(PortConflictError);
    });

    it('should extract correct port from healthCheckUrl in PortConflictError', async () => {
      const portError = new Error('Port in use');
      (portError as NodeJS.ErrnoException).code = 'EADDRINUSE';
      (mockConfig.onStart as jest.Mock).mockRejectedValue(portError);

      try {
        await manager.start(mockConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(PortConflictError);
        if (error instanceof PortConflictError) {
          expect(error.port).toBe(8080);
          expect(error.serverName).toBe('Test Server');
        }
      }
    });

    it('should throw ServerStartupError on other errors', async () => {
      (mockConfig.onStart as jest.Mock).mockRejectedValue(new Error('Unknown failure'));

      await expect(manager.start(mockConfig)).rejects.toThrow(ServerStartupError);
    });

    it('should include error message in ServerStartupError', async () => {
      (mockConfig.onStart as jest.Mock).mockRejectedValue(new Error('Custom error message'));

      try {
        await manager.start(mockConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ServerStartupError);
        if (error instanceof ServerStartupError) {
          expect(error.cause).toBe('Custom error message');
          expect(error.serverName).toBe('Test Server');
        }
      }
    });
  });

  describe('stop', () => {
    it('should call onStop callback', async () => {
      await manager.stop(mockConfig);

      expect(mockConfig.onStop).toHaveBeenCalledTimes(1);
    });

    it('should not throw on stop errors', async () => {
      (mockConfig.onStop as jest.Mock).mockRejectedValue(new Error('Stop failed'));

      await expect(manager.stop(mockConfig)).resolves.toBeUndefined();
    });

    it('should log but not throw on stop failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockConfig.onStop as jest.Mock).mockRejectedValue(new Error('Stop failed'));

      await manager.stop(mockConfig);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('restart', () => {
    it('should use custom onRestart if provided', async () => {
      mockConfig.onRestart = jest.fn();

      await manager.restart(mockConfig);

      expect(mockConfig.onRestart).toHaveBeenCalledTimes(1);
      expect(mockConfig.onStart).not.toHaveBeenCalled();
      expect(mockConfig.onStop).not.toHaveBeenCalled();
    });

    it('should call stop then start if no onRestart', async () => {
      await manager.restart(mockConfig);

      expect(mockConfig.onStop).toHaveBeenCalledTimes(1);
      expect(mockConfig.onStart).toHaveBeenCalledTimes(1);
    });

    it('should wait between stop and start', async () => {
      const startTime = Date.now();

      await manager.restart(mockConfig);

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(1000); // At least 1 second delay
    });

    it('should throw ServerCallbackError if onRestart fails', async () => {
      mockConfig.onRestart = jest.fn().mockRejectedValue(new Error('Restart failed'));

      await expect(manager.restart(mockConfig)).rejects.toThrow(ServerCallbackError);
    });

    it('should include callback name in ServerCallbackError', async () => {
      mockConfig.onRestart = jest.fn().mockRejectedValue(new Error('Restart failed'));

      try {
        await manager.restart(mockConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ServerCallbackError);
        if (error instanceof ServerCallbackError) {
          expect(error.callbackName).toBe('onRestart');
          expect(error.serverName).toBe('Test Server');
        }
      }
    });
  });

  describe('waitForHealthy', () => {
    it('should resolve when server becomes healthy', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      await expect(
        manager.waitForHealthy(mockConfig, 2000, 100)
      ).resolves.toBeUndefined();
    });

    it('should throw HealthCheckTimeoutError on timeout', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Connection refused')
      );

      await expect(
        manager.waitForHealthy(mockConfig, 500, 100)
      ).rejects.toThrow(HealthCheckTimeoutError);
    });

    it('should include timeout duration in error', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Connection refused')
      );

      try {
        await manager.waitForHealthy(mockConfig, 1000, 100);
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckTimeoutError);
        if (error instanceof HealthCheckTimeoutError) {
          expect(error.message).toContain('1000ms');
          expect(error.serverName).toBe('Test Server');
        }
      }
    });

    it('should poll at specified interval', async () => {
      let callCount = 0;
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
        callCount++;
        if (callCount >= 3) {
          return Promise.resolve({ ok: true, status: 200 } as Response);
        }
        return Promise.reject(new Error('Not ready'));
      });

      const startTime = Date.now();
      await manager.waitForHealthy(mockConfig, 2000, 200);
      const duration = Date.now() - startTime;

      // Should take at least 2 intervals (200ms * 2 = 400ms)
      expect(duration).toBeGreaterThanOrEqual(400);
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('should handle non-200 responses during startup', async () => {
      let callCount = 0;
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
        callCount++;
        if (callCount >= 3) {
          return Promise.resolve({ ok: true, status: 200 } as Response);
        }
        return Promise.resolve({ ok: false, status: 503 } as Response);
      });

      await expect(
        manager.waitForHealthy(mockConfig, 2000, 100)
      ).resolves.toBeUndefined();
    });
  });

  describe('port conflict detection', () => {
    it('should detect EADDRINUSE error code', async () => {
      const error = new Error('Address in use');
      (error as NodeJS.ErrnoException).code = 'EADDRINUSE';
      (mockConfig.onStart as jest.Mock).mockRejectedValue(error);

      await expect(manager.start(mockConfig)).rejects.toThrow(PortConflictError);
    });

    it('should detect port conflict in error message', async () => {
      const error = new Error('Error: address already in use');
      (mockConfig.onStart as jest.Mock).mockRejectedValue(error);

      await expect(manager.start(mockConfig)).rejects.toThrow(PortConflictError);
    });

    it('should detect port conflict from system error', async () => {
      const error = new Error('listen EADDRINUSE: address already in use :::8080');
      (mockConfig.onStart as jest.Mock).mockRejectedValue(error);

      await expect(manager.start(mockConfig)).rejects.toThrow(PortConflictError);
    });
  });

  describe('port extraction', () => {
    it('should extract port from standard URL', async () => {
      mockConfig.healthCheckUrl = 'http://localhost:60123/health';
      const error = new Error('Port conflict');
      (error as NodeJS.ErrnoException).code = 'EADDRINUSE';
      (mockConfig.onStart as jest.Mock).mockRejectedValue(error);

      try {
        await manager.start(mockConfig);
      } catch (error) {
        if (error instanceof PortConflictError) {
          expect(error.port).toBe(60123);
        }
      }
    });

    it('should extract port from HTTPS URL', async () => {
      mockConfig.healthCheckUrl = 'https://example.com:8443/health';
      const error = new Error('Port conflict');
      (error as NodeJS.ErrnoException).code = 'EADDRINUSE';
      (mockConfig.onStart as jest.Mock).mockRejectedValue(error);

      try {
        await manager.start(mockConfig);
      } catch (error) {
        if (error instanceof PortConflictError) {
          expect(error.port).toBe(8443);
        }
      }
    });

    it('should return 0 if port not found in URL', async () => {
      mockConfig.healthCheckUrl = 'http://localhost/health';
      const error = new Error('Port conflict');
      (error as NodeJS.ErrnoException).code = 'EADDRINUSE';
      (mockConfig.onStart as jest.Mock).mockRejectedValue(error);

      try {
        await manager.start(mockConfig);
      } catch (error) {
        if (error instanceof PortConflictError) {
          expect(error.port).toBe(0);
        }
      }
    });
  });
});
