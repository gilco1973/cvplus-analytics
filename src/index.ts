// CVPlus Analytics Module
// Advanced analytics, revenue tracking, and business intelligence

// Services
export { 
  RevenueAnalyticsService,
  revenueAnalyticsService,
  type DateRange,
  type RevenueMetrics as AnalyticsRevenueMetrics,
  type CohortData,
  type GrowthData
} from './services/revenue-analytics.service';

export {
  CohortAnalysisService,
  cohortAnalysisService,
  type CohortAnalysisParams,
  type CohortMetrics as AnalyticsCohortMetrics,
  type CohortPeriod,
  type CohortComparison
} from './services/cohort-analysis.service';

// Functions
export { getRevenueMetrics } from './functions/getRevenueMetrics';

// Types (specific exports to avoid conflicts)
// export * from './types';

// Constants (specific exports to avoid conflicts)
// export * from './constants';

// Utils (specific exports to avoid conflicts)
// export * from './utils';

// Main Analytics Service
export class AnalyticsService {
  static initialized = false;
  
  static async initialize() {
    // Initialize analytics service
    this.initialized = true;
  }
  
  static isInitialized(): boolean {
    return this.initialized;
  }
}

// Version
export const VERSION = '1.0.0';