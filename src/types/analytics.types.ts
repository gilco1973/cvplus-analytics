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

// Import types first to avoid circular dependencies
import type { AnalyticsEvent as CoreAnalyticsEvent, AnalyticsMetrics } from './analytics-core.types';
import type { FeatureUsage } from './enhanced-analytics';
import type { PortalAnalytics } from './portal-analytics';
import type { ExternalDataUsageEvent } from './external-data-analytics.types';

// Aggregate type for all analytics types
export type AnalyticsTypes = 
  | CoreAnalyticsEvent
  | AnalyticsMetrics
  | FeatureUsage
  | PortalAnalytics
  | ExternalDataUsageEvent;