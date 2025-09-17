/**
 * Conversion Analytics Functions
 * Handles conversion tracking, metrics calculation, and business intelligence
 */

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ConversionEvent, ConversionMetrics, BusinessIntelligenceReport } from '../../types/analytics.types';

/**
 * Track a conversion event
 */
export const trackConversionEvent = onCall(async (request) => {
  try {
    const { data } = request;

    // Input validation
    if (!data) {
      throw new Error('Missing request data');
    }

    const { event, userId, value, currency, metadata } = data;

    // Validate required fields
    if (!event || typeof event !== 'object') {
      throw new Error('Missing or invalid event object');
    }

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Missing or invalid userId');
    }

    if (!event.eventId || typeof event.eventId !== 'string') {
      throw new Error('Missing or invalid event.eventId');
    }

    if (!event.type || typeof event.type !== 'string') {
      throw new Error('Missing or invalid event.type');
    }

    if (!event.category || !['signup', 'subscription', 'purchase', 'engagement', 'feature_usage'].includes(event.category)) {
      throw new Error('Missing or invalid event.category');
    }

    // Validate optional fields
    if (value !== undefined && (typeof value !== 'number' || value < 0)) {
      throw new Error('Invalid value - must be a non-negative number');
    }

    if (currency !== undefined && (typeof currency !== 'string' || currency.length !== 3)) {
      throw new Error('Invalid currency - must be a 3-character ISO code');
    }

    if (metadata !== undefined && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      throw new Error('Invalid metadata - must be an object');
    }

    const db = getFirestore();

    // Store conversion event
    await db.collection('conversion_events').add({
      ...event,
      userId,
      value: value || 0,
      currency: currency || 'USD',
      metadata: metadata || {},
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date()
    });

    // Update user conversion metrics
    await db.collection('user_conversion_metrics').doc(userId).set({
      lastConversion: event.type,
      lastConversionDate: FieldValue.serverTimestamp(),
      totalConversions: FieldValue.increment(1),
      totalValue: FieldValue.increment(value || 0),
      currency: currency || 'USD',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, eventId: event.eventId };
  } catch (error) {
    console.error('Failed to track conversion event:', error);
    throw error;
  }
});

/**
 * Get conversion metrics for analysis
 */
