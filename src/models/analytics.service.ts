/**
 * Analytics Firestore Service
 *
 * Firebase model service for managing AnalyticsEvent and AnalyticsAggregate entities
 * with comprehensive event tracking, aggregation, and real-time analytics.
 *
 * @fileoverview Analytics service for Firebase Functions with privacy compliance and insights
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  runTransaction
} from 'firebase-admin/firestore';
import {
  AnalyticsEvent,
  AnalyticsAggregate,
  RealTimeAnalytics,
  validateAnalyticsEvent,
  isAnalyticsEvent,
  EventType,
  EntityType,
  AggregationPeriod,
  GenerationStatus,
  ReferrerCategory,
  AnomalyType,
  generateAggregateId,
  calculateBounceRate,
  calculateConversionRate,
  anonymizeIpAddress,
  isBotTraffic,
  getPeriodBoundaries,
  calculateGeographicDiversity,
  formatAnalyticsNumber,
  calculateGrowthRate
} from '../../../shared/types/analytics';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// Service Configuration
// ============================================================================

const EVENTS_COLLECTION = 'analyticsEvents';
const AGGREGATES_COLLECTION = 'analyticsAggregates';
const REALTIME_COLLECTION = 'realTimeAnalytics';
const CACHE_TTL_SECONDS = 60; // 1 minute for analytics
const BATCH_SIZE = 500;
const MAX_EVENT_AGE_DAYS = 90; // Events older than 90 days are anonymized
const REALTIME_UPDATE_INTERVAL_MS = 30000; // 30 seconds

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const eventCache = new Map<string, CacheEntry>();
const aggregateCache = new Map<string, CacheEntry>();

function getCacheKey(collection: string, id: string): string {
  return `${collection}:${id}`;
}

function getCachedData(collection: string, id: string): any | null {
  const key = getCacheKey(collection, id);
  const entry = collection === EVENTS_COLLECTION ? eventCache.get(key) : aggregateCache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    if (collection === EVENTS_COLLECTION) {
      eventCache.delete(key);
    } else {
      aggregateCache.delete(key);
    }
    return null;
  }

  return entry.data;
}

function setCachedData(collection: string, id: string, data: any): void {
  const key = getCacheKey(collection, id);
  const now = Date.now();
  const entry = {
    data,
    timestamp: now,
    expiresAt: now + (CACHE_TTL_SECONDS * 1000)
  };

  if (collection === EVENTS_COLLECTION) {
    eventCache.set(key, entry);
  } else {
    aggregateCache.set(key, entry);
  }
}

function invalidateCache(collection: string, id: string): void {
  const key = getCacheKey(collection, id);
  if (collection === EVENTS_COLLECTION) {
    eventCache.delete(key);
  } else {
    aggregateCache.delete(key);
  }
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track an analytics event
 */
export async function trackEvent(
  eventData: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'isAnonymized' | 'retentionExpiresAt'>
): Promise<AnalyticsEvent> {
  const db = getFirestore();
  const eventsRef = collection(db, EVENTS_COLLECTION);
  const newEventRef = doc(eventsRef);

  const now = Timestamp.now();
  const retentionDate = Timestamp.fromMillis(now.toMillis() + (MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000));

  // Anonymize IP address
  const anonymizedIpAddress = anonymizeIpAddress(eventData.ipAddress);

  // Check if it's bot traffic
  const isBot = isBotTraffic(eventData.userAgent);

  const event: AnalyticsEvent = {
    ...eventData,
    id: newEventRef.id,
    ipAddress: anonymizedIpAddress,
    timestamp: now,
    isAnonymized: false,
    retentionExpiresAt: retentionDate
  };

  // Validate event data
  const validationErrors = validateAnalyticsEvent(event);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('AnalyticsEvent validation failed', { errors: validationErrors, eventId: event.id });
    throw new Error(errorMessage);
  }

  try {
    await setDoc(newEventRef, event);
    setCachedData(EVENTS_COLLECTION, event.id, event);

    // Skip bot traffic from triggering aggregation updates
    if (!isBot) {
      // Trigger real-time aggregation update (async)
      updateRealTimeAnalytics(event.entityType, event.entityId, event.eventType).catch(error => {
        logger.error('Failed to update real-time analytics', { error, eventId: event.id });
      });
    }

    logger.debug('Analytics event tracked', {
      eventId: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      isBot
    });

    return event;
  } catch (error) {
    logger.error('Failed to track analytics event', { error, eventId: event.id });
    throw new Error(`Failed to track analytics event: ${error}`);
  }
}

