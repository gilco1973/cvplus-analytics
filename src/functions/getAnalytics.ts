/**
 * Get Analytics Firebase Function
 * Provides analytics data for the existing frontend AnalyticsDashboard component
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { frontendIntegrationService } from '../integrations/frontend-integration';

export const getAnalytics = onCall(async (request) => {
  try {
    // Authenticate user using Firebase Admin directly
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = request.auth.uid;

    const { timeRange = '30d' } = request.data || {};

    // Validate time range
    const validTimeRanges = ['7d', '30d', '90d', '1y'];
    if (!validTimeRanges.includes(timeRange)) {
      return {
        success: false,
        error: { message: 'Invalid time range. Must be one of: 7d, 30d, 90d, 1y' }
      };
    }

    // Get analytics data using frontend integration service
    const analyticsData = await frontendIntegrationService.getAnalyticsData(timeRange);

    return analyticsData;
  } catch (error) {
    console.error('Analytics function error:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch analytics'
      }
    };
  }
});

/**
 * Get Real-time Analytics
 * Provides real-time metrics for dashboard updates
 */
export const getRealtimeAnalytics = onCall(async (request) => {
  try {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const realtimeData = await frontendIntegrationService.getRealtimeAnalytics();

    return {
      success: true,
      data: realtimeData
    };
  } catch (error) {
    console.error('Realtime analytics error:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch realtime analytics'
      }
    };
  }
});

/**
 * Get Chart Data
 * Provides specific chart data for analytics visualizations
 */
export const getChartData = onCall(async (request) => {
  try {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { chartType, timeRange = '30d' } = request.data || {};

    if (!chartType) {
      return {
        success: false,
        error: { message: 'Chart type is required' }
      };
    }

    const validChartTypes = ['retention', 'conversion', 'revenue', 'engagement'];
    if (!validChartTypes.includes(chartType)) {
      return {
        success: false,
        error: { message: `Invalid chart type. Must be one of: ${validChartTypes.join(', ')}` }
      };
    }

    const chartData = await frontendIntegrationService.getChartData(chartType, timeRange);

    return {
      success: true,
      data: chartData
    };
  } catch (error) {
    console.error('Chart data error:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch chart data'
      }
    };
  }
});

/**
 * Health Check for Analytics
 */
export const analyticsHealthCheck = onCall(async (request) => {
  try {
    const health = await frontendIntegrationService.healthCheck();

    return {
      success: true,
      health
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Health check failed'
      }
    };
  }
});