export interface AnalyticsConfig {
  trackingEnabled: boolean;
  dataRetentionDays: number;
  batchSize: number;
  flushInterval: number;
  endpoints: {
    events: string;
    metrics: string;
    reports: string;
  };
}

export interface TrackingEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  properties: Record<string, any>;
  context: {
    userAgent?: string;
    ip?: string;
    page?: string;
    referrer?: string;
  };
}

export interface MetricDefinition {
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  tags?: string[];
}

export interface AnalyticsError {
  code: string;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}