/**
 * Get analytics event by ID
 */
export async function getAnalyticsEvent(id: string): Promise<AnalyticsEvent | null> {
  // Check cache first
  const cached = getCachedData(EVENTS_COLLECTION, id);
  if (cached) {
    return cached as AnalyticsEvent;
  }

  const db = getFirestore();
  const eventRef = doc(db, EVENTS_COLLECTION, id);

  try {
    const docSnapshot = await getDoc(eventRef);

    if (!docSnapshot.exists()) {
      logger.debug('Analytics event not found', { eventId: id });
      return null;
    }

    const data = docSnapshot.data();
    if (!isAnalyticsEvent(data)) {
      logger.error('Invalid AnalyticsEvent data structure', { eventId: id, data });
      throw new Error('Invalid analytics event data structure');
    }

    const event = data as AnalyticsEvent;
    setCachedData(EVENTS_COLLECTION, event.id, event);

    return event;
  } catch (error) {
    logger.error('Failed to get analytics event', { error, eventId: id });
    throw new Error(`Failed to retrieve analytics event: ${error}`);
  }
}

/**
 * Query analytics events
 */
export interface AnalyticsEventQueryOptions {
  entityType?: EntityType;
  entityId?: string;
  eventType?: EventType;
  userId?: string;
  sessionId?: string;
  country?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  startAfterDoc?: DocumentSnapshot;
  limit?: number;
  orderByField?: 'timestamp' | 'duration' | 'loadTime';
  orderDirection?: 'asc' | 'desc';
}

