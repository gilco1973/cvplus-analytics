/**/**
 * Prediction Cache Service
 * 
 * Manages caching of ML predictions and features to improve performance
 * and reduce redundant computations.
 */

import { SuccessPrediction, FeatureVector } from '../../../types/phase2-models';
import { PredictionRequest } from './MLPipelineOrchestrator';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export class PredictionCache {
  private predictionCache: Map<string, CacheEntry<SuccessPrediction>> = new Map();
  private featureCache: Map<string, CacheEntry<FeatureVector>> = new Map();
  
  private readonly PREDICTION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly FEATURE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get cached prediction if available and not expired
   */
  async get(request: PredictionRequest): Promise<SuccessPrediction | null> {
    const cacheKey = this.generatePredictionCacheKey(request);
    const entry = this.predictionCache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.predictionCache.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Cache a prediction
   */
  async set(request: PredictionRequest, prediction: SuccessPrediction): Promise<void> {
    const cacheKey = this.generatePredictionCacheKey(request);
    const expiresAt = new Date(Date.now() + this.PREDICTION_TTL);
    
    const entry: CacheEntry<SuccessPrediction> = {
      data: prediction,
      timestamp: new Date(),
      expiresAt
    };
    
    this.predictionCache.set(cacheKey, entry);
    
    // Check if cache needs cleanup due to size
    if (this.predictionCache.size > this.MAX_CACHE_SIZE) {
      await this.evictOldestEntries(this.predictionCache, this.MAX_CACHE_SIZE * 0.8);
    }
  }

  /**
   * Get cached features if available and not expired
   */
  async getFeatures(request: PredictionRequest): Promise<FeatureVector | null> {
    const cacheKey = this.generateFeatureCacheKey(request);
    const entry = this.featureCache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.featureCache.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Cache extracted features
   */
  async setFeatures(request: PredictionRequest, features: FeatureVector): Promise<void> {
    const cacheKey = this.generateFeatureCacheKey(request);
    const expiresAt = new Date(Date.now() + this.FEATURE_TTL);
    
    const entry: CacheEntry<FeatureVector> = {
      data: features,
      timestamp: new Date(),
      expiresAt
    };
    
    this.featureCache.set(cacheKey, entry);
    
    // Check if cache needs cleanup due to size
    if (this.featureCache.size > this.MAX_CACHE_SIZE) {
      await this.evictOldestEntries(this.featureCache, this.MAX_CACHE_SIZE * 0.8);
    }
  }

  /**
   * Invalidate cache entries for a specific user
   */
  async invalidateUser(userId: string): Promise<void> {
    let removedCount = 0;
    
    // Remove prediction cache entries
    for (const [key, entry] of this.predictionCache.entries()) {
      if (entry.data.userId === userId) {
        this.predictionCache.delete(key);
        removedCount++;
      }
    }
    
    // Remove feature cache entries
    for (const [key, entry] of this.featureCache.entries()) {
      if (entry.data.userId === userId) {
        this.featureCache.delete(key);
        removedCount++;
      }
    }
    
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const totalEntries = this.predictionCache.size + this.featureCache.size;
    
    this.predictionCache.clear();
    this.featureCache.clear();
    
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    predictions: { size: number; hitRate?: number };
    features: { size: number; hitRate?: number };
    totalMemoryUsage: number;
  }> {
    return {
      predictions: {
        size: this.predictionCache.size
      },
      features: {
        size: this.featureCache.size
      },
      totalMemoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test basic cache operations
      const testKey = 'health_check_test';
      const testData = { test: true, timestamp: new Date() };
      
      // Test set and get operations
      const testEntry: CacheEntry<any> = {
        data: testData,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 1000)
      };
      
      this.predictionCache.set(testKey, testEntry);
      const retrieved = this.predictionCache.get(testKey);
      
      // Clean up test entry
      this.predictionCache.delete(testKey);
      
      return retrieved !== undefined;
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private generatePredictionCacheKey(request: PredictionRequest): string {
    const cvHash = this.hashCV(request.cv);
    return `pred_${request.userId}_${request.jobId}_${cvHash}_${request.targetRole || 'default'}`;
  }

  private generateFeatureCacheKey(request: PredictionRequest): string {
    const cvHash = this.hashCV(request.cv);
    return `feat_${request.jobId}_${cvHash}_${request.industry || 'default'}`;
  }

  private hashCV(cv: any): string {
    // Create a simple hash of CV content for cache key generation
    const cvString = JSON.stringify({
      experience: cv.experience?.length || 0,
      skills: cv.skills,
      education: cv.education?.length || 0,
      summary: cv.personalInfo?.summary?.substring(0, 100) // First 100 chars
    });
    
    return Buffer.from(cvString).toString('base64').slice(0, 16);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt.getTime();
  }

  private async evictOldestEntries<T>(
    cache: Map<string, CacheEntry<T>>, 
    targetSize: number
  ): Promise<void> {
    const entries = Array.from(cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const entriesToRemove = entries.length - targetSize;
    
    for (let i = 0; i < entriesToRemove; i++) {
      const [key] = entries[i];
      cache.delete(key);
    }
    
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupExpiredEntries(): void {
    let removedCount = 0;
    
    // Clean up prediction cache
    for (const [key, entry] of this.predictionCache.entries()) {
      if (this.isExpired(entry)) {
        this.predictionCache.delete(key);
        removedCount++;
      }
    }
    
    // Clean up feature cache
    for (const [key, entry] of this.featureCache.entries()) {
      if (this.isExpired(entry)) {
        this.featureCache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let totalSize = 0;
    
    for (const [key, entry] of this.predictionCache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    for (const [key, entry] of this.featureCache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    return totalSize;
  }
}