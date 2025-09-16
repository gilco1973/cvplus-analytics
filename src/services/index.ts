/**/**
 * Analytics Services - Backward Compatibility Re-exports
 *
 * MIGRATION COMPLETE: These services have been successfully migrated to @cvplus/analytics
 * This file now provides backward compatibility by re-exporting from the target package.
 *
 * Domain: Analytics, Performance Monitoring, Metrics
 * Target Submodule: @cvplus/analytics ✅ MIGRATED
 * Migration Phase: 4B ✅ COMPLETE
 */

// Re-export from migrated @cvplus/analytics package for backward compatibility
export {
  analyticsCacheService,
  AnalyticsCacheService,
  type AnalyticsQuery,
  type AnalyticsQueryType,
  type CacheOptions
} from '@cvplus/analytics';

export {
  cachePerformanceMonitor,
  CachePerformanceMonitor,
  type CacheMetrics,
  type PerformanceThresholds,
  type CacheReport
} from '@cvplus/analytics';

// Legacy type aliases for backward compatibility
export type {
  AnalyticsQuery as AnalyticsResult,
  CacheOptions as AnalyticsCacheMetrics
} from '@cvplus/analytics';

export type {
  CacheReport as CacheHealthStatus,
  CacheReport as CachePerformanceReport,
  CacheMetrics as CacheAlert,
  CacheMetrics as CacheRecommendation
} from '@cvplus/analytics';

