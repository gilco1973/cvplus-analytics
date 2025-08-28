/**
 * Get Conversion Metrics Function
 * 
 * Firebase Function to track and retrieve conversion metrics for external data
 * premium feature, including preview-to-upgrade rates and business intelligence
 * 
 * @author Gil Klainert
 * @created 2025-08-25
 * @version 1.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { requireAuth } from '../middleware/authGuard';
import { 
  ConversionMetrics,
  AnalyticsResponse,
  BusinessIntelligenceReport
} from '../types/external-data-analytics.types';

const db = getFirestore();

interface TrackConversionEventRequest {
  eventType: 'preview_viewed' | 'premium_signup' | 'feature_discovered' | 'upgrade_clicked';
  source?: string;
  metadata?: {
    cvId?: string;
    previousPlan?: string;
    newPlan?: string;
    [key: string]: any;
  };
}

interface GetConversionMetricsRequest {
  startDate?: Date;
  endDate?: Date;
  source?: string;
  adminAccess?: boolean;
}

/**
 * Track conversion events for external data premium feature
 */
export const trackConversionEvent = onCall<TrackConversionEventRequest>(
  {
    ...corsOptions,
    maxInstances: 20,
    timeoutSeconds: 10,
    memory: '256MiB'
  },
  async (request) => {
    try {
      const authRequest = await requireAuth(request);
      const userId = authRequest.auth.uid;
      
      const { eventType, source, metadata } = request.data;
      const timestamp = new Date();
      const dateKey = timestamp.toISOString().split('T')[0];

      logger.info('[TRACK-CONVERSION] Recording conversion event', {
        userId,
        eventType,
        source,
        metadata
      });

      // Validate event type
      const validEventTypes = ['preview_viewed', 'premium_signup', 'feature_discovered', 'upgrade_clicked'];
      if (!validEventTypes.includes(eventType)) {
        throw new HttpsError(
          'invalid-argument',
          `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`
        );
      }

      const batch = db.batch();

      // 1. Store individual conversion event
      const eventRef = db
        .collection('external_data_conversions')
        .doc(userId)
        .collection('events')
        .doc();
      
      batch.set(eventRef, {
        userId,
        eventType,
        source: source || 'unknown',
        metadata: metadata || {},
        timestamp: FieldValue.serverTimestamp(),
        id: eventRef.id
      });

      // 2. Update user conversion journey
      const userJourneyRef = db
        .collection('external_data_conversions')
        .doc(userId)
        .collection('journey')
        .doc('current');

      const journeyUpdate: any = {
        lastEvent: eventType,
        lastEventTimestamp: FieldValue.serverTimestamp(),
        [`${eventType}Count`]: FieldValue.increment(1)
      };

      // Track first occurrence timestamps
      if (eventType === 'feature_discovered') {
        journeyUpdate.firstDiscoveryTimestamp = FieldValue.serverTimestamp();
      } else if (eventType === 'preview_viewed') {
        journeyUpdate.firstPreviewTimestamp = FieldValue.serverTimestamp();
      } else if (eventType === 'premium_signup') {
        journeyUpdate.conversionTimestamp = FieldValue.serverTimestamp();
        journeyUpdate.converted = true;
      }

      batch.set(userJourneyRef, journeyUpdate, { merge: true });

      // 3. Update daily conversion metrics
      const dailyMetricsRef = db
        .collection('conversion_metrics')
        .doc('daily')
        .collection('data')
        .doc(dateKey);

      const dailyUpdate: any = {
        date: dateKey,
        lastUpdated: FieldValue.serverTimestamp(),
        [`${eventType}Count`]: FieldValue.increment(1)
      };

      if (source) {
        dailyUpdate[`sources.${source}.${eventType}Count`] = FieldValue.increment(1);
      }

      batch.set(dailyMetricsRef, dailyUpdate, { merge: true });

      // 4. Update conversion funnel metrics
      const funnelRef = db
        .collection('conversion_metrics')
        .doc('funnel')
        .collection('data')
        .doc(dateKey);

      const funnelUpdate: any = {
        date: dateKey,
        lastUpdated: FieldValue.serverTimestamp()
      };

      switch (eventType) {
        case 'feature_discovered':
          funnelUpdate.step1_discovery = FieldValue.increment(1);
          break;
        case 'preview_viewed':
          funnelUpdate.step2_preview = FieldValue.increment(1);
          break;
        case 'upgrade_clicked':
          funnelUpdate.step3_upgrade_intent = FieldValue.increment(1);
          break;
        case 'premium_signup':
          funnelUpdate.step4_conversion = FieldValue.increment(1);
          break;
      }

      batch.set(funnelRef, funnelUpdate, { merge: true });

      await batch.commit();

      logger.info('[TRACK-CONVERSION] Conversion event recorded successfully', {
        userId,
        eventId: eventRef.id,
        eventType
      });

      return {
        success: true,
        eventId: eventRef.id,
        timestamp: timestamp.toISOString(),
        tracked: {
          userJourney: true,
          dailyMetrics: true,
          conversionFunnel: true
        }
      };

    } catch (error) {
      logger.error('[TRACK-CONVERSION] Failed to track conversion event', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId: request.auth?.uid,
        eventType: request.data?.eventType
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to track conversion event',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Get conversion metrics and analytics
 */
export const getConversionMetrics = onCall<GetConversionMetricsRequest>(
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
      
      // Check admin access
      const isAdmin = await checkAdminAccess(userId);
      if (request.data.adminAccess && !isAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Admin access required for this operation'
        );
      }

      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        source
      } = request.data;

      logger.info('[GET-CONVERSION-METRICS] Retrieving conversion metrics', {
        userId,
        isAdmin,
        startDate,
        endDate,
        source
      });

      const metrics = await aggregateConversionMetrics({
        startDate,
        endDate,
        source
      });

      const response: AnalyticsResponse<ConversionMetrics> = {
        success: true,
        data: metrics,
        metadata: {
          generatedAt: new Date(),
          dataPoints: Object.keys(metrics.sourceSpecificConversion).length,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        }
      };

      return response;

    } catch (error) {
      logger.error('[GET-CONVERSION-METRICS] Failed to retrieve conversion metrics', {
        error: error instanceof Error ? error.message : error,
        userId: request.auth?.uid
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to retrieve conversion metrics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Get business intelligence report
 */
export const getBusinessIntelligenceReport = onCall<{
  period?: '7_days' | '30_days' | '90_days';
  adminAccess?: boolean;
}>(
  {
    ...corsOptions,
    maxInstances: 3,
    timeoutSeconds: 60,
    memory: '1GiB'
  },
  async (request) => {
    try {
      const authRequest = await requireAuth(request);
      const userId = authRequest.auth.uid;
      
      // Require admin access for BI reports
      const isAdmin = await checkAdminAccess(userId);
      if (!isAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Admin access required for business intelligence reports'
        );
      }

      const period = request.data.period || '30_days';
      logger.info('[GET-BI-REPORT] Generating business intelligence report', {
        userId,
        period
      });

      const report = await generateBusinessIntelligenceReport(period);

      const response: AnalyticsResponse<BusinessIntelligenceReport> = {
        success: true,
        data: report,
        metadata: {
          generatedAt: new Date(),
          dataPoints: 1,
          period
        }
      };

      return response;

    } catch (error) {
      logger.error('[GET-BI-REPORT] Failed to generate BI report', {
        error: error instanceof Error ? error.message : error,
        userId: request.auth?.uid
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to generate business intelligence report',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

async function aggregateConversionMetrics({
  startDate,
  endDate,
  source
}: {
  startDate: Date;
  endDate: Date;
  source?: string;
}): Promise<ConversionMetrics> {
  const startDateKey = startDate.toISOString().split('T')[0];
  const endDateKey = endDate.toISOString().split('T')[0];

  // Query daily conversion metrics
  const metricsSnapshot = await db
    .collection('conversion_metrics')
    .doc('daily')
    .collection('data')
    .where('date', '>=', startDateKey)
    .where('date', '<=', endDateKey)
    .orderBy('date')
    .get();

  let totalPreviews = 0;
  let totalConversions = 0;
  const sourceSpecificConversion: Record<string, any> = {};

  metricsSnapshot.forEach(doc => {
    const data = doc.data();
    
    totalPreviews += data.preview_viewedCount || 0;
    totalConversions += data.premium_signupCount || 0;

    // Aggregate source-specific data
    if (data.sources) {
      Object.entries(data.sources).forEach(([sourceKey, sourceData]: [string, any]) => {
        if (!sourceSpecificConversion[sourceKey]) {
          sourceSpecificConversion[sourceKey] = {
            previews: 0,
            conversions: 0,
            conversionRate: 0
          };
        }
        
        sourceSpecificConversion[sourceKey].previews += sourceData.preview_viewedCount || 0;
        sourceSpecificConversion[sourceKey].conversions += sourceData.premium_signupCount || 0;
      });
    }
  });

  // Calculate conversion rates
  const overallConversionRate = totalPreviews > 0 ? (totalConversions / totalPreviews) * 100 : 0;

  Object.keys(sourceSpecificConversion).forEach(sourceKey => {
    const sourceData = sourceSpecificConversion[sourceKey];
    sourceData.conversionRate = sourceData.previews > 0 
      ? (sourceData.conversions / sourceData.previews) * 100 
      : 0;
  });

  // Calculate time to conversion (simplified - would need more complex analysis)
  const timeToConversion = {
    averageMinutes: 0, // Would need to analyze user journey timestamps
    medianMinutes: 0
  };

  return {
    previewToUpgrade: {
      previews: totalPreviews,
      conversions: totalConversions,
      conversionRate: overallConversionRate
    },
    sourceSpecificConversion,
    timeToConversion
  };
}

async function generateBusinessIntelligenceReport(
  period: '7_days' | '30_days' | '90_days'
): Promise<BusinessIntelligenceReport> {
  const days = period === '7_days' ? 7 : period === '30_days' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // This is a simplified implementation - in production, you'd want more sophisticated queries
  const [conversionMetrics, usageAnalytics] = await Promise.all([
    aggregateConversionMetrics({ startDate, endDate: new Date() }),
    // Get usage analytics (would need to implement this query)
    getUsageAnalyticsForPeriod(startDate, new Date())
  ]);

  return {
    reportDate: new Date(),
    period,
    userEngagement: {
      activeUsers: usageAnalytics.uniqueUsers || 0,
      premiumUsers: usageAnalytics.premiumUsers || 0,
      freeUsers: usageAnalytics.freeUsers || 0,
      churnRate: 0 // Would need to calculate from subscription data
    },
    featureUsage: {
      totalExternalDataRequests: usageAnalytics.totalRequests || 0,
      uniqueUsersUsingFeature: usageAnalytics.uniqueUsers || 0,
      averageRequestsPerUser: usageAnalytics.uniqueUsers > 0 
        ? (usageAnalytics.totalRequests || 0) / usageAnalytics.uniqueUsers 
        : 0,
      mostPopularSources: usageAnalytics.topSources || []
    },
    conversionFunnel: {
      featureDiscovery: 0, // Would need to track from frontend analytics
      featurePreview: conversionMetrics.previewToUpgrade.previews,
      premiumConversion: conversionMetrics.previewToUpgrade.conversions,
      conversionRate: conversionMetrics.previewToUpgrade.conversionRate
    },
    revenueImpact: {
      estimatedRevenueFromFeature: conversionMetrics.previewToUpgrade.conversions * 99, // Assuming $99 premium plan
      costPerAcquisition: 0, // Would need marketing cost data
      lifetimeValue: 0 // Would need subscription retention data
    }
  };
}

async function getUsageAnalyticsForPeriod(startDate: Date, endDate: Date): Promise<any> {
  // This would query the external data usage analytics
  // For now, return mock structure - implement based on your analytics schema
  return {
    totalRequests: 0,
    uniqueUsers: 0,
    premiumUsers: 0,
    freeUsers: 0,
    topSources: []
  };
}