/**
 * Frontend Integration Tests
 * Tests for the frontend integration service using existing CVPlus testing patterns
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrontendIntegrationService } from '../src/integrations/frontend-integration';

describe('FrontendIntegrationService', () => {
  let service: FrontendIntegrationService;

  beforeEach(() => {
    service = new FrontendIntegrationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAnalyticsData', () => {
    it('should return dashboard metrics with correct structure', async () => {
      const result = await service.getAnalyticsData('30d');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.userMetrics).toBeDefined();
      expect(result.data?.atsMetrics).toBeDefined();
      expect(result.data?.businessMetrics).toBeDefined();
      expect(result.data?.mlMetrics).toBeDefined();
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['7d', '30d', '90d', '1y'] as const;

      for (const timeRange of timeRanges) {
        const result = await service.getAnalyticsData(timeRange);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      }
    });

    it('should include retention metrics', async () => {
      const result = await service.getAnalyticsData('30d');

      expect(result.data?.userMetrics.retention).toBeDefined();
      expect(result.data?.userMetrics.retention.day1).toBeGreaterThan(0);
      expect(result.data?.userMetrics.retention.day7).toBeGreaterThan(0);
      expect(result.data?.userMetrics.retention.day30).toBeGreaterThan(0);
    });

    it('should include feature adoption metrics', async () => {
      const result = await service.getAnalyticsData('30d');

      expect(result.data?.userMetrics.featureAdoption).toBeDefined();
      expect(Object.keys(result.data?.userMetrics.featureAdoption || {})).toContain('CV Analysis');
      expect(Object.keys(result.data?.userMetrics.featureAdoption || {})).toContain('ATS Optimization');
    });

    it('should handle errors gracefully', async () => {
      // Mock service to throw error
      const mockService = new FrontendIntegrationService();
      vi.spyOn(mockService as any, 'biService').mockImplementation({
        calculateMetric: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      const result = await mockService.getAnalyticsData('30d');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database error');
    });
  });

  describe('getRealtimeAnalytics', () => {
    it('should return realtime metrics', async () => {
      const result = await service.getRealtimeAnalytics();

      expect(result.currentVisitors).toBeGreaterThanOrEqual(0);
      expect(result.currentSessions).toBeGreaterThanOrEqual(0);
      expect(result.bounceRate).toBeGreaterThanOrEqual(0);
      expect(result.bounceRate).toBeLessThanOrEqual(1);
      expect(result.averageSessionDuration).toBeGreaterThan(0);
      expect(Array.isArray(result.topPages)).toBe(true);
    });

    it('should include top pages with correct structure', async () => {
      const result = await service.getRealtimeAnalytics();

      expect(result.topPages.length).toBeGreaterThan(0);
      result.topPages.forEach(page => {
        expect(page.path).toBeDefined();
        expect(page.views).toBeGreaterThanOrEqual(0);
        expect(page.uniqueViews).toBeGreaterThanOrEqual(0);
        expect(page.uniqueViews).toBeLessThanOrEqual(page.views);
      });
    });
  });

  describe('getChartData', () => {
    it('should return retention chart data', async () => {
      const result = await service.getChartData('retention', '30d');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('value');
    });

    it('should return conversion chart data', async () => {
      const result = await service.getChartData('conversion', '30d');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('stage');
      expect(result[0]).toHaveProperty('value');
    });

    it('should return revenue chart data', async () => {
      const result = await service.getChartData('revenue', '30d');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('growth');
    });

    it('should return engagement chart data', async () => {
      const result = await service.getChartData('engagement', '30d');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('feature');
      expect(result[0]).toHaveProperty('usage');
    });

    it('should throw error for invalid chart type', async () => {
      await expect(service.getChartData('invalid' as any, '30d')).rejects.toThrow(
        'Unsupported chart type: invalid'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const result = await service.healthCheck();

      expect(result.status).toMatch(/healthy|degraded|unhealthy/);
      expect(result.details).toBeDefined();
    });

    it('should include component health details', async () => {
      const result = await service.healthCheck();

      expect(result.details.businessIntelligence).toBeDefined();
      expect(result.details.cache).toBeDefined();
      expect(result.details.integration).toBeDefined();
    });

    it('should handle service failures', async () => {
      // Mock services to fail
      const mockService = new FrontendIntegrationService();
      vi.spyOn(mockService as any, 'biService').mockImplementation({
        healthCheck: vi.fn().mockRejectedValue(new Error('Service unavailable'))
      });

      const result = await mockService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toContain('Service unavailable');
    });
  });

  describe('caching behavior', () => {
    it('should cache analytics data', async () => {
      // First call
      const result1 = await service.getAnalyticsData('30d');
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = await service.getAnalyticsData('30d');
      expect(result2.success).toBe(true);
      expect(result2.data).toEqual(result1.data);
    });

    it('should cache chart data', async () => {
      // First call
      const result1 = await service.getChartData('retention', '30d');
      expect(Array.isArray(result1)).toBe(true);

      // Second call should use cache
      const result2 = await service.getChartData('retention', '30d');
      expect(result2).toEqual(result1);
    });
  });

  describe('data validation', () => {
    it('should validate user metrics structure', async () => {
      const result = await service.getAnalyticsData('30d');

      expect(result.data?.userMetrics.dailyActiveUsers).toBeGreaterThan(0);
      expect(result.data?.userMetrics.weeklyActiveUsers).toBeGreaterThan(0);
      expect(result.data?.userMetrics.monthlyActiveUsers).toBeGreaterThan(0);
      expect(result.data?.userMetrics.weeklyActiveUsers).toBeGreaterThan(result.data?.userMetrics.dailyActiveUsers);
      expect(result.data?.userMetrics.monthlyActiveUsers).toBeGreaterThan(result.data?.userMetrics.weeklyActiveUsers);
    });

    it('should validate business metrics structure', async () => {
      const result = await service.getAnalyticsData('30d');

      expect(result.data?.businessMetrics.revenue.mrr).toBeGreaterThan(0);
      expect(result.data?.businessMetrics.revenue.arr).toBeGreaterThan(0);
      expect(result.data?.businessMetrics.revenue.arr).toBeGreaterThan(result.data?.businessMetrics.revenue.mrr * 10);
    });

    it('should validate ML metrics structure', async () => {
      const result = await service.getAnalyticsData('30d');

      expect(result.data?.mlMetrics.predictionAccuracy).toBeGreaterThan(0);
      expect(result.data?.mlMetrics.predictionAccuracy).toBeLessThanOrEqual(1);
      expect(result.data?.mlMetrics.modelLatency).toBeGreaterThan(0);
      expect(result.data?.mlMetrics.predictionVolume).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle cache service errors', async () => {
      // Mock cache service to fail
      vi.spyOn(service as any, 'analyticsCacheService').mockImplementation({
        get: vi.fn().mockRejectedValue(new Error('Cache unavailable')),
        set: vi.fn().mockRejectedValue(new Error('Cache unavailable'))
      });

      const result = await service.getAnalyticsData('30d');

      // Should still work without cache
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle BI service errors', async () => {
      // Mock BI service to fail
      vi.spyOn(service as any, 'biService').mockImplementation({
        calculateMetric: vi.fn().mockRejectedValue(new Error('BI service unavailable')),
        getRealtimeMetric: vi.fn().mockRejectedValue(new Error('BI service unavailable'))
      });

      const result = await service.getAnalyticsData('30d');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('BI service unavailable');
    });
  });
});