import { describe, it, expect } from '@jest/globals';
import {
  ServerIndicatorConfig,
  isValidServerIndicatorConfig,
  hasValidPollInterval
} from '../../types/ServerIndicatorConfig';

describe('ServerIndicatorConfig', () => {
  describe('isValidServerIndicatorConfig type guard', () => {
    it('should return true for minimal valid config', () => {
      const config = {
        name: 'Test Server',
        healthCheckUrl: 'http://localhost:8080/health',
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(isValidServerIndicatorConfig(config)).toBe(true);
    });

    it('should return true for complete valid config with all optional properties', () => {
      const config: ServerIndicatorConfig = {
        name: 'Complete Server',
        healthCheckUrl: 'http://localhost:9000/health',
        pollInterval: 5000,
        onStart: async () => {},
        onStop: async () => {},
        onRestart: async () => {},
        onOpenWebUI: () => {},
        onShowDetails: () => {}
      };
      expect(isValidServerIndicatorConfig(config)).toBe(true);
    });

    describe('name validation', () => {
      it('should reject missing name', () => {
        const config = {
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject non-string name', () => {
        const config = {
          name: 123,
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject empty name', () => {
        const config = {
          name: '',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject whitespace-only name', () => {
        const config = {
          name: '   ',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });
    });

    describe('healthCheckUrl validation', () => {
      it('should reject missing healthCheckUrl', () => {
        const config = {
          name: 'Test',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject non-string healthCheckUrl', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 12345,
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject URLs not starting with http', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'ws://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should accept https URLs', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'https://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(true);
      });
    });

    describe('onStart callback validation', () => {
      it('should reject missing onStart', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject non-function onStart', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: 'not a function',
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should accept sync function as onStart', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: () => Promise.resolve(),
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(true);
      });
    });

    describe('onStop callback validation', () => {
      it('should reject missing onStop', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should reject non-function onStop', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: null
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });
    });

    describe('optional property validation', () => {
      it('should accept valid pollInterval', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          pollInterval: 10000,
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(true);
      });

      it('should reject non-number pollInterval', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          pollInterval: '5000',
          onStart: async () => {},
          onStop: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should accept valid onRestart function', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {},
          onRestart: async () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(true);
      });

      it('should reject non-function onRestart', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {},
          onRestart: 'restart'
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should accept valid onOpenWebUI function', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {},
          onOpenWebUI: () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(true);
      });

      it('should reject non-function onOpenWebUI', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {},
          onOpenWebUI: true
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });

      it('should accept valid onShowDetails function', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {},
          onShowDetails: () => {}
        };
        expect(isValidServerIndicatorConfig(config)).toBe(true);
      });

      it('should reject non-function onShowDetails', () => {
        const config = {
          name: 'Test',
          healthCheckUrl: 'http://localhost:8080/health',
          onStart: async () => {},
          onStop: async () => {},
          onShowDetails: []
        };
        expect(isValidServerIndicatorConfig(config)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject null', () => {
        expect(isValidServerIndicatorConfig(null)).toBe(false);
      });

      it('should reject undefined', () => {
        expect(isValidServerIndicatorConfig(undefined)).toBe(false);
      });

      it('should reject primitives', () => {
        expect(isValidServerIndicatorConfig('config')).toBe(false);
        expect(isValidServerIndicatorConfig(123)).toBe(false);
        expect(isValidServerIndicatorConfig(true)).toBe(false);
      });

      it('should reject array', () => {
        expect(isValidServerIndicatorConfig([])).toBe(false);
      });

      it('should reject empty object', () => {
        expect(isValidServerIndicatorConfig({})).toBe(false);
      });
    });
  });

  describe('hasValidPollInterval', () => {
    it('should return true for default interval when pollInterval is undefined', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(true);
    });

    it('should return true for 5000ms (default)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 5000,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(true);
    });

    it('should return true for minimum valid interval (1000ms)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 1000,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(true);
    });

    it('should return true for maximum valid interval (30000ms)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 30000,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(true);
    });

    it('should return false for interval below minimum (999ms)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 999,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(false);
    });

    it('should return false for interval above maximum (30001ms)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 30001,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(false);
    });

    it('should return false for extremely low interval (100ms)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 100,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(false);
    });

    it('should return false for extremely high interval (60000ms)', () => {
      const config: ServerIndicatorConfig = {
        name: 'Test',
        healthCheckUrl: 'http://localhost:8080/health',
        pollInterval: 60000,
        onStart: async () => {},
        onStop: async () => {}
      };
      expect(hasValidPollInterval(config)).toBe(false);
    });
  });
});
