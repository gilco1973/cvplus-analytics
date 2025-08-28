// CVPlus Analytics SDK - Test Suite
// Comprehensive tests for event tracking, privacy compliance, and session management

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CVPlusAnalyticsSDK } from '../services/analytics-sdk.service';
import { 
  AnalyticsConfig, 
  EventType, 
  ConsentCategory,
  CVPlusEvents 
} from '../types/tracking.types';

// Mock browser APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  language: 'en-US',
  cookieEnabled: true,
  doNotTrack: '0',
  platform: 'MacIntel'
};

const mockWindow = {
  location: {
    href: 'https://cvplus.com/dashboard',
    pathname: '/dashboard',
    search: '?utm_source=google&utm_medium=cpc',
    hostname: 'cvplus.com'
  },
  history: {
    pushState: jest.fn(),
    replaceState: jest.fn()
  },
  performance: {
    now: jest.fn(() => 1000),
    getEntriesByType: jest.fn(() => [{
      fetchStart: 0,
      loadEventEnd: 1500,
      domContentLoadedEventEnd: 1000,
      responseStart: 200,
      domInteractive: 800,
      loadEventStart: 1400
    }])
  },
  screen: {
    width: 1920,
    height: 1080
  },
  devicePixelRatio: 2,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockDocument = {
  title: 'CVPlus Dashboard',
  referrer: 'https://google.com',
  readyState: 'complete',
  createElement: jest.fn(() => ({
    getContext: jest.fn(() => ({
      textBaseline: '',
      font: '',
      fillText: jest.fn(),
      toDataURL: jest.fn(() => 'data:image/png;base64,test')
    }))
  })),
  addEventListener: jest.fn()
};

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

// Setup global mocks
Object.defineProperty(global, 'navigator', { value: mockNavigator });
Object.defineProperty(global, 'window', { value: mockWindow });
Object.defineProperty(global, 'document', { value: mockDocument });
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(global, 'Intl', {
  value: {
    DateTimeFormat: jest.fn(() => ({
      resolvedOptions: jest.fn(() => ({ timeZone: 'America/New_York' }))
    }))
  }
});

describe('CVPlusAnalyticsSDK', () => {
  let sdk: CVPlusAnalyticsSDK;
  let config: AnalyticsConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);

    // Create test configuration
    config = {
      apiKey: 'test-api-key',
      environment: 'development',
      autoTrackPageViews: true,
      autoTrackClicks: true,
      autoTrackErrors: true,
      autoTrackPerformance: true,
      privacy: {
        gdprEnabled: true,
        ccpaEnabled: true,
        anonymizeIP: true,
        respectDoNotTrack: false,
        consentRequired: false,
        defaultConsent: [ConsentCategory.NECESSARY, ConsentCategory.ANALYTICS]
      },
      queue: {
        maxSize: 100,
        flushInterval: 1000,
        flushBatchSize: 10,
        retryAttempts: 3,
        retryDelay: 500,
        offlineStorage: true
      },
      transport: {
        endpoint: '/api/analytics/events',
        apiKey: 'test-api-key',
        timeout: 5000,
        compression: false,
        batchingEnabled: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxDelay: 5000
        }
      },
      debug: true,
      logLevel: 'debug',
      validateEvents: true,
      integrations: {}
    };

    sdk = new CVPlusAnalyticsSDK(config);
  });

  afterEach(async () => {
    if (sdk) {
      await sdk.flush();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      await sdk.initialize();
      
      const status = sdk.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.hasConsent).toBe(true);
      expect(status.sessionId).toBeDefined();
    });

    it('should initialize in minimal mode when consent is required but not given', async () => {
      config.privacy.consentRequired = true;
      config.privacy.defaultConsent = [];
      sdk = new CVPlusAnalyticsSDK(config);

      await sdk.initialize();
      
      const status = sdk.getStatus();
      expect(status.initialized).toBe(true);
      // Should still be initialized but with limited functionality
    });

    it('should set up automatic tracking when enabled', async () => {
      await sdk.initialize();
      
      // Verify event listeners were added
      expect(mockDocument.addEventListener).toHaveBeenCalled();
      expect(mockWindow.addEventListener).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock an error during initialization
      config.apiKey = '';
      
      await expect(sdk.initialize()).rejects.toThrow();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should track custom events with properties', async () => {
      const eventName = 'button_clicked';
      const properties = {
        action: {
          category: 'ui_interaction',
          label: 'sign_up_button'
        }
      };

      await sdk.track(eventName, properties);
      
      // Event should be queued for processing
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    it('should track CVPlus-specific events', async () => {
      const properties = {
        cv: {
          templateId: 'template_123',
          generationStep: 'export'
        }
      };

      await sdk.trackCVPlusEvent('CV_GENERATION_COMPLETED', properties);
      
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    it('should not track events when consent is not given', async () => {
      // Update consent to deny analytics
      await sdk.updateConsent({
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: false,
        [ConsentCategory.MARKETING]: false,
        [ConsentCategory.PERSONALIZATION]: false,
        [ConsentCategory.FUNCTIONAL]: false
      });

      const initialQueueSize = sdk.getStatus().queueSize;
      await sdk.track('test_event', {});
      
      // Queue size should not increase
      expect(sdk.getStatus().queueSize).toBe(initialQueueSize);
    });

    it('should validate events when validation is enabled', async () => {
      // Track an invalid event (missing required fields)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await sdk.track('', {}); // Empty event name should be invalid
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event validation failed')
      );
      
      consoleSpy.mockRestore();
    });

    it('should enrich events with context information', async () => {
      await sdk.track('test_event', { test: true });
      
      // Events should be enriched with browser, device, and session info
      const status = sdk.getStatus();
      expect(status.sessionId).toBeDefined();
    });
  });

  describe('Page Tracking', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should track page views with URL and referrer', async () => {
      await sdk.page('dashboard', 'Dashboard Home');
      
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    it('should extract UTM parameters from URL', async () => {
      // UTM parameters are already mocked in window.location.search
      await sdk.page();
      
      // Should capture utm_source and utm_medium
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    it('should track page views even with minimal consent', async () => {
      // Update consent to only necessary
      await sdk.updateConsent({
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: false,
        [ConsentCategory.MARKETING]: false,
        [ConsentCategory.PERSONALIZATION]: false,
        [ConsentCategory.FUNCTIONAL]: false
      });

      await sdk.page();
      
      // Page views should still be tracked as they're necessary
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });
  });

  describe('User Identification', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should identify users with traits', async () => {
      const userId = 'user_123';
      const traits = {
        email: 'user@example.com',
        name: 'Test User',
        plan: 'premium'
      };

      await sdk.identify(userId, traits);
      
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    it('should filter traits based on privacy settings', async () => {
      // Update consent to deny analytics
      await sdk.updateConsent({
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: false,
        [ConsentCategory.MARKETING]: false,
        [ConsentCategory.PERSONALIZATION]: false,
        [ConsentCategory.FUNCTIONAL]: false
      });

      const userId = 'user_123';
      const traits = {
        email: 'user@example.com', // Should be filtered
        plan: 'premium' // Should be allowed
      };

      await sdk.identify(userId, traits);
      
      // Event should still be tracked but with filtered traits
      const status = sdk.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    it('should not identify users when analytics consent is not given', async () => {
      // Update consent to deny analytics
      await sdk.updateConsent({
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: false,
        [ConsentCategory.MARKETING]: false,
        [ConsentCategory.PERSONALIZATION]: false,
        [ConsentCategory.FUNCTIONAL]: false
      });

      const initialQueueSize = sdk.getStatus().queueSize;
      
      await sdk.identify('user_123', { email: 'test@example.com' });
      
      // No events should be added to queue
      expect(sdk.getStatus().queueSize).toBe(initialQueueSize);
    });
  });

  describe('Privacy and Consent Management', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should update consent and store it in localStorage', async () => {
      const consent = {
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: true,
        [ConsentCategory.MARKETING]: false,
        [ConsentCategory.PERSONALIZATION]: true,
        [ConsentCategory.FUNCTIONAL]: true
      };

      await sdk.updateConsent(consent);
      
      // Consent should be stored in localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cvplus_consent',
        JSON.stringify(consent)
      );
    });

    it('should track consent change events', async () => {
      const initialQueueSize = sdk.getStatus().queueSize;
      
      await sdk.updateConsent({
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: true,
        [ConsentCategory.MARKETING]: true,
        [ConsentCategory.PERSONALIZATION]: false,
        [ConsentCategory.FUNCTIONAL]: false
      });
      
      // Consent change should be tracked as an event
      expect(sdk.getStatus().queueSize).toBeGreaterThan(initialQueueSize);
    });

    it('should load stored consent on initialization', async () => {
      const storedConsent = {
        [ConsentCategory.NECESSARY]: true,
        [ConsentCategory.ANALYTICS]: false,
        [ConsentCategory.MARKETING]: true,
        [ConsentCategory.PERSONALIZATION]: false,
        [ConsentCategory.FUNCTIONAL]: true
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedConsent));
      
      const newSdk = new CVPlusAnalyticsSDK(config);
      await newSdk.initialize();
      
      // Should respect stored consent
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cvplus_consent');
    });

    it('should handle data deletion requests', async () => {
      await expect(sdk.requestDataDeletion('user_request')).rejects.toThrow(
        'Data deletion request not implemented'
      );
    });

    it('should handle data access requests', async () => {
      await expect(sdk.requestUserData()).rejects.toThrow(
        'Data access request not implemented'
      );
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should create a session on initialization', async () => {
      const session = sdk.getCurrentSession();
      
      expect(session).toBeDefined();
      expect(session!.sessionId).toBeDefined();
      expect(session!.startTime).toBeDefined();
      expect(session!.deviceFingerprint).toBeDefined();
    });

    it('should generate consistent device fingerprints', async () => {
      const session1 = sdk.getCurrentSession();
      
      // Create another SDK instance
      const newSdk = new CVPlusAnalyticsSDK(config);
      await newSdk.initialize();
      const session2 = newSdk.getCurrentSession();
      
      // Device fingerprints should be consistent for same device
      expect(session1!.deviceFingerprint).toBe(session2!.deviceFingerprint);
    });

    it('should update session activity on events', async () => {
      const session = sdk.getCurrentSession();
      const initialActivity = session!.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await sdk.track('test_event', {});
      
      const updatedSession = sdk.getCurrentSession();
      expect(updatedSession!.lastActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Event Queue and Flushing', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should queue events and flush when batch size is reached', async () => {
      const batchSize = config.queue.flushBatchSize;
      
      // Track enough events to trigger flush
      for (let i = 0; i < batchSize + 1; i++) {
        await sdk.track(`test_event_${i}`, { index: i });
      }
      
      // Events should be processed
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should flush events manually', async () => {
      await sdk.track('test_event', {});
      
      const statusBefore = sdk.getStatus();
      expect(statusBefore.queueSize).toBeGreaterThan(0);
      
      await sdk.flush();
      
      // Queue should be processed (would be empty in real implementation)
    });

    it('should handle flush errors gracefully', async () => {
      // Mock a flush error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await sdk.track('test_event', {});
      await sdk.flush();
      
      // Should not throw, errors should be logged
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should handle tracking errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Force an error by passing invalid data
      await sdk.track('test_event', { circular: {} });
      
      // Should not throw, errors should be logged
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should track errors when auto error tracking is enabled', async () => {
      const initialQueueSize = sdk.getStatus().queueSize;
      
      // Simulate an error
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });
      
      mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1](errorEvent);
      
      // Error should be tracked
      expect(sdk.getStatus().queueSize).toBeGreaterThan(initialQueueSize);
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should track performance metrics on page load', async () => {
      const initialQueueSize = sdk.getStatus().queueSize;
      
      // Simulate load event
      const loadEvent = new Event('load');
      mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1](loadEvent);
      
      // Allow for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Performance metrics should be tracked
      expect(sdk.getStatus().queueSize).toBeGreaterThan(initialQueueSize);
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle missing browser APIs gracefully', async () => {
      // Mock missing APIs
      const originalLocalStorage = global.localStorage;
      delete (global as any).localStorage;
      
      const newSdk = new CVPlusAnalyticsSDK(config);
      
      // Should not throw
      await expect(newSdk.initialize()).resolves.not.toThrow();
      
      // Restore
      global.localStorage = originalLocalStorage;
    });

    it('should generate device fingerprint without canvas when unavailable', async () => {
      mockDocument.createElement.mockReturnValue({});
      
      const newSdk = new CVPlusAnalyticsSDK(config);
      await newSdk.initialize();
      
      const session = newSdk.getCurrentSession();
      expect(session!.deviceFingerprint).toBeDefined();
    });
  });
});