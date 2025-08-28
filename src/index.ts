// CVPlus Analytics Module - Comprehensive Analytics Platform
// Advanced analytics, privacy compliance, A/B testing, and business intelligence

// Core Analytics SDK
export { CVPlusAnalyticsSDK } from './services/analytics-sdk.service';

// Privacy & Compliance
export { default as PrivacyComplianceService } from './services/privacy-compliance.service';

// A/B Testing & Experimentation
export { default as ABTestingService } from './services/ab-testing.service';

// Business Intelligence & Dashboards
export { default as BusinessIntelligenceService } from './services/business-intelligence.service';

// Legacy Services (for backward compatibility)
export { 
  RevenueAnalyticsService,
  revenueAnalyticsService,
  type DateRange,
  type RevenueMetrics as AnalyticsRevenueMetrics,
  type CohortData,
  type GrowthData
} from './services/revenue-analytics.service';

export {
  CohortAnalysisService,
  cohortAnalysisService,
  type CohortAnalysisParams,
  type CohortMetrics as AnalyticsCohortMetrics,
  type CohortPeriod,
  type CohortComparison
} from './services/cohort-analysis.service';

// Functions
export { getRevenueMetrics } from './functions/getRevenueMetrics';

// Comprehensive Type Exports
export * from './types';

// Constants
export * from './constants';

// Utils
export * from './utils';

// Main Analytics Service - Enhanced with new capabilities
export class AnalyticsService {
  private static initialized = false;
  private static sdkInstance: CVPlusAnalyticsSDK | null = null;
  private static privacyService: PrivacyComplianceService | null = null;
  private static abTestingService: ABTestingService | null = null;
  private static biService: BusinessIntelligenceService | null = null;
  
  /**
   * Initialize the comprehensive analytics platform
   */
  static async initialize(config?: {
    apiKey?: string;
    environment?: 'development' | 'staging' | 'production';
    privacy?: {
      gdprEnabled?: boolean;
      ccpaEnabled?: boolean;
      consentRequired?: boolean;
    };
    autoTracking?: {
      pageViews?: boolean;
      clicks?: boolean;
      errors?: boolean;
      performance?: boolean;
    };
  }) {
    if (this.initialized) {
      console.warn('[CVPlus Analytics] Service already initialized');
      return;
    }

    try {
      // Initialize SDK with configuration
      if (config?.apiKey) {
        const { CVPlusAnalyticsSDK } = await import('./services/analytics-sdk.service');
        this.sdkInstance = new CVPlusAnalyticsSDK({
          apiKey: config.apiKey,
          environment: config.environment || 'development',
          autoTrackPageViews: config.autoTracking?.pageViews !== false,
          autoTrackClicks: config.autoTracking?.clicks !== false,
          autoTrackErrors: config.autoTracking?.errors !== false,
          autoTrackPerformance: config.autoTracking?.performance !== false,
          privacy: {
            gdprEnabled: config.privacy?.gdprEnabled !== false,
            ccpaEnabled: config.privacy?.ccpaEnabled !== false,
            anonymizeIP: true,
            respectDoNotTrack: true,
            consentRequired: config.privacy?.consentRequired !== false,
            defaultConsent: []
          },
          queue: {
            maxSize: 1000,
            flushInterval: 5000,
            flushBatchSize: 50,
            retryAttempts: 3,
            retryDelay: 1000,
            offlineStorage: true
          },
          transport: {
            endpoint: '/api/analytics/events',
            apiKey: config.apiKey,
            timeout: 10000,
            compression: true,
            batchingEnabled: true,
            retryConfig: {
              maxRetries: 3,
              backoffMultiplier: 2,
              maxDelay: 10000
            }
          },
          debug: config.environment === 'development',
          logLevel: 'info',
          validateEvents: true,
          integrations: {}
        });

        await this.sdkInstance.initialize();
      }

      // Initialize Privacy Service
      const PrivacyService = (await import('./services/privacy-compliance.service')).default;
      this.privacyService = new PrivacyService({
        requiredCategories: [],
        optionalCategories: [],
        purposeMapping: {},
        ui: {
          showBanner: true,
          showModal: false,
          showPreferenceCenter: true,
          allowGranularControl: true,
          rememberChoice: true,
          recheckInterval: 365
        },
        legalBasis: {},
        retentionPolicies: {}
      });
      await this.privacyService.initialize();

      // Initialize A/B Testing Service
      const ABTestingServiceClass = (await import('./services/ab-testing.service')).default;
      this.abTestingService = new ABTestingServiceClass();
      await this.abTestingService.initialize();

      // Initialize Business Intelligence Service
      const BIServiceClass = (await import('./services/business-intelligence.service')).default;
      this.biService = new BIServiceClass();
      await this.biService.initialize();

      this.initialized = true;
      
      console.log('[CVPlus Analytics] Platform initialized successfully');
      
    } catch (error) {
      console.error('[CVPlus Analytics] Failed to initialize platform:', error);
      throw error;
    }
  }
  
