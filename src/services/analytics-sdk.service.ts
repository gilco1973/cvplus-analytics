/**
 * CVPlus Analytics SDK - Main Service Class
// Comprehensive analytics collection and privacy management

import { 
  AnalyticsEvent,
  AnalyticsConfig,
  EventType,
  EventSource,
  ConsentCategory,
  CVPlusEvents,
  EventProperties,
  UserIdentification,
  SessionInfo,
  EventValidationResult,
  EventProcessingResult,
  EventBatch
} from '../types/tracking.types';

import { 
  ConsentRecord,
  PrivacySettings,
  DataSubjectRight,
  DataAccessRequest,
  DataDeletionRequest
} from '../types/privacy.types';

/**
 * Main CVPlus Analytics SDK Class
 * Handles event tracking, privacy management, and user session management
*/
export class CVPlusAnalyticsSDK {
  private config: AnalyticsConfig;
  private sessionManager: SessionManager;
  private privacyManager: PrivacyManager;
  private eventQueue: EventQueue;
  private eventTransport: EventTransport;
  private initialized: boolean = false;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.sessionManager = new SessionManager(config);
    this.privacyManager = new PrivacyManager(config.privacy);
    this.eventQueue = new EventQueue(config.queue);
    this.eventTransport = new EventTransport(config.transport);
  }

  /**
   * Initialize the analytics SDK
  */
  async initialize(): Promise<void> {
    try {
      // Check privacy consent first
      const consentStatus = await this.privacyManager.checkConsent();
      
      if (!consentStatus.hasConsent && this.config.privacy.consentRequired) {
        if (this.config.debug) {
          console.log('[CVPlus Analytics] Consent required but not given, initializing in minimal mode');
        }
        await this.initializeMinimalMode();
        return;
      }

      // Initialize session management
      await this.sessionManager.initialize();
      
      // Set up automatic tracking if enabled
      if (this.config.autoTrackPageViews) {
        this.setupAutoPageTracking();
      }
      
      if (this.config.autoTrackClicks) {
        this.setupAutoClickTracking();
      }
      
      if (this.config.autoTrackErrors) {
        this.setupAutoErrorTracking();
      }
      
      if (this.config.autoTrackPerformance) {
        this.setupAutoPerformanceTracking();
      }

      // Start event processing
      this.eventQueue.startProcessing();
      
      this.initialized = true;
      
      if (this.config.debug) {
        console.log('[CVPlus Analytics] SDK initialized successfully');
      }

    } catch (error) {
      console.error('[CVPlus Analytics] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Track a custom event
  */
  async track(eventName: string, properties: EventProperties = {}): Promise<void> {
    if (!this.initialized) {
      console.warn('[CVPlus Analytics] SDK not initialized, call initialize() first');
      return;
    }

    // Check privacy consent for analytics
    if (!await this.privacyManager.hasConsent(ConsentCategory.ANALYTICS)) {
      if (this.config.debug) {
        console.log('[CVPlus Analytics] Analytics consent not given, skipping event:', eventName);
      }
      return;
    }

    try {
      const event = await this.buildEvent({
        eventName,
        eventType: EventType.TRACK,
        properties
      });

      await this.enqueueEvent(event);

      if (this.config.debug) {
        console.log('[CVPlus Analytics] Event tracked:', eventName, properties);
      }

    } catch (error) {
      console.error('[CVPlus Analytics] Failed to track event:', error);
      if (this.config.autoTrackErrors) {
        this.trackError('event_tracking_failed', error as Error);
      }
    }
  }

  /**
   * Track a page view
  */
  async page(category?: string, name?: string, properties: EventProperties = {}): Promise<void> {
    if (!this.initialized) {
      console.warn('[CVPlus Analytics] SDK not initialized');
      return;
    }

    // Even with minimal consent, page views may be allowed if they're necessary
    const hasConsent = await this.privacyManager.hasConsent(ConsentCategory.NECESSARY) ||
                      await this.privacyManager.hasConsent(ConsentCategory.ANALYTICS);

    if (!hasConsent) {
      return;
    }

    try {
      const pageProperties: EventProperties = {
        ...properties,
        page: {
          title: document.title,
          url: window.location.href,
          path: window.location.pathname,
          referrer: document.referrer,
          search: window.location.search,
          category: category || undefined,
          ...properties.page
        }
      };

      const event = await this.buildEvent({
        eventName: 'page_view',
        eventType: EventType.PAGE,
        properties: pageProperties
      });

      await this.enqueueEvent(event);

      // Update session with page view
      await this.sessionManager.recordPageView(window.location.href);

    } catch (error) {
      console.error('[CVPlus Analytics] Failed to track page view:', error);
    }
  }

  /**
   * Identify a user
  */
  async identify(userId: string, traits: UserIdentification['traits'] = {}): Promise<void> {
    if (!this.initialized) {
      console.warn('[CVPlus Analytics] SDK not initialized');
      return;
    }

    // Check if user identification is allowed
    if (!await this.privacyManager.hasConsent(ConsentCategory.ANALYTICS)) {
      if (this.config.debug) {
        console.log('[CVPlus Analytics] Analytics consent not given for user identification');
      }
      return;
    }

    try {
      // Filter traits based on privacy settings
      const filteredTraits = await this.privacyManager.filterUserTraits(traits);

      const event = await this.buildEvent({
        eventName: 'user_identified',
        eventType: EventType.IDENTIFY,
        properties: {
          traits: filteredTraits
        }
      });

      // Update session with user ID
      await this.sessionManager.setUserId(userId);
      
      await this.enqueueEvent(event);

      if (this.config.debug) {
        console.log('[CVPlus Analytics] User identified:', userId);
      }

    } catch (error) {
      console.error('[CVPlus Analytics] Failed to identify user:', error);
    }
  }

  /**
   * Track CVPlus-specific events with enhanced context
  */
  async trackCVPlusEvent(eventName: keyof typeof CVPlusEvents, properties: EventProperties = {}): Promise<void> {
    const cvPlusEventName = CVPlusEvents[eventName];
    
    // Add CVPlus-specific context
    const enhancedProperties: EventProperties = {
      ...properties,
      cvplus: {
        version: this.config.environment === 'production' ? '1.0.0' : 'dev',
        feature: this.extractFeatureFromEvent(cvPlusEventName),
        ...properties.cvplus
      }
    };

    await this.track(cvPlusEventName, enhancedProperties);
  }

  /**
   * Update privacy consent
  */
  async updateConsent(consent: Record<ConsentCategory, boolean>): Promise<void> {
    await this.privacyManager.updateConsent(consent);
    
    // Reinitialize if consent was granted
    const hasAnalyticsConsent = await this.privacyManager.hasConsent(ConsentCategory.ANALYTICS);
    if (hasAnalyticsConsent && !this.initialized) {
      await this.initialize();
    }

    // Track consent change
    if (this.initialized) {
      await this.track(CVPlusEvents.CONSENT_GRANTED, {
        privacy: {
          consentCategories: Object.keys(consent).filter(key => consent[key as ConsentCategory]),
          consentTimestamp: Date.now()
        }
      });
    }
  }

  /**
   * Request user data (GDPR Article 15 - Right of Access)
  */
  async requestUserData(): Promise<DataAccessRequest> {
    return await this.privacyManager.requestUserData();
  }

  /**
   * Request data deletion (GDPR Article 17 - Right to be Forgotten)
  */
  async requestDataDeletion(reason: string): Promise<DataDeletionRequest> {
    return await this.privacyManager.requestDataDeletion(reason);
  }

  /**
   * Get current session information
  */
  getCurrentSession(): SessionInfo | null {
    return this.sessionManager.getCurrentSession();
  }

  /**
   * Flush pending events immediately
  */
  async flush(): Promise<void> {
    await this.eventQueue.flush();
  }

  /**
   * Get SDK status and configuration
  */
  getStatus() {
    return {
      initialized: this.initialized,
      hasConsent: this.privacyManager.hasMinimalConsent(),
      sessionId: this.sessionManager.getCurrentSession()?.sessionId,
      queueSize: this.eventQueue.size(),
      config: {
        environment: this.config.environment,
        version: this.config.transport.apiKey ? 'configured' : 'not_configured'
      }
    };
  }

  /**
   * Private helper methods
  */

  private async initializeMinimalMode(): Promise<void> {
    // Initialize with minimal functionality (only necessary cookies/data)
    await this.sessionManager.initializeMinimal();
    this.initialized = true;
    
    if (this.config.debug) {
      console.log('[CVPlus Analytics] Initialized in minimal mode');
    }
  }

  private async buildEvent(eventData: {
    eventName: string;
    eventType: EventType;
    properties: EventProperties;
  }): Promise<AnalyticsEvent> {
    const session = this.sessionManager.getCurrentSession();
    const privacyMetadata = await this.privacyManager.getPrivacyMetadata();
    
    return {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      userId: session?.userId,
      sessionId: session?.sessionId || this.generateSessionId(),
      deviceId: session?.deviceFingerprint || this.generateDeviceId(),
      
      eventName: eventData.eventName,
      eventType: eventData.eventType,
      properties: eventData.properties,
      
      context: await this.buildEventContext(),
      privacy: privacyMetadata,
      
      version: '1.0.0',
      source: EventSource.WEB,
      apiVersion: 'v1',
      
      validated: false,
      processed: false,
      enriched: false
    };
  }

  private async buildEventContext() {
    const session = this.sessionManager.getCurrentSession();
    
    return {
      userAgent: navigator.userAgent,
      browser: this.getBrowserInfo(),
      device: this.getDeviceInfo(),
      os: this.getOSInfo(),
      location: await this.privacyManager.getLocationInfo(),
      
      app: {
        name: 'CVPlus Web',
        version: '1.0.0',
        build: this.config.environment,
        environment: this.config.environment
      },
      
      sessionStartTime: session?.startTime || Date.now(),
      sessionDuration: session ? Date.now() - session.startTime : 0,
      pageLoadTime: performance.now(),
      referrer: document.referrer,
      
      utmParams: this.getUTMParams()
    };
  }

  private async enqueueEvent(event: AnalyticsEvent): Promise<void> {
    // Validate event if enabled
    if (this.config.validateEvents) {
      const validation = await this.validateEvent(event);
      if (!validation.valid) {
        console.warn('[CVPlus Analytics] Event validation failed:', validation.errors);
        return;
      }
      event = validation.enriched;
      event.validated = true;
    }

    // Add to queue for processing
    await this.eventQueue.enqueue(event);
  }

  private async validateEvent(event: AnalyticsEvent): Promise<EventValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!event.eventName) {
      errors.push('Event name is required');
    }
    
    if (!event.sessionId) {
      errors.push('Session ID is required');
    }
    
    if (!event.timestamp) {
      errors.push('Timestamp is required');
    }

    // Privacy validation
    if (!event.privacy) {
      errors.push('Privacy metadata is required');
    }

    // Enrich event with additional data
    const enriched = {
      ...event,
      enriched: true
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      enriched
    };
  }

  private setupAutoPageTracking(): void {
    // Track initial page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.page());
    } else {
      this.page();
    }

    // Track SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => this.page(), 0);
    }.bind(this);

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.page(), 0);
    }.bind(this);

    window.addEventListener('popstate', () => {
      setTimeout(() => this.page(), 0);
    });
  }

  private setupAutoClickTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Track clicks on buttons, links, and elements with data-track attribute
      if (target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.hasAttribute('data-track')) {
        
        this.track('element_clicked', {
          action: {
            category: 'ui_interaction',
            label: target.textContent?.trim() || target.tagName.toLowerCase(),
            value: 1
          },
          element: {
            tag: target.tagName.toLowerCase(),
            classes: target.className,
            id: target.id,
            text: target.textContent?.trim().substring(0, 100)
          }
        });
      }
    });
  }

  private setupAutoErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', {
        reason: event.reason,
        message: event.reason?.message,
        stack: event.reason?.stack
      });
    });
  }

  private setupAutoPerformanceTracking(): void {
    // Track Web Vitals when available
    if ('web-vitals' in window) {
      // This would typically import from 'web-vitals' library
      this.trackWebVitals();
    }

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        this.track(CVPlusEvents.PERFORMANCE_METRICS, {
          performance: {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstByte: navigation.responseStart - navigation.fetchStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            renderTime: navigation.loadEventStart - navigation.fetchStart
          }
        });
      }, 0);
    });
  }

  private async trackError(errorType: string, error: Error | any): Promise<void> {
    await this.track(CVPlusEvents.APPLICATION_ERROR, {
      error: {
        message: error.message || String(error),
        code: error.code,
        stack: error.stack,
        severity: 'medium'
      },
      errorType
    });
  }

  private trackWebVitals(): void {
    // Implementation would use web-vitals library
    // This is a placeholder for the actual implementation
    if (this.config.debug) {
      console.log('[CVPlus Analytics] Web Vitals tracking enabled');
    }
  }

  // Utility methods
  private generateEventId(): string {
    return 'evt_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateDeviceId(): string {
    // Generate a privacy-friendly device fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    // Hash the fingerprint for privacy
    return 'dev_' + this.simpleHash(fingerprint);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'unknown';
    let version = 'unknown';

    if (ua.includes('Firefox')) {
      browserName = 'Firefox';
      version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'unknown';
    } else if (ua.includes('Chrome')) {
      browserName = 'Chrome';
      version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'unknown';
    } else if (ua.includes('Safari')) {
      browserName = 'Safari';
      version = ua.match(/Safari\/([0-9.]+)/)?.[1] || 'unknown';
    }

    return {
      name: browserName,
      version,
      engine: 'unknown',
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1'
    };
  }

  private getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Mobi|Android/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(ua)) {
      deviceType = 'tablet';
    }

    return {
      type: deviceType as 'desktop' | 'tablet' | 'mobile' | 'unknown',
      screenWidth: screen.width,
      screenHeight: screen.height,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  private getOSInfo() {
    const ua = navigator.userAgent;
    let osName = 'unknown';
    
    if (ua.includes('Windows')) osName = 'Windows';
    else if (ua.includes('Mac OS X')) osName = 'macOS';
    else if (ua.includes('Linux')) osName = 'Linux';
    else if (ua.includes('Android')) osName = 'Android';
    else if (ua.includes('iOS')) osName = 'iOS';

    return {
      name: osName,
      version: 'unknown',
      platform: navigator.platform
    };
  }

  private getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      source: urlParams.get('utm_source') || undefined,
      medium: urlParams.get('utm_medium') || undefined,
      campaign: urlParams.get('utm_campaign') || undefined,
      term: urlParams.get('utm_term') || undefined,
      content: urlParams.get('utm_content') || undefined
    };
  }

  private extractFeatureFromEvent(eventName: string): string {
    if (eventName.includes('cv_')) return 'cv_generation';
    if (eventName.includes('premium_')) return 'premium_features';
    if (eventName.includes('user_')) return 'user_management';
    return 'general';
  }
}

