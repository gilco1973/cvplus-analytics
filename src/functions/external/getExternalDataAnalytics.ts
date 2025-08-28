/**
 * Get External Data Analytics Function
 * 
 * Firebase Function to retrieve aggregated analytics and business intelligence
 * metrics for external data enrichment operations
 * 
 * @author Gil Klainert
 * @created 2025-08-25
 * @version 1.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { requireAuth } from '../middleware/authGuard';
import { 
  AnalyticsRequest,
  AnalyticsResponse,
  ExternalDataAnalytics,
  DailyAnalytics
} from '../types/external-data-analytics.types';

const db = getFirestore();

interface GetAnalyticsRequest extends AnalyticsRequest {
  adminAccess?: boolean;
}

/**
 * Get external data analytics
 * Only accessible by premium users for their own data, or admins for all data
 */
export const getExternalDataAnalytics = onCall<GetAnalyticsRequest>(
  {
    ...corsOptions,
    maxInstances: 5,
    timeoutSeconds: 30,
    memory: '512MiB'
  },
  async (request) => {
    try {
      const authRequest = await requireAuth(request);
      const userId = authRequest.auth.uid;
      
      // Check if user has admin access (implement your admin check logic here)
      const isAdmin = await checkAdminAccess(userId);
      const targetUserId = request.data.adminAccess && isAdmin ? null : userId;

      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
        endDate = new Date(),
        granularity = 'day'
      } = request.data;

      logger.info('[GET-ANALYTICS] Retrieving external data analytics', {
        userId,
        targetUserId,
        isAdmin,
        startDate,
        endDate,
        granularity
      });

      // Validate date range
      if (startDate >= endDate) {
        throw new HttpsError(
          'invalid-argument',
          'Start date must be before end date'
        );
      }

      const analytics = await aggregateAnalytics({
        userId: targetUserId,
        startDate,
        endDate,
        granularity
      });

      const response: AnalyticsResponse<ExternalDataAnalytics> = {
        success: true,
        data: analytics,
        metadata: {
          generatedAt: new Date(),
          dataPoints: analytics.sourcesBreakdown ? Object.keys(analytics.sourcesBreakdown).length : 0,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        }
      };

      logger.info('[GET-ANALYTICS] Analytics retrieved successfully', {
        userId,
        dataPoints: response.metadata.dataPoints,
        totalRequests: analytics.totalRequests
      });

      return response;

    } catch (error) {
      logger.error('[GET-ANALYTICS] Failed to retrieve analytics', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId: request.auth?.uid
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to retrieve analytics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Get daily analytics summary
 */
export const getDailyExternalDataAnalytics = onCall<{
  startDate?: Date;
  endDate?: Date;
  adminAccess?: boolean;
}>(
  {
    ...corsOptions,
    maxInstances: 5,
    timeoutSeconds: 20,
    memory: '256MiB'
  },
  async (request) => {
    try {
      const authRequest = await requireAuth(request);
      const userId = authRequest.auth.uid;
      
      // Check admin access
      const isAdmin = await checkAdminAccess(userId);
      if (request.data.adminAccess && !isAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Admin access required for this operation'
        );
      }

      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: 7 days ago
        endDate = new Date()
      } = request.data;

      logger.info('[GET-DAILY-ANALYTICS] Retrieving daily analytics', {
        userId,
        isAdmin,
        startDate,
        endDate
      });

      const dailyAnalytics = await getDailyAnalyticsData(startDate, endDate);

      const response: AnalyticsResponse<DailyAnalytics[]> = {
        success: true,
        data: dailyAnalytics,
        metadata: {
          generatedAt: new Date(),
          dataPoints: dailyAnalytics.length,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        }
      };

      return response;

    } catch (error) {
      logger.error('[GET-DAILY-ANALYTICS] Failed to retrieve daily analytics', {
        error: error instanceof Error ? error.message : error,
        userId: request.auth?.uid
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to retrieve daily analytics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has admin access
 * This is a placeholder - implement your actual admin check logic
 */
async function checkAdminAccess(userId: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.isAdmin === true;
  } catch (error) {
    logger.error('[CHECK-ADMIN] Failed to check admin access', { error, userId });
    return false;
  }
}

/**
 * Aggregate analytics data from Firestore
 */
async function aggregateAnalytics({
  userId,
  startDate,
  endDate,
  granularity
}: {
  userId: string | null;
  startDate: Date;
  endDate: Date;
  granularity: string;
}): Promise<ExternalDataAnalytics> {
  const startDateKey = startDate.toISOString().split('T')[0];
  const endDateKey = endDate.toISOString().split('T')[0];

  // Query daily analytics documents
  let query = db
    .collection('external_data_analytics')
    .doc('daily')
    .collection('data')
    .where('date', '>=', startDateKey)
    .where('date', '<=', endDateKey)
    .orderBy('date');

  const analyticsSnapshot = await query.get();
  
  // Initialize aggregation variables
  let totalRequests = 0;
  let successfulRequests = 0;
  let premiumRequests = 0;
  let freeRequests = 0;
  const sourcesBreakdown: Record<string, any> = {};

  // Process each daily analytics document
  analyticsSnapshot.forEach(doc => {
    const data = doc.data();
    
    totalRequests += data.totalRequests || 0;
    successfulRequests += data.successfulRequests || 0;
    premiumRequests += data.premiumRequests || 0;
    freeRequests += data.freeRequests || 0;

    // Aggregate source-specific metrics
    if (data.sourceBreakdown) {
      Object.entries(data.sourceBreakdown).forEach(([source, sourceData]: [string, any]) => {
        if (!sourcesBreakdown[source]) {
          sourcesBreakdown[source] = {
            requests: 0,
            successRate: 0,
            averageDuration: 0,
            totalDuration: 0,
            successfulCount: 0
          };
        }
        
        sourcesBreakdown[source].requests += sourceData.requests || 0;
        sourcesBreakdown[source].successfulCount += sourceData.successful || 0;
        sourcesBreakdown[source].totalDuration += sourceData.duration || 0;
      });
    }
  });

  // Calculate success rate
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

  // Calculate source-specific metrics
  Object.keys(sourcesBreakdown).forEach(source => {
    const sourceData = sourcesBreakdown[source];
    sourceData.successRate = sourceData.requests > 0 
      ? (sourceData.successfulCount / sourceData.requests) * 100 
      : 0;
    sourceData.averageDuration = sourceData.successfulCount > 0 
      ? sourceData.totalDuration / sourceData.successfulCount 
      : 0;
      
    // Clean up temporary fields
    delete sourceData.totalDuration;
    delete sourceData.successfulCount;
  });

  // Get conversion metrics (simplified for now)
  const conversionMetrics = {
    previewToUpgrade: {
      previews: freeRequests,
      conversions: 0, // Would need to calculate from actual conversion data
      conversionRate: 0
    },
    sourceSpecificConversion: {},
    timeToConversion: {
      averageMinutes: 0,
      medianMinutes: 0
    }
  };

  return {
    period: granularity as 'daily' | 'weekly' | 'monthly',
    startDate,
    endDate,
    totalRequests,
    successRate,
    premiumUsers: Math.ceil(premiumRequests / 10), // Rough estimate
    freeUsers: Math.ceil(freeRequests / 3), // Rough estimate
    sourcesBreakdown,
    conversionMetrics
  };
}

/**
 * Get daily analytics data
 */
async function getDailyAnalyticsData(startDate: Date, endDate: Date): Promise<DailyAnalytics[]> {
  const startDateKey = startDate.toISOString().split('T')[0];
  const endDateKey = endDate.toISOString().split('T')[0];

  const analyticsSnapshot = await db
    .collection('external_data_analytics')
    .doc('daily')
    .collection('data')
    .where('date', '>=', startDateKey)
    .where('date', '<=', endDateKey)
    .orderBy('date')
    .get();

  return analyticsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      date: data.date,
      totalRequests: data.totalRequests || 0,
      premiumRequests: data.premiumRequests || 0,
      freeRequests: data.freeRequests || 0,
      unauthorizedAttempts: data.unauthorizedAttempts || 0,
      averageResponseTime: data.totalFetchDuration && data.successfulRequests 
        ? data.totalFetchDuration / data.successfulRequests 
        : 0,
      topSources: data.sourceBreakdown 
        ? Object.keys(data.sourceBreakdown).sort((a, b) => 
            (data.sourceBreakdown[b].requests || 0) - (data.sourceBreakdown[a].requests || 0)
          ).slice(0, 5)
        : [],
      newPremiumSignups: 0, // Would need to calculate from actual subscription data
      conversionRate: 0 // Would need to calculate from actual conversion data
    };
  });
}