import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as vscode from 'vscode';
import { ServerStatusBarIndicator } from '../../components/ServerStatusBarIndicator';
import { ServerIndicatorConfig } from '../../types/ServerIndicatorConfig';
import {
  PortConflictError,
  HealthCheckTimeoutError
} from '../../types/ServerIndicatorErrors';

// Type definitions for mocks
type MockHealthCheckPoller = {
  start: jest.Mock<() => void>;
  dispose: jest.Mock<() => void>;
  getConsecutiveFailures: jest.Mock<() => number>;
  getIsRunning: jest.Mock<() => boolean>;
  onHealthChange: (isHealthy: boolean) => void;
};

type MockServerLifecycleManager = {
  start: jest.Mock<(config: ServerIndicatorConfig) => Promise<void>>;
  stop: jest.Mock<(config: ServerIndicatorConfig) => Promise<void>>;
  restart: jest.Mock<(config: ServerIndicatorConfig) => Promise<void>>;
  waitForHealthy: jest.Mock<(config: ServerIndicatorConfig, timeout?: number, interval?: number) => Promise<void>>;
};

// Mock vscode module
jest.mock('vscode');

// Mock HealthCheckPoller
let mockPollers: MockHealthCheckPoller[] = [];
jest.mock('../../services/HealthCheckPoller', () => ({
  HealthCheckPoller: jest.fn().mockImplementation((
    _url: string,
    _interval: number,
    onHealthChange: (isHealthy: boolean) => void
  ) => {
    const mockPoller: MockHealthCheckPoller = {
      start: jest.fn<() => void>(),
      dispose: jest.fn<() => void>(),
      getConsecutiveFailures: jest.fn<() => number>(() => 0),
      getIsRunning: jest.fn<() => boolean>(() => true),
      onHealthChange
    };
    mockPollers.push(mockPoller);
    return mockPoller;
  }) as unknown as jest.Mock
}));

// Mock ServerLifecycleManager
let mockManagers: MockServerLifecycleManager[] = [];
jest.mock('../../services/ServerLifecycleManager', () => ({
  ServerLifecycleManager: jest.fn().mockImplementation(() => {
    const mockManager: MockServerLifecycleManager = {
      start: jest.fn<(config: ServerIndicatorConfig) => Promise<void>>(),
      stop: jest.fn<(config: ServerIndicatorConfig) => Promise<void>>(),
      restart: jest.fn<(config: ServerIndicatorConfig) => Promise<void>>(),
      waitForHealthy: jest.fn<(config: ServerIndicatorConfig, timeout?: number, interval?: number) => Promise<void>>()
    };
    mockManagers.push(mockManager);
    return mockManager;
  })
}));