/**
 * Session Manager - Handles user sessions and identification
*/
class SessionManager {
  private currentSession: SessionInfo | null = null;
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Create or restore session
    this.currentSession = this.createSession();
  }

  async initializeMinimal(): Promise<void> {
    // Minimal session without personal data
    this.currentSession = this.createMinimalSession();
  }

  async setUserId(userId: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.userId = userId;
    }
  }

  async recordPageView(url: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.pageViews++;
      this.currentSession.lastActivity = Date.now();
    }
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  private createSession(): SessionInfo {
    const sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const anonymousId = this.config.anonymousId || this.generateAnonymousId();

    return {
      sessionId,
      userId: this.config.userId,
      anonymousId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      duration: 0,
      pageViews: 0,
      events: 0,
      referrer: document.referrer,
      utmParams: this.getUTMParams(),
      deviceFingerprint: this.generateDeviceFingerprint()
    };
  }

  private createMinimalSession(): SessionInfo {
    return {
      sessionId: 'minimal_' + Date.now().toString(36),
      anonymousId: 'anon_' + Date.now().toString(36),
      startTime: Date.now(),
      lastActivity: Date.now(),
      duration: 0,
      pageViews: 0,
      events: 0,
      deviceFingerprint: 'minimal'
    };
  }

  private generateAnonymousId(): string {
    return 'anon_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateDeviceFingerprint(): string {
    // Generate privacy-friendly fingerprint
    return 'fp_' + Math.random().toString(36).substring(2);
  }

  private getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = urlParams.get(param);
      if (value) utmParams[param] = value;
    });
    
    return Object.keys(utmParams).length > 0 ? utmParams : undefined;
  }
}

