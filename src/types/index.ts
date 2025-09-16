/**
 * CVPlus Analytics - Comprehensive Type Definitions
 * Main export file for all analytics types - Legacy and Modern
  */

// =============================================================================
// LEGACY INTERFACES (for backwards compatibility)
// =============================================================================
export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  averageRevenuePerUser: number;
  monthlyRecurringRevenue: number;
  revenueGrowthRate: number;
  timestamp: Date;
}

export interface CohortAnalysis {
  cohortId: string;
  cohortMonth: string;
  totalUsers: number;
  activeUsers: number;
  retentionRate: number;
  churnRate: number;
  revenue: number;
  averageLifetimeValue: number;
}

export interface UserAnalytics {
  userId: string;
  registrationDate: Date;
  lastActiveDate: Date;
  totalSessions: number;
  totalRevenue: number;
  subscriptionStatus: 'free' | 'premium' | 'enterprise';
  features: string[];
  engagementScore: number;
}

export interface FeatureAnalytics {
  featureId: string;
  featureName: string;
  totalUsage: number;
  uniqueUsers: number;
  conversionRate: number;
  averageUsagePerUser: number;
  revenueImpact: number;
}

export interface BusinessMetrics {
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  churnRate: number;
  conversionRate: number;
  netPromoterScore?: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
}

// Legacy AnalyticsEvent interface (deprecated - use AnalyticsEvent from tracking.types.ts)
export interface LegacyAnalyticsEvent {
  eventId: string;
  eventType: string;
  userId: string;
  timestamp: Date;
  properties: Record<string, any>;
  revenue?: number;
}

// Legacy interfaces (kept for backward compatibility)
export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  metrics: string[];
  filters?: Record<string, any>;
  groupBy?: string[];
}

export interface AnalyticsReport {
  reportId: string;
  reportType: string;
  generatedAt: Date;
  data: any;
  summary: {
    totalRecords: number;
    keyInsights: string[];
  };
}

export interface DashboardConfig {
  dashboardId: string;
  userId: string;
  name: string;
  widgets: LegacyDashboardWidget[];
  refreshInterval: number;
  isDefault: boolean;
}

export interface LegacyDashboardWidget {
  widgetId: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap';
  title: string;
  query: AnalyticsQuery;
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    colors?: string[];
    layout?: Record<string, any>;
  };
}

// =============================================================================
// MODERN TYPE EXPORTS  
// =============================================================================

// Core Analytics Types
export type {
  AnalyticsEvent as CoreAnalyticsEvent,
  AnalyticsMetrics,
  EventData,
  UserMetrics,
  SystemMetrics,
  PerformanceMetrics
} from './analytics-core.types';

// Enhanced Analytics Types
export type {
  // FeatureUsage,
  FeatureInteraction,
  // FeatureConfig,
  // UserExperience,
  // UserPersonality,
  // FeaturePersonalityAnalysis
} from './enhanced-analytics';

// Portal Analytics Types  
export type {
  PortalUrls,
  PortalAnalytics,
  URLPlacement,
  QRCodeType,
  QRCodeStyling,
  QRCodeAnalytics
} from './portal-analytics';


// Cohort Types
export type {
  CohortType,
  CohortRetentionData,
  CohortRevenueData,
  CohortSegmentation
} from './cohort.types';

// Revenue Types
export type {
  RevenueStreamType,
  RevenueData,
  RevenueProjection,
  RevenueComparison
} from './revenue.types';

// Dashboard Types - TODO: Create dashboard.types.ts when needed
// export type {
//   DashboardMetric,
//   DashboardConfig as ModernDashboardConfig,
//   DashboardWidget as ModernDashboardWidget,
//   DashboardLayout
// } from './dashboard.types';

// Comprehensive Types (conditional exports removed - use explicit imports)
// export * from './tracking.types';
// export * from './privacy.types';
// export * from './ab-testing.types';
// export * from './business-intelligence.types';

// =============================================================================
// ALL TYPE EXPORTS (for maximum compatibility)
// =============================================================================
export * from './analytics.types';
export * from './revenue.types';
export * from './cohort.types';
// export * from './dashboard.types'; // TODO: Create dashboard.types.ts when needed
export * from './user-outcomes';

// Migrated from Core Module
export * from './analytics';
export * from './enhanced-analytics';

// Core Analytics Types (migrated from cv-processing)
export * from './core-analytics';

// =============================================================================
// VERSION
// =============================================================================
export const ANALYTICS_TYPES_VERSION = '1.0.0';

// Migrated analytics types from core module
export * from './user-outcomes';
export * from './ml-pipeline';
export * from './success-prediction';
export * from './analytics-errors';

// export * from './api'; // TODO: Create api.ts when needed
// export * from './booking.types'; // TODO: Create booking.types.ts when needed
// export * from './payment.types'; // TODO: Create payment.types.ts when needed
