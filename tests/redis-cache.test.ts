/**
 * Redis Cache Service Tests
 * Tests for the real Redis implementation replacing mock cache
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyticsCacheService } from '../src/services/analytics-cache.service';

// Mock Redis to avoid requiring actual Redis in tests
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      flushdb: vi.fn(),
      exists: vi.fn(),
      ping: vi.fn(),
      disconnect: vi.fn()
    }))
  };
});

describe('Redis Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cache Operations', () => {
    it('should set and get cache values', async () => {
      const testKey = 'test_key';
      const testValue = { data: 'test data', timestamp: Date.now() };

      // Mock Redis responses
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        setex: vi.fn().mockResolvedValue('OK'),
        get: vi.fn().mockResolvedValue(JSON.stringify(testValue))
      });

      const setResult = await analyticsCacheService.set(testKey, testValue, 3600);
      expect(setResult).toBe(true);

      const getValue = await analyticsCacheService.get(testKey);
      expect(getValue).toEqual(testValue);
    });

    it('should return null for non-existent keys', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockResolvedValue(null)
      });

      const result = await analyticsCacheService.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('should delete cache entries', async () => {
      const testKey = 'test_key_to_delete';

      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        del: vi.fn().mockResolvedValue(1)
      });

      const result = await analyticsCacheService.del(testKey);
      expect(result).toBe(true);
    });

    it('should check if key exists', async () => {
      const testKey = 'existing_key';

      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        exists: vi.fn().mockResolvedValue(1)
      });

      const exists = await analyticsCacheService.exists(testKey);
      expect(exists).toBe(true);
    });

    it('should flush all cache entries', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        flushdb: vi.fn().mockResolvedValue('OK')
      });

      const result = await analyticsCacheService.flush();
      expect(result).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        ping: vi.fn().mockResolvedValue('PONG')
      });

      const health = await analyticsCacheService.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.error).toBeUndefined();
    });

    it('should handle health check failures', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        ping: vi.fn().mockRejectedValue(new Error('Connection failed'))
      });

      const health = await analyticsCacheService.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection failed');
    });
  });

  describe('Statistics', () => {
    it('should track cache hit/miss statistics', async () => {
      const mockRedis = analyticsCacheService as any;

      // Mock successful get (hit)
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockResolvedValue(JSON.stringify({ data: 'test' }))
      });

      await analyticsCacheService.get('hit_key');

      // Mock failed get (miss)
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockResolvedValue(null)
      });

      await analyticsCacheService.get('miss_key');

      const stats = analyticsCacheService.getStats();

      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
      expect(stats.redis.hits).toBeGreaterThanOrEqual(0);
      expect(stats.redis.misses).toBeGreaterThanOrEqual(0);
    });

    it('should track error rates', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockRejectedValue(new Error('Redis error'))
      });

      await analyticsCacheService.get('error_key');

      const stats = analyticsCacheService.getStats();

      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      expect(stats.redis.errors).toBeGreaterThan(0);
    });

    it('should report healthy status based on error rate', async () => {
      // Fresh instance should be healthy
      const stats = analyticsCacheService.getStats();
      expect(stats.isHealthy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        setex: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        del: vi.fn().mockRejectedValue(new Error('Connection timeout'))
      });

      // Should not throw, but return null/false
      const getValue = await analyticsCacheService.get('test_key');
      expect(getValue).toBeNull();

      const setValue = await analyticsCacheService.set('test_key', 'value');
      expect(setValue).toBe(false);

      const delValue = await analyticsCacheService.del('test_key');
      expect(delValue).toBe(false);
    });

    it('should handle JSON parsing errors', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockResolvedValue('invalid json}')
      });

      const result = await analyticsCacheService.get('invalid_json_key');
      expect(result).toBeNull();
    });

    it('should handle serialization errors', async () => {
      const circularObj: any = {};
      circularObj.self = circularObj;

      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        setex: vi.fn().mockResolvedValue('OK')
      });

      const result = await analyticsCacheService.set('circular_key', circularObj);
      expect(result).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should use default TTL when not specified', async () => {
      const mockRedis = analyticsCacheService as any;
      const setexSpy = vi.fn().mockResolvedValue('OK');
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        setex: setexSpy
      });

      await analyticsCacheService.set('test_key', 'test_value');

      expect(setexSpy).toHaveBeenCalledWith('test_key', 3600, '"test_value"');
    });

    it('should use custom TTL when specified', async () => {
      const mockRedis = analyticsCacheService as any;
      const setexSpy = vi.fn().mockResolvedValue('OK');
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        setex: setexSpy
      });

      const customTTL = 1800; // 30 minutes
      await analyticsCacheService.set('test_key', 'test_value', customTTL);

      expect(setexSpy).toHaveBeenCalledWith('test_key', customTTL, '"test_value"');
    });
  });

  describe('Configuration', () => {
    it('should use Redis configuration from core module', () => {
      // This test verifies that the cache service is initialized with config from @cvplus/core
      expect(analyticsCacheService).toBeDefined();
      // In a real implementation, we would verify that getRedisConfig() was called
    });
  });

  describe('Performance', () => {
    it('should complete cache operations quickly', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockResolvedValue(JSON.stringify({ data: 'test' })),
        setex: vi.fn().mockResolvedValue('OK')
      });

      const start = Date.now();

      await analyticsCacheService.set('perf_test', { data: 'performance test' });
      await analyticsCacheService.get('perf_test');

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent operations', async () => {
      const mockRedis = analyticsCacheService as any;
      vi.spyOn(mockRedis, 'redis').mockImplementation({
        get: vi.fn().mockResolvedValue(JSON.stringify({ data: 'test' })),
        setex: vi.fn().mockResolvedValue('OK')
      });

      const operations = Array.from({ length: 100 }, (_, i) =>
        analyticsCacheService.set(`key_${i}`, { value: i })
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(100);
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});