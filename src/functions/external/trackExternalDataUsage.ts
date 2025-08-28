/**
 * Track External Data Usage Function
 * 
 * Firebase Function to track usage events for external data enrichment
 * operations, including success/failure metrics and premium user analytics
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
  ExternalDataUsageEvent,
  UsageTrackingRequest,
  ExternalDataUsageStats 
} from '../types/external-data-analytics.types';

const db = getFirestore();

/**
 * Track external data usage event
 * This function can be called internally (no auth required) or externally (auth required)
 */
export const trackExternalDataUsage = onCall<UsageTrackingRequest>(
  {
    ...corsOptions,
    maxInstances: 20,
    timeoutSeconds: 10,
    memory: '256MiB'
  },
  async (request) => {
    try {
      // If called externally, require auth; if called internally, skip auth
      let userId: string;
      
      if (request.auth) {
        // External call - require authentication
        const authRequest = await requireAuth(request);
        userId = authRequest.auth.uid;
        
        // Ensure the user can only track their own events
        if (request.data.event.userId !== userId) {
          throw new HttpsError(
            'permission-denied',
            'Cannot track usage events for other users'
          );
        }
      } else {
        // Internal call - use the userId from the event
        userId = request.data.event.userId;
      }

      const event = request.data.event;
      const timestamp = new Date();
      const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

      logger.info('[TRACK-USAGE] Recording external data usage event', {
        userId,
        cvId: event.cvId,
        sources: event.sources,
        success: event.success,
        premiumStatus: event.premiumStatus
      });

      // Validate event data
      if (!event.userId || !event.cvId || !event.sources || !Array.isArray(event.sources)) {
        throw new HttpsError(
          'invalid-argument',
          'Invalid usage event data: userId, cvId, and sources are required'
        );
      }

      // Batch operations for atomicity
      const batch = db.batch();

      // 1. Store individual usage event
      const eventRef = db
        .collection('external_data_usage')
        .doc(userId)
        .collection('events')
        .doc();
      
      batch.set(eventRef, {
        ...event,
        timestamp: FieldValue.serverTimestamp(),
        id: eventRef.id
      });

      // 2. Update user usage statistics
      const userStatsRef = db
        .collection('external_data_usage')
        .doc(userId)
        .collection('stats')
        .doc('current');

      batch.set(userStatsRef, {
        totalRequests: FieldValue.increment(1),
        successfulRequests: event.success ? FieldValue.increment(1) : FieldValue.increment(0),
        failedRequests: event.success ? FieldValue.increment(0) : FieldValue.increment(1),
        lastUsed: FieldValue.serverTimestamp(),
        sourcesUsed: event.sources.reduce((acc, source) => {
          acc[`sourcesUsed.${source}`] = FieldValue.increment(1);
          return acc;
        }, {} as Record<string, any>)
      }, { merge: true });

      // 3. Update daily analytics
      const dailyAnalyticsRef = db
        .collection('external_data_analytics')
        .doc('daily')
        .collection('data')
        .doc(dateKey);

      const analyticsUpdate: any = {
        date: dateKey,
        totalRequests: FieldValue.increment(1),
        lastUpdated: FieldValue.serverTimestamp()
      };

      // Add premium-specific metrics
      if (event.premiumStatus === 'premium') {
        analyticsUpdate.premiumRequests = FieldValue.increment(1);
      } else {
        analyticsUpdate.freeRequests = FieldValue.increment(1);
      }

      // Add success/failure metrics
      if (event.success) {
        analyticsUpdate.successfulRequests = FieldValue.increment(1);
        analyticsUpdate.totalFetchDuration = FieldValue.increment(event.fetchDuration);
        analyticsUpdate.totalSourcesQueried = FieldValue.increment(event.sourcesQueried);
        analyticsUpdate.totalSourcesSuccessful = FieldValue.increment(event.sourcesSuccessful);
        analyticsUpdate.totalCacheHits = FieldValue.increment(event.cacheHits);
      } else {
        analyticsUpdate.failedRequests = FieldValue.increment(1);
      }

      // Add source-specific metrics
      event.sources.forEach(source => {
        analyticsUpdate[`sourceBreakdown.${source}.requests`] = FieldValue.increment(1);
        if (event.success) {
          analyticsUpdate[`sourceBreakdown.${source}.successful`] = FieldValue.increment(1);
        } else {
          analyticsUpdate[`sourceBreakdown.${source}.failed`] = FieldValue.increment(1);
        }
      });

      batch.set(dailyAnalyticsRef, analyticsUpdate, { merge: true });

      // 4. Update user daily usage (for rate limiting)
      const userDailyRef = db
        .collection('external_data_usage')
        .doc(userId)
        .collection('daily')
        .doc(dateKey);

      batch.set(userDailyRef, {
        date: dateKey,
        requestCount: FieldValue.increment(1),
        lastRequest: FieldValue.serverTimestamp(),
        sources: FieldValue.arrayUnion(...event.sources)
      }, { merge: true });

      // Execute batch
      await batch.commit();

      logger.info('[TRACK-USAGE] Usage event recorded successfully', {
        userId,
        eventId: eventRef.id,
        sources: event.sources,
        success: event.success
      });

      return {
        success: true,
        eventId: eventRef.id,
        timestamp: timestamp.toISOString(),
        tracked: {
          userStats: true,
          dailyAnalytics: true,
          userDailyUsage: true
        }
      };

    } catch (error) {
      logger.error('[TRACK-USAGE] Failed to track usage event', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId: request.data?.event?.userId
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to track usage event',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Get user external data usage statistics
 */
export const getUserExternalDataUsageStats = onCall<{ userId?: string }>(
  {
    ...corsOptions,
    maxInstances: 10,
    timeoutSeconds: 10,
    memory: '256MiB'
  },
  async (request) => {
    try {
      const authRequest = await requireAuth(request);
      const requestingUserId = authRequest.auth.uid;
      
      // Allow users to only access their own stats
      const targetUserId = request.data.userId || requestingUserId;
      if (targetUserId !== requestingUserId) {
        throw new HttpsError(
          'permission-denied',
          'Cannot access usage stats for other users'
        );
      }

      logger.info('[GET-USAGE-STATS] Retrieving usage statistics', {
        userId: targetUserId
      });

      // Get current user statistics
      const userStatsDoc = await db
        .collection('external_data_usage')
        .doc(targetUserId)
        .collection('stats')
        .doc('current')
        .get();

      if (!userStatsDoc.exists) {
        return {
          userId: targetUserId,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageDuration: 0,
          sourcesUsed: {},
          lastUsed: null,
          quotaRemaining: null
        };
      }

      const stats = userStatsDoc.data() as ExternalDataUsageStats;
      
      // Calculate average duration if we have successful requests
      const averageDuration = stats.successfulRequests > 0 
        ? (stats as any).totalFetchDuration / stats.successfulRequests 
        : 0;

      return {
        ...stats,
        averageDuration,
        lastUsed: stats.lastUsed
      };

    } catch (error) {
      logger.error('[GET-USAGE-STATS] Failed to retrieve usage statistics', {
        error: error instanceof Error ? error.message : error,
        userId: request.auth?.uid
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to retrieve usage statistics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);