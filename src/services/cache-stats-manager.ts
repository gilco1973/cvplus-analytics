/**
 * @cvplus/recommendations - Cache Stats Manager
 * 
 * Handles performance monitoring, statistics tracking, and cleanup operations
 * for the cache system. Provides health monitoring and performance metrics.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type { CacheStats, PerformanceMetrics } from '../../types';
import type { MemoryManager } from './memory-manager';

export class CacheStatsManager {
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private memoryManager: MemoryManager;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    this.stats = this.initializeStats();
    this.startCleanupTimer();
  }

  /**
   * Initialize default stats
    */
  private initializeStats(): CacheStats {
    return {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      evictions: 0,
      memoryUsage: 0,
      averageAge: 0
    };
  }

  /**
   * Record cache hit from specific tier
    */
  recordCacheHit(tier: 'memory' | 'redis' | 'firestore', latency: number): void {
    this.stats.totalRequests++;
    const hits = (this.stats.hitRate * (this.stats.totalRequests - 1)) + 1;
    this.stats.hitRate = hits / this.stats.totalRequests;
    this.stats.missRate = 1 - this.stats.hitRate;
    
    console.log(`[CacheStatsManager] Cache HIT (${tier}) - latency: ${latency}ms`);
    this.updateStats();
  }

  /**
   * Record cache miss
    */
  recordCacheMiss(latency: number): void {
    this.stats.totalRequests++;
    const misses = (this.stats.missRate * (this.stats.totalRequests - 1)) + 1;
    this.stats.missRate = misses / this.stats.totalRequests;
    this.stats.hitRate = 1 - this.stats.missRate;
    
    console.log(`[CacheStatsManager] Cache MISS - latency: ${latency}ms`);
    this.updateStats();
  }

  /**
   * Record eviction event
    */
  recordEviction(count: number = 1): void {
    this.stats.evictions += count;
    this.updateStats();
  }

  /**
   * Update current stats from memory manager
    */
  updateStats(): void {
    this.stats.cacheSize = this.memoryManager.size();
    this.stats.memoryUsage = this.memoryManager.getMemoryUsage();
    this.stats.averageAge = this.memoryManager.getAverageAge();
  }

  /**
   * Get current statistics
    */
  getStats(): CacheStats {
    this.updateStats(); // Ensure fresh stats
    return { ...this.stats };
  }

  /**
   * Reset all statistics
    */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Get performance metrics for monitoring
    */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    this.updateStats();
    return {
      cacheHitRate: this.stats.hitRate * 100,
      memoryUsage: this.stats.memoryUsage,
      timestamp: new Date()
    };
  }

  /**
   * Start cleanup timer for expired entries
    */
  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup timer
    */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Perform cleanup of expired entries
    */
  performCleanup(): void {
    const expiredKeys = this.memoryManager.cleanupExpired();
    
    if (expiredKeys.length > 0) {
      console.log(`[CacheStatsManager] Cleaned up ${expiredKeys.length} expired entries`);
      this.updateStats();
    }
  }

  /**
   * Check if cache system is healthy
    */
  isHealthy(): boolean {
    this.updateStats();
    
    const isMemoryHealthy = this.stats.memoryUsage < (100 * 1024 * 1024); // 100MB limit
    const isHitRateHealthy = this.stats.totalRequests < 10 || this.stats.hitRate > 0.3; // 30% minimum hit rate
    
    return isMemoryHealthy && isHitRateHealthy;
  }

  /**
   * Get health status details
    */
  getHealthStatus(): {
    healthy: boolean;
    memoryUsage: number;
    hitRate: number;
    issues: string[];
  } {
    this.updateStats();
    
    const issues: string[] = [];
    const memoryLimit = 100 * 1024 * 1024; // 100MB
    
    if (this.stats.memoryUsage >= memoryLimit) {
      issues.push(`Memory usage (${Math.round(this.stats.memoryUsage / 1024 / 1024)}MB) exceeds limit (100MB)`);
    }
    
    if (this.stats.totalRequests >= 10 && this.stats.hitRate <= 0.3) {
      issues.push(`Hit rate (${(this.stats.hitRate * 100).toFixed(1)}%) below healthy threshold (30%)`);
    }
    
    return {
      healthy: issues.length === 0,
      memoryUsage: this.stats.memoryUsage,
      hitRate: this.stats.hitRate * 100,
      issues
    };
  }

  /**
   * Cleanup resources
    */
  dispose(): void {
    this.stopCleanupTimer();
  }
}