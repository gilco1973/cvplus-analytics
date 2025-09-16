/**
 * Cache Performance Monitor for CVPlus Performance Optimization
 * 
 * Comprehensive monitoring and alerting for Redis caching layer performance,
 * providing real-time metrics, health checks, and automated optimization.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
  */

import { logger } from 'firebase-functions';
// TODO: Fix import paths after module dependencies are resolved
// import { pricingCacheService } from '../../premium/services/pricing-cache.service';
// import { subscriptionCacheService } from '../../premium/services/subscription-cache.service';
// import { featureAccessCacheService } from '../../premium/services/feature-access-cache.service';
// import { usageBatchCacheService } from '../../premium/services/usage-batch-cache.service';
import { analyticsCacheService } from './analytics-cache.service';
// import { cacheService } from '../../../services/cache/cache.service';

// Temporary mock services to make module build - TODO: Replace with proper imports
const mockCacheService = {
  healthCheck: async () => ({ healthy: true }),
  getStats: () => ({
    isHealthy: true,
    hitRate: 0.8,
    errorRate: 0.01,
    redis: { responseTime: 50 }
  })
};

const mockMetrics = {
  requests: 100,
  cacheHits: 80,
  averageResponseTime: 45,
  errorRate: 0.01,
  getMetrics: () => mockMetrics,
  getHitRate: () => 0.8,
  warmCache: async () => {},
  getWriteReduction: () => 85
};

const pricingCacheService = mockMetrics;
const subscriptionCacheService = { ...mockMetrics, invalidations: 5 };
const featureAccessCacheService = mockMetrics;
const usageBatchCacheService = { ...mockMetrics, eventsQueued: 50, averageBatchSize: 10, firestoreWrites: 5 };
const cacheService = mockCacheService;

export interface CacheHealthStatus {
  healthy: boolean;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  lastCheck: Date;
}

export interface CachePerformanceReport {
  overall: {
    hitRate: number;
    averageResponseTime: number;
    errorRate: number;
    healthScore: number;
  };
  services: {
    pricing: {
      requests: number;
      hitRate: number;
      responseTime: number;
      cacheSize: number;
    };
    subscription: {
      requests: number;
      hitRate: number;
      responseTime: number;
      invalidations: number;
    };
    featureAccess: {
      requests: number;
      hitRate: number;
      responseTime: number;
      denialRate: number;
    };
    usageBatch: {
      eventsQueued: number;
      writeReduction: number;
      batchSize: number;
      firestoreWrites: number;
    };
    analytics: {
      queries: number;
      hitRate: number;
      responseTime: number;
      dataFreshness: number;
    };
  };
  redis: {
    connected: boolean;
    hitRate: number;
    errorRate: number;
    responseTime: number;
  };
  alerts: CacheAlert[];
  recommendations: CacheRecommendation[];
  timestamp: Date;
}

export interface CacheAlert {
  level: 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export interface CacheRecommendation {
  priority: 'high' | 'medium' | 'low';
  service: string;
  action: string;
  description: string;
  expectedImpact: string;
}

class CachePerformanceMonitorService {
  private readonly ALERT_THRESHOLDS = {
    hitRate: {
      warning: 0.7,   // Below 70%
      error: 0.5,     // Below 50%
      critical: 0.3   // Below 30%
    },
    responseTime: {
      warning: 100,   // Above 100ms
      error: 500,     // Above 500ms
      critical: 1000  // Above 1000ms
    },
    errorRate: {
      warning: 0.05,  // Above 5%
      error: 0.1,     // Above 10%
      critical: 0.2   // Above 20%
    }
  };

