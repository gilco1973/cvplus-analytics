/**
 * Core Analytics Types
 * Base analytics functionality and metrics
 *
 * Originally from cv-processing, moved to analytics submodule for proper domain boundaries.
 * These types provide foundational analytics interfaces used across the CVPlus platform.
  */

export interface AnalyticsMetrics {
  pageViews: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  totalSessions: number;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  properties: Record<string, unknown>;
}

export interface AnalyticsSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  pageViews: number;
  events: AnalyticsEvent[];
  referrer?: string;
  userAgent?: string;
}

export interface AnalyticsReport {
  period: {
    start: number;
    end: number;
  };
  metrics: AnalyticsMetrics;
  topPages: PageMetrics[];
  topSources: SourceMetrics[];
  userFlow: UserFlowStep[];
}

export interface PageMetrics {
  path: string;
  views: number;
  uniqueViews: number;
  averageTime: number;
  exitRate: number;
}

export interface SourceMetrics {
  source: string;
  visitors: number;
  sessions: number;
  bounceRate: number;
}

export interface UserFlowStep {
  step: number;
  page: string;
  users: number;
  dropoffRate: number;
}