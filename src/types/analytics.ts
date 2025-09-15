/**
 * Analytics Types
 * Extracted from phase2-models.ts for better modularity
 * 
 * Analytics events, metrics, and performance tracking.
 */

// ===============================
// ANALYTICS AND METRICS MODELS
// ===============================

export interface AnalyticsEvent {
  eventId: string;
  userId: string;
  jobId?: string;
  
  // Event classification
  eventType: 'cv_generated' | 'cv_downloaded' | 'cv_shared' | 'application_submitted' | 'outcome_reported' | 'feature_used';
  eventCategory: 'engagement' | 'conversion' | 'outcome' | 'usage' | 'error' | 'user_action';
  category?: 'engagement' | 'conversion' | 'outcome' | 'usage' | 'error' | 'user_action'; // Alternative field name for compatibility
  
  // Event data
  eventData: {
    action: string;
    value?: number;
    properties?: Record<string, any>;
  };
  
  // Context
  timestamp: Date;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  
  // Feature tracking
  featureUsed?: string;
  featureVersion?: string;
  
  // Performance metrics
  performanceMetrics?: {
    loadTime?: number;
    responseTime?: number;
    errorRate?: number;
  };
  
  // Conversion tracking
  conversionStep?: string;
  conversionValue?: number;
  
  // A/B testing
  experimentId?: string;
  variant?: string;
}

export interface AnalyticsMetrics {
  metricsId: string;
  userId?: string; // If user-specific, otherwise platform-wide
  timeRange: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  // User engagement metrics
  engagement: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    sessionCount: number;
    averageSessionDuration: number;
    bounceRate: number;
    pageViews: number;
  };
  
  // Feature usage metrics
  features: {
    [featureName: string]: {
      usageCount: number;
      uniqueUsers: number;
      conversionRate: number;
      errorRate: number;
      averageCompletionTime: number;
    };
  };
  
  // Conversion metrics
  conversions: {
    cvGenerated: number;
    cvDownloaded: number;
    cvShared: number;
    applicationsSubmitted: number;
    interviewsScheduled: number;
    offersReceived: number;
    
    // Conversion rates
    generationToDownloadRate: number;
    downloadToShareRate: number;
    shareToApplicationRate: number;
    applicationToInterviewRate: number;
    interviewToOfferRate: number;
  };
  
  // Success metrics
  success: {
    averageSuccessScore: number;
    userSatisfactionRating: number;
    npsScore: number;
    customerLifetimeValue: number;
  };
  
  // Performance metrics
  performance: {
    averageLoadTime: number;
    errorRate: number;
    uptime: number;
    throughput: number;
  };
  
  // Revenue metrics (if applicable)
  revenue?: {
    totalRevenue: number;
    revenuePerUser: number;
    conversionValue: number;
    churnRate: number;
  };
  
  // Predictive metrics
  predictions?: {
    modelAccuracy: number;
    predictionConfidence: number;
    improvementImpact: number;
  };
}

// Type unions for easier handling
export type AnalyticsTypes = AnalyticsEvent | AnalyticsMetrics;