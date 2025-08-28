// CVPlus Analytics Module
// Advanced analytics, revenue tracking, and business intelligence

// Services
export * from './services/revenue-analytics.service';
export * from './services/cohort-analysis.service';

// Functions
export * from './functions/getRevenueMetrics';

// Types
export * from './types';

// Constants  
export * from './constants';

// Utils
export * from './utils';

// Main Analytics Service
export class AnalyticsService {
  static initialized = false;
  
  static async initialize(config?: any) {
    // Initialize analytics service
    this.initialized = true;
  }
  
  static isInitialized(): boolean {
    return this.initialized;
  }
}

// Version
export const VERSION = '1.0.0';