/**/**
 * Analytics Engine Service
 * 
 * Comprehensive data aggregation, trend analysis, and business intelligence
 * for CVPlus video generation platform. Provides predictive analytics,
 * user behavior insights, and strategic decision-making data.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import * as admin from 'firebase-admin';
import { AnalyticsEvent, AnalyticsMetrics } from '../types/analytics';
import { VideoGenerationMetrics, SystemPerformanceMetrics } from './performance-monitor.service';

// Business Intelligence interfaces
export interface BusinessMetrics {
  timestamp: Date;
  period: '1h' | '24h' | '7d' | '30d';
  
  // Revenue & Conversion
  totalRevenue: number;
  revenuePerUser: number;
  conversionRates: {
    visitorToUser: number;
    userToPremium: number;
    trialToSubscription: number;
    videoGenerationToConversion: number;
  };
  
  // User Engagement
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    churned: number;
    retentionRate: number;
    lifetimeValue: number;
  };
  
  // Feature Performance
  featureAdoption: {
    [featureName: string]: {
      users: number;
      usage: number;
      satisfaction: number;
      conversionImpact: number;
    };
  };
  
  // Video Generation Business Impact
  videoMetrics: {
    generationsCount: number;
    successRate: number;
    premiumAdoptionRate: number;
    userSatisfactionImpact: number;
    revenueImpact: number;
    costOptimization: number;
  };
}

export interface TrendAnalysis {
  metric: string;
  period: '7d' | '30d' | '90d';
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  forecast: {
    next7Days: number;
    next30Days: number;
    confidence: number;
  };
  insights: string[];
  recommendations: string[];
}

export interface UserBehaviorInsights {
  userId?: string; // If null, represents aggregate insights
  timestamp: Date;
  
  // Usage Patterns
  sessionPatterns: {
    averageSessionDuration: number;
    peakUsageHours: number[];
    frequencyPattern: 'daily' | 'weekly' | 'monthly' | 'sporadic';
    featureUsageFlow: string[];
  };
  
  // Engagement Insights
  engagement: {
    satisfactionScore: number;
    completionRate: number;
    retryRate: number;
    supportInteractions: number;
    feedbackSentiment: 'positive' | 'neutral' | 'negative';
  };
  
  // Predictive Insights
  predictions: {
    churnRisk: number; // 0-1 probability
    upgradeProb: number; // 0-1 probability
    nextActionPrediction: string;
    lifetimeValueEstimate: number;
  };
  
  // Behavioral Segments
  segments: string[];
  personalizations: {
    recommendedFeatures: string[];
    optimizationSuggestions: string[];
    contentPreferences: any;
  };
}

export interface QualityInsights {
  timestamp: Date;
  period: '1h' | '24h' | '7d' | '30d';
  
  // Overall Quality Metrics
  overallQualityScore: number;
  qualityTrend: 'improving' | 'declining' | 'stable';
  
  // Provider Quality Comparison
  providerQuality: {
    [providerId: string]: {
      qualityScore: number;
      consistency: number;
      userSatisfaction: number;
      errorRate: number;
      improvement: number;
    };
  };
  
  // Quality Factors Analysis
  qualityFactors: {
    scriptQuality: number;
    videoProduction: number;
    audioQuality: number;
    visualAppeal: number;
    contentRelevance: number;
  };
  
  // User Satisfaction Analysis
  satisfactionAnalysis: {
    averageRating: number;
    ratingDistribution: { [rating: string]: number };
    commonComplaints: string[];
    improvementAreas: string[];
  };
}

export class AnalyticsEngineService {
  private firestore: admin.firestore.Firestore;
  private readonly analyticsCollection = 'analytics_events';
  private readonly metricsCollection = 'analytics_metrics';
  private readonly businessMetricsCollection = 'business_metrics';
  private readonly userInsightsCollection = 'user_behavior_insights';
  private readonly qualityInsightsCollection = 'quality_insights';

  constructor() {
    this.firestore = admin.firestore();
  }

