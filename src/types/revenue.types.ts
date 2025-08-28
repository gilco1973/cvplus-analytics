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