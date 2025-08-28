// Analytics Types
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

// Export all types
export * from './analytics.types';
export * from './revenue.types';
export * from './cohort.types';
export * from './dashboard.types';