describe('ServerStatusBarIndicator', () => {
  let mockStatusBarItem: {
    text: string;
    tooltip: string;
    color: string | undefined;
    backgroundColor: vscode.ThemeColor | undefined;
    command: string;
    show: jest.Mock;
    hide: jest.Mock;
    dispose: jest.Mock;
  };

  let mockConfig: ServerIndicatorConfig;
  let indicator: ServerStatusBarIndicator | null;

  beforeEach(() => {
    // Reset mock arrays
    mockPollers = [];
    mockManagers = [];

    // Create mock StatusBarItem
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      color: undefined,
      backgroundColor: undefined,
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };

    // Mock vscode.window.createStatusBarItem
    (vscode.window.createStatusBarItem as unknown as jest.Mock) = jest.fn(() => mockStatusBarItem);

    // Mock vscode.commands.registerCommand
    (vscode.commands.registerCommand as unknown as jest.Mock) = jest.fn();

    // Mock vscode.ThemeColor
    (vscode.ThemeColor as unknown as jest.Mock) = jest.fn((color: string) => ({ color })) as unknown as jest.Mock;

    // Mock vscode.window.showQuickPick
    (vscode.window.showQuickPick as unknown as jest.Mock) = jest.fn() as unknown as jest.Mock;

    // Mock vscode.window.showErrorMessage
    (vscode.window.showErrorMessage as unknown as jest.Mock) = jest.fn(() => Promise.resolve(undefined));

    // Create test config
    mockConfig = {
      name: 'Test Server',
      healthCheckUrl: 'http://localhost:8080/health',
      pollInterval: 5000,
      onStart: jest.fn<() => Promise<void>>(),
      onStop: jest.fn<() => Promise<void>>()
    };

    indicator = null;

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (indicator) {
      indicator.dispose();
      indicator = null;
    }
  });

  describe('Initialization', () => {
    it('should create status bar item with correct alignment and priority', () => {
      indicator = new ServerStatusBarIndicator(mockConfig, 100);

      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        100
      );
    });

    it('should register command with generated ID', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'debrief.test-server.showMenu',
        expect.any(Function)
      );
    });

    it('should set initial state to NotStarted', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      expect(mockStatusBarItem.text).toContain('$(server)');
      expect(mockStatusBarItem.text).toContain('Test Server');
    });

    it('should show status bar item on creation', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should set command on status bar item', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      expect(mockStatusBarItem.command).toBe('debrief.test-server.showMenu');
    });
  });

  describe('Visual Updates', () => {
    it('should update icon for NotStarted state', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      expect(mockStatusBarItem.text).toContain('$(server)');
      expect(mockStatusBarItem.color).toBe('#858585');
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
    });

    it('should update icon and color for Starting state', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      // Trigger start (will fail immediately due to mock)
      await indicator.start().catch(() => { /* Expected to fail */ });

      // State should be Starting initially
      expect(mockStatusBarItem.text).toContain('$(sync~spin)');
      expect(mockStatusBarItem.color).toBe('#FFA500');
    });

    it('should update tooltip based on state', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      expect(mockStatusBarItem.tooltip).toContain('Not Started - Click to start');
    });

    it('should set background color for Error state', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      // Get current manager and make it fail
      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockRejectedValue(new Error('Test error'));

      // Start will fail and set Error state
      await indicator.start().catch(() => { /* Expected */ });

      // Check that background was set (timing may vary)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockStatusBarItem.backgroundColor).toBeDefined();
    });
  });

  describe('State Transitions', () => {
    it('should transition from NotStarted to Starting on start', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      const startPromise = indicator.start();

      // Should show Starting state immediately
      expect(mockStatusBarItem.text).toContain('$(sync~spin)');

      await startPromise;
    });

    it('should transition to Healthy after successful start', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      expect(mockStatusBarItem.text).toContain('$(check)');
      expect(mockStatusBarItem.color).toBe('#00FF00');
    });

    it('should transition to NotStarted after stop', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      await indicator.stop();

      expect(mockStatusBarItem.text).toContain('$(server)');
      expect(mockStatusBarItem.color).toBe('#858585');
    });
  });

  describe('Polling Lifecycle', () => {
    it('should start polling after successful server start', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      // HealthCheckPoller should be created
      expect(mockPollers.length).toBeGreaterThan(0);
      const pollerInstance = mockPollers[mockPollers.length - 1];
      expect(pollerInstance.start).toHaveBeenCalled();
    });

    it('should dispose poller on stop', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      const pollerInstance = mockPollers[mockPollers.length - 1];

      await indicator.stop();

      expect(pollerInstance.dispose).toHaveBeenCalled();
    });

    it('should use configured poll interval', async () => {
      mockConfig.pollInterval = 3000;
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      // Check that poller was created with correct interval
      const { HealthCheckPoller } = require('../../services/HealthCheckPoller');
      expect(HealthCheckPoller).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        3000,
        expect.any(Function),
        3
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle port conflict errors', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      const portError = new PortConflictError('Test Server', 8080);
      currentManager.start.mockRejectedValue(portError);

      await indicator.start();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Port 8080 is already in use'),
        'Change Port',
        'Show Details'
      );

      expect(mockStatusBarItem.text).toContain('$(error)');
    });

    it('should handle health check timeout errors', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockRejectedValue(
        new HealthCheckTimeoutError('Test Server', 30000)
      );

      await indicator.start();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('did not respond within 30s'),
        'Show Logs',
        'Retry'
      );

      expect(mockStatusBarItem.text).toContain('$(error)');
    });

    it('should handle generic errors', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockRejectedValue(new Error('Generic failure'));

      await indicator.start();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Generic failure'),
        'Show Details'
      );

      expect(mockStatusBarItem.text).toContain('$(error)');
    });
  });

  describe('QuickPick Menu', () => {
    it('should show Start option in NotStarted state', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const mockQuickPickItems: vscode.QuickPickItem[] = [];
      (vscode.window.showQuickPick as unknown as jest.Mock).mockImplementation((items: vscode.QuickPickItem[]) => {
        mockQuickPickItems.push(...items);
        return Promise.resolve(undefined);
      });

      await indicator.showMenu();

      expect(mockQuickPickItems.some(item => item.label.includes('Start Server'))).toBe(true);
    });

    it('should show Stop and Restart options in Healthy state', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      // Set to Healthy state
      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      const mockQuickPickItems: vscode.QuickPickItem[] = [];
      (vscode.window.showQuickPick as unknown as jest.Mock).mockImplementation((items: vscode.QuickPickItem[]) => {
        mockQuickPickItems.push(...items);
        return Promise.resolve(undefined);
      });

      await indicator.showMenu();

      expect(mockQuickPickItems.some(item => item.label.includes('Stop Server'))).toBe(true);
      expect(mockQuickPickItems.some(item => item.label.includes('Restart Server'))).toBe(true);
    });

    it('should show Open Web UI option when callback exists', async () => {
      mockConfig.onOpenWebUI = jest.fn<() => void>();
      indicator = new ServerStatusBarIndicator(mockConfig);

      // Set to Healthy state
      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      const mockQuickPickItems: vscode.QuickPickItem[] = [];
      (vscode.window.showQuickPick as unknown as jest.Mock).mockImplementation((items: vscode.QuickPickItem[]) => {
        mockQuickPickItems.push(...items);
        return Promise.resolve(undefined);
      });

      await indicator.showMenu();

      expect(mockQuickPickItems.some(item => item.label.includes('Open Web UI'))).toBe(true);
    });

    it('should show Details option when callback exists', async () => {
      mockConfig.onShowDetails = jest.fn<() => void>();
      indicator = new ServerStatusBarIndicator(mockConfig);

      const mockQuickPickItems: vscode.QuickPickItem[] = [];
      (vscode.window.showQuickPick as unknown as jest.Mock).mockImplementation((items: vscode.QuickPickItem[]) => {
        mockQuickPickItems.push(...items);
        return Promise.resolve(undefined);
      });

      await indicator.showMenu();

      expect(mockQuickPickItems.some(item => item.label.includes('Show Details'))).toBe(true);
    });

    it('should execute start action when selected', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      (vscode.window.showQuickPick as unknown as jest.Mock).mockResolvedValue({
        label: '$(play) Start Server'
      } as vscode.QuickPickItem);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.showMenu();

      expect(currentManager.start).toHaveBeenCalled();
    });
  });

  describe('Resource Disposal', () => {
    it('should dispose status bar item', () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      indicator.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should dispose poller if running', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.start();

      const pollerInstance = mockPollers[mockPollers.length - 1];

      indicator.dispose();

      expect(pollerInstance.dispose).toHaveBeenCalled();
    });
  });

  describe('Server Operations', () => {
    it('should call lifecycleManager.start during start', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.start.mockRejectedValue(new Error('test'));

      await indicator.start().catch(() => { /* Expected */ });

      expect(currentManager.start).toHaveBeenCalledWith(mockConfig);
    });

    it('should call lifecycleManager.stop during stop', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];

      await indicator.stop();

      expect(currentManager.stop).toHaveBeenCalledWith(mockConfig);
    });

    it('should call lifecycleManager.restart during restart', async () => {
      indicator = new ServerStatusBarIndicator(mockConfig);

      const currentManager = mockManagers[mockManagers.length - 1];
      currentManager.restart.mockResolvedValue(undefined);
      currentManager.waitForHealthy.mockResolvedValue(undefined);

      await indicator.restart();

      expect(currentManager.restart).toHaveBeenCalledWith(mockConfig);
    });
  });
});
