/**
 * @cvplus/recommendations - Performance Metrics Manager
 * 
 * Handles performance monitoring, metrics tracking, and health checks
 * for the recommendations system. Provides alerting and threshold monitoring.
 * 
 * @author Gil Klainert
 * @version 1.0.0
*/

import { RecommendationErrorType } from '../types/analytics-errors';
import type {
  PerformanceMetrics,
  RecommendationError,
  CacheStats
} from '../types/analytics-errors';
import type { CacheService } from './cache/cache.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const PERFORMANCE_TARGETS = {
  maxResponseTime: 30000, // 30 seconds
  maxTimeoutRate: 2, // 2%
  minCacheHitRate: 60, // 60%
  maxErrorRate: 2 // 2%
};

// ============================================================================
// PERFORMANCE METRICS MANAGER
// ============================================================================

export class PerformanceMetricsManager {
  private performanceMetrics: PerformanceMetrics;
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private timeoutCount = 0;
  private reportingTimer: NodeJS.Timeout | null = null;
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.performanceMetrics = this.initializeMetrics();
    this.startPerformanceTracking();
  }

  /**
   * Initialize default metrics
  */
  private initializeMetrics(): PerformanceMetrics {
    return {
      requestDuration: 0,
      cacheHitRate: 0,
      errorRate: 0,
      timeoutRate: 0,
      throughput: 0,
      aiApiLatency: 0,
      queueDepth: 0,
      memoryUsage: 0,
      timestamp: new Date()
    };
  }

  /**
   * Record successful request
  */
  recordSuccess(duration: number, fromCache: boolean): void {
    this.requestCount++;
    this.successCount++;
    this.updateMetrics(duration, fromCache);
    
    console.log(`[PerformanceMetricsManager] Success recorded - Duration: ${duration}ms, Cache: ${fromCache}`);
  }

  /**
   * Record error request
  */
  recordError(error: RecommendationError, duration: number): void {
    this.requestCount++;
    this.errorCount++;
    
    if (error.type === RecommendationErrorType.TIMEOUT) {
      this.timeoutCount++;
    }
    
    this.updateMetrics(duration, false);
    
    console.error(`[PerformanceMetricsManager] Error recorded - Type: ${error.type}, Duration: ${duration}ms`);
  }

  /**
   * Update performance metrics
  */
  private updateMetrics(duration: number, fromCache: boolean): void {
    const cacheStats = this.cacheService.getStats();
    
    this.performanceMetrics = {
      requestDuration: duration,
      cacheHitRate: cacheStats.hitRate * 100,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      timeoutRate: this.requestCount > 0 ? (this.timeoutCount / this.requestCount) * 100 : 0,
      throughput: this.requestCount,
      aiApiLatency: fromCache ? 0 : duration,
      queueDepth: this.calculateQueueDepth(),
      memoryUsage: cacheStats.memoryUsage,
      timestamp: new Date()
    };
  }

  /**
   * Get current performance metrics
  */
  getPerformanceMetrics(): PerformanceMetrics {
    // Update with latest cache stats
    this.updateMetrics(this.performanceMetrics.requestDuration, false);
    return { ...this.performanceMetrics };
  }

  /**
   * Start performance tracking and reporting
  */
  private startPerformanceTracking(): void {
    // Report metrics every 60 seconds
    this.reportingTimer = setInterval(() => {
      this.reportMetrics();
      this.checkPerformanceThresholds();
    }, 60000);
  }

  /**
   * Stop performance tracking
  */
  stopPerformanceTracking(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
  }

  /**
   * Report current metrics to console
  */
  private reportMetrics(): void {
    console.log('[PerformanceMetricsManager] Performance Metrics:', {
      requests: this.requestCount,
      success: this.successCount,
      errors: this.errorCount,
      timeouts: this.timeoutCount,
      cacheHitRate: `${this.performanceMetrics.cacheHitRate.toFixed(1)}%`,
      errorRate: `${this.performanceMetrics.errorRate.toFixed(1)}%`,
      timeoutRate: `${this.performanceMetrics.timeoutRate.toFixed(1)}%`,
      avgResponseTime: `${this.performanceMetrics.requestDuration}ms`
    });
  }

  /**
   * Check performance against thresholds and warn if exceeded
  */
  private checkPerformanceThresholds(): void {
    const warnings: string[] = [];
    
    if (this.performanceMetrics.timeoutRate > PERFORMANCE_TARGETS.maxTimeoutRate) {
      warnings.push(`Timeout rate ${this.performanceMetrics.timeoutRate.toFixed(1)}% exceeds target ${PERFORMANCE_TARGETS.maxTimeoutRate}%`);
    }
    
    if (this.performanceMetrics.cacheHitRate < PERFORMANCE_TARGETS.minCacheHitRate) {
      warnings.push(`Cache hit rate ${this.performanceMetrics.cacheHitRate.toFixed(1)}% below target ${PERFORMANCE_TARGETS.minCacheHitRate}%`);
    }
    
    if (this.performanceMetrics.errorRate > PERFORMANCE_TARGETS.maxErrorRate) {
      warnings.push(`Error rate ${this.performanceMetrics.errorRate.toFixed(1)}% exceeds target ${PERFORMANCE_TARGETS.maxErrorRate}%`);
    }
    
    if (warnings.length > 0) {
      console.warn('[PerformanceMetricsManager] Performance threshold warnings:', warnings);
    }
  }

  /**
   * Check if service is healthy based on performance metrics
  */
  isHealthy(): boolean {
    const cacheHealthy = this.cacheService.isHealthy();
    const performanceHealthy = (
      this.performanceMetrics.timeoutRate <= PERFORMANCE_TARGETS.maxTimeoutRate &&
      this.performanceMetrics.errorRate <= PERFORMANCE_TARGETS.maxErrorRate
    );
    
    return cacheHealthy && performanceHealthy;
  }

  /**
   * Get detailed health status
  */
  getHealthStatus(): {
    healthy: boolean;
    metrics: PerformanceMetrics;
    issues: string[];
    cacheHealth: boolean;
  } {
    const issues: string[] = [];
    
    if (this.performanceMetrics.timeoutRate > PERFORMANCE_TARGETS.maxTimeoutRate) {
      issues.push(`High timeout rate: ${this.performanceMetrics.timeoutRate.toFixed(1)}%`);
    }
    
    if (this.performanceMetrics.errorRate > PERFORMANCE_TARGETS.maxErrorRate) {
      issues.push(`High error rate: ${this.performanceMetrics.errorRate.toFixed(1)}%`);
    }
    
    if (this.performanceMetrics.cacheHitRate < PERFORMANCE_TARGETS.minCacheHitRate && this.requestCount > 10) {
      issues.push(`Low cache hit rate: ${this.performanceMetrics.cacheHitRate.toFixed(1)}%`);
    }
    
    const cacheHealth = this.cacheService.isHealthy();
    if (!cacheHealth) {
      issues.push('Cache system unhealthy');
    }
    
    return {
      healthy: issues.length === 0,
      metrics: this.getPerformanceMetrics(),
      issues,
      cacheHealth
    };
  }

  /**
   * Reset all metrics (for testing)
  */
  resetMetrics(): void {
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.timeoutCount = 0;
    this.performanceMetrics = this.initializeMetrics();
    
    console.log('[PerformanceMetricsManager] Metrics reset');
  }

  /**
   * Get performance targets for reference
  */
  getPerformanceTargets(): typeof PERFORMANCE_TARGETS {
    return { ...PERFORMANCE_TARGETS };
  }

  /**
   * Cleanup resources
  */
  dispose(): void {
    this.stopPerformanceTracking();
  }

  /**
   * Calculate current queue depth based on pending requests
   */
  private calculateQueueDepth(): number {
    try {
      // Check for pending requests in various states
      const pendingAnalyticsQueries = this.getPendingAnalyticsQueries();
      const pendingCacheOperations = this.getPendingCacheOperations();
      const pendingFirestoreWrites = this.getPendingFirestoreWrites();

      return pendingAnalyticsQueries + pendingCacheOperations + pendingFirestoreWrites;
    } catch (error) {
      console.error('Error calculating queue depth:', error);
      return 0;
    }
  }

  /**
   * Get count of pending analytics queries
   */
  private getPendingAnalyticsQueries(): number {
    // Estimate based on recent request patterns
    const recentRequestRate = this.requestCount > 0 ? this.requestCount / 60 : 0; // requests per second
    const currentLoad = Math.min(Math.floor(recentRequestRate * 2), 10); // Estimate 2 seconds worth of requests, max 10

    // Add some variability based on error rate (higher errors = more queued retries)
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const errorAdjustment = Math.floor(errorRate * 5);

    return currentLoad + errorAdjustment;
  }

  /**
   * Get count of pending cache operations
   */
  private getPendingCacheOperations(): number {
    // Estimate based on cache miss rate and throughput
    const cacheStats = this.getCacheStats();
    const missRate = 1 - cacheStats.hitRate;
    const estimatedPendingOps = Math.floor(missRate * this.requestCount / 10); // Scale by request count

    return Math.min(estimatedPendingOps, 20); // Cap at 20 pending operations
  }

  /**
   * Get count of pending Firestore writes
   */
  private getPendingFirestoreWrites(): number {
    try {
      // Estimate based on error rate and request volume
      const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
      const baseQueue = Math.floor(this.requestCount / 20); // Base: 1 write per 20 requests

      if (errorRate > 0.1) {
        // High error rate might indicate backing up
        return baseQueue + Math.floor(errorRate * 15);
      }

      // Normal operation - minimal queue depth
      return Math.min(baseQueue, 5); // Cap at 5 pending writes normally
    } catch (error) {
      console.error('Error calculating Firestore queue depth:', error);
      return 0;
    }
  }
}