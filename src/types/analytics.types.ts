/**
 * CVPlus Analytics Types
 * Comprehensive analytics type definitions
*/

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
  FeatureInteraction,
  // FeatureUsage,
  // FeatureConfig,
  // UserExperience,
  // UserPersonality,
  // FeaturePersonalityAnalysis
} from './enhanced-analytics';

export type {
  PortalUrls,
  PortalAnalytics,
  URLPlacement,
  QRCodeType,
  QRCodeStyling,
  QRCodeAnalytics
} from './portal-analytics';


// Define essential analytics types
export type EntityType = 'user_profile' | 'processed_cv' | 'generated_content' | 'public_profile';
export type AggregationPeriod = 'hour' | 'day' | 'week' | 'month' | 'year';

// Import types first to avoid circular dependencies
import type { AnalyticsEvent as CoreAnalyticsEvent, AnalyticsMetrics } from './analytics-core.types';
// import type { FeatureUsage } from './enhanced-analytics';
import type { PortalAnalytics } from './portal-analytics';

// Aggregate type for all analytics types
export type AnalyticsTypes =
  | CoreAnalyticsEvent
  | AnalyticsMetrics
  // | FeatureUsage
  | PortalAnalytics;