/**
 * Privacy Manager - Handles GDPR/CCPA compliance and consent management
*/
class PrivacyManager {
  private privacyConfig: AnalyticsConfig['privacy'];
  private currentConsent: Record<ConsentCategory, boolean> = {
    [ConsentCategory.NECESSARY]: true,
    [ConsentCategory.ANALYTICS]: false,
    [ConsentCategory.MARKETING]: false,
    [ConsentCategory.PERSONALIZATION]: false,
    [ConsentCategory.FUNCTIONAL]: false
  };

  constructor(privacyConfig: AnalyticsConfig['privacy']) {
    this.privacyConfig = privacyConfig;
    this.initializeConsent();
  }

  private initializeConsent(): void {
    // Load consent from localStorage if available
    const storedConsent = localStorage.getItem('cvplus_consent');
    if (storedConsent) {
      try {
        this.currentConsent = { ...this.currentConsent, ...JSON.parse(storedConsent) };
      } catch (e) {
        console.warn('[CVPlus Analytics] Failed to load stored consent');
      }
    }

    // Apply default consent from config
    this.privacyConfig.defaultConsent.forEach(category => {
      this.currentConsent[category] = true;
    });
  }

  async checkConsent(): Promise<{ hasConsent: boolean; consentLevel: string }> {
    const hasAnalyticsConsent = this.currentConsent[ConsentCategory.ANALYTICS];
    return {
      hasConsent: hasAnalyticsConsent,
      consentLevel: hasAnalyticsConsent ? 'full' : 'minimal'
    };
  }

