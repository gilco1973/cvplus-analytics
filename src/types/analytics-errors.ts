/**
 * Analytics Error Types
 * Error handling types for analytics operations
 */

export enum AnalyticsErrorType {
  TIMEOUT = 'timeout',
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  CACHE_ERROR = 'cache_error',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

export interface AnalyticsError extends Error {
  type: AnalyticsErrorType;
  category: 'system' | 'validation' | 'user' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details?: Record<string, any>;
  retryable?: boolean;
}

// Performance metrics interface for recommendations system
export interface RecommendationsPerformanceMetrics {
  requestDuration: number;
  cacheHitRate: number;
  errorRate: number;
  timeoutRate: number;
  throughput: number;
  aiApiLatency: number;
  queueDepth: number;
  memoryUsage: number;
  timestamp: Date;
}

// Cache stats interface for recommendations system
export interface CacheStats {
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
}

// For compatibility with migrated code
export const RecommendationErrorType = AnalyticsErrorType;
export type RecommendationError = AnalyticsError;
export type PerformanceMetrics = RecommendationsPerformanceMetrics;