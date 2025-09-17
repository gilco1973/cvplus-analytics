/**
 * Cohort Analysis Types
 */
export interface CohortDefinition {
  id: string;
  name: string;
  criteria: {
    registrationDate?: {
      start: Date;
      end: Date;
    };
    source?: string[];
    plan?: string[];
    features?: string[];
  };
}

export interface CohortMetrics {
  cohortId: string;
  period: string;
  userCount: number;
  activeUsers: number;
  retainedUsers: number;
  churnedUsers: number;
  retentionRate: number;
  churnRate: number;
  revenue: number;
  averageRevenue: number;
}

export interface RetentionMatrix {
  cohorts: string[];
  periods: string[];
  data: number[][]; // retention rates
}

// Additional missing types for compatibility
export type CohortType = 'registration' | 'first_purchase' | 'feature_adoption' | 'engagement';

export interface CohortRetentionData {
  cohortId: string;
  cohortDate: string;
  totalUsers: number;
  periods: {
    period: number;
    retainedUsers: number;
    retentionRate: number;
  }[];
}

export interface CohortRevenueData {
  cohortId: string;
  cohortDate: string;
  totalUsers: number;
  periods: {
    period: number;
    revenue: number;
    averageRevenuePerUser: number;
    cumulativeRevenue: number;
  }[];
}

export interface CohortSegmentation {
  segmentId: string;
  name: string;
  description: string;
  criteria: Record<string, any>;
  userCount: number;
  metrics: CohortMetrics;
}