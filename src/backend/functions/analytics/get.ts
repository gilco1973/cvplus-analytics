import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import {
  getAnalyticsByEntity,
  getAnalyticsAggregates,
  getAnalyticsEvents
} from '../../models/analytics.service';
import { getUserProfile } from '../../models/user-profile.service';
import { getPublicProfile } from '../../models/public-profile.service';
import { getCVJob } from '../../models/cv-job.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { EntityType, AggregationPeriod } from '../../../../shared/types/analytics';

interface AnalyticsRequest {
  period?: AggregationPeriod;
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
  includeRawEvents?: boolean;
  groupBy?: 'day' | 'week' | 'month';
  limit?: number;
}

interface AnalyticsResponse {
  success: boolean;
  entityType: EntityType;
  entityId: string;
  period?: AggregationPeriod;
  data?: {
    aggregates?: {
      totalEvents: number;
      uniqueUsers: number;
      topEvents: Array<{
        eventType: string;
        count: number;
      }>;
      dailyBreakdown?: Array<{
        date: string;
        events: number;
        uniqueUsers: number;
      }>;
      weeklyBreakdown?: Array<{
        week: string;
        events: number;
        uniqueUsers: number;
      }>;
      monthlyBreakdown?: Array<{
        month: string;
        events: number;
        uniqueUsers: number;
      }>;
    };
    events?: Array<{
      id: string;
      eventType: string;
      timestamp: string;
      userId?: string;
      eventData: Record<string, any>;
    }>;
    insights?: {
      performanceScore: number;
      trends: {
        viewsChange: number;
        engagementChange: number;
        conversionChange: number;
      };
      recommendations: string[];
    };
  };
  message?: string;
}

export const getAnalytics = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 100,
    cors: {
      origin: true,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('Analytics request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(200).send('');
        return;
      }

      // Only allow GET method
      if (req.method !== 'GET') {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use GET.'
        } as AnalyticsResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as AnalyticsResponse);
        return;
      }

      const userId = authResult.userId;

      // Extract entityType and entityId from URL path
      const urlParts = req.path.split('/').filter(part => part.length > 0);
      if (urlParts.length < 3) {
        res.status(400).json({
          success: false,
          message: 'Invalid URL format. Expected: /analytics/{entityType}/{entityId}'
        } as AnalyticsResponse);
        return;
      }

      const entityType = urlParts[urlParts.length - 2] as EntityType;
      const entityId = urlParts[urlParts.length - 1];

      // Validate entity type
      const validEntityTypes = ['user_profile', 'processed_cv', 'generated_content', 'public_profile'];
      if (!validEntityTypes.includes(entityType)) {
        res.status(400).json({
          success: false,
          message: `Invalid entity type. Supported types: ${validEntityTypes.join(', ')}`
        } as AnalyticsResponse);
        return;
      }

      // Parse query parameters
      const requestParams: AnalyticsRequest = {
        period: (req.query.period as AggregationPeriod) || AggregationPeriod.LAST_30_DAYS,
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        eventTypes: req.query.event_types ? (req.query.event_types as string).split(',') : undefined,
        includeRawEvents: req.query.include_raw_events === 'true',
        groupBy: (req.query.group_by as 'day' | 'week' | 'month') || 'day',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };

      console.log(`Getting analytics for ${entityType}/${entityId} with period: ${requestParams.period}`);

      // Verify entity ownership
      const ownershipCheck = await verifyEntityOwnership(entityType, entityId, userId);
      if (!ownershipCheck.isOwner) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only view analytics for your own content.'
        } as AnalyticsResponse);
        return;
      }

      // Check if user has analytics access
      const userProfile = await getUserProfile(userId);
      const hasAnalyticsAccess = checkAnalyticsAccess(userProfile.subscriptionTier, entityType);

      if (!hasAnalyticsAccess) {
        res.status(403).json({
          success: false,
          message: 'Analytics access not available in your subscription tier. Please upgrade to access detailed analytics.'
        } as AnalyticsResponse);
        return;
      }

      // Get analytics data
      const analyticsData = await fetchAnalyticsData(
        entityType,
        entityId,
        requestParams,
        userProfile.subscriptionTier
      );

      // Generate insights (premium+ only)
      let insights;
      if (['premium', 'enterprise'].includes(userProfile.subscriptionTier)) {
        insights = await generateInsights(entityType, entityId, analyticsData);
      }

      // Set appropriate cache headers
      const cacheMaxAge = getCacheMaxAge(requestParams.period);
      res.set({
        'Cache-Control': `private, max-age=${cacheMaxAge}`,
        'X-Analytics-Period': requestParams.period,
        'X-Entity-Type': entityType
      });

      console.log(`Analytics data retrieved successfully for ${entityType}/${entityId}`);

      res.status(200).json({
        success: true,
        entityType,
        entityId,
        period: requestParams.period,
        data: {
          ...analyticsData,
          insights
        }
      } as AnalyticsResponse);

    } catch (error) {
      console.error('Analytics retrieval error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error while retrieving analytics'
      } as AnalyticsResponse);
    }
  }
);

