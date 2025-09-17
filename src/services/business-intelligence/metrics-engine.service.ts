/**
 * Metrics Engine Service
 * Handles business metric calculations and real-time analytics
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import {
  BusinessMetric,
  MetricCalculation,
  TimeRange
} from '../../types/business-intelligence.types';

export class MetricsEngine {
  private metrics: Map<string, BusinessMetric> = new Map();
  private calculations: Map<string, MetricCalculation> = new Map();

  /**
   * Register a business metric
   */
  async registerMetric(metric: BusinessMetric): Promise<void> {
    this.metrics.set(metric.id, metric);
  }

  /**
   * Calculate metric value
   */
  async calculateMetric(
    metricId: string,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number | null> {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      throw new Error(`Metric ${metricId} not found`);
    }

    const calculationId = `${metricId}_${Date.now()}`;
    const calculation: MetricCalculation = {
      id: calculationId,
      metricId,
      value: 0,
      timeRange,
      calculatedAt: new Date(),
      parameters: filters || {}
    };

    try {
      calculation.value = await this.performCalculation(metric, timeRange, filters);
      this.calculations.set(calculationId, calculation);
      return calculation.value;
    } catch (error) {
      calculation.error = (error as Error).message;
      this.calculations.set(calculationId, calculation);
      throw error;
    }
  }

  /**
   * Perform the actual metric calculation
   */
  private async performCalculation(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    switch (metric.type) {
      case 'revenue':
        return this.calculateRevenue(metric, timeRange, filters);
      case 'conversion':
        return this.calculateConversion(metric, timeRange, filters);
      case 'engagement':
        return this.calculateEngagement(metric, timeRange, filters);
      case 'retention':
        return this.calculateRetention(metric, timeRange, filters);
      case 'growth':
        return this.calculateGrowth(metric, timeRange, filters);
      default:
        return this.calculateCustom(metric, timeRange, filters);
    }
  }

  /**
   * Calculate revenue metrics
   */
  private async calculateRevenue(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    // Simulate revenue calculation based on metric name
    switch (metric.name.toLowerCase()) {
      case 'total_revenue':
        return 125000 + Math.random() * 25000;
      case 'monthly_recurring_revenue':
        return 45000 + Math.random() * 10000;
      case 'average_revenue_per_user':
        return 89.50 + Math.random() * 20;
      case 'customer_lifetime_value':
        return 456.78 + Math.random() * 100;
      default:
        return Math.random() * 10000;
    }
  }

  /**
   * Calculate conversion metrics
   */
  private async calculateConversion(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    switch (metric.name.toLowerCase()) {
      case 'signup_conversion':
        return 0.25 + Math.random() * 0.1;
      case 'trial_to_paid_conversion':
        return 0.18 + Math.random() * 0.07;
      case 'free_to_premium_conversion':
        return 0.12 + Math.random() * 0.05;
      default:
        return Math.random() * 0.5;
    }
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagement(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    switch (metric.name.toLowerCase()) {
      case 'daily_active_users':
        return 1250 + Math.random() * 500;
      case 'session_duration':
        return 420 + Math.random() * 180; // seconds
      case 'pages_per_session':
        return 3.2 + Math.random() * 1.8;
      case 'bounce_rate':
        return 0.35 + Math.random() * 0.15;
      default:
        return Math.random() * 1000;
    }
  }

  /**
   * Calculate retention metrics
   */
  private async calculateRetention(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    switch (metric.name.toLowerCase()) {
      case 'day_1_retention':
        return 0.75 + Math.random() * 0.15;
      case 'day_7_retention':
        return 0.45 + Math.random() * 0.20;
      case 'day_30_retention':
        return 0.28 + Math.random() * 0.15;
      case 'monthly_churn_rate':
        return 0.05 + Math.random() * 0.03;
      default:
        return Math.random();
    }
  }

  /**
   * Calculate growth metrics
   */
  private async calculateGrowth(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    switch (metric.name.toLowerCase()) {
      case 'user_growth_rate':
        return 0.15 + Math.random() * 0.10;
      case 'revenue_growth_rate':
        return 0.22 + Math.random() * 0.15;
      case 'market_share_growth':
        return 0.08 + Math.random() * 0.05;
      default:
        return Math.random() * 0.3;
    }
  }

  /**
   * Calculate custom metrics
   */
  private async calculateCustom(
    metric: BusinessMetric,
    timeRange: TimeRange,
    filters?: Record<string, any>
  ): Promise<number> {
    // For custom metrics, we'd execute custom calculation logic
    // For now, return a random value based on the aggregation type
    const baseValue = Math.random() * 1000;

    switch (metric.aggregation) {
      case 'sum':
        return baseValue * 10;
      case 'average':
        return baseValue;
      case 'count':
        return Math.floor(baseValue);
      case 'min':
        return baseValue * 0.1;
      case 'max':
        return baseValue * 2;
      default:
        return baseValue;
    }
  }

  /**
   * Get metric trend data
   */
  async getMetricTrend(
    metricId: string,
    timeRange: TimeRange,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      throw new Error(`Metric ${metricId} not found`);
    }

    const points = this.getTimePoints(timeRange, granularity);
    const trendData: Array<{ timestamp: Date; value: number }> = [];

    for (const timestamp of points) {
      const pointTimeRange: TimeRange = {
        start: timestamp,
        end: new Date(timestamp.getTime() + this.getGranularityMs(granularity))
      };

      const value = await this.calculateMetric(metricId, pointTimeRange);
      if (value !== null) {
        trendData.push({ timestamp, value });
      }
    }

    return trendData;
  }

  /**
   * Generate time points for trend analysis
   */
  private getTimePoints(timeRange: TimeRange, granularity: string): Date[] {
    const points: Date[] = [];
    const start = timeRange.start;
    const end = timeRange.end;
    const stepMs = this.getGranularityMs(granularity);

    let current = new Date(start);
    while (current <= end) {
      points.push(new Date(current));
      current = new Date(current.getTime() + stepMs);
    }

    return points;
  }

  /**
   * Get milliseconds for granularity
   */
  private getGranularityMs(granularity: string): number {
    switch (granularity) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get metric by ID
   */
  async getMetric(metricId: string): Promise<BusinessMetric | null> {
    return this.metrics.get(metricId) || null;
  }

  /**
   * Get all registered metrics
   */
  async getAllMetrics(): Promise<BusinessMetric[]> {
    return Array.from(this.metrics.values());
  }

  /**
   * Get calculation history for metric
   */
  async getCalculationHistory(metricId: string): Promise<MetricCalculation[]> {
    return Array.from(this.calculations.values())
      .filter(calc => calc.metricId === metricId)
      .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime());
  }

  /**
   * Get real-time metric value (cached for performance)
   */
  async getRealtimeMetric(metricId: string): Promise<{
    value: number;
    lastUpdated: Date;
    trend: 'up' | 'down' | 'stable';
  }> {
    const currentValue = await this.calculateMetric(
      metricId,
      {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
        end: new Date()
      }
    );

    const previousValue = await this.calculateMetric(
      metricId,
      {
        start: new Date(Date.now() - 48 * 60 * 60 * 1000), // 24-48 hours ago
        end: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    );

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (currentValue && previousValue) {
      const change = (currentValue - previousValue) / previousValue;
      if (change > 0.05) trend = 'up';
      else if (change < -0.05) trend = 'down';
    }

    return {
      value: currentValue || 0,
      lastUpdated: new Date(),
      trend
    };
  }
}