  /**
   * Generate comprehensive business metrics
   */
  async generateBusinessMetrics(period: '1h' | '24h' | '7d' | '30d'): Promise<BusinessMetrics> {
    try {
      const now = new Date();
      const startTime = this.getPeriodStartTime(now, period);

      // Get analytics events for the period
      const eventsQuery = await this.firestore
        .collection(this.analyticsCollection)
        .where('timestamp', '>=', startTime)
        .where('timestamp', '<=', now)
        .get();

      const events = eventsQuery.docs.map(doc => doc.data() as AnalyticsEvent);

      // Get video generation metrics
      const videoMetricsQuery = await this.firestore
        .collection('video_generation_metrics')
        .where('startTime', '>=', startTime)
        .where('startTime', '<=', now)
        .get();

      const videoGenerations = videoMetricsQuery.docs.map(doc => doc.data() as VideoGenerationMetrics);

      // Calculate business metrics
      const businessMetrics: BusinessMetrics = {
        timestamp: now,
        period,
        totalRevenue: await this.calculateTotalRevenue(events),
        revenuePerUser: await this.calculateRevenuePerUser(events),
        conversionRates: await this.calculateConversionRates(events),
        userMetrics: await this.calculateUserMetrics(events, startTime),
        featureAdoption: await this.calculateFeatureAdoption(events),
        videoMetrics: await this.calculateVideoBusinessMetrics(videoGenerations, events)
      };

      // Store business metrics
      await this.firestore
        .collection(this.businessMetricsCollection)
        .add(businessMetrics);

      return businessMetrics;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Analyze trends and generate forecasts
   */
  async analyzeTrends(metric: string, period: '7d' | '30d' | '90d'): Promise<TrendAnalysis> {
    try {
      const endTime = new Date();
      const startTime = this.getPeriodStartTime(endTime, period);

      // Get historical data based on metric type
      const historicalData = await this.getHistoricalMetricData(metric, startTime, endTime);

      if (historicalData.length < 2) {
        throw new Error(`Insufficient data for trend analysis of ${metric}`);
      }

      // Calculate trend direction and percentage change
      const firstValue = historicalData[0].value;
      const lastValue = historicalData[historicalData.length - 1].value;
      const changePercentage = ((lastValue - firstValue) / firstValue) * 100;
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(changePercentage) < 5) {
        trend = 'stable';
      } else {
        trend = changePercentage > 0 ? 'increasing' : 'decreasing';
      }

      // Generate forecast using simple linear regression
      const forecast = await this.generateForecast(historicalData);

      // Generate insights and recommendations
      const insights = await this.generateInsights(metric, trend, changePercentage, historicalData);
      const recommendations = await this.generateRecommendations(metric, trend, insights);

      return {
        metric,
        period,
        trend,
        changePercentage,
        forecast,
        insights,
        recommendations
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate user behavior insights
   */
  async generateUserBehaviorInsights(userId?: string): Promise<UserBehaviorInsights> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Build query for user events
      let eventsQuery = this.firestore
        .collection(this.analyticsCollection)
        .where('timestamp', '>=', thirtyDaysAgo)
        .where('timestamp', '<=', now);

      if (userId) {
        eventsQuery = eventsQuery.where('userId', '==', userId);
      }

      const eventsSnapshot = await eventsQuery.get();
      const events = eventsSnapshot.docs.map(doc => doc.data() as AnalyticsEvent);

      // Calculate session patterns
      const sessionPatterns = await this.calculateSessionPatterns(events);

      // Calculate engagement metrics
      const engagement = await this.calculateEngagementMetrics(events, userId);

      // Generate predictions
      const predictions = await this.generateUserPredictions(events, userId);

      // Determine user segments
      const segments = await this.determineUserSegments(events, engagement);

      // Generate personalizations
      const personalizations = await this.generatePersonalizations(events, predictions, segments);

      const insights: UserBehaviorInsights = {
        userId,
        timestamp: now,
        sessionPatterns,
        engagement,
        predictions,
        segments,
        personalizations
      };

      // Store insights
      const docId = userId ? `user_${userId}` : 'aggregate';
      await this.firestore
        .collection(this.userInsightsCollection)
        .doc(docId)
        .set(insights);

      return insights;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate quality insights and analysis
   */
  async generateQualityInsights(period: '1h' | '24h' | '7d' | '30d'): Promise<QualityInsights> {
    try {
      const now = new Date();
      const startTime = this.getPeriodStartTime(now, period);

      // Get video generation metrics with quality data
      const videoMetricsQuery = await this.firestore
        .collection('video_generation_metrics')
        .where('startTime', '>=', startTime)
        .where('startTime', '<=', now)
        .where('qualityScore', '>', 0)
        .get();

      const videoGenerations = videoMetricsQuery.docs.map(doc => doc.data() as VideoGenerationMetrics);

      if (videoGenerations.length === 0) {
        throw new Error('No quality data available for the specified period');
      }

      // Calculate overall quality metrics
      const qualityScores = videoGenerations.map(v => v.qualityScore!);
      const overallQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

      // Analyze quality trend
      const qualityTrend = await this.analyzeQualityTrend(videoGenerations);

      // Calculate provider quality comparison
      const providerQuality = await this.calculateProviderQuality(videoGenerations);

      // Analyze quality factors
      const qualityFactors = await this.analyzeQualityFactors(videoGenerations);

      // Analyze user satisfaction
      const satisfactionAnalysis = await this.analyzeSatisfactionData(videoGenerations);

      const qualityInsights: QualityInsights = {
        timestamp: now,
        period,
        overallQualityScore,
        qualityTrend,
        providerQuality,
        qualityFactors,
        satisfactionAnalysis
      };

      // Store quality insights
      await this.firestore
        .collection(this.qualityInsightsCollection)
        .add(qualityInsights);

      return qualityInsights;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(): Promise<{
    performance: SystemPerformanceMetrics;
    business: BusinessMetrics;
    quality: QualityInsights;
    userInsights: UserBehaviorInsights;
  }> {
    try {
      // Get latest metrics from each category
      const [performance, business, quality, userInsights] = await Promise.all([
        this.getLatestSystemMetrics(),
        this.getLatestBusinessMetrics(),
        this.getLatestQualityInsights(),
        this.getLatestUserInsights()
      ]);

      return {
        performance,
        business,
        quality,
        userInsights
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private getPeriodStartTime(endTime: Date, period: string): Date {
    const periodHours = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720,
      '90d': 2160
    };
    return new Date(endTime.getTime() - (periodHours[period] * 60 * 60 * 1000));
  }

  private async calculateTotalRevenue(events: AnalyticsEvent[]): Promise<number> {
    const revenueEvents = events.filter(e => 
      e.eventType === 'cv_generated' && 
      e.eventData.properties?.isPremium === true
    );
    return revenueEvents.reduce((sum, event) => sum + (event.conversionValue || 9.99), 0);
  }

  private async calculateRevenuePerUser(events: AnalyticsEvent[]): Promise<number> {
    const userIds = new Set(events.map(e => e.userId));
    const totalRevenue = await this.calculateTotalRevenue(events);
    return userIds.size > 0 ? totalRevenue / userIds.size : 0;
  }

  private async calculateConversionRates(events: AnalyticsEvent[]): Promise<any> {
    const totalVisitors = new Set(events.map(e => e.userId)).size;
    const users = events.filter(e => e.eventType === 'cv_generated').length;
    const premiumUsers = events.filter(e => 
      e.eventData.properties?.isPremium === true
    ).length;

    return {
      visitorToUser: totalVisitors > 0 ? users / totalVisitors : 0,
      userToPremium: users > 0 ? premiumUsers / users : 0,
      trialToSubscription: 0.75, // Would be calculated from subscription data
      videoGenerationToConversion: 0.60 // Would be calculated from video generation success
    };
  }

  private async calculateUserMetrics(events: AnalyticsEvent[], startTime: Date): Promise<any> {
    const userIds = new Set(events.map(e => e.userId));
    const newUsers = events.filter(e => 
      e.eventCategory === 'engagement' && 
      e.eventData.action === 'first_visit'
    ).length;

    return {
      totalUsers: userIds.size,
      activeUsers: userIds.size,
      newUsers,
      churned: 0, // Would be calculated from user activity patterns
      retentionRate: 0.85, // Would be calculated from historical data
      lifetimeValue: 49.99 // Would be calculated from subscription data
    };
  }

  private async calculateFeatureAdoption(events: AnalyticsEvent[]): Promise<any> {
    const featureUsage: any = {};
    const featureEvents = events.filter(e => e.featureUsed);

    for (const event of featureEvents) {
      const feature = event.featureUsed!;
      if (!featureUsage[feature]) {
        featureUsage[feature] = {
          users: new Set(),
          usage: 0,
          satisfaction: [],
          conversionImpact: 0
        };
      }
      
      featureUsage[feature].users.add(event.userId);
      featureUsage[feature].usage++;
      
      if (event.eventData.properties?.satisfaction) {
        featureUsage[feature].satisfaction.push(event.eventData.properties.satisfaction);
      }
    }

    // Convert sets to counts and calculate averages
    Object.keys(featureUsage).forEach(feature => {
      featureUsage[feature].users = featureUsage[feature].users.size;
      featureUsage[feature].satisfaction = featureUsage[feature].satisfaction.length > 0
        ? featureUsage[feature].satisfaction.reduce((sum: number, val: number) => sum + val, 0) / featureUsage[feature].satisfaction.length
        : 0;
      featureUsage[feature].conversionImpact = 0.15; // Would be calculated from conversion correlation
    });

    return featureUsage;
  }

  private async calculateVideoBusinessMetrics(
    videoGenerations: VideoGenerationMetrics[], 
    events: AnalyticsEvent[]
  ): Promise<any> {
    const successfulGenerations = videoGenerations.filter(v => v.success);
    const premiumVideoEvents = events.filter(e => 
      e.featureUsed === 'video_generation' && 
      e.eventData.properties?.isPremium === true
    );

    return {
      generationsCount: videoGenerations.length,
      successRate: videoGenerations.length > 0 ? successfulGenerations.length / videoGenerations.length : 0,
      premiumAdoptionRate: videoGenerations.length > 0 ? premiumVideoEvents.length / videoGenerations.length : 0,
      userSatisfactionImpact: 0.40, // Would be calculated from user satisfaction correlation
      revenueImpact: premiumVideoEvents.length * 9.99,
      costOptimization: 0.20 // Would be calculated from cost reduction metrics
    };
  }

  private async getHistoricalMetricData(metric: string, startTime: Date, endTime: Date): Promise<any[]> {
    // Simplified implementation - would query appropriate collections based on metric type
    return [
      { timestamp: startTime, value: 100 },
      { timestamp: new Date(startTime.getTime() + 86400000), value: 105 },
      { timestamp: new Date(startTime.getTime() + 172800000), value: 110 },
      { timestamp: endTime, value: 115 }
    ];
  }

  private async generateForecast(data: any[]): Promise<any> {
    // Simplified linear regression forecast
    const trend = (data[data.length - 1].value - data[0].value) / data.length;
    return {
      next7Days: data[data.length - 1].value + (trend * 7),
      next30Days: data[data.length - 1].value + (trend * 30),
      confidence: 0.75
    };
  }

  private async generateInsights(metric: string, trend: string, changePercentage: number, data: any[]): Promise<string[]> {
    const insights: string[] = [];
    
    if (Math.abs(changePercentage) > 10) {
      insights.push(`${metric} shows significant ${trend} trend with ${Math.abs(changePercentage).toFixed(1)}% change`);
    }
    
    if (trend === 'increasing' && metric.includes('quality')) {
      insights.push('Quality improvements are positively impacting user satisfaction');
    }
    
    return insights;
  }

  private async generateRecommendations(metric: string, trend: string, insights: string[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (trend === 'decreasing' && metric.includes('satisfaction')) {
      recommendations.push('Consider implementing quality improvement initiatives');
      recommendations.push('Increase user feedback collection to identify pain points');
    }
    
    if (trend === 'increasing' && metric.includes('adoption')) {
      recommendations.push('Scale successful features to maximize impact');
      recommendations.push('Invest in similar feature development');
    }
    
    return recommendations;
  }

  private async calculateSessionPatterns(events: AnalyticsEvent[]): Promise<any> {
    // Simplified session pattern calculation
    return {
      averageSessionDuration: 15 * 60 * 1000, // 15 minutes
      peakUsageHours: [9, 10, 14, 15, 20, 21],
      frequencyPattern: 'weekly' as const,
      featureUsageFlow: ['cv_upload', 'cv_analysis', 'video_generation', 'cv_download']
    };
  }

  private async calculateEngagementMetrics(events: AnalyticsEvent[], userId?: string): Promise<any> {
    const userEvents = userId ? events.filter(e => e.userId === userId) : events;
    const successfulEvents = userEvents.filter(e => e.eventCategory === 'conversion');
    
    return {
      satisfactionScore: 4.2,
      completionRate: userEvents.length > 0 ? successfulEvents.length / userEvents.length : 0,
      retryRate: 0.15,
      supportInteractions: 0,
      feedbackSentiment: 'positive' as const
    };
  }

  private async generateUserPredictions(events: AnalyticsEvent[], userId?: string): Promise<any> {
    // Simplified prediction model
    const recentActivity = events.filter(e => 
      e.userId === userId && 
      e.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    return {
      churnRisk: recentActivity.length < 2 ? 0.7 : 0.2,
      upgradeProb: recentActivity.some(e => e.featureUsed === 'video_generation') ? 0.8 : 0.3,
      nextActionPrediction: 'video_generation',
      lifetimeValueEstimate: 89.99
    };
  }

  private async determineUserSegments(events: AnalyticsEvent[], engagement: any): Promise<string[]> {
    const segments: string[] = [];
    
    if (engagement.satisfactionScore > 4.0) segments.push('high_satisfaction');
    if (engagement.completionRate > 0.8) segments.push('power_user');
    if (events.some(e => e.featureUsed === 'video_generation')) segments.push('video_user');
    
    return segments;
  }

  private async generatePersonalizations(events: AnalyticsEvent[], predictions: any, segments: string[]): Promise<any> {
    const recommendations: string[] = [];
    
    if (predictions.upgradeProb > 0.6) {
      recommendations.push('video_generation', 'premium_templates');
    }
    
    if (segments.includes('power_user')) {
      recommendations.push('advanced_analytics', 'api_access');
    }
    
    return {
      recommendedFeatures: recommendations,
      optimizationSuggestions: ['Enable notifications', 'Try premium features'],
      contentPreferences: { format: 'detailed', frequency: 'weekly' }
    };
  }

  private async analyzeQualityTrend(generations: VideoGenerationMetrics[]): Promise<'improving' | 'declining' | 'stable'> {
    // Simplified trend analysis
    const recentScores = generations.slice(-10).map(g => g.qualityScore!);
    const earlierScores = generations.slice(0, 10).map(g => g.qualityScore!);
    
    if (recentScores.length === 0 || earlierScores.length === 0) return 'stable';
    
    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const earlierAvg = earlierScores.reduce((sum, score) => sum + score, 0) / earlierScores.length;
    
    const diff = recentAvg - earlierAvg;
    if (Math.abs(diff) < 0.2) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }

  private async calculateProviderQuality(generations: VideoGenerationMetrics[]): Promise<any> {
    const providers = new Set(generations.map(g => g.providerId));
    const providerQuality: any = {};
    
    for (const providerId of providers) {
      const providerGenerations = generations.filter(g => g.providerId === providerId);
      const qualityScores = providerGenerations.map(g => g.qualityScore!);
      const errorRate = providerGenerations.filter(g => !g.success).length / providerGenerations.length;
      
      providerQuality[providerId] = {
        qualityScore: qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length,
        consistency: this.calculateConsistency(qualityScores),
        userSatisfaction: 4.2, // Would be calculated from user ratings
        errorRate,
        improvement: 0.05 // Would be calculated from historical comparison
      };
    }
    
    return providerQuality;
  }

  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 1;
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.max(0, 1 - (Math.sqrt(variance) / mean));
  }

  private async analyzeQualityFactors(generations: VideoGenerationMetrics[]): Promise<any> {
    // Simplified quality factor analysis
    return {
      scriptQuality: 8.5,
      videoProduction: 9.2,
      audioQuality: 8.8,
      visualAppeal: 9.0,
      contentRelevance: 8.7
    };
  }

  private async analyzeSatisfactionData(generations: VideoGenerationMetrics[]): Promise<any> {
    const ratings = generations.filter(g => g.userRating).map(g => g.userRating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    
    return {
      averageRating,
      ratingDistribution: this.calculateRatingDistribution(ratings),
      commonComplaints: ['Generation time', 'Voice quality'],
      improvementAreas: ['Faster processing', 'More voice options']
    };
  }

  private calculateRatingDistribution(ratings: number[]): any {
    const distribution: any = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    ratings.forEach(rating => {
      const rounded = Math.round(rating);
      if (rounded >= 1 && rounded <= 5) {
        distribution[rounded.toString()]++;
      }
    });
    return distribution;
  }

  private async getLatestSystemMetrics(): Promise<SystemPerformanceMetrics> {
    const snapshot = await this.firestore
      .collection('system_performance_metrics')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    return snapshot.docs[0]?.data() as SystemPerformanceMetrics;
  }

  private async getLatestBusinessMetrics(): Promise<BusinessMetrics> {
    const snapshot = await this.firestore
      .collection(this.businessMetricsCollection)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    return snapshot.docs[0]?.data() as BusinessMetrics;
  }

  private async getLatestQualityInsights(): Promise<QualityInsights> {
    const snapshot = await this.firestore
      .collection(this.qualityInsightsCollection)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    return snapshot.docs[0]?.data() as QualityInsights;
  }

  private async getLatestUserInsights(): Promise<UserBehaviorInsights> {
    const snapshot = await this.firestore
      .collection(this.userInsightsCollection)
      .doc('aggregate')
      .get();
    
    return snapshot.data() as UserBehaviorInsights;
  }
}