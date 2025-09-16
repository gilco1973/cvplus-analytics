/**
 * Analytics Constants
 */
export const ANALYTICS_EVENTS = {
  USER_REGISTRATION: 'user_registration',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  FEATURE_USAGE: 'feature_usage',
  CV_GENERATED: 'cv_generated',
  CV_DOWNLOADED: 'cv_downloaded',
  CV_SHARED: 'cv_shared',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed'
} as const;

export const REVENUE_SOURCES = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one-time',
  UPGRADE: 'upgrade',
  ADDON: 'addon'
} as const;

export const COHORT_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
} as const;

export const METRIC_TYPES = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
} as const;

export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  AREA: 'area',
  DOUGHNUT: 'doughnut'
} as const;

export const DASHBOARD_REFRESH_INTERVALS = {
  REAL_TIME: 5000,    // 5 seconds
  FAST: 30000,        // 30 seconds
  NORMAL: 300000,     // 5 minutes
  SLOW: 900000,       // 15 minutes
  HOURLY: 3600000     // 1 hour
} as const;

// Default configurations
export const DEFAULT_ANALYTICS_CONFIG = {
  trackingEnabled: true,
  dataRetentionDays: 365,
  batchSize: 100,
  flushInterval: 30000,
  endpoints: {
    events: '/api/analytics/events',
    metrics: '/api/analytics/metrics',
    reports: '/api/analytics/reports'
  }
};

export const DEFAULT_COHORT_CONFIG = {
  period: COHORT_PERIODS.MONTHLY,
  retentionPeriods: 12,
  minimumCohortSize: 10
};

export const REVENUE_THRESHOLDS = {
  LOW_VALUE: 100,
  HIGH_VALUE: 1000,
  ENTERPRISE_VALUE: 10000
};

export const KPI_TARGETS = {
  MONTHLY_CHURN_RATE: 0.05,    // 5%
  CUSTOMER_LIFETIME_VALUE: 500,
  CUSTOMER_ACQUISITION_COST: 50,
  CONVERSION_RATE: 0.15,        // 15%
  NET_PROMOTER_SCORE: 50
};