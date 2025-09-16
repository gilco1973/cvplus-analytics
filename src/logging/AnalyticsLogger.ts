/**/**
 * T032: Analytics logging in packages/analytics/src/logging/AnalyticsLogger.ts
 *
 * Specialized logger for analytics, metrics, and business intelligence events
 */

import { AnalyticsLogger as BaseAnalyticsLogger, analyticsLogger } from '@cvplus/core';

// Re-export the analytics logger
export { analyticsLogger };
export default analyticsLogger;