  async hasConsent(category: ConsentCategory): Promise<boolean> {
    return this.currentConsent[category] || false;
  }

  hasMinimalConsent(): boolean {
    return this.currentConsent[ConsentCategory.NECESSARY];
  }

  async updateConsent(consent: Record<ConsentCategory, boolean>): Promise<void> {
    this.currentConsent = { ...this.currentConsent, ...consent };
    
    // Store consent
    localStorage.setItem('cvplus_consent', JSON.stringify(this.currentConsent));
    
    // Create consent record for audit trail
    const consentRecord: ConsentRecord = {
      userId: 'unknown', // Would be set if user is identified
      consentId: 'consent_' + Date.now(),
      timestamp: Date.now(),
      categories: Object.keys(consent).filter(k => consent[k as ConsentCategory]) as ConsentCategory[],
      purposes: [], // Would map categories to purposes
      mechanism: 'explicit' as any,
      userAgent: navigator.userAgent,
      version: '1.0',
      language: navigator.language,
      jurisdiction: 'unknown',
      withdrawn: false
    };
    
    // Store consent record (implementation would send to server)
    console.log('[CVPlus Analytics] Consent updated:', consentRecord);
  }

  async getPrivacyMetadata() {
    return {
      consentGiven: this.hasMinimalConsent(),
      consentCategories: Object.keys(this.currentConsent).filter(
        k => this.currentConsent[k as ConsentCategory]
      ) as ConsentCategory[],
      consentTimestamp: Date.now(),
      anonymized: this.privacyConfig.anonymizeIP,
      retentionPolicy: 'standard' as const,
      gdprApplicable: this.privacyConfig.gdprEnabled,
      ccpaApplicable: this.privacyConfig.ccpaEnabled,
      processingPurpose: ['analytics', 'product_improvement']
    };
  }

