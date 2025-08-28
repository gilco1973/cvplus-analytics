// CVPlus Analytics Services
// Comprehensive analytics, revenue tracking, and business intelligence services

// =============================================================================
// CORE ANALYTICS SERVICES
// =============================================================================
export { 
  revenueAnalyticsService, 
  RevenueAnalyticsService,
  type DateRange,
  type RevenueMetrics,
  type CohortData,
  type GrowthData,
  type SubscriptionData,
  type PaymentData,
  type CachedMetric 
} from './revenue-analytics.service';

export { 
  cohortAnalysisService, 
  CohortAnalysisService,
  type CohortAnalysisParams,
  type CohortMetrics,
  type CohortPeriod,
  type CohortComparison,
  type CohortTrend 
} from './cohort-analysis.service';

export {
  AnalyticsEngineService,
  type BusinessMetrics,
  type TrendAnalysis,
  type UserBehaviorInsights,
  type QualityInsights
} from './analytics-engine.service';

// =============================================================================
// CACHE SERVICES
// =============================================================================
export {
  analyticsCacheService,
  AnalyticsCacheService,
  type CacheConfig,
  type CacheEntry,
  type CacheStats
} from './cache/analytics-cache.service';

// =============================================================================
// PREMIUM ANALYTICS SERVICES
// =============================================================================
export {
  PricingAnalyticsService,
  type PricingMetrics,
  type PricingOptimizationResult,
  type PricingTest,
  type ConversionData
} from './premium/pricingAnalytics';

export {
  ReportBuilderService,
  type ReportConfig,
  type ReportData,
  type ReportTemplate,
  type ReportMetadata
} from './premium/reportBuilder';

// =============================================================================
// VERSION
// =============================================================================
export const ANALYTICS_SERVICES_VERSION = '1.0.0';