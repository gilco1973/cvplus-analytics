/**
 * Analytics Core Types
 * 
 * Legacy import path for backwards compatibility.
 * Re-exports from the main analytics types module.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Re-export all types for backwards compatibility
export * from './analytics.types';
export * from './analytics-core.types';

// Additional legacy exports
export type { AnalyticsEvent, AnalyticsMetrics } from './analytics-core.types';