  async filterUserTraits(traits: Record<string, any>): Promise<Record<string, any>> {
    if (!this.currentConsent[ConsentCategory.ANALYTICS]) {
      // Only allow non-personal traits
      const allowedTraits: Record<string, any> = {};
      ['plan', 'industry', 'role'].forEach(key => {
        if (traits[key]) allowedTraits[key] = traits[key];
      });
      return allowedTraits;
    }
    
    return traits;
  }

  async getLocationInfo() {
    if (!this.currentConsent[ConsentCategory.ANALYTICS]) {
      return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    
    // Would implement geolocation with consent
    return {
      country: 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  async requestUserData(): Promise<DataAccessRequest> {
    // Implementation would create a data access request
    throw new Error('Data access request not implemented');
  }

  async requestDataDeletion(reason: string): Promise<DataDeletionRequest> {
    // Implementation would create a data deletion request
    throw new Error('Data deletion request not implemented');
  }
}

/**
 * Event Queue - Handles event batching and offline storage
*/
class EventQueue {
  private queue: AnalyticsEvent[] = [];
  private config: AnalyticsConfig['queue'];
  private processing: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: AnalyticsConfig['queue']) {
    this.config = config;
  }

  async enqueue(event: AnalyticsEvent): Promise<void> {
    this.queue.push(event);
    
    if (this.queue.length >= this.config.flushBatchSize) {
      await this.flush();
    }
  }

  startProcessing(): void {
    if (this.processing) return;
    
    this.processing = true;
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.config.flushBatchSize);
    
    try {
      // Send batch to transport
      // Implementation would send to analytics endpoint
      console.log('[CVPlus Analytics] Flushing batch:', batch.length, 'events');
      
    } catch (error) {
      console.error('[CVPlus Analytics] Failed to flush events:', error);
      
      // Return events to queue for retry
      this.queue.unshift(...batch);
    }
  }

  size(): number {
    return this.queue.length;
  }
}

/**
 * Event Transport - Handles sending events to analytics backend
*/
class EventTransport {
  private config: AnalyticsConfig['transport'];

  constructor(config: AnalyticsConfig['transport']) {
    this.config = config;
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<EventProcessingResult[]> {
    // Implementation would send events to analytics backend
    // This is a placeholder
    return events.map(event => ({
      success: true,
      eventId: event.eventId,
      timestamp: Date.now(),
      processingTime: 10
    }));
  }

  async sendEvent(event: AnalyticsEvent): Promise<EventProcessingResult> {
    const results = await this.sendBatch([event]);
    return results[0];
  }
}