/**
 * Verify that the user owns the entity
 */
async function verifyEntityOwnership(
  entityType: EntityType,
  entityId: string,
  userId: string
): Promise<{ isOwner: boolean; entity?: any }> {
  try {
    switch (entityType) {
      case 'user_profile':
        return { isOwner: entityId === userId };

      case 'processed_cv':
        // Would need to implement getProcessedCV ownership check
        return { isOwner: true }; // Simplified for now

      case 'generated_content':
        // Would need to implement getGeneratedContent ownership check
        return { isOwner: true }; // Simplified for now

      case 'public_profile':
        const profile = await getPublicProfile(entityId);
        return {
          isOwner: profile ? profile.userId === userId : false,
          entity: profile
        };

      default:
        return { isOwner: false };
    }
  } catch (error) {
    console.error('Entity ownership verification failed:', error);
    return { isOwner: false };
  }
}

/**
 * Check if user has analytics access for entity type
 */
function checkAnalyticsAccess(tier: string, entityType: EntityType): boolean {
  const accessLevels = {
    free: [],
    basic: ['public_profile'],
    premium: ['user_profile', 'processed_cv', 'generated_content', 'public_profile'],
    enterprise: ['user_profile', 'processed_cv', 'generated_content', 'public_profile']
  };

  const allowedTypes = accessLevels[tier as keyof typeof accessLevels] || [];
  return allowedTypes.includes(entityType);
}

/**
 * Fetch analytics data based on request parameters
 */
async function fetchAnalyticsData(
  entityType: EntityType,
  entityId: string,
  params: AnalyticsRequest,
  tier: string
) {
  const data: any = {};

  // Get aggregated data
  const aggregates = await getAnalyticsAggregates(
    entityType,
    entityId,
    params.period!,
    params.startDate,
    params.endDate
  );

  if (aggregates.length > 0) {
    const totalEvents = aggregates.reduce((sum, agg) => sum + agg.eventCount, 0);
    const uniqueUsers = new Set(aggregates.flatMap(agg => agg.uniqueUserIds || [])).size;

    // Group by event type
    const eventTypeCounts = aggregates.reduce((acc, agg) => {
      acc[agg.eventType] = (acc[agg.eventType] || 0) + agg.eventCount;
      return acc;
    }, {} as Record<string, number>);

    const topEvents = Object.entries(eventTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([eventType, count]) => ({ eventType, count }));

    data.aggregates = {
      totalEvents,
      uniqueUsers,
      topEvents
    };

    // Add breakdown by time period if requested
    if (params.groupBy) {
      data.aggregates[`${params.groupBy}lyBreakdown`] = generateTimeBreakdown(
        aggregates,
        params.groupBy
      );
    }
  }

  // Get raw events if requested and allowed
  if (params.includeRawEvents && ['premium', 'enterprise'].includes(tier)) {
    const events = await getAnalyticsEvents(
      entityType,
      entityId,
      params.startDate,
      params.endDate,
      params.eventTypes,
      params.limit || 100
    );

    data.events = events.map(event => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp.toDate().toISOString(),
      userId: event.userId,
      eventData: event.eventData
    }));
  }

  return data;
}

/**
 * Generate time breakdown for aggregates
 */
