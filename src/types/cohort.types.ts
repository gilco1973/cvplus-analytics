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