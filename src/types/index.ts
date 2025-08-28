// CVPlus Analytics Types
// Comprehensive type definitions for analytics, revenue tracking, and business intelligence

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

export interface AnalyticsEvent {
  eventId: string;
  eventType: string;
  userId: string;
  timestamp: Date;
  properties: Record<string, any>;
  revenue?: number;
}

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
  widgets: DashboardWidget[];
  refreshInterval: number;
  isDefault: boolean;
}

export interface DashboardWidget {
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
  FeatureUsage,
  FeatureInteraction,
  FeatureConfig,
  UserExperience,
  UserPersonality,
  FeaturePersonalityAnalysis
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

// External Data Analytics Types
export type {
  ExternalDataUsageEvent,
  ExternalDataSource,
  ExternalDataMetrics,
  ExternalDataAnalytics
} from './external-data-analytics.types';

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

// Dashboard Types
export type {
  DashboardMetric,
  DashboardConfig as ModernDashboardConfig,
  DashboardWidget as ModernDashboardWidget,
  DashboardLayout
} from './dashboard.types';

// =============================================================================
// ALL TYPE EXPORTS (for maximum compatibility)
// =============================================================================
export * from './analytics.types';
export * from './revenue.types';
export * from './cohort.types';
export * from './dashboard.types';
export * from './user-outcomes';

// =============================================================================
// VERSION
// =============================================================================
export const ANALYTICS_TYPES_VERSION = '1.0.0';