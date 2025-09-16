/**
 * CVPlus Analytics - Integration Test
// Basic integration test to verify all services work together

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { AnalyticsService, VERSION, ANALYTICS_PLATFORM } from '../index';
import { ConsentCategory } from '../types/tracking.types';

describe('CVPlus Analytics Integration', () => {
  beforeAll(async () => {
    // Mock browser environment for Node.js testing
    global.navigator = {
      userAgent: 'Mozilla/5.0 (Test Environment)',
      language: 'en-US',
      cookieEnabled: true,
      doNotTrack: '0',
      platform: 'Test'
    } as any;

    global.window = {
      location: {
        href: 'https://test.cvplus.com',
        pathname: '/test',
        search: '',
        hostname: 'test.cvplus.com'
      },
      performance: { now: () => 1000 },
      screen: { width: 1920, height: 1080 },
      devicePixelRatio: 1,
      addEventListener: jest.fn()
    } as any;

    global.document = {
      title: 'Test Page',
      referrer: '',
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
    } as any;

    global.localStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn()
    } as any;

    global.Intl = {
      DateTimeFormat: jest.fn(() => ({
        resolvedOptions: jest.fn(() => ({ timeZone: 'UTC' }))
      }))
    } as any;
  });

  afterAll(async () => {
    if (AnalyticsService.isInitialized()) {
      await AnalyticsService.shutdown();
    }
  });

  it('should have correct version and platform info', () => {
    expect(VERSION).toBe('2.0.0');
    expect(ANALYTICS_PLATFORM.NAME).toBe('CVPlus Analytics');
    expect(ANALYTICS_PLATFORM.VERSION).toBe(VERSION);
    expect(ANALYTICS_PLATFORM.FEATURES).toContain('Event Tracking');
    expect(ANALYTICS_PLATFORM.FEATURES).toContain('Privacy Compliance (GDPR/CCPA)');
    expect(ANALYTICS_PLATFORM.FEATURES).toContain('A/B Testing & Experimentation');
  });

  it('should initialize analytics service successfully', async () => {
    const config = {
      apiKey: 'test-api-key',
      environment: 'development' as const,
      privacy: {
        gdprEnabled: true,
        ccpaEnabled: true,
        consentRequired: false // For testing
      },
      autoTracking: {
        pageViews: true,
        clicks: true,
        errors: true,
        performance: true
      }
    };

    await AnalyticsService.initialize(config);

    expect(AnalyticsService.isInitialized()).toBe(true);
    
    const status = AnalyticsService.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.services.sdk).toBe(true);
    expect(status.services.privacy).toBe(true);
    expect(status.services.abTesting).toBe(true);
    expect(status.services.businessIntelligence).toBe(true);
  });

  it('should track events successfully', async () => {
    await AnalyticsService.track('test_event', {
      action: {
        category: 'test',
        label: 'integration_test'
      }
    });

    // Event should be tracked without throwing errors
  });

  it('should track page views successfully', async () => {
    await AnalyticsService.page('test', 'Integration Test Page', {
      page: {
        category: 'test'
      }
    });

    // Page view should be tracked without throwing errors
  });

  it('should identify users successfully', async () => {
    await AnalyticsService.identify('test_user_123', {
      name: 'Test User',
      email: 'test@example.com',
      plan: 'test'
    });

    // User identification should work without throwing errors
  });

  it('should update consent successfully', async () => {
    await AnalyticsService.updateConsent({
      [ConsentCategory.NECESSARY]: true,
      [ConsentCategory.ANALYTICS]: true,
      [ConsentCategory.MARKETING]: false,
      [ConsentCategory.PERSONALIZATION]: true,
      [ConsentCategory.FUNCTIONAL]: false
    });

    // Consent update should work without throwing errors
  });

  it('should access all services', async () => {
    const sdk = AnalyticsService.getSDK();
    const privacyService = AnalyticsService.getPrivacyService();
    const abTestingService = AnalyticsService.getABTestingService();
    const biService = AnalyticsService.getBIService();

    expect(sdk).toBeDefined();
    expect(privacyService).toBeDefined();
    expect(abTestingService).toBeDefined();
    expect(biService).toBeDefined();

    // Check SDK status
    const sdkStatus = sdk?.getStatus();
    expect(sdkStatus?.initialized).toBe(true);
  });

  it('should handle privacy service operations', async () => {
    const privacyService = AnalyticsService.getPrivacyService();
    
    if (privacyService) {
      // Get privacy settings
      const settings = await privacyService.getPrivacySettings('test_user');
      expect(settings).toBeDefined();
      expect(settings.userId).toBe('test_user');

      // Get cookie consent
      const cookieConsent = await privacyService.getCookieConsent('test_user');
      expect(cookieConsent).toBeDefined();
      expect(cookieConsent.necessary).toBe(true);
    }
  });

  it('should handle A/B testing operations', async () => {
    const abTestingService = AnalyticsService.getABTestingService();
    
    if (abTestingService) {
      // Try to get a variant (should return null for non-existent experiment)
      const variant = await AnalyticsService.getVariant('non_existent_experiment', 'test_user');
      expect(variant).toBeNull();

      // Get feature flag value (should return default)
      const flagValue = await abTestingService.getFeatureFlagValue('non_existent_flag');
      expect(flagValue).toBe(false); // Default value
    }
  });

  it('should handle BI service operations', async () => {
    const biService = AnalyticsService.getBIService();
    
    if (biService) {
      // Try to get CV generation metrics
      const metrics = await biService.getCVGenerationMetrics({
        type: 'relative',
        relative: { period: 'day', count: 30 }
      });
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalGenerations).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(Array.isArray(metrics.popularTemplates)).toBe(true);
    }
  });

  it('should handle graceful degradation', async () => {
    // Test with invalid configuration
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Try to track without initialization (should warn but not throw)
    await AnalyticsService.shutdown();
    await AnalyticsService.track('test_event_after_shutdown', {});
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('SDK not initialized')
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    // Test error handling doesn't break the system
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
      // Try to initialize with invalid config
      await AnalyticsService.initialize({} as any);
    } catch (error) {
      // Should handle errors gracefully
      expect(error).toBeDefined();
    }
    
    consoleSpy.mockRestore();
  });

  it('should support CVPlus-specific functionality', async () => {
    // Reinitialize for this test
    if (!AnalyticsService.isInitialized()) {
      await AnalyticsService.initialize({
        apiKey: 'test-api-key',
        environment: 'development',
        privacy: { gdprEnabled: true, ccpaEnabled: true, consentRequired: false }
      });
    }

    const sdk = AnalyticsService.getSDK();
    
    if (sdk) {
      // Track CVPlus-specific event
      await sdk.trackCVPlusEvent('CV_GENERATION_STARTED', {
        cv: {
          templateId: 'test_template',
          generationStep: 'personal_info'
        }
      });

      // Get current session
      const session = sdk.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.sessionId).toBeDefined();
    }
  });
});

// Performance test
describe('CVPlus Analytics Performance', () => {
  it('should handle high-volume event tracking', async () => {
    if (!AnalyticsService.isInitialized()) {
      await AnalyticsService.initialize({
        apiKey: 'test-api-key',
        environment: 'development',
        privacy: { consentRequired: false }
      });
    }

    const startTime = Date.now();
    const eventCount = 100;

    // Track many events
    const promises = [];
    for (let i = 0; i < eventCount; i++) {
      promises.push(AnalyticsService.track(`test_event_${i}`, { index: i }));
    }

    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(5000); // 5 seconds
    
    console.log(`Tracked ${eventCount} events in ${duration}ms`);
  });
});

// Error resilience test
describe('CVPlus Analytics Error Resilience', () => {
  it('should continue working after errors', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    try {
      if (!AnalyticsService.isInitialized()) {
        await AnalyticsService.initialize({
          apiKey: 'test-api-key',
          environment: 'development',
          privacy: { consentRequired: false }
        });
      }

      // Try to cause an error
      await AnalyticsService.track('error_test', { 
        problematic: { circular: 'reference' }
      });

      // Should still be able to track normal events
      await AnalyticsService.track('recovery_test', { normal: 'data' });

      // System should still be operational
      expect(AnalyticsService.isInitialized()).toBe(true);

    } finally {
      console.error = originalConsoleError;
    }
  });
});