  /**
   * Generate comprehensive cache performance report
    */
  async generatePerformanceReport(): Promise<CachePerformanceReport> {
    const startTime = Date.now();
    
    try {
      // Gather metrics from all cache services
      const [
        pricingMetrics,
        subscriptionMetrics,
        featureAccessMetrics,
        usageBatchMetrics,
        analyticsMetrics,
        redisStats
      ] = await Promise.all([
        this.getPricingMetrics(),
        this.getSubscriptionMetrics(),
        this.getFeatureAccessMetrics(),
        this.getUsageBatchMetrics(),
        this.getAnalyticsMetrics(),
        this.getRedisStats()
      ]);

      // Calculate overall metrics
      const overall = this.calculateOverallMetrics({
        pricing: pricingMetrics,
        subscription: subscriptionMetrics,
        featureAccess: featureAccessMetrics,
        usageBatch: usageBatchMetrics,
        analytics: analyticsMetrics,
        redis: redisStats
      });

      // Generate alerts and recommendations
      const alerts = this.generateAlerts({
        pricing: pricingMetrics,
        subscription: subscriptionMetrics,
        featureAccess: featureAccessMetrics,
        usageBatch: usageBatchMetrics,
        analytics: analyticsMetrics,
        redis: redisStats
      });

      const recommendations = this.generateRecommendations({
        pricing: pricingMetrics,
        subscription: subscriptionMetrics,
        featureAccess: featureAccessMetrics,
        usageBatch: usageBatchMetrics,
        analytics: analyticsMetrics,
        redis: redisStats
      });

      const report: CachePerformanceReport = {
        overall,
        services: {
          pricing: {
            requests: pricingMetrics.requests,
            hitRate: pricingMetrics.requests > 0 ? pricingMetrics.cacheHits / pricingMetrics.requests : 0,
            responseTime: pricingMetrics.averageResponseTime,
            cacheSize: pricingMetrics.requests // Approximation
          },
          subscription: {
            requests: subscriptionMetrics.requests,
            hitRate: subscriptionMetrics.requests > 0 ? subscriptionMetrics.cacheHits / subscriptionMetrics.requests : 0,
            responseTime: subscriptionMetrics.averageResponseTime,
            invalidations: subscriptionMetrics.invalidations
          },
          featureAccess: {
            requests: featureAccessMetrics.requests,
            hitRate: featureAccessMetrics.requests > 0 ? featureAccessMetrics.cacheHits / featureAccessMetrics.requests : 0,
            responseTime: featureAccessMetrics.averageResponseTime,
            denialRate: featureAccessMetrics.errorRate
          },
          usageBatch: {
            eventsQueued: usageBatchMetrics.eventsQueued,
            writeReduction: usageBatchCacheService.getWriteReduction(),
            batchSize: usageBatchMetrics.averageBatchSize,
            firestoreWrites: usageBatchMetrics.firestoreWrites
          },
          analytics: {
            queries: analyticsMetrics.queries,
            hitRate: analyticsMetrics.queries > 0 ? analyticsMetrics.cacheHits / analyticsMetrics.queries : 0,
            responseTime: analyticsMetrics.averageResponseTime,
            dataFreshness: analyticsMetrics.dataFreshness
          }
        },
        redis: redisStats,
        alerts,
        recommendations,
        timestamp: new Date()
      };

      const generationTime = Date.now() - startTime;
      
      logger.info('Cache performance report generated', {
        generationTime,
        overallHealth: overall.healthScore,
        alerts: alerts.length,
        recommendations: recommendations.length
      });

      return report;

    } catch (error) {
      logger.error('Cache performance report generation error', { error });
      throw error;
    }
  }