export const getConversionMetrics = onCall(async (request) => {
  try {
    const { data } = request;

    // Input validation
    if (!data) {
      throw new Error('Missing request data');
    }

    const { timeRange, userId, conversionType } = data;

    // Validate timeRange if provided
    if (timeRange) {
      if (typeof timeRange !== 'object' || !timeRange.start || !timeRange.end) {
        throw new Error('Invalid timeRange - must have start and end dates');
      }

      const startDate = new Date(timeRange.start);
      const endDate = new Date(timeRange.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid timeRange - start and end must be valid dates');
      }

      if (startDate >= endDate) {
        throw new Error('Invalid timeRange - start date must be before end date');
      }

      // Prevent excessive date ranges
      const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
        throw new Error('Invalid timeRange - maximum range is 1 year');
      }
    }

    // Validate userId if provided
    if (userId !== undefined && (typeof userId !== 'string' || userId.trim().length === 0)) {
      throw new Error('Invalid userId - must be a non-empty string');
    }

    // Validate conversionType if provided
    if (conversionType !== undefined && (typeof conversionType !== 'string' || conversionType.trim().length === 0)) {
      throw new Error('Invalid conversionType - must be a non-empty string');
    }

    const db = getFirestore();
    let query = db.collection('conversion_events').orderBy('createdAt', 'desc');

    // Apply filters
    if (timeRange) {
      query = query.where('createdAt', '>=', timeRange.start)
                   .where('createdAt', '<=', timeRange.end);
    }

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (conversionType) {
      query = query.where('type', '==', conversionType);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate metrics
    const totalConversions = events.length;
    const totalValue = events.reduce((sum, event) => sum + (event.value || 0), 0);
    const uniqueUsers = new Set(events.map(event => event.userId)).size;

    // Calculate conversion rate (requires visitor data)
    const visitorsQuery = await db.collection('user_sessions')
      .where('createdAt', '>=', timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .where('createdAt', '<=', timeRange?.end || new Date())
      .get();

    const totalVisitors = new Set(visitorsQuery.docs.map(doc => doc.data().userId)).size;
    const conversionRate = totalVisitors > 0 ? (uniqueUsers / totalVisitors) * 100 : 0;

    // Group by conversion type
    const conversionsByType = events.reduce((acc, event) => {
      const type = event.type || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, value: 0 };
      }
      acc[type].count++;
      acc[type].value += event.value || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    // Top converting funnel steps
    const funnelSteps = [
      { step: 'landing', name: 'Landing Page Visit' },
      { step: 'signup', name: 'User Registration' },
      { step: 'profile_complete', name: 'Profile Completion' },
      { step: 'first_cv_upload', name: 'First CV Upload' },
      { step: 'premium_signup', name: 'Premium Subscription' }
    ];

    const funnelMetrics = await Promise.all(
      funnelSteps.map(async (step) => {
        const stepEvents = await db.collection('conversion_events')
          .where('type', '==', step.step)
          .where('createdAt', '>=', timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .where('createdAt', '<=', timeRange?.end || new Date())
          .get();

        return {
          step: step.step,
          name: step.name,
          conversions: stepEvents.size,
          conversionRate: totalVisitors > 0 ? (stepEvents.size / totalVisitors) * 100 : 0
        };
      })
    );

    const metrics: ConversionMetrics = {
      totalConversions,
      totalValue,
      uniqueUsers,
      conversionRate,
      averageOrderValue: totalConversions > 0 ? totalValue / totalConversions : 0,
      conversionsByType,
      funnelMetrics,
      timeRange: timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    };

    return metrics;
  } catch (error) {
    console.error('Failed to get conversion metrics:', error);
    throw error;
  }
});

/**
 * Generate comprehensive business intelligence report
 */
export const getBusinessIntelligenceReport = onCall(async (request) => {
  try {
    const { data } = request;

    // Input validation
    if (!data) {
      throw new Error('Missing request data');
    }

    const { timeRange, includeForecasting } = data;

    // Validate timeRange if provided
    if (timeRange) {
      if (typeof timeRange !== 'object' || !timeRange.start || !timeRange.end) {
        throw new Error('Invalid timeRange - must have start and end dates');
      }

      const startDate = new Date(timeRange.start);
      const endDate = new Date(timeRange.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid timeRange - start and end must be valid dates');
      }

      if (startDate >= endDate) {
        throw new Error('Invalid timeRange - start date must be before end date');
      }

      // Prevent excessive date ranges for BI reports
      const maxRangeMs = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years for BI reports
      if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
        throw new Error('Invalid timeRange - maximum range is 2 years');
      }
    }

    // Validate includeForecasting if provided
    if (includeForecasting !== undefined && typeof includeForecasting !== 'boolean') {
      throw new Error('Invalid includeForecasting - must be a boolean');
    }

    const db = getFirestore();
    const startDate = timeRange?.start ? new Date(timeRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = timeRange?.end ? new Date(timeRange.end) : new Date();

    // Get conversion metrics directly (avoid circular call)
    const conversionEventsQuery = await db.collection('conversion_events')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'desc')
      .get();

    const conversionEvents = conversionEventsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate conversion metrics
    const totalConversions = conversionEvents.length;
    const totalValue = conversionEvents.reduce((sum, event) => sum + (event.value || 0), 0);
    const uniqueUsers = new Set(conversionEvents.map(event => event.userId)).size;

    // Calculate conversion rate (requires visitor data)
    const visitorsQuery = await db.collection('user_sessions')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    const totalVisitors = new Set(visitorsQuery.docs.map(doc => doc.data().userId)).size;
    const conversionRate = totalVisitors > 0 ? (uniqueUsers / totalVisitors) * 100 : 0;

    // Group by conversion type
    const conversionsByType = conversionEvents.reduce((acc, event) => {
      const type = event.type || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, value: 0 };
      }
      acc[type].count++;
      acc[type].value += event.value || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const conversionMetrics: ConversionMetrics = {
      totalConversions,
      totalValue,
      uniqueUsers,
      conversionRate,
      averageOrderValue: totalConversions > 0 ? totalValue / totalConversions : 0,
      conversionsByType,
      funnelMetrics: [], // Will be calculated below
      timeRange: { start: startDate, end: endDate }
    };

    // Get revenue data
    const revenueQuery = await db.collection('revenue_events')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'desc')
      .get();

    const revenueEvents = revenueQuery.docs.map(doc => doc.data());
    const totalRevenue = revenueEvents.reduce((sum, event) => sum + (event.amount || 0), 0);
    const monthlyRecurringRevenue = revenueEvents
      .filter(event => event.type === 'subscription')
      .reduce((sum, event) => sum + (event.amount || 0), 0);

    // Get user engagement data
    const engagementQuery = await db.collection('user_sessions')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    const sessions = engagementQuery.docs.map(doc => doc.data());
    const uniqueUsers = new Set(sessions.map(session => session.userId)).size;
    const totalSessions = sessions.length;
    const averageSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length
      : 0;

    // Get churn predictions if ML data available
    const churnQuery = await db.collection('churn_predictions')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    const churnPredictions = churnQuery.docs.map(doc => doc.data());
    const averageChurnRisk = churnPredictions.length > 0
      ? churnPredictions.reduce((sum, pred) => sum + (pred.churnProbability || 0), 0) / churnPredictions.length
      : 0;

    // Customer acquisition metrics
    const newUsersQuery = await db.collection('users')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    const newUsers = newUsersQuery.size;
    const customerAcquisitionCost = totalRevenue > 0 && newUsers > 0
      ? totalRevenue / newUsers
      : 0;

    // Feature usage analytics
    const featureUsageQuery = await db.collection('feature_usage')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const featureUsage = featureUsageQuery.docs.reduce((acc, doc) => {
      const data = doc.data();
      const feature = data.feature || 'unknown';
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topFeatures = Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([feature, usage]) => ({ feature, usage }));

    // Forecasting (simplified)
    let forecasting = {};
    if (includeForecasting) {
      const dailyRevenue = totalRevenue / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      forecasting = {
        projectedMonthlyRevenue: dailyRevenue * 30,
        projectedQuarterlyRevenue: dailyRevenue * 90,
        projectedYearlyRevenue: dailyRevenue * 365,
        revenueGrowthTrend: dailyRevenue > 0 ? 'positive' : 'stable'
      };
    }

    const report: BusinessIntelligenceReport = {
      reportId: `bi_${Date.now()}`,
      generatedAt: new Date(),
      timeRange: { start: startDate, end: endDate },

      // Revenue metrics
      revenue: {
        total: totalRevenue,
        monthlyRecurring: monthlyRecurringRevenue,
        averageOrderValue: conversionMetrics.averageOrderValue,
        revenuePerUser: uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0
      },

      // Conversion metrics
      conversions: conversionMetrics,

      // User engagement
      engagement: {
        uniqueUsers,
        totalSessions,
        averageSessionDuration,
        sessionsPerUser: uniqueUsers > 0 ? totalSessions / uniqueUsers : 0
      },

      // Customer metrics
      customers: {
        newUsers,
        customerAcquisitionCost,
        averageChurnRisk,
        retentionRate: Math.max(0, 1 - averageChurnRisk)
      },

      // Feature analytics
      features: {
        topFeatures,
        totalFeatureUsage: Object.values(featureUsage).reduce((sum, count) => sum + count, 0)
      },

      // Forecasting
      forecasting: includeForecasting ? forecasting : undefined
    };

    return report;
  } catch (error) {
    console.error('Failed to generate business intelligence report:', error);
    throw error;
  }
});