/**
 * Business Intelligence Service Tests
 * Tests for the modular BI service implementation
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BusinessIntelligenceService } from '../src/services/business-intelligence/index';

describe('BusinessIntelligenceService', () => {
  let service: BusinessIntelligenceService;

  beforeEach(() => {
    service = new BusinessIntelligenceService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dashboard Management', () => {
    it('should create a dashboard', async () => {
      const dashboard = await service.createDashboard({
        name: 'Test Dashboard',
        type: 'analytics',
        userId: 'user123',
        isPublic: false
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('Test Dashboard');
      expect(dashboard.type).toBe('analytics');
      expect(dashboard.userId).toBe('user123');
      expect(dashboard.isPublic).toBe(false);
      expect(dashboard.widgets).toEqual([]);
      expect(dashboard.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve a dashboard by ID', async () => {
      const dashboard = await service.createDashboard({
        name: 'Test Dashboard',
        type: 'analytics'
      });

      const retrieved = await service.getDashboard(dashboard.id);

      expect(retrieved).toEqual(dashboard);
    });

    it('should get user dashboards', async () => {
      const userId = 'user123';

      const dashboard1 = await service.createDashboard({
        name: 'Dashboard 1',
        type: 'analytics',
        userId
      });

      const dashboard2 = await service.createDashboard({
        name: 'Dashboard 2',
        type: 'analytics',
        userId
      });

      const userDashboards = await service.getUserDashboards(userId);

      expect(userDashboards).toHaveLength(2);
      expect(userDashboards.map(d => d.id)).toContain(dashboard1.id);
      expect(userDashboards.map(d => d.id)).toContain(dashboard2.id);
    });

    it('should return null for non-existent dashboard', async () => {
      const result = await service.getDashboard('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('Report Generation', () => {
    it('should generate a revenue report', async () => {
      const report = await service.generateReport({
        name: 'Revenue Report',
        type: 'revenue',
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        metrics: ['total_revenue', 'mrr'],
        format: 'json'
      });

      expect(report.id).toBeDefined();
      expect(report.name).toBe('Revenue Report');
      expect(report.type).toBe('revenue');
      expect(report.format).toBe('json');
      expect(report.data).toBeDefined();
      expect(report.data.summary).toBeDefined();
      expect(report.data.breakdown).toBeDefined();
      expect(report.createdAt).toBeInstanceOf(Date);
    });

    it('should generate a user engagement report', async () => {
      const report = await service.generateReport({
        name: 'User Engagement Report',
        type: 'user_engagement',
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        metrics: ['dau', 'retention'],
        format: 'json'
      });

      expect(report.data.summary).toBeDefined();
      expect(report.data.engagement).toBeDefined();
      expect(report.data.summary.dailyActiveUsers).toBeGreaterThan(0);
      expect(report.data.engagement.retention).toBeDefined();
    });

    it('should export report in different formats', async () => {
      const report = await service.generateReport({
        name: 'Test Report',
        type: 'revenue',
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        metrics: ['revenue'],
        format: 'json'
      });

      const csvExport = await service.exportReport(report.id, 'csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain(','); // CSV should contain commas

      const jsonExport = await service.exportReport(report.id, 'json');
      expect(typeof jsonExport).toBe('string');
      expect(() => JSON.parse(jsonExport as string)).not.toThrow();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate revenue metrics', async () => {
      const revenue = await service.calculateMetric(
        'total_revenue',
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      );

      expect(revenue).toBeGreaterThan(0);
      expect(typeof revenue).toBe('number');
    });

    it('should calculate user metrics', async () => {
      const dau = await service.calculateMetric(
        'daily_active_users',
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      );

      expect(dau).toBeGreaterThan(0);
      expect(typeof dau).toBe('number');
    });

    it('should get realtime metrics with trend', async () => {
      const realtimeMetric = await service.getRealtimeMetric('daily_active_users');

      expect(realtimeMetric.value).toBeGreaterThanOrEqual(0);
      expect(realtimeMetric.lastUpdated).toBeInstanceOf(Date);
      expect(['up', 'down', 'stable']).toContain(realtimeMetric.trend);
    });
  });

  describe('Alert Management', () => {
    it('should create an alert', async () => {
      const alert = await service.createAlert({
        name: 'High Error Rate Alert',
        metricId: 'error_rate',
        condition: {
          operator: 'greater_than',
          threshold: 0.05
        },
        recipients: ['admin@example.com']
      });

      expect(alert.id).toBeDefined();
      expect(alert.name).toBe('High Error Rate Alert');
      expect(alert.metricId).toBe('error_rate');
      expect(alert.isActive).toBe(true);
      expect(alert.recipients).toContain('admin@example.com');
      expect(alert.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Predictive Analytics', () => {
    it('should train a churn prediction model', async () => {
      const model = await service.trainModel({
        name: 'Churn Prediction',
        type: 'churn',
        features: ['days_since_last_login', 'session_count'],
        target: 'churned'
      });

      expect(model.id).toBeDefined();
      expect(model.name).toBe('Churn Prediction');
      expect(model.type).toBe('churn');
      expect(model.features).toEqual(['days_since_last_login', 'session_count']);
      expect(model.status).toBe('ready');
      expect(model.accuracy).toBeGreaterThan(0);
      expect(model.accuracy).toBeLessThanOrEqual(1);
    });

    it('should make predictions using trained model', async () => {
      const model = await service.trainModel({
        name: 'Test Model',
        type: 'churn',
        features: ['days_since_last_login'],
        target: 'churned'
      });

      const prediction = await service.makePrediction(model.id, {
        days_since_last_login: 7
      });

      expect(prediction.id).toBeDefined();
      expect(prediction.modelId).toBe(model.id);
      expect(prediction.prediction).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.createdAt).toBeInstanceOf(Date);
    });

    it('should provide churn prediction with recommendations', async () => {
      const model = await service.trainModel({
        name: 'Churn Model',
        type: 'churn',
        features: ['days_since_last_login', 'session_count'],
        target: 'churned'
      });

      const prediction = await service.makePrediction(model.id, {
        days_since_last_login: 14,
        session_count: 5
      });

      expect(prediction.prediction.churn_probability).toBeDefined();
      expect(prediction.prediction.risk_level).toMatch(/high|medium|low/);
      expect(Array.isArray(prediction.prediction.recommendations)).toBe(true);
    });
  });

  describe('Business Summary', () => {
    it('should generate comprehensive business summary', async () => {
      const summary = await service.getBusinessSummary({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      });

      expect(summary.revenue).toBeDefined();
      expect(summary.users).toBeDefined();
      expect(summary.conversion).toBeDefined();
      expect(summary.predictions).toBeDefined();

      expect(summary.revenue.total).toBeGreaterThanOrEqual(0);
      expect(summary.revenue.mrr).toBeGreaterThanOrEqual(0);
      expect(summary.users.active).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const health = await service.healthCheck();

      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.components).toBeDefined();
      expect(health.components.dashboards).toBeDefined();
      expect(health.components.reporting).toBeDefined();
      expect(health.components.metrics).toBeDefined();
      expect(health.components.alerts).toBeDefined();
      expect(health.components.predictive).toBeDefined();
    });

    it('should return healthy status for normal operation', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(Object.values(health.components).every(status => status === true)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid metric IDs', async () => {
      const result = await service.calculateMetric(
        'invalid_metric',
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      );

      // Should return a reasonable default value for unknown metrics
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle prediction on non-existent model', async () => {
      await expect(
        service.makePrediction('non-existent-model', {})
      ).rejects.toThrow('Model non-existent-model not found');
    });

    it('should handle export on non-existent report', async () => {
      await expect(
        service.exportReport('non-existent-report', 'json')
      ).rejects.toThrow('Report non-existent-report not found');
    });
  });

  describe('Performance', () => {
    it('should complete metric calculations quickly', async () => {
      const start = Date.now();

      await service.calculateMetric('daily_active_users', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent calculations', async () => {
      const promises = Array.from({ length: 10 }, () =>
        service.calculateMetric('daily_active_users', {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });
  });
});