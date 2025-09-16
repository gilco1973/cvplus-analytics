/**/**
 * Generic Cache Service for CVPlus Performance Optimization
 * 
 * Provides high-level caching operations with serialization, TTL management,
 * and graceful fallback patterns. Built on top of Redis client service.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
 */

import { logger } from 'firebase-functions';
import { redisClient } from './redis-client.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  serialize?: boolean; // Whether to JSON serialize/deserialize
  namespace?: string; // Cache key namespace prefix
  fallbackToDb?: boolean; // Whether to fallback to database on cache miss
}

export interface CacheResult<T> {
  value: T | null;
  cached: boolean;
  responseTime: number;
  key: string;
}

export interface BatchCacheResult<T> {
  results: Record<string, T | null>;
  cached: Record<string, boolean>;
  responseTime: number;
  hitRate: number;
}

class CacheService {
  private readonly defaultOptions: Required<CacheOptions> = {
    ttl: 3600, // 1 hour default
    serialize: true,
    namespace: 'cvplus',
    fallbackToDb: false
  };

  /**
   * Get value from cache with optional fallback function
   */
  async get<T>(
    key: string, 
    fallbackFn?: () => Promise<T>,
    options?: CacheOptions
  ): Promise<CacheResult<T>> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.namespace);

    try {
      // Try to get from cache first
      const cachedValue = await redisClient.get(cacheKey);
      
      if (cachedValue !== null) {
        const value = opts.serialize ? this.deserialize<T>(cachedValue) : cachedValue as T;
        
        return {
          value,
          cached: true,
          responseTime: Date.now() - startTime,
          key: cacheKey
        };
      }

      // Cache miss - try fallback function if provided
      if (fallbackFn) {
        const value = await fallbackFn();
        
        if (value !== null && value !== undefined) {
          // Store in cache for next time
          await this.set(key, value, options);
        }
        
        return {
          value,
          cached: false,
          responseTime: Date.now() - startTime,
          key: cacheKey
        };
      }

      // No fallback, return cache miss
      return {
        value: null,
        cached: false,
        responseTime: Date.now() - startTime,
        key: cacheKey
      };

    } catch (error) {
      logger.error('Cache get error', { key: cacheKey, error });
      
      // Try fallback on error
      if (fallbackFn) {
        try {
          const value = await fallbackFn();
          return {
            value,
            cached: false,
            responseTime: Date.now() - startTime,
            key: cacheKey
          };
        } catch (fallbackError) {
          logger.error('Cache fallback error', { key: cacheKey, error: fallbackError });
        }
      }

      return {
        value: null,
        cached: false,
        responseTime: Date.now() - startTime,
        key: cacheKey
      };
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.namespace);

    try {
      if (value === null || value === undefined) {
        logger.debug('Skipping cache set for null/undefined value', { key: cacheKey });
        return false;
      }

      const serializedValue = opts.serialize ? this.serialize(value) : String(value);
      const success = await redisClient.set(cacheKey, serializedValue, opts.ttl);
      
      if (success) {
        logger.debug('Cache set successful', { key: cacheKey, ttl: opts.ttl });
      } else {
        logger.warn('Cache set failed', { key: cacheKey });
      }
      
      return success;
      
    } catch (error) {
      logger.error('Cache set error', { key: cacheKey, error });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.namespace);

    try {
      const success = await redisClient.del(cacheKey);
      logger.debug('Cache delete', { key: cacheKey, success });
      return success;
      
    } catch (error) {
      logger.error('Cache delete error', { key: cacheKey, error });
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string, options?: Pick<CacheOptions, 'namespace'>): Promise<number> {
    const opts = { ...this.defaultOptions, ...options };
    const fullPattern = this.buildKey(pattern, opts.namespace);

    try {
      const deleted = await redisClient.delPattern(fullPattern);
      logger.info('Cache pattern delete', { pattern: fullPattern, deleted });
      return deleted;
      
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern: fullPattern, error });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.namespace);

    try {
      return await redisClient.exists(cacheKey);
      
    } catch (error) {
      logger.error('Cache exists error', { key: cacheKey, error });
      return false;
    }
  }

  /**
   * Get multiple values from cache in batch
   */
  async getBatch<T>(
    keys: string[],
    fallbackFn?: (missedKeys: string[]) => Promise<Record<string, T>>,
    options?: CacheOptions
  ): Promise<BatchCacheResult<T>> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    if (keys.length === 0) {
      return {
        results: {},
        cached: {},
        responseTime: 0,
        hitRate: 0
      };
    }

    try {
      // Build cache keys
      const cacheKeys = keys.map(key => this.buildKey(key, opts.namespace));
      
      // Get all values at once
      const cachedValues = await redisClient.mget(cacheKeys);
      
      // Process results
      const results: Record<string, T | null> = {};
      const cached: Record<string, boolean> = {};
      const missedKeys: string[] = [];
      let hitCount = 0;

      for (let i = 0; i < keys.length; i++) {
        const originalKey = keys[i];
        const cachedValue = cachedValues[i];

        if (cachedValue !== null) {
          results[originalKey] = opts.serialize ? this.deserialize<T>(cachedValue) : cachedValue as T;
          cached[originalKey] = true;
          hitCount++;
        } else {
          results[originalKey] = null;
          cached[originalKey] = false;
          missedKeys.push(originalKey);
        }
      }

      // Handle cache misses with fallback
      if (missedKeys.length > 0 && fallbackFn) {
        try {
          const fallbackResults = await fallbackFn(missedKeys);
          
          // Store fallback results in cache and update results
          const cachePromises: Promise<boolean>[] = [];
          
          for (const [key, value] of Object.entries(fallbackResults)) {
            if (value !== null && value !== undefined) {
              results[key] = value;
              cachePromises.push(this.set(key, value, options));
            }
          }
          
          // Execute cache sets in parallel (fire and forget)
          Promise.allSettled(cachePromises).catch(error => {
            logger.error('Batch cache set error', { error });
          });
          
        } catch (fallbackError) {
          logger.error('Batch fallback error', { keys: missedKeys, error: fallbackError });
        }
      }

      const hitRate = keys.length > 0 ? hitCount / keys.length : 0;

      return {
        results,
        cached,
        responseTime: Date.now() - startTime,
        hitRate
      };

    } catch (error) {
      logger.error('Cache batch get error', { keys, error });
      
      // Try fallback on error
      if (fallbackFn) {
        try {
          const fallbackResults = await fallbackFn(keys);
          const results: Record<string, T | null> = {};
          const cached: Record<string, boolean> = {};
          
          for (const key of keys) {
            results[key] = fallbackResults[key] || null;
            cached[key] = false;
          }
          
          return {
            results,
            cached,
            responseTime: Date.now() - startTime,
            hitRate: 0
          };
        } catch (fallbackError) {
          logger.error('Batch fallback error on cache error', { keys, error: fallbackError });
        }
      }

      // Return empty results on complete failure
      const results: Record<string, T | null> = {};
      const cached: Record<string, boolean> = {};
      for (const key of keys) {
        results[key] = null;
        cached[key] = false;
      }

      return {
        results,
        cached,
        responseTime: Date.now() - startTime,
        hitRate: 0
      };
    }
  }

  /**
   * Set multiple values in cache in batch
   */
  async setBatch<T>(data: Record<string, T>, options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const entries = Object.entries(data).filter(([_, value]) => 
      value !== null && value !== undefined
    );

    if (entries.length === 0) {
      return true;
    }

    try {
      // Prepare key-value pairs for mset
      const keyValuePairs: Record<string, string> = {};
      
      for (const [key, value] of entries) {
        const cacheKey = this.buildKey(key, opts.namespace);
        const serializedValue = opts.serialize ? this.serialize(value) : String(value);
        keyValuePairs[cacheKey] = serializedValue;
      }

      // Set all values at once
      const success = await redisClient.mset(keyValuePairs);
      
      if (success && opts.ttl > 0) {
        // Set TTL for all keys (in parallel)
        const ttlPromises = Object.keys(keyValuePairs).map(cacheKey =>
          redisClient.expire(cacheKey, opts.ttl)
        );
        
        Promise.allSettled(ttlPromises).catch(error => {
          logger.error('Batch TTL set error', { error });
        });
      }

      logger.debug('Cache batch set', { 
        keys: Object.keys(data), 
        count: entries.length,
        ttl: opts.ttl,
        success 
      });
      
      return success;
      
    } catch (error) {
      logger.error('Cache batch set error', { keys: Object.keys(data), error });
      return false;
    }
  }

  /**
   * Increment numeric value in cache
   */
  async increment(key: string, delta: number = 1, options?: CacheOptions): Promise<number | null> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.namespace);

    try {
      const value = await redisClient.get(cacheKey);
      let newValue: number;

      if (value === null) {
        newValue = delta;
      } else {
        const currentValue = opts.serialize ? 
          this.deserialize<number>(value) : 
          parseInt(value, 10);
        
        newValue = (isNaN(currentValue) ? 0 : currentValue) + delta;
      }

      await redisClient.set(cacheKey, String(newValue), opts.ttl);
      return newValue;
      
    } catch (error) {
      logger.error('Cache increment error', { key: cacheKey, error });
      return null;
    }
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Serialize value to string
   */
  private serialize<T>(value: T): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Cache serialization error', { error });
      return String(value);
    }
  }

  /**
   * Deserialize string to value
   */
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache deserialization error', { error });
      return value as unknown as T;
    }
  }

  /**
   * Get cache performance statistics
   */
  getStats() {
    return {
      redis: redisClient.getMetrics(),
      hitRate: redisClient.getHitRate(),
      errorRate: redisClient.getErrorRate(),
      isHealthy: redisClient.isHealthy()
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'health_check_value';
      
      // Test set/get cycle
      const setResult = await this.set(testKey, testValue, { ttl: 60 });
      const getResult = await this.get(testKey);
      const deleteResult = await this.delete(testKey);
      
      const healthy = setResult && 
                     getResult.cached && 
                     getResult.value === testValue && 
                     deleteResult;
      
      return {
        healthy,
        details: {
          redis: redisClient.getMetrics(),
          setResult,
          getResult: getResult.cached,
          deleteResult,
          hitRate: redisClient.getHitRate(),
          errorRate: redisClient.getErrorRate()
        }
      };
      
    } catch (error) {
      logger.error('Cache health check failed', { error });
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();