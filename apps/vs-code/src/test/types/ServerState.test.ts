import { describe, it, expect } from '@jest/globals';
import {
  ServerState,
  SERVER_STATE_VISUALS,
  isServerState,
  type StateVisuals,
  type StateVisualsMap
} from '../../types/ServerState';

describe('ServerState', () => {
  describe('enum values', () => {
    it('should have NotStarted state', () => {
      expect(ServerState.NotStarted).toBe('not_started');
    });

    it('should have Starting state', () => {
      expect(ServerState.Starting).toBe('starting');
    });

    it('should have Healthy state', () => {
      expect(ServerState.Healthy).toBe('healthy');
    });

    it('should have Error state', () => {
      expect(ServerState.Error).toBe('error');
    });

    it('should have exactly 4 enum members', () => {
      const enumValues = Object.values(ServerState);
      expect(enumValues).toHaveLength(4);
    });
  });

  describe('SERVER_STATE_VISUALS', () => {
    it('should have visual config for all states', () => {
      const states = Object.values(ServerState);
      states.forEach(state => {
        expect(SERVER_STATE_VISUALS[state]).toBeDefined();
      });
    });

    it('should have correct NotStarted visuals', () => {
      const visuals = SERVER_STATE_VISUALS[ServerState.NotStarted];
      expect(visuals.icon).toBe('$(circle-outline)');
      expect(visuals.color).toBeUndefined(); // Uses theme default for readability
      expect(visuals.tooltipSuffix).toContain('Not Started');
    });

    it('should have correct Starting visuals with animation', () => {
      const visuals = SERVER_STATE_VISUALS[ServerState.Starting];
      expect(visuals.icon).toBe('$(sync~spin)');
      expect(visuals.color).toBeUndefined(); // Uses theme default for readability
      expect(visuals.tooltipSuffix).toContain('Starting');
    });

    it('should have correct Healthy visuals', () => {
      const visuals = SERVER_STATE_VISUALS[ServerState.Healthy];
      expect(visuals.icon).toBe('$(pass-filled)');
      expect(visuals.color).toBeUndefined(); // Uses theme default for readability
      expect(visuals.tooltipSuffix).toContain('Healthy');
    });

    it('should have correct Error visuals with background color', () => {
      const visuals = SERVER_STATE_VISUALS[ServerState.Error];
      expect(visuals.icon).toBe('$(error)');
      expect(visuals.backgroundColor).toBe('statusBarItem.errorBackground');
      expect(visuals.tooltipSuffix).toContain('Error');
    });

    it('should use valid VS Code codicon format', () => {
      const states = Object.values(ServerState);
      states.forEach(state => {
        const icon = SERVER_STATE_VISUALS[state].icon;
        expect(icon).toMatch(/^\$\([a-z~-]+\)$/);
      });
    });

    it('should only use error background for Error state', () => {
      expect(SERVER_STATE_VISUALS[ServerState.NotStarted].backgroundColor).toBeUndefined();
      expect(SERVER_STATE_VISUALS[ServerState.Starting].backgroundColor).toBeUndefined();
      expect(SERVER_STATE_VISUALS[ServerState.Healthy].backgroundColor).toBeUndefined();
      expect(SERVER_STATE_VISUALS[ServerState.Error].backgroundColor).toBeDefined();
    });

    it('should have hex color format for foreground colors', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      if (SERVER_STATE_VISUALS[ServerState.NotStarted].color) {
        expect(SERVER_STATE_VISUALS[ServerState.NotStarted].color).toMatch(hexColorRegex);
      }
      if (SERVER_STATE_VISUALS[ServerState.Starting].color) {
        expect(SERVER_STATE_VISUALS[ServerState.Starting].color).toMatch(hexColorRegex);
      }
      if (SERVER_STATE_VISUALS[ServerState.Healthy].color) {
        expect(SERVER_STATE_VISUALS[ServerState.Healthy].color).toMatch(hexColorRegex);
      }
    });
  });

  describe('isServerState type guard', () => {
    it('should return true for valid ServerState values', () => {
      expect(isServerState('not_started')).toBe(true);
      expect(isServerState('starting')).toBe(true);
      expect(isServerState('healthy')).toBe(true);
      expect(isServerState('error')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isServerState('invalid')).toBe(false);
      expect(isServerState('HEALTHY')).toBe(false);
      expect(isServerState('not-started')).toBe(false);
      expect(isServerState('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isServerState(123)).toBe(false);
      expect(isServerState(null)).toBe(false);
      expect(isServerState(undefined)).toBe(false);
      expect(isServerState({})).toBe(false);
      expect(isServerState([])).toBe(false);
      expect(isServerState(true)).toBe(false);
    });

    it('should correctly narrow type in TypeScript', () => {
      const value: unknown = 'healthy';
      if (isServerState(value)) {
        // TypeScript should know value is ServerState here
        const visuals = SERVER_STATE_VISUALS[value];
        expect(visuals).toBeDefined();
      }
    });
  });

  describe('StateVisuals interface', () => {
    it('should allow valid visual configurations', () => {
      const visuals: StateVisuals = {
        icon: '$(check)',
        color: '#00FF00',
        backgroundColor: 'statusBarItem.errorBackground',
        tooltipSuffix: 'Test suffix'
      };
      expect(visuals.icon).toBe('$(check)');
    });

    it('should allow minimal visual config with only icon', () => {
      const visuals: StateVisuals = {
        icon: '$(server)'
      };
      expect(visuals.icon).toBe('$(server)');
      expect(visuals.color).toBeUndefined();
      expect(visuals.backgroundColor).toBeUndefined();
      expect(visuals.tooltipSuffix).toBeUndefined();
    });
  });

  describe('StateVisualsMap type', () => {
    it('should enforce mapping for all enum values', () => {
      const map: StateVisualsMap = {
        [ServerState.NotStarted]: { icon: '$(server)' },
        [ServerState.Starting]: { icon: '$(sync~spin)' },
        [ServerState.Healthy]: { icon: '$(check)' },
        [ServerState.Error]: { icon: '$(error)' }
      };
      expect(Object.keys(map)).toHaveLength(4);
    });
  });
});