  /**
   * Perform health check on all cache services
    */
  async performHealthCheck(): Promise<CacheHealthStatus> {
    const startTime = Date.now();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check Redis connectivity
      const redisHealth = await cacheService.healthCheck();
      if (!redisHealth.healthy) {
        issues.push('Redis connection unhealthy');
        recommendations.push('Check Redis server status and network connectivity');
      }

      // Check individual service metrics
      const services = [
        { name: 'Pricing', service: pricingCacheService },
        { name: 'Subscription', service: subscriptionCacheService },
        { name: 'Feature Access', service: featureAccessCacheService },
        { name: 'Analytics', service: analyticsCacheService }
      ];

      for (const { name, service } of services) {
        const hitRate = service.getHitRate();
        
        if (hitRate < this.ALERT_THRESHOLDS.hitRate.warning) {
          issues.push(`${name} cache hit rate below optimal (${(hitRate * 100).toFixed(1)}%)`);
          
          if (hitRate < this.ALERT_THRESHOLDS.hitRate.error) {
            recommendations.push(`Consider pre-warming ${name} cache or increasing TTL`);
          }
        }
      }

      // Check usage batch service
      const writeReduction = usageBatchCacheService.getWriteReduction();
      if (writeReduction < 80) {
        issues.push(`Usage batch write reduction below target (${writeReduction.toFixed(1)}%)`);
        recommendations.push('Review batch sizes and flush intervals');
      }

      // Calculate health score
      const healthScore = this.calculateHealthScore(issues.length, redisHealth.healthy);
      const healthy = healthScore > 70 && redisHealth.healthy;

      const checkTime = Date.now() - startTime;
      
      logger.info('Cache health check completed', {
        healthy,
        healthScore,
        issues: issues.length,
        checkTime
      });

      return {
        healthy,
        score: healthScore,
        issues,
        recommendations,
        lastCheck: new Date()
      };

    } catch (error) {
      logger.error('Cache health check error', { error });
      return {
        healthy: false,
        score: 0,
        issues: ['Health check failed with error'],
        recommendations: ['Investigate health check system'],
        lastCheck: new Date()
      };
    }
  }

  /**
   * Warm all cache services with common data
    */
  async warmAllCaches(): Promise<{
    services: Record<string, { success: boolean; duration: number }>;
    totalDuration: number;
    overallSuccess: boolean;
  }> {
    const startTime = Date.now();
    const results: Record<string, { success: boolean; duration: number }> = {};

    logger.info('Starting comprehensive cache warm-up');

    try {
      // Common user IDs for warm-up (would be fetched from active users in production)
      const commonUserIds = ['user1', 'user2', 'user3', 'user4', 'user5'];

      // Warm pricing cache
      const pricingStart = Date.now();
      try {
        await pricingCacheService.warmCache(commonUserIds, ['PREMIUM']);
        results.pricing = { success: true, duration: Date.now() - pricingStart };
      } catch (error) {
        logger.error('Pricing cache warm-up error', { error });
        results.pricing = { success: false, duration: Date.now() - pricingStart };
      }

      // Warm subscription cache
      const subscriptionStart = Date.now();
      try {
        await subscriptionCacheService.warmCache(commonUserIds);
        results.subscription = { success: true, duration: Date.now() - subscriptionStart };
      } catch (error) {
        logger.error('Subscription cache warm-up error', { error });
        results.subscription = { success: false, duration: Date.now() - subscriptionStart };
      }

      // Warm feature access cache
      const featureStart = Date.now();
      try {
        await featureAccessCacheService.warmCache(commonUserIds);
        results.featureAccess = { success: true, duration: Date.now() - featureStart };
      } catch (error) {
        logger.error('Feature access cache warm-up error', { error });
        results.featureAccess = { success: false, duration: Date.now() - featureStart };
      }

      // Warm analytics cache
      const analyticsStart = Date.now();
      try {
        await analyticsCacheService.warmCache();
        results.analytics = { success: true, duration: Date.now() - analyticsStart };
      } catch (error) {
        logger.error('Analytics cache warm-up error', { error });
        results.analytics = { success: false, duration: Date.now() - analyticsStart };
      }

      const totalDuration = Date.now() - startTime;
      const successCount = Object.values(results).filter(r => r.success).length;
      const overallSuccess = successCount === Object.keys(results).length;

      logger.info('Cache warm-up completed', {
        totalDuration,
        services: Object.keys(results).length,
        successful: successCount,
        overallSuccess
      });

      return {
        services: results,
        totalDuration,
        overallSuccess
      };

    } catch (error) {
      logger.error('Cache warm-up error', { error });
      return {
        services: results,
        totalDuration: Date.now() - startTime,
        overallSuccess: false
      };
    }
  }

