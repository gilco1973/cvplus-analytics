/**
 * CVPlus Analytics Frontend Components
 *
 * Main exports for the analytics submodule frontend components.
 * These components provide comprehensive analytics and insights
 * for CVPlus profiles and user engagement.
 */

// Main Components
// Component exports removed - React components moved to appropriate frontend packages
// export { default as AnalyticsDashboard } from './components/AnalyticsDashboard';

// Analytics Components (when implemented)
// export { default as MetricsOverview } from './components/MetricsOverview';
// export { default as VisitorAnalytics } from './components/VisitorAnalytics';
// export { default as EngagementCharts } from './components/EngagementCharts';
// export { default as TrafficSources } from './components/TrafficSources';
// export { default as GeographicInsights } from './components/GeographicInsights';
// export { default as ContentPerformance } from './components/ContentPerformance';
// export { default as ReportsGenerator } from './components/ReportsGenerator';

// Custom Hooks
// export { default as useAnalytics } from './hooks/useAnalytics';
// export { default as useRealTimeMetrics } from './hooks/useRealTimeMetrics';
// export { default as useChartData } from './hooks/useChartData';

// Types and Interfaces
export interface DashboardMetrics {
  profileViews: number;
  uniqueVisitors: number;
  engagementRate: number;
  downloadCount: number;
  conversionRate: number;
  avgTimeOnProfile: number;
}

export interface AnalyticsData {
  metrics: DashboardMetrics;
  timeSeriesData: Array<{
    date: string;
    views: number;
    visitors: number;
    engagement: number;
  }>;
  demographicData: {
    geographic: Record<string, number>;
    devices: Record<string, number>;
    referrers: Record<string, number>;
  };
}

export interface AnalyticsDashboardProps {
  profileId?: string;
  dateRange?: '7d' | '30d' | '90d' | '1y';
  showExportOptions?: boolean;
  onMetricsUpdate?: (metrics: DashboardMetrics) => void;
  className?: string;
}