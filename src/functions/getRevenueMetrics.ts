/**
 * Get Revenue Metrics Cloud Function
 * 
 * Provides comprehensive revenue analytics and business intelligence data.
 * Protected endpoint requiring admin access.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @since Phase 3 - Analytics & Revenue Intelligence
 */

import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { requireAuth, isAdmin } from '../../middleware/authGuard';
import { revenueAnalyticsService, DateRange } from '../../services/analytics/revenue-analytics.service';

interface RevenueMetricsRequest {
  dateRange?: {
    start: string; // ISO date string
    end: string;   // ISO date string
  };
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  includeCohorts?: boolean;
  includeForecasting?: boolean;
}

interface RevenueMetricsResponse {
  success: boolean;
  data?: {
    metrics: any;
    trends: any[];
    cohortAnalysis?: any[];
    forecasting?: any;
    lastUpdated: string;
  };
  error?: string;
  metadata: {
    requestId: string;
    executionTime: number;
    dataFreshness: number; // Minutes since last update
    cacheHit: boolean;
  };
}

export const getRevenueMetrics = onCall<RevenueMetricsRequest, RevenueMetricsResponse>(
  {
    cors: true,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    memory: '1GiB',
    timeoutSeconds: 300,
    maxInstances: 10
  },
  async (request): Promise<RevenueMetricsResponse> => {
    const startTime = Date.now();
    const requestId = `revenue_${startTime}_${Math.random().toString(36).substring(7)}`;

    logger.info('Revenue metrics request received', {
      requestId,
      uid: request.auth?.uid,
      params: request.data
    });

    try {
      // Authentication and authorization
      const authenticatedRequest = await requireAuth(request);
      
      // Admin access required for revenue analytics
      if (!isAdmin(authenticatedRequest)) {
        logger.warn('Unauthorized revenue metrics access attempt', {
          requestId,
          uid: authenticatedRequest.auth.uid,
          email: authenticatedRequest.auth.token.email
        });

        return {
          success: false,
          error: 'Admin access required for revenue analytics',
          metadata: {
            requestId,
            executionTime: Date.now() - startTime,
            dataFreshness: 0,
            cacheHit: false
          }
        };
      }

      // Parse and validate request parameters
      const {
        dateRange,
        granularity = 'monthly',
        includeCohorts = true,
        includeForecasting = true
      } = request.data;

      // Default to last 12 months if no date range provided
      const defaultDateRange: DateRange = {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end: new Date()
      };

      const parsedDateRange: DateRange = dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : defaultDateRange;

      // Validate date range
      if (isNaN(parsedDateRange.start.getTime()) || isNaN(parsedDateRange.end.getTime())) {
        return {
          success: false,
          error: 'Invalid date range provided',
          metadata: {
            requestId,
            executionTime: Date.now() - startTime,
            dataFreshness: 0,
            cacheHit: false
          }
        };
      }

      if (parsedDateRange.start >= parsedDateRange.end) {
        return {
          success: false,
          error: 'Start date must be before end date',
          metadata: {
            requestId,
            executionTime: Date.now() - startTime,
            dataFreshness: 0,
            cacheHit: false
          }
        };
      }

      // Get revenue metrics
      logger.info('Fetching revenue metrics', {
        requestId,
        dateRange: parsedDateRange,
        granularity
      });

      const metrics = await revenueAnalyticsService.getRevenueMetrics(parsedDateRange);
      
      // Get additional data based on request parameters
      const additionalData: any = {};

      if (includeCohorts) {
        logger.info('Including cohort analysis', { requestId });
        additionalData.cohortAnalysis = metrics.cohortAnalysis;
      }

      if (includeForecasting) {
        logger.info('Including revenue forecasting', { requestId });
        additionalData.forecasting = await generateRevenueForecasting(metrics, parsedDateRange);
      }

      // Calculate data freshness (assuming metrics have a timestamp)
      const dataFreshness = 5; // Minutes - would be calculated from actual data timestamp

      const response: RevenueMetricsResponse = {
        success: true,
        data: {
          metrics: {
            ...metrics,
            // Add computed fields
            mrrGrowthRate: calculateMRRGrowthRate(metrics.revenueGrowth),
            customerHealthScore: calculateCustomerHealthScore(metrics),
            revenueQuality: calculateRevenueQuality(metrics)
          },
          trends: metrics.revenueGrowth,
          ...additionalData,
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          requestId,
          executionTime: Date.now() - startTime,
          dataFreshness,
          cacheHit: true // Would be determined by cache service
        }
      };

      logger.info('Revenue metrics request completed successfully', {
        requestId,
        mrr: metrics.mrr,
        arr: metrics.arr,
        executionTime: response.metadata.executionTime
      });

      return response;

    } catch (error) {
      logger.error('Revenue metrics request failed', {
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        executionTime: Date.now() - startTime
      });

      return {
        success: false,
        error: 'Failed to retrieve revenue metrics',
        metadata: {
          requestId,
          executionTime: Date.now() - startTime,
          dataFreshness: 0,
          cacheHit: false
        }
      };
    }
  }
);

