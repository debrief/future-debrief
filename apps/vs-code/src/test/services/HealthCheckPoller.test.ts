import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { HealthCheckPoller } from '../../services/HealthCheckPoller';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('HealthCheckPoller', () => {
  let poller: HealthCheckPoller;
  let healthChangeCallback: jest.Mock;

  beforeEach(() => {
    healthChangeCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (poller) {
      poller.dispose();
    }
  });

  describe('start and stop', () => {
    it('should start polling successfully', () => {
      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        1000,
        healthChangeCallback
      );

      poller.start();

      expect(poller.getIsRunning()).toBe(true);
    });

    it('should throw error if already running', () => {
      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        1000,
        healthChangeCallback
      );

      poller.start();

      expect(() => poller.start()).toThrow('already running');
    });

    it('should stop polling', () => {
      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        1000,
        healthChangeCallback
      );

      poller.start();
      poller.stop();

      expect(poller.getIsRunning()).toBe(false);
    });
  });

  describe('health check success', () => {
    it('should report healthy on successful health check', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback
      );

      poller.start();

      // Wait for first health check
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(healthChangeCallback).toHaveBeenCalledWith(true);
    });

    it('should reset consecutive failures on successful check', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          status: 200
        } as Response);

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback,
        3
      );

      poller.start();

      // Wait for checks
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(poller.getConsecutiveFailures()).toBe(0);
      expect(healthChangeCallback).toHaveBeenCalledWith(true);
    });
  });

  describe('health check failure', () => {
    it('should increment consecutive failures on error', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Connection refused')
      );

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback,
        3
      );

      poller.start();

      // Wait for immediate check + one interval (0ms + 100ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have had immediate check only
      expect(poller.getConsecutiveFailures()).toBe(1);
    });

    it('should report unhealthy after reaching failure threshold', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Connection refused')
      );

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback,
        3
      );

      poller.start();

      // Wait for 3 failures
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(poller.getConsecutiveFailures()).toBeGreaterThanOrEqual(3);
      expect(healthChangeCallback).toHaveBeenCalledWith(false);
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback,
        2
      );

      poller.start();

      // Wait for 2 failures
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(healthChangeCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('abort handling', () => {
    it('should not count aborted requests as failures', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        return Promise.reject(abortError);
      });

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback,
        3
      );

      poller.start();

      // Wait for check
      await new Promise(resolve => setTimeout(resolve, 150));

      // Aborted requests should not increment failures
      expect(poller.getConsecutiveFailures()).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should cleanup resources on dispose', () => {
      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback
      );

      poller.start();
      poller.dispose();

      expect(poller.getIsRunning()).toBe(false);
      expect(poller.getConsecutiveFailures()).toBe(0);
    });

    it('should stop polling after dispose', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback
      );

      poller.start();
      const callCountBeforeDispose = healthChangeCallback.mock.calls.length;

      poller.dispose();

      // Wait to ensure no more calls
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should not have additional calls after dispose
      expect(healthChangeCallback.mock.calls.length).toBeLessThanOrEqual(callCountBeforeDispose + 1);
    });
  });

  describe('custom failure threshold', () => {
    it('should use custom failure threshold', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Connection refused')
      );

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        100,
        healthChangeCallback,
        5 // Custom threshold
      );

      poller.start();

      // Wait for 4 failures (immediate + 3 intervals = 0ms, 100ms, 200ms, 300ms)
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should not be unhealthy yet (4 < threshold of 5)
      expect(healthChangeCallback).not.toHaveBeenCalledWith(false);

      // Wait for 5th failure (at 400ms)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now should be unhealthy (5 >= threshold of 5)
      expect(healthChangeCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('immediate health check', () => {
    it('should perform immediate health check on start', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      poller = new HealthCheckPoller(
        'http://localhost:8080/health',
        10000, // Long interval
        healthChangeCallback
      );

      poller.start();

      // Wait short time (less than interval)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have been called immediately
      expect(healthChangeCallback).toHaveBeenCalledWith(true);
    });
  });
});
