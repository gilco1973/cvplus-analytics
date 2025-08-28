export interface RevenueData {
  amount: number;
  currency: string;
  timestamp: Date;
  source: 'subscription' | 'one-time' | 'upgrade' | 'addon';
  userId: string;
  planId?: string;
  transactionId: string;
}

export interface RevenueBreakdown {
  subscriptions: number;
  oneTime: number;
  upgrades: number;
  addons: number;
  refunds: number;
  netRevenue: number;
}

export interface RevenueForecast {
  period: string;
  predictedRevenue: number;
  confidence: number;
  factors: string[];
  modelVersion: string;
}

// Additional missing types for compatibility
export type RevenueStreamType = 'subscription' | 'one-time' | 'upgrade' | 'addon' | 'commission' | 'affiliate';

export interface RevenueProjection {
  projectionId: string;
  timeframe: 'monthly' | 'quarterly' | 'yearly';
  baseRevenue: number;
  growthRate: number;
  projectedRevenue: number;
  confidence: number;
  assumptions: string[];
  scenarioType: 'conservative' | 'optimistic' | 'pessimistic';
  createdAt: Date;
}

export interface RevenueComparison {
  comparisonId: string;
  periodA: {
    start: Date;
    end: Date;
    revenue: number;
  };
  periodB: {
    start: Date;
    end: Date;
    revenue: number;
  };
  growthRate: number;
  growthAmount: number;
  metrics: {
    arpu: { current: number; previous: number; change: number };
    mrr: { current: number; previous: number; change: number };
    churnRate: { current: number; previous: number; change: number };
  };
}