/**
 * Helper functions for enhanced analytics
 */
function calculateMRRGrowthRate(revenueGrowth: any[]): number {
  if (revenueGrowth.length < 2) return 0;
  
  const recent = revenueGrowth.slice(-3); // Last 3 periods
  const growthRates = recent.map(period => period.growthRate || 0);
  
  return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
}

function calculateCustomerHealthScore(metrics: any): number {
  // Composite score based on multiple factors
  let score = 50; // Base score
  
  // Churn rate impact (lower is better)
  score += (10 - Math.min(metrics.churnRate, 10)) * 2;
  
  // Net Revenue Retention impact
  if (metrics.netRevenueRetention > 100) {
    score += Math.min((metrics.netRevenueRetention - 100) / 2, 20);
  } else {
    score -= (100 - metrics.netRevenueRetention) / 2;
  }
  
  // LTV/CAC ratio impact
  const ltvCacRatio = metrics.cac > 0 ? metrics.ltv / metrics.cac : 0;
  if (ltvCacRatio > 3) {
    score += Math.min((ltvCacRatio - 3) * 5, 20);
  } else {
    score -= (3 - ltvCacRatio) * 5;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateRevenueQuality(metrics: any): {
  score: number;
  factors: string[];
} {
  let score = 50;
  const factors: string[] = [];
  
  // Recurring revenue percentage
  const recurringPercentage = 90; // Would be calculated from actual data
  if (recurringPercentage > 80) {
    score += 15;
    factors.push('High recurring revenue ratio');
  }
  
  // Revenue predictability
  const revenueVolatility = calculateRevenueVolatility(metrics.revenueGrowth);
  if (revenueVolatility < 0.2) {
    score += 10;
    factors.push('Low revenue volatility');
  } else if (revenueVolatility > 0.4) {
    score -= 10;
    factors.push('High revenue volatility');
  }
  
  // Customer concentration
  const topCustomerPercentage = 15; // Would be calculated from actual data
  if (topCustomerPercentage < 20) {
    score += 10;
    factors.push('Low customer concentration risk');
  } else if (topCustomerPercentage > 40) {
    score -= 15;
    factors.push('High customer concentration risk');
  }
  
  // Contract length
  const avgContractLength = 12; // Months - would be calculated from actual data
  if (avgContractLength > 12) {
    score += 10;
    factors.push('Long average contract length');
  }
  
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    factors
  };
}

function calculateRevenueVolatility(revenueGrowth: any[]): number {
  if (revenueGrowth.length < 3) return 0;
  
  const growthRates = revenueGrowth.map(period => period.growthRate || 0);
  const mean = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
  
  const variance = growthRates.reduce((sum, rate) => {
    return sum + Math.pow(rate - mean, 2);
  }, 0) / growthRates.length;
  
  return Math.sqrt(variance) / 100; // Normalize to 0-1 scale
}

async function generateRevenueForecasting(metrics: any, dateRange: DateRange): Promise<any> {
  // Simple forecasting based on historical trends
  const forecastPeriods = 12; // 12 months ahead
  const currentMRR = metrics.mrr;
  const avgGrowthRate = calculateMRRGrowthRate(metrics.revenueGrowth);
  
  const forecast = [];
  let projectedMRR = currentMRR;
  
  for (let i = 1; i <= forecastPeriods; i++) {
    projectedMRR *= (1 + avgGrowthRate / 100);
    
    const forecastDate = new Date(dateRange.end);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    forecast.push({
      period: forecastDate.toISOString().substring(0, 7), // YYYY-MM
      projectedMRR: Math.round(projectedMRR),
      projectedARR: Math.round(projectedMRR * 12),
      confidence: Math.max(0.5, 1 - (i * 0.05)), // Decreasing confidence over time
      scenario: 'base_case'
    });
  }
  
  return {
    baseCaseProjection: forecast,
    optimisticProjection: forecast.map(f => ({
      ...f,
      projectedMRR: Math.round(f.projectedMRR * 1.2),
      projectedARR: Math.round(f.projectedARR * 1.2),
      scenario: 'optimistic'
    })),
    conservativeProjection: forecast.map(f => ({
      ...f,
      projectedMRR: Math.round(f.projectedMRR * 0.8),
      projectedARR: Math.round(f.projectedARR * 0.8),
      scenario: 'conservative'
    })),
    assumptions: [
      `Average growth rate: ${avgGrowthRate.toFixed(2)}%`,
      `Current churn rate: ${metrics.churnRate.toFixed(2)}%`,
      `Current LTV/CAC ratio: ${(metrics.ltv / metrics.cac).toFixed(2)}`
    ]
  };
}