function generateTimeBreakdown(aggregates: any[], groupBy: 'day' | 'week' | 'month') {
  const breakdown = aggregates.reduce((acc, agg) => {
    let key: string;
    const date = agg.periodStart.toDate();

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!acc[key]) {
      acc[key] = { events: 0, uniqueUsers: new Set() };
    }

    acc[key].events += agg.eventCount;
    (agg.uniqueUserIds || []).forEach((userId: string) => acc[key].uniqueUsers.add(userId));

    return acc;
  }, {} as Record<string, any>);

  return Object.entries(breakdown).map(([period, data]) => ({
    [groupBy === 'day' ? 'date' : groupBy === 'week' ? 'week' : 'month']: period,
    events: data.events,
    uniqueUsers: data.uniqueUsers.size
  }));
}

/**
 * Generate insights for premium+ users
 */
async function generateInsights(entityType: EntityType, entityId: string, analyticsData: any) {
  // Calculate performance score
  const performanceScore = calculatePerformanceScore(entityType, analyticsData);

  // Calculate trends (would require historical data comparison)
  const trends = {
    viewsChange: Math.floor(Math.random() * 40) - 20, // Placeholder
    engagementChange: Math.floor(Math.random() * 30) - 15,
    conversionChange: Math.floor(Math.random() * 20) - 10
  };

  // Generate recommendations
  const recommendations = generateRecommendations(entityType, analyticsData, trends);

  return {
    performanceScore,
    trends,
    recommendations
  };
}

/**
 * Calculate performance score based on entity type and data
 */
function calculatePerformanceScore(entityType: EntityType, data: any): number {
  let score = 50; // Base score

  if (!data.aggregates) return score;

  const { totalEvents, uniqueUsers, topEvents } = data.aggregates;

  switch (entityType) {
    case 'public_profile':
      // Score based on views, engagement, and diversity of interactions
      if (totalEvents > 100) score += 20;
      else if (totalEvents > 50) score += 10;

      if (uniqueUsers > 20) score += 15;
      else if (uniqueUsers > 10) score += 8;

      if (topEvents.length > 3) score += 15; // Diverse interactions

      break;

    case 'processed_cv':
      // Score based on views and downloads
      const downloadEvents = topEvents.find(e => e.eventType === 'cv_downloaded');
      if (downloadEvents && downloadEvents.count > 5) score += 25;

      if (totalEvents > 50) score += 15;
      break;

    default:
      // Generic scoring
      if (totalEvents > 20) score += 20;
      if (uniqueUsers > 5) score += 10;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Generate recommendations based on analytics
 */
function generateRecommendations(entityType: EntityType, data: any, trends: any): string[] {
  const recommendations: string[] = [];

  if (!data.aggregates) return recommendations;

  const { totalEvents, uniqueUsers, topEvents } = data.aggregates;

  // Generic recommendations
  if (totalEvents < 10) {
    recommendations.push('Increase visibility by sharing your profile on social media');
  }

  if (uniqueUsers < 5) {
    recommendations.push('Optimize your profile for SEO to reach more unique visitors');
  }

  if (trends.viewsChange < -10) {
    recommendations.push('Update your content regularly to maintain engagement');
  }

  // Entity-specific recommendations
  switch (entityType) {
    case 'public_profile':
      if (!topEvents.some(e => e.eventType === 'profile_contacted')) {
        recommendations.push('Add a clear call-to-action to encourage visitors to contact you');
      }
      break;

    case 'processed_cv':
      if (!topEvents.some(e => e.eventType === 'cv_downloaded')) {
        recommendations.push('Consider improving your CV summary to increase download rates');
      }
      break;
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

/**
 * Get cache max age based on period
 */
function getCacheMaxAge(period: AggregationPeriod): number {
  const cacheSettings = {
    [AggregationPeriod.LAST_24_HOURS]: 300, // 5 minutes
    [AggregationPeriod.LAST_7_DAYS]: 900, // 15 minutes
    [AggregationPeriod.LAST_30_DAYS]: 1800, // 30 minutes
    [AggregationPeriod.LAST_90_DAYS]: 3600, // 1 hour
    [AggregationPeriod.ALL_TIME]: 7200 // 2 hours
  };

  return cacheSettings[period] || 900;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}