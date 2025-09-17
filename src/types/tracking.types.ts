/**
 * CVPlus Analytics - Event Tracking Types
// Comprehensive type definitions for event tracking and analytics

/**
 * Core event types for CVPlus analytics system
*/
export enum EventType {
  // Basic tracking events
  TRACK = 'track',          // User action tracking
  PAGE = 'page',            // Page view tracking
  IDENTIFY = 'identify',    // User identification
  GROUP = 'group',          // Group association
  SCREEN = 'screen',        // Mobile screen tracking

  // Analytics events used in services
  VIEW = 'view',                    // Content view events
  DOWNLOAD = 'download',            // Download events
  SOCIAL_SHARE = 'social_share',    // Social sharing events
  CONTACT_FORM_SUBMIT = 'contact_form_submit', // Contact form submissions
  CALENDAR_BOOKING = 'calendar_booking',       // Calendar booking events
  SECTION_VIEW = 'section_view',    // Section view tracking
  FEATURE_INTERACTION = 'feature_interaction', // Feature interaction events

  // CV specific events
  CV_GENERATED = 'cv_generated',
  CV_DOWNLOADED = 'cv_downloaded',
  CV_SHARED = 'cv_shared',
  APPLICATION_SUBMITTED = 'application_submitted',
  OUTCOME_REPORTED = 'outcome_reported',
  FEATURE_USED = 'feature_used'
}

/**
 * Event sources within the CVPlus ecosystem
*/
export enum EventSource {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
  SERVER = 'server',
  WORKER = 'worker'
}

/**
 * Privacy consent categories for GDPR compliance
*/
export enum ConsentCategory {
  NECESSARY = 'necessary',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
  FUNCTIONAL = 'functional'
}

/**
 * Device information interface
*/
export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  brand?: string;
  model?: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

/**
 * Browser information interface
*/
export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  language: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
}

/**
 * Operating system information interface
*/
export interface OSInfo {
  name: string;
  version: string;
  platform: string;
}

/**
 * Geographic location information (privacy-compliant)
*/
export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  // IP-based geolocation without storing IP
}

/**
 * Privacy metadata for GDPR compliance
*/
export interface PrivacyMetadata {
  consentGiven: boolean;
  consentCategories: ConsentCategory[];
  consentTimestamp: number;
  anonymized: boolean;
  retentionPolicy: 'standard' | 'minimal' | 'extended';
  gdprApplicable: boolean;
  ccpaApplicable: boolean;
  processingPurpose: string[];
}

/**
 * Event context information
*/
export interface EventContext {
  // Browser/App Context
  userAgent: string;
  browser: BrowserInfo;
  device: DeviceInfo;
  os: OSInfo;
  
  // Network Context (only if consent given)
  ip?: string;               // IP address (anonymized if required)
  location?: LocationInfo;   // Geographic data (if consent given)
  
  // Application Context
  app: {
    name: string;            // 'CVPlus Web' | 'CVPlus Mobile'
    version: string;         // Application version
    build?: string;          // Build number
    environment: 'development' | 'staging' | 'production';
  };
  
  // Session Context
  sessionStartTime: number;
  sessionDuration?: number;
  pageLoadTime?: number;
  referrer?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

/**
 * Event properties for different event types
*/
export interface EventProperties {
  // Page/Screen Events
  page?: {
    title: string;
    url: string;
    referrer?: string;
    search?: string;
    path: string;
    category?: string;
  };
  
  // User Action Events
  action?: {
    category: string;         // e.g., 'cv_generation', 'premium_feature'
    label?: string;           // Additional context
    value?: number;           // Numeric value
    duration?: number;        // Action duration in milliseconds
  };
  
  // CV-specific events
  cv?: {
    templateId?: string;
    generationStep?: string;
    features?: string[];
    exportFormat?: string;
    processingTime?: number;
  };
  
  // Premium feature events
  premium?: {
    featureId: string;
    tier: 'free' | 'premium' | 'enterprise';
    usage: number;
    limit?: number;
    billingCycle?: string;
  };
  
  // Error tracking
  error?: {
    message: string;
    code?: string;
    stack?: string;
    component?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Performance metrics
  performance?: {
    loadTime: number;
    renderTime?: number;
    interactionTime?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  
  // Custom Properties (strongly typed where possible)
  [key: string]: any;
}

/**
 * Core analytics event interface
*/
export interface AnalyticsEvent {
  // Core Identifiers
  eventId: string;              // UUID v4
  timestamp: number;            // Unix timestamp (milliseconds)
  userId?: string;              // User identifier (optional for anonymous)
  sessionId: string;            // Session UUID
  deviceId: string;             // Device fingerprint (privacy-compliant)
  
  // Event Data
  eventName: string;            // Event name (snake_case)
  eventType: EventType;         // Event type enum
  properties: EventProperties;   // Event-specific data
  
  // Context Information
  context: EventContext;        // Browser, device, location data
  
  // Privacy & Compliance
  privacy: PrivacyMetadata;     // Consent status, retention policy
  
  // System Metadata
  version: string;              // SDK version
  source: EventSource;          // Event source
  apiVersion: string;           // API version used
  
  // Data Quality
  validated: boolean;           // Schema validation status
  processed: boolean;           // Processing status
  enriched: boolean;            // Enrichment status
}

/**
 * Event validation result
*/
export interface EventValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  enriched: AnalyticsEvent;
}

/**
 * Event queue configuration
*/
export interface EventQueueConfig {
  maxSize: number;              // Maximum events in queue
  flushInterval: number;        // Auto-flush interval (ms)
  flushBatchSize: number;       // Events per batch
  retryAttempts: number;        // Retry attempts for failed events
  retryDelay: number;           // Delay between retries (ms)
  offlineStorage: boolean;      // Store events when offline
}

/**
 * Event transport configuration
*/
export interface EventTransportConfig {
  endpoint: string;             // Analytics endpoint URL
  apiKey: string;               // API key for authentication
  timeout: number;              // Request timeout (ms)
  compression: boolean;         // Enable gzip compression
  batchingEnabled: boolean;     // Enable event batching
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
}

/**
 * Analytics SDK configuration
*/
export interface AnalyticsConfig {
  // Core Configuration
  apiKey: string;
  environment: 'development' | 'staging' | 'production';
  userId?: string;
  anonymousId?: string;
  
  // Event Collection
  autoTrackPageViews: boolean;
  autoTrackClicks: boolean;
  autoTrackErrors: boolean;
  autoTrackPerformance: boolean;
  
  // Privacy Configuration
  privacy: {
    gdprEnabled: boolean;
    ccpaEnabled: boolean;
    anonymizeIP: boolean;
    respectDoNotTrack: boolean;
    consentRequired: boolean;
    defaultConsent: ConsentCategory[];
  };
  
  // Queue & Transport
  queue: EventQueueConfig;
  transport: EventTransportConfig;
  
  // Debugging & Development
  debug: boolean;
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  validateEvents: boolean;
  
  // Integration Settings
  integrations: {
    googleAnalytics?: { trackingId: string };
    mixpanel?: { token: string };
    amplitude?: { apiKey: string };
    customEndpoints?: string[];
  };
}

/**
 * Session information
*/
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  anonymousId: string;
  startTime: number;
  lastActivity: number;
  duration: number;
  pageViews: number;
  events: number;
  referrer?: string;
  utmParams?: Record<string, string>;
  deviceFingerprint: string;
}

/**
 * User identification data
*/
export interface UserIdentification {
  userId: string;
  anonymousId?: string;
  traits: {
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    createdAt?: Date;
    plan?: string;
    company?: string;
    industry?: string;
    role?: string;
    // Custom traits
    [key: string]: any;
  };
}

/**
 * Event processing result
*/
export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  timestamp: number;
  errors?: string[];
  warnings?: string[];
  processingTime: number;
  enrichments?: Record<string, any>;
}

/**
 * Event batch for bulk processing
*/
export interface EventBatch {
  batchId: string;
  events: AnalyticsEvent[];
  timestamp: number;
  userId?: string;
  sessionId: string;
  metadata: {
    source: EventSource;
    version: string;
    compression?: string;
  };
}

/**
 * Event filter for querying
*/
export interface EventFilter {
  eventNames?: string[];
  eventTypes?: EventType[];
  userIds?: string[];
  sessionIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  properties?: Record<string, any>;
  privacy?: {
    consentRequired?: boolean;
    anonymizedOnly?: boolean;
  };
}

/**
 * CVPlus-specific event names (strongly typed)
*/
export const CVPlusEvents = {
  // CV Generation Events
  CV_GENERATION_STARTED: 'cv_generation_started',
  CV_GENERATION_COMPLETED: 'cv_generation_completed',
  CV_GENERATION_FAILED: 'cv_generation_failed',
  CV_TEMPLATE_SELECTED: 'cv_template_selected',
  CV_EXPORTED: 'cv_exported',
  
  // Premium Feature Events
  PREMIUM_FEATURE_ACCESSED: 'premium_feature_accessed',
  PREMIUM_FEATURE_BLOCKED: 'premium_feature_blocked',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // User Journey Events
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  PROFILE_UPDATED: 'profile_updated',
  
  // Engagement Events
  TUTORIAL_STARTED: 'tutorial_started',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  HELP_ACCESSED: 'help_accessed',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  
  // Error Events
  APPLICATION_ERROR: 'application_error',
  NETWORK_ERROR: 'network_error',
  VALIDATION_ERROR: 'validation_error',
  
  // Performance Events
  PAGE_LOAD_COMPLETED: 'page_load_completed',
  PERFORMANCE_METRICS: 'performance_metrics',
  
  // Privacy Events
  CONSENT_GRANTED: 'consent_granted',
  CONSENT_WITHDRAWN: 'consent_withdrawn',
  PRIVACY_POLICY_VIEWED: 'privacy_policy_viewed'
} as const;

export type CVPlusEventName = typeof CVPlusEvents[keyof typeof CVPlusEvents];

/**
 * Event category taxonomy for organization
*/
export const EventCategories = {
  USER_ACTION: 'user_action',
  SYSTEM_EVENT: 'system_event',
  BUSINESS_EVENT: 'business_event',
  ERROR_EVENT: 'error_event',
  PRIVACY_EVENT: 'privacy_event',
  PERFORMANCE_EVENT: 'performance_event'
} as const;

export type EventCategory = typeof EventCategories[keyof typeof EventCategories];