export async function queryAnalyticsEvents(options: AnalyticsEventQueryOptions = {}): Promise<{
  events: AnalyticsEvent[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const db = getFirestore();
  const eventsRef = collection(db, EVENTS_COLLECTION);

  let q = query(eventsRef);

  // Apply filters
  if (options.entityType) {
    q = query(q, where('entityType', '==', options.entityType));
  }

  if (options.entityId) {
    q = query(q, where('entityId', '==', options.entityId));
  }

  if (options.eventType) {
    q = query(q, where('eventType', '==', options.eventType));
  }

  if (options.userId) {
    q = query(q, where('userId', '==', options.userId));
  }

  if (options.sessionId) {
    q = query(q, where('sessionId', '==', options.sessionId));
  }

  if (options.country) {
    q = query(q, where('country', '==', options.country));
  }

  // Apply date filters
  if (options.startDate) {
    q = query(q, where('timestamp', '>=', options.startDate));
  }

  if (options.endDate) {
    q = query(q, where('timestamp', '<=', options.endDate));
  }

  // Apply ordering
  const orderByField = options.orderByField || 'timestamp';
  const orderDirection = options.orderDirection || 'desc';
  q = query(q, orderBy(orderByField, orderDirection));

  // Apply pagination
  if (options.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }

  const limitCount = Math.min(options.limit || 100, BATCH_SIZE);
  q = query(q, firestoreLimit(limitCount + 1)); // Get one extra to check if there are more

  try {
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    const hasMore = docs.length > limitCount;

    if (hasMore) {
      docs.pop(); // Remove the extra document
    }

    const events: AnalyticsEvent[] = [];
    for (const doc of docs) {
      const data = doc.data();
      if (isAnalyticsEvent(data)) {
        events.push(data as AnalyticsEvent);
      } else {
        logger.warn('Invalid AnalyticsEvent data in query result', { docId: doc.id });
      }
    }

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      events,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logger.error('Failed to query analytics events', { error, options });
    throw new Error(`Failed to query analytics events: ${error}`);
  }
}

// ============================================================================
// Analytics Aggregation
// ============================================================================

/**
 * Create or update analytics aggregate
 */
export async function createOrUpdateAggregate(
  entityType: EntityType,
  entityId: string,
  period: AggregationPeriod,
  startTime: Timestamp
): Promise<AnalyticsAggregate> {
  const db = getFirestore();
  const aggregateId = generateAggregateId(entityType, entityId, period, startTime);
  const boundaries = getPeriodBoundaries(period, startTime);

  // Query events for this period
  const events = await queryAnalyticsEvents({
    entityType,
    entityId,
    startDate: boundaries.start,
    endDate: boundaries.end,
    limit: 10000 // Large limit for aggregation
  });

  // Calculate aggregate metrics
  const aggregate = calculateAggregateMetrics(
    aggregateId,
    entityType,
    entityId,
    period,
    boundaries.start,
    boundaries.end,
    events.events
  );

  const aggregatesRef = collection(db, AGGREGATES_COLLECTION);
  const aggregateRef = doc(aggregatesRef, aggregateId);

  try {
    await setDoc(aggregateRef, aggregate);
    setCachedData(AGGREGATES_COLLECTION, aggregateId, aggregate);

    logger.debug('Analytics aggregate created/updated', {
      aggregateId,
      entityType,
      entityId,
      period,
      eventCount: events.events.length
    });

    return aggregate;
  } catch (error) {
    logger.error('Failed to create/update analytics aggregate', { error, aggregateId });
    throw new Error(`Failed to create/update analytics aggregate: ${error}`);
  }
}

/**
 * Calculate aggregate metrics from events
 */
function calculateAggregateMetrics(
  id: string,
  entityType: EntityType,
  entityId: string,
  period: AggregationPeriod,
  startTime: Timestamp,
  endTime: Timestamp,
  events: AnalyticsEvent[]
): AnalyticsAggregate {
  const viewEvents = events.filter(e => e.eventType === EventType.VIEW);
  const downloadEvents = events.filter(e => e.eventType === EventType.DOWNLOAD);
  const shareEvents = events.filter(e => e.eventType === EventType.SOCIAL_SHARE);
  const contactEvents = events.filter(e => e.eventType === EventType.CONTACT_FORM_SUBMIT);
  const calendarEvents = events.filter(e => e.eventType === EventType.CALENDAR_BOOKING);

  // Basic counts
  const viewCount = viewEvents.length;
  const uniqueViewCount = new Set(viewEvents.map(e => e.sessionId)).size;
  const downloadCount = downloadEvents.length;
  const shareCount = shareEvents.length;
  const contactFormSubmissions = contactEvents.length;
  const calendarBookings = calendarEvents.length;

  // Engagement metrics
  const sessionsWithMultipleEvents = new Map<string, number>();
  events.forEach(event => {
    const current = sessionsWithMultipleEvents.get(event.sessionId) || 0;
    sessionsWithMultipleEvents.set(event.sessionId, current + 1);
  });

  const totalSessions = sessionsWithMultipleEvents.size;
  const bouncedSessions = Array.from(sessionsWithMultipleEvents.values()).filter(count => count === 1).length;
  const bounceRate = calculateBounceRate(totalSessions, bouncedSessions);

  const averagePageDepth = totalSessions > 0
    ? Array.from(sessionsWithMultipleEvents.values()).reduce((sum, count) => sum + count, 0) / totalSessions
    : 0;

  // Engagement time calculation
  const sessionDurations = new Map<string, number>();
  events.forEach(event => {
    if (event.duration) {
      const current = sessionDurations.get(event.sessionId) || 0;
      sessionDurations.set(event.sessionId, Math.max(current, event.duration));
    }
  });

  const averageEngagementTime = sessionDurations.size > 0
    ? Array.from(sessionDurations.values()).reduce((sum, duration) => sum + duration, 0) / sessionDurations.size / 1000
    : 0;

  // Conversion metrics
  const conversionCount = contactFormSubmissions + calendarBookings;
  const conversionRate = calculateConversionRate(uniqueViewCount, conversionCount);

  // Geographic distribution
  const countryCounts = new Map<string, number>();
  viewEvents.forEach(event => {
    if (event.country) {
      const current = countryCounts.get(event.country) || 0;
      countryCounts.set(event.country, current + 1);
    }
  });

  const topCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([countryCode, count]) => ({
      countryCode,
      countryName: getCountryName(countryCode),
      viewCount: count,
      percentage: Math.round((count / viewCount) * 100 * 10) / 10,
      uniqueVisitors: new Set(
        viewEvents.filter(e => e.country === countryCode).map(e => e.sessionId)
      ).size
    }));

  const geographicDiversity = calculateGeographicDiversity(topCountries);

  // Traffic sources
  const referrerCounts = new Map<string, { count: number; category: ReferrerCategory }>();
  viewEvents.forEach(event => {
    if (event.referrer) {
      const domain = new URL(event.referrer).hostname;
      const category = categorizeReferrer(event.referrer);
      const current = referrerCounts.get(domain) || { count: 0, category };
      referrerCounts.set(domain, { count: current.count + 1, category });
    }
  });

  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([source, data]) => ({
      source,
      category: data.category,
      viewCount: data.count,
      percentage: Math.round((data.count / viewCount) * 100 * 10) / 10,
      conversionRate: 0 // Would need to calculate conversions from this source
    }));

  const directEvents = viewEvents.filter(e => !e.referrer);
  const directTrafficRate = Math.round((directEvents.length / viewCount) * 100 * 10) / 10;

  // Device breakdown
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const browserCounts = new Map<string, number>();

  viewEvents.forEach(event => {
    // Simple device detection based on user agent
    const userAgent = event.userAgent.toLowerCase();
    if (userAgent.includes('mobile')) {
      deviceCounts.mobile++;
    } else if (userAgent.includes('tablet')) {
      deviceCounts.tablet++;
    } else {
      deviceCounts.desktop++;
    }

    // Extract browser
    const browser = extractBrowser(event.userAgent);
    browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1);
  });

  const deviceBreakdown = {
    desktop: {
      count: deviceCounts.desktop,
      percentage: Math.round((deviceCounts.desktop / viewCount) * 100 * 10) / 10,
      avgSessionDuration: averageEngagementTime,
      bounceRate: bounceRate
    },
    mobile: {
      count: deviceCounts.mobile,
      percentage: Math.round((deviceCounts.mobile / viewCount) * 100 * 10) / 10,
      avgSessionDuration: averageEngagementTime,
      bounceRate: bounceRate
    },
    tablet: {
      count: deviceCounts.tablet,
      percentage: Math.round((deviceCounts.tablet / viewCount) * 100 * 10) / 10,
      avgSessionDuration: averageEngagementTime,
      bounceRate: bounceRate
    }
  };

  const browserStats = Array.from(browserCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([browserName, count]) => ({
      browserName,
      count,
      percentage: Math.round((count / viewCount) * 100 * 10) / 10
    }));

  // Return visitor analysis
  const returningVisitors = new Set<string>();
  const visitorSessionCounts = new Map<string, number>();

  events.forEach(event => {
    if (event.fingerprint) {
      const count = visitorSessionCounts.get(event.fingerprint) || 0;
      visitorSessionCounts.set(event.fingerprint, count + 1);
      if (count > 0) {
        returningVisitors.add(event.fingerprint);
      }
    }
  });

  const returnVisitorRate = visitorSessionCounts.size > 0
    ? Math.round((returningVisitors.size / visitorSessionCounts.size) * 100 * 10) / 10
    : 0;

  // Content sections and features (simplified)
  const topSections = events
    .filter(e => e.eventType === EventType.SECTION_VIEW)
    .reduce((acc, event) => {
      const sectionId = event.eventData.sectionId || 'unknown';
      const existing = acc.find(s => s.sectionId === sectionId);
      if (existing) {
        existing.viewCount++;
        existing.avgTimeSpent = (existing.avgTimeSpent + (event.duration || 0)) / 2;
      } else {
        acc.push({
          sectionId,
          sectionName: event.eventData.sectionName || sectionId,
          viewCount: 1,
          avgTimeSpent: event.duration || 0,
          interactionRate: 0
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  const featureUsage = events
    .filter(e => e.eventType === EventType.FEATURE_INTERACTION)
    .reduce((acc, event) => {
      const featureId = event.eventData.featureId || 'unknown';
      const existing = acc.find(f => f.featureId === featureId);
      if (existing) {
        existing.usageCount++;
        existing.avgUsageDuration = (existing.avgUsageDuration + (event.duration || 0)) / 2;
      } else {
        acc.push({
          featureId,
          featureName: event.eventData.featureName || featureId,
          usageCount: 1,
          successRate: 100,
          avgUsageDuration: event.duration || 0
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  const dataCompleteness = Math.round((events.length / Math.max(events.length, 1)) * 100);

  return {
    id,
    entityType,
    entityId,
    period,
    startTime,
    endTime,
    viewCount,
    uniqueViewCount,
    downloadCount,
    shareCount,
    contactFormSubmissions,
    calendarBookings,
    averageEngagementTime,
    bounceRate,
    averagePageDepth,
    returnVisitorRate,
    conversionCount,
    conversionRate,
    topCountries,
    geographicDiversity,
    topReferrers,
    directTrafficRate,
    deviceBreakdown,
    browserStats,
    topSections,
    featureUsage,
    dataCompleteness,
    lastUpdated: Timestamp.now()
  };
}

// ============================================================================
// Real-time Analytics
// ============================================================================

/**
 * Update real-time analytics
 */
export async function updateRealTimeAnalytics(
  entityType: EntityType,
  entityId: string,
  eventType: EventType
): Promise<void> {
  const db = getFirestore();
  const realtimeId = `${entityType}:${entityId}`;
  const realtimeRef = doc(db, REALTIME_COLLECTION, realtimeId);

  try {
    await runTransaction(db, async (transaction) => {
      const realtimeDoc = await transaction.get(realtimeRef);
      const now = Timestamp.now();
      const fiveMinutesAgo = Timestamp.fromMillis(now.toMillis() - (5 * 60 * 1000));
      const oneHourAgo = Timestamp.fromMillis(now.toMillis() - (60 * 60 * 1000));

      let realtimeData: RealTimeAnalytics;

      if (realtimeDoc.exists()) {
        realtimeData = realtimeDoc.data() as RealTimeAnalytics;
      } else {
        realtimeData = {
          entityId,
          entityType,
          currentUsers: 0,
          recentEvents: 0,
          lastHourViews: 0,
          trendingContent: [],
          trafficSpike: false,
          anomalies: [],
          avgResponseTime: 0,
          errorRate: 0,
          lastUpdated: now
        };
      }

      // Update metrics based on event type
      if (eventType === EventType.VIEW) {
        realtimeData.currentUsers++;
        realtimeData.lastHourViews++;
      }

      realtimeData.recentEvents++;
      realtimeData.lastUpdated = now;

      // Simple spike detection
      if (realtimeData.recentEvents > 100) {
        realtimeData.trafficSpike = true;
      }

      transaction.set(realtimeRef, realtimeData);
    });

    logger.debug('Real-time analytics updated', { entityType, entityId, eventType });
  } catch (error) {
    logger.error('Failed to update real-time analytics', { error, entityType, entityId });
    // Don't throw - this is a background operation
  }
}

/**
 * Get real-time analytics
 */
export async function getRealTimeAnalytics(
  entityType: EntityType,
  entityId: string
): Promise<RealTimeAnalytics | null> {
  const db = getFirestore();
  const realtimeId = `${entityType}:${entityId}`;
  const realtimeRef = doc(db, REALTIME_COLLECTION, realtimeId);

  try {
    const docSnapshot = await getDoc(realtimeRef);

    if (!docSnapshot.exists()) {
      return null;
    }

    return docSnapshot.data() as RealTimeAnalytics;
  } catch (error) {
    logger.error('Failed to get real-time analytics', { error, entityType, entityId });
    throw new Error(`Failed to get real-time analytics: ${error}`);
  }
}

// ============================================================================
// Cleanup and Maintenance
// ============================================================================

/**
 * Anonymize old events for privacy compliance
 */
export async function anonymizeOldEvents(): Promise<number> {
  const cutoffDate = Timestamp.fromMillis(Date.now() - (MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000));
  const db = getFirestore();
  const eventsRef = collection(db, EVENTS_COLLECTION);
  const q = query(
    eventsRef,
    where('timestamp', '<=', cutoffDate),
    where('isAnonymized', '==', false),
    firestoreLimit(BATCH_SIZE)
  );

  try {
    const snapshot = await getDocs(q);
    const batch = db.batch();

    snapshot.docs.forEach(doc => {
      const anonymizedUpdate = {
        ipAddress: '0.0.0.0',
        userAgent: 'anonymized',
        fingerprint: null,
        customProperties: null,
        isAnonymized: true,
        updatedAt: Timestamp.now()
      };
      batch.update(doc.ref, anonymizedUpdate);
      invalidateCache(EVENTS_COLLECTION, doc.id);
    });

    if (snapshot.docs.length > 0) {
      await batch.commit();
      logger.info('Anonymized old events', { count: snapshot.docs.length });
    }

    return snapshot.docs.length;
  } catch (error) {
    logger.error('Failed to anonymize old events', { error });
    throw new Error(`Failed to anonymize old events: ${error}`);
  }
}

/**
 * Delete expired events
 */
export async function deleteExpiredEvents(): Promise<number> {
  const db = getFirestore();
  const eventsRef = collection(db, EVENTS_COLLECTION);
  const now = Timestamp.now();
  const q = query(
    eventsRef,
    where('retentionExpiresAt', '<=', now),
    firestoreLimit(BATCH_SIZE)
  );

  try {
    const snapshot = await getDocs(q);
    const batch = db.batch();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      invalidateCache(EVENTS_COLLECTION, doc.id);
    });

    if (snapshot.docs.length > 0) {
      await batch.commit();
      logger.info('Deleted expired events', { count: snapshot.docs.length });
    }

    return snapshot.docs.length;
  } catch (error) {
    logger.error('Failed to delete expired events', { error });
    throw new Error(`Failed to delete expired events: ${error}`);
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Categorize referrer URL
 */
function categorizeReferrer(referrer: string): ReferrerCategory {
  try {
    const url = new URL(referrer);
    const domain = url.hostname.toLowerCase();

    if (domain.includes('google') || domain.includes('bing') || domain.includes('yahoo')) {
      return ReferrerCategory.SEARCH_ENGINE;
    }
    if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('linkedin')) {
      return ReferrerCategory.SOCIAL_MEDIA;
    }
    if (domain.includes('mail') || domain.includes('gmail')) {
      return ReferrerCategory.EMAIL;
    }

    return ReferrerCategory.REFERRAL;
  } catch {
    return ReferrerCategory.OTHER;
  }
}

/**
 * Extract browser from user agent
 */
function extractBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  return 'Other';
}

/**
 * Get country name from code
 */
function getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'AU': 'Australia',
    'JP': 'Japan',
    'IN': 'India',
    'BR': 'Brazil',
    'MX': 'Mexico'
  };

  return countryMap[countryCode] || countryCode;
}

/**
 * Clear all caches
 */
export function clearAnalyticsCache(): void {
  eventCache.clear();
  aggregateCache.clear();
  logger.debug('Analytics cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  eventCacheSize: number;
  aggregateCacheSize: number;
} {
  return {
    eventCacheSize: eventCache.size,
    aggregateCacheSize: aggregateCache.size
  };
}

/**
 * Batch track multiple events
 */
export async function batchTrackEvents(
  eventsData: Array<Omit<AnalyticsEvent, 'id' | 'timestamp' | 'isAnonymized' | 'retentionExpiresAt'>>
): Promise<AnalyticsEvent[]> {
  const db = getFirestore();
  const batch = db.batch();
  const events: AnalyticsEvent[] = [];

  const now = Timestamp.now();
  const retentionDate = Timestamp.fromMillis(now.toMillis() + (MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000));

  for (const eventData of eventsData) {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const newEventRef = doc(eventsRef);

    const event: AnalyticsEvent = {
      ...eventData,
      id: newEventRef.id,
      ipAddress: anonymizeIpAddress(eventData.ipAddress),
      timestamp: now,
      isAnonymized: false,
      retentionExpiresAt: retentionDate
    };

    // Validate each event
    const validationErrors = validateAnalyticsEvent(event);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed for event: ${validationErrors.join(', ')}`);
    }

    batch.set(newEventRef, event);
    events.push(event);

    // Cache the event
    setCachedData(EVENTS_COLLECTION, event.id, event);
  }

  try {
    await batch.commit();
    logger.info('Batch tracked analytics events', { count: events.length });
    return events;
  } catch (error) {
    logger.error('Failed to batch track analytics events', { error, count: eventsData.length });
    throw new Error(`Failed to batch track analytics events: ${error}`);
  }
}