  /**
   * Get the analytics SDK instance
   */
  static getSDK(): CVPlusAnalyticsSDK | null {
    return this.sdkInstance;
  }

  /**
   * Get the privacy compliance service
   */
  static getPrivacyService(): PrivacyComplianceService | null {
    return this.privacyService;
  }

  /**
   * Get the A/B testing service
   */
  static getABTestingService(): ABTestingService | null {
    return this.abTestingService;
  }

  /**
   * Get the business intelligence service
   */
  static getBIService(): BusinessIntelligenceService | null {
    return this.biService;
  }

  /**
   * Check if the service is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Track an event (convenience method)
   */
  static async track(eventName: string, properties?: any): Promise<void> {
    if (!this.sdkInstance) {
      console.warn('[CVPlus Analytics] SDK not initialized');
      return;
    }
    
    await this.sdkInstance.track(eventName, properties);
  }

  /**
   * Track a page view (convenience method)
   */
  static async page(category?: string, name?: string, properties?: any): Promise<void> {
    if (!this.sdkInstance) {
      console.warn('[CVPlus Analytics] SDK not initialized');
      return;
    }
    
    await this.sdkInstance.page(category, name, properties);
  }

  /**
   * Identify a user (convenience method)
   */
  static async identify(userId: string, traits?: any): Promise<void> {
    if (!this.sdkInstance) {
      console.warn('[CVPlus Analytics] SDK not initialized');
      return;
    }
    
    await this.sdkInstance.identify(userId, traits);
  }

  /**
   * Update privacy consent (convenience method)
   */
  static async updateConsent(consent: Record<string, boolean>): Promise<void> {
    if (!this.sdkInstance) {
      console.warn('[CVPlus Analytics] SDK not initialized');
      return;
    }
    
    await this.sdkInstance.updateConsent(consent as any);
  }

  /**
   * Get A/B test variant assignment (convenience method)
   */
  static async getVariant(experimentId: string, userId: string, context?: any): Promise<any> {
    if (!this.abTestingService) {
      console.warn('[CVPlus Analytics] A/B Testing service not initialized');
      return null;
    }
    
    return await this.abTestingService.getVariantAssignment(experimentId, userId, context);
  }

  /**
   * Get platform status
   */
  static getStatus() {
    return {
      initialized: this.initialized,
      services: {
        sdk: !!this.sdkInstance,
        privacy: !!this.privacyService,
        abTesting: !!this.abTestingService,
        businessIntelligence: !!this.biService
      },
      sdkStatus: this.sdkInstance?.getStatus()
    };
  }

  /**
   * Shutdown the analytics platform
   */
  static async shutdown(): Promise<void> {
    if (this.sdkInstance) {
      await this.sdkInstance.flush();
    }
    
    this.initialized = false;
    this.sdkInstance = null;
    this.privacyService = null;
    this.abTestingService = null;
    this.biService = null;
    
    console.log('[CVPlus Analytics] Platform shutdown complete');
  }
}

// Version
export const VERSION = '2.0.0';

// Platform Constants
export const ANALYTICS_PLATFORM = {
  NAME: 'CVPlus Analytics',
  VERSION,
  FEATURES: [
    'Event Tracking',
    'Privacy Compliance (GDPR/CCPA)',
    'A/B Testing & Experimentation',
    'Business Intelligence & Dashboards',
    'Predictive Analytics',
    'Real-time Processing',
    'Custom Reporting'
  ],
  INTEGRATIONS: [
    'Google Analytics 4',
    'Mixpanel',
    'Amplitude',
    'BigQuery',
    'Firebase'
  ]
};