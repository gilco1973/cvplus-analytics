/**
 * External Data Analytics Types
 * 
 * Type definitions for external data usage tracking, analytics,
 * and business intelligence metrics
 * 
 * @author Gil Klainert
 * @created 2025-08-25
 * @version 1.0
 */

// ============================================================================
// USAGE TRACKING TYPES
// ============================================================================

export interface ExternalDataUsageEvent {
  userId: string;
  cvId: string;
  sources: string[];
  timestamp: Date;
  success: boolean;
  fetchDuration: number;
  sourcesQueried: number;
  sourcesSuccessful: number;
  cacheHits: number;
  errors?: string[];
  premiumStatus: 'free' | 'premium';
  requestId?: string;
}

export interface ExternalDataUsageStats {
  userId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageDuration: number;
  sourcesUsed: Record<string, number>;
  lastUsed: Date;
  quotaRemaining?: number;
}

// ============================================================================
// SECURITY AUDIT TYPES
// ============================================================================

export interface ExternalDataSecurityAudit {
  userId: string;
  action: 'access_attempt' | 'unauthorized_access' | 'rate_limit_exceeded' | 'quota_exceeded';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  premiumStatus: boolean;
  errorCode?: string;
  metadata?: {
    cvId?: string;
    sources?: string[];
    requestId?: string;
    [key: string]: any;
  };
}

export interface SecurityAuditSummary {
  date: string;
  totalAttempts: number;
  unauthorizedAttempts: number;
  rateLimitViolations: number;
  uniqueUsers: number;
  topViolatingIPs: Array<{
    ip: string;
    count: number;
  }>;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ExternalDataAnalytics {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalRequests: number;
  successRate: number;
  premiumUsers: number;
  freeUsers: number;
  sourcesBreakdown: Record<string, {
    requests: number;
    successRate: number;
    averageDuration: number;
  }>;
  conversionMetrics: ConversionMetrics;
}

export interface ConversionMetrics {
  previewToUpgrade: {
    previews: number;
    conversions: number;
    conversionRate: number;
  };
  sourceSpecificConversion: Record<string, {
    previews: number;
    conversions: number;
    conversionRate: number;
  }>;
  timeToConversion: {
    averageMinutes: number;
    medianMinutes: number;
  };
}

export interface DailyAnalytics {
  date: string;
  totalRequests: number;
  premiumRequests: number;
  freeRequests: number;
  unauthorizedAttempts: number;
  averageResponseTime: number;
  topSources: string[];
  newPremiumSignups: number;
  conversionRate: number;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

export interface RateLimitConfig {
  free: {
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  premium: {
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
}

export interface RateLimitStatus {
  userId: string;
  currentHour: {
    requests: number;
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  currentDay: {
    requests: number;
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  isLimited: boolean;
  nextAllowedRequest?: Date;
}

// ============================================================================
// BUSINESS INTELLIGENCE TYPES
// ============================================================================

export interface BusinessIntelligenceReport {
  reportDate: Date;
  period: '7_days' | '30_days' | '90_days';
  userEngagement: {
    activeUsers: number;
    premiumUsers: number;
    freeUsers: number;
    churnRate: number;
  };
  featureUsage: {
    totalExternalDataRequests: number;
    uniqueUsersUsingFeature: number;
    averageRequestsPerUser: number;
    mostPopularSources: string[];
  };
  conversionFunnel: {
    featureDiscovery: number;
    featurePreview: number;
    premiumConversion: number;
    conversionRate: number;
  };
  revenueImpact: {
    estimatedRevenueFromFeature: number;
    costPerAcquisition: number;
    lifetimeValue: number;
  };
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface AnalyticsRequest {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  sources?: string[];
}

export interface UsageTrackingRequest {
  event: ExternalDataUsageEvent;
}

export interface SecurityAuditRequest {
  audit: ExternalDataSecurityAudit;
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    generatedAt: Date;
    dataPoints: number;
    period: string;
  };
}