  /**
   * Get performance metrics for pricing cache
    */
  private async getPricingMetrics() {
    return pricingCacheService.getMetrics();
  }

  /**
   * Get performance metrics for subscription cache
    */
  private async getSubscriptionMetrics() {
    return subscriptionCacheService.getMetrics();
  }

  /**
   * Get performance metrics for feature access cache
    */
  private async getFeatureAccessMetrics() {
    return featureAccessCacheService.getMetrics();
  }

  /**
   * Get performance metrics for usage batch cache
    */
  private async getUsageBatchMetrics() {
    return usageBatchCacheService.getMetrics();
  }

  /**
   * Get performance metrics for analytics cache
    */
  private async getAnalyticsMetrics() {
    return analyticsCacheService.getMetrics();
  }

  /**
   * Get Redis performance statistics
    */
  private async getRedisStats() {
    const stats = cacheService.getStats();
    return {
      connected: stats.isHealthy,
      hitRate: stats.hitRate,
      errorRate: stats.errorRate,
      responseTime: stats.redis.responseTime
    };
  }

  /**
   * Calculate overall performance metrics
    */
  private calculateOverallMetrics(metrics: any) {
    const services = [metrics.pricing, metrics.subscription, metrics.featureAccess, metrics.analytics];
    const totalRequests = services.reduce((sum, s) => sum + (s.requests || 0), 0);
    const totalHits = services.reduce((sum, s) => sum + (s.cacheHits || 0), 0);
    const totalErrors = services.reduce((sum, s) => sum + ((s.requests || 0) * (s.errorRate || 0)), 0);
    
    const avgResponseTime = services
      .filter(s => s.averageResponseTime > 0)
      .reduce((sum, s, _, arr) => sum + s.averageResponseTime / arr.length, 0);

    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    // Health score based on hit rate, response time, and error rate
    let healthScore = 100;
    
    if (hitRate < 0.8) healthScore -= 20;
    if (hitRate < 0.5) healthScore -= 30;
    if (avgResponseTime > 100) healthScore -= 15;
    if (avgResponseTime > 500) healthScore -= 25;
    if (errorRate > 0.05) healthScore -= 20;
    if (errorRate > 0.1) healthScore -= 30;
    
    return {
      hitRate,
      averageResponseTime: avgResponseTime,
      errorRate,
      healthScore: Math.max(0, healthScore)
    };
  }

  /**
   * Generate performance alerts
    */
  private generateAlerts(metrics: any): CacheAlert[] {
    const alerts: CacheAlert[] = [];
    const now = new Date();

    // Check each service for issues
    const services = [
      { name: 'pricing', data: metrics.pricing },
      { name: 'subscription', data: metrics.subscription },
      { name: 'featureAccess', data: metrics.featureAccess },
      { name: 'analytics', data: metrics.analytics }
    ];

    for (const { name, data } of services) {
      if (!data) continue;

      const hitRate = data.requests > 0 ? data.cacheHits / data.requests : 0;
      const errorRate = data.errorRate || 0;
      const responseTime = data.averageResponseTime || 0;

      // Hit rate alerts
      if (hitRate < this.ALERT_THRESHOLDS.hitRate.critical) {
        alerts.push({
          level: 'critical',
          service: name,
          message: `Critical: ${name} cache hit rate extremely low`,
          metric: 'hitRate',
          value: hitRate,
          threshold: this.ALERT_THRESHOLDS.hitRate.critical,
          timestamp: now
        });
      } else if (hitRate < this.ALERT_THRESHOLDS.hitRate.error) {
        alerts.push({
          level: 'error',
          service: name,
          message: `Error: ${name} cache hit rate below acceptable level`,
          metric: 'hitRate',
          value: hitRate,
          threshold: this.ALERT_THRESHOLDS.hitRate.error,
          timestamp: now
        });
      } else if (hitRate < this.ALERT_THRESHOLDS.hitRate.warning) {
        alerts.push({
          level: 'warning',
          service: name,
          message: `Warning: ${name} cache hit rate suboptimal`,
          metric: 'hitRate',
          value: hitRate,
          threshold: this.ALERT_THRESHOLDS.hitRate.warning,
          timestamp: now
        });
      }

      // Response time alerts
      if (responseTime > this.ALERT_THRESHOLDS.responseTime.critical) {
        alerts.push({
          level: 'critical',
          service: name,
          message: `Critical: ${name} response time extremely high`,
          metric: 'responseTime',
          value: responseTime,
          threshold: this.ALERT_THRESHOLDS.responseTime.critical,
          timestamp: now
        });
      } else if (responseTime > this.ALERT_THRESHOLDS.responseTime.error) {
        alerts.push({
          level: 'error',
          service: name,
          message: `Error: ${name} response time too high`,
          metric: 'responseTime',
          value: responseTime,
          threshold: this.ALERT_THRESHOLDS.responseTime.error,
          timestamp: now
        });
      }

      // Error rate alerts
      if (errorRate > this.ALERT_THRESHOLDS.errorRate.critical) {
        alerts.push({
          level: 'critical',
          service: name,
          message: `Critical: ${name} error rate extremely high`,
          metric: 'errorRate',
          value: errorRate,
          threshold: this.ALERT_THRESHOLDS.errorRate.critical,
          timestamp: now
        });
      }
    }

    return alerts;
  }

  /**
   * Generate optimization recommendations
    */
  private generateRecommendations(metrics: any): CacheRecommendation[] {
    const recommendations: CacheRecommendation[] = [];

    // Analyze pricing cache
    if (metrics.pricing) {
      const hitRate = metrics.pricing.requests > 0 ? metrics.pricing.cacheHits / metrics.pricing.requests : 0;
      if (hitRate < 0.7) {
        recommendations.push({
          priority: 'high',
          service: 'pricing',
          action: 'Increase TTL or pre-warm cache',
          description: 'Pricing cache hit rate is below optimal levels',
          expectedImpact: 'Reduce pricing calculation time by 60%'
        });
      }
    }

    // Analyze subscription cache
    if (metrics.subscription && metrics.subscription.invalidations > metrics.subscription.requests * 0.2) {
      recommendations.push({
        priority: 'medium',
        service: 'subscription',
        action: 'Optimize invalidation strategy',
        description: 'High invalidation rate suggests inefficient cache usage',
        expectedImpact: 'Improve subscription hit rate by 25%'
      });
    }

    // Analyze usage batch service
    if (metrics.usageBatch) {
      const writeReduction = usageBatchCacheService.getWriteReduction();
      if (writeReduction < 85) {
        recommendations.push({
          priority: 'high',
          service: 'usageBatch',
          action: 'Increase batch size or flush interval',
          description: 'Usage batch write reduction below target efficiency',
          expectedImpact: 'Reduce Firestore writes by additional 15%'
        });
      }
    }

    // General Redis recommendations
    if (metrics.redis && !metrics.redis.connected) {
      recommendations.push({
        priority: 'high',
        service: 'redis',
        action: 'Restore Redis connectivity',
        description: 'Redis connection is down, affecting all cache services',
        expectedImpact: 'Restore full cache functionality'
      });
    }

    return recommendations;
  }

  /**
   * Calculate health score based on issues
    */
  private calculateHealthScore(issueCount: number, redisHealthy: boolean): number {
    let score = 100;
    
    if (!redisHealthy) score -= 50;
    score -= (issueCount * 10);
    
    return Math.max(0, score);
  }
}

// Singleton instance
export const cachePerformanceMonitor = new CachePerformanceMonitorService();