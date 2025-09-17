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

// Conversion Analytics Types
export interface ConversionEvent {
  eventId: string;
  type: string;
  name: string;
  category: 'signup' | 'subscription' | 'purchase' | 'engagement' | 'feature_usage';
  timestamp: Date;
  properties?: Record<string, any>;
}

export interface ConversionMetrics {
  totalConversions: number;
  totalValue: number;
  uniqueUsers: number;
  conversionRate: number;
  averageOrderValue: number;
  conversionsByType: Record<string, { count: number; value: number }>;
  funnelMetrics: Array<{
    step: string;
    name: string;
    conversions: number;
    conversionRate: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface BusinessIntelligenceReport {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  revenue: {
    total: number;
    monthlyRecurring: number;
    averageOrderValue: number;
    revenuePerUser: number;
  };
  conversions: ConversionMetrics;
  engagement: {
    uniqueUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    sessionsPerUser: number;
  };
  customers: {
    newUsers: number;
    customerAcquisitionCost: number;
    averageChurnRisk: number;
    retentionRate: number;
  };
  features: {
    topFeatures: Array<{ feature: string; usage: number }>;
    totalFeatureUsage: number;
  };
  forecasting?: {
    projectedMonthlyRevenue: number;
    projectedQuarterlyRevenue: number;
    projectedYearlyRevenue: number;
    revenueGrowthTrend: string;
  };
}

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