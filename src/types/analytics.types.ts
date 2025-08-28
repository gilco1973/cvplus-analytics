// CVPlus Analytics Types
// Comprehensive analytics type definitions

// Re-export all analytics types for backwards compatibility
export type {
  AnalyticsEvent,
  AnalyticsMetrics,
  EventData,
  UserMetrics,
  SystemMetrics,
  PerformanceMetrics
} from './analytics-core.types';

export type {
  FeatureUsage,
  FeatureInteraction,
  FeatureConfig,
  UserExperience,
  UserPersonality,
  FeaturePersonalityAnalysis
} from './enhanced-analytics';

export type {
  PortalUrls,
  PortalAnalytics,
  URLPlacement,
  QRCodeType,
  QRCodeStyling,
  QRCodeAnalytics
} from './portal-analytics';

export type {
  ExternalDataUsageEvent,
  ExternalDataSource,
  ExternalDataMetrics,
  ExternalDataAnalytics
} from './external-data-analytics.types';

// Aggregate type for all analytics types
export type AnalyticsTypes = 
  | AnalyticsEvent
  | AnalyticsMetrics
  | FeatureUsage
  | PortalAnalytics
  | ExternalDataUsageEvent;