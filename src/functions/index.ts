/**
 * CVPlus Analytics Functions
// Firebase Functions exports for analytics, revenue tracking, and business intelligence

// =============================================================================
// CORE ANALYTICS FUNCTIONS
// =============================================================================
export { getRevenueMetrics } from './getRevenueMetrics';

// =============================================================================
// DASHBOARD FUNCTIONS - MIGRATED TO @cvplus/admin
// =============================================================================
// MOVED: Dashboard functions migrated to @cvplus/admin/backend/functions/dashboards
// Import from @cvplus/admin for dashboard functionality

// =============================================================================
// EXTERNAL DATA ANALYTICS FUNCTIONS
// =============================================================================
// External functions temporarily commented out - missing files
// export {
//   trackExternalDataUsage,
//   getUserExternalDataUsageStats
// } from './external/trackExternalDataUsage';

// export {
//   getExternalDataAnalytics,
//   getDailyExternalDataAnalytics
// } from './external/getExternalDataAnalytics';

// =============================================================================
// CONVERSION ANALYTICS FUNCTIONS
// =============================================================================
export {
  trackConversionEvent,
  getConversionMetrics,
  getBusinessIntelligenceReport
} from './conversion/getConversionMetrics';

// =============================================================================
// PREMIUM ANALYTICS FUNCTIONS - MIGRATED TO @cvplus/premium
// =============================================================================
// MOVED: Premium analytics functions migrated to @cvplus/premium/backend/functions
// Import from @cvplus/premium for premium analytics functionality

// =============================================================================
// ML ANALYTICS FUNCTIONS
// =============================================================================
export { predictChurn } from './ml/predictChurn';

// =============================================================================
// OUTCOME TRACKING FUNCTIONS
// =============================================================================
export {
  trackUserOutcome,
  updateUserOutcome,
  getUserOutcomeStats,
  sendFollowUpReminders,
  processOutcomeForML
} from './outcome/trackOutcome';

// =============================================================================
// VERSION
// =============================================================================
export const ANALYTICS_FUNCTIONS_VERSION = '1.0.0';