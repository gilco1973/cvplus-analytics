// CVPlus Analytics Functions
// Firebase Functions exports for analytics, revenue tracking, and business intelligence

// =============================================================================
// CORE ANALYTICS FUNCTIONS
// =============================================================================
export { getRevenueMetrics } from './getRevenueMetrics';

// =============================================================================
// DASHBOARD FUNCTIONS
// =============================================================================
export { videoAnalyticsDashboard } from './dashboard/video-analytics-dashboard';

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
// PREMIUM ANALYTICS FUNCTIONS
// =============================================================================
export { batchTrackingEvents } from './premium/batchTrackingEvents';
export { getRealtimeUsageStats } from './premium/getRealtimeUsageStats';
export { 
  createCustomReport,
  generateWhiteLabelReport,
  exportReport,
  getDataSources,
  getReportTemplates,
  validateReportConfig,
  analyticsHealthCheck
} from './premium/advancedAnalytics';

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