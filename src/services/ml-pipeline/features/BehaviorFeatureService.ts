/**/**
 * Behavior Feature Service
 * 
 * Extracts user behavior features including application patterns,
 * platform engagement, timing preferences, and optimization activities.
 */

import * as admin from 'firebase-admin';
import { FeatureVector } from '../../../types/phase2-models';

export class BehaviorFeatureService {
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private behaviorCache: Map<string, { data: any; timestamp: Date }> = new Map();

  /**
   * Extract user behavior features
   */
  async extractFeatures(userId: string): Promise<any> {
    
    const cacheKey = `behavior_${userId}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const features = {
      applicationTiming: await this.getApplicationTiming(userId),
      weekdayApplication: await this.isWeekdayApplication(userId),
      timeOfDay: await this.getPreferredTimeOfDay(userId),
      applicationMethod: await this.getApplicationMethod(userId),
      cvOptimizationLevel: await this.getCVOptimizationLevel(userId),
      platformEngagement: await this.getPlatformEngagement(userId),
      previousApplications: await this.getPreviousApplicationCount(userId)
    };
    
    this.setCachedData(cacheKey, features);
    
    
    return features;
  }

  /**
   * Health check for behavior feature service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a dummy user ID
      const testFeatures = await this.extractFeatures('test_user_health_check');
      
      return typeof testFeatures.applicationTiming === 'number' &&
             typeof testFeatures.weekdayApplication === 'boolean' &&
             typeof testFeatures.platformEngagement === 'number';
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private async getApplicationTiming(userId: string): Promise<number> {
    try {
      // Get user's recent job applications
      const applicationsSnapshot = await admin.firestore()
        .collection('job_applications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      if (applicationsSnapshot.empty) {
        return 1; // Default: applied 1 day after job posting
      }
      
      let totalTimingScore = 0;
      let validApplications = 0;
      
      for (const doc of applicationsSnapshot.docs) {
        const application = doc.data();
        
        if (application.jobPostedDate && application.appliedDate) {
          const postedDate = new Date(application.jobPostedDate);
          const appliedDate = new Date(application.appliedDate);
          const daysDifference = Math.ceil((appliedDate.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          totalTimingScore += Math.max(0, daysDifference);
          validApplications++;
        }
      }
      
      return validApplications > 0 ? totalTimingScore / validApplications : 1;
    } catch (error) {
      return 1; // Default fallback
    }
  }

  private async isWeekdayApplication(userId: string): Promise<boolean> {
    try {
      const applicationsSnapshot = await admin.firestore()
        .collection('job_applications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      
      if (applicationsSnapshot.empty) {
        return true; // Default to weekday
      }
      
      let weekdayCount = 0;
      let totalApplications = 0;
      
      applicationsSnapshot.docs.forEach(doc => {
        const application = doc.data();
        
        if (application.appliedDate || application.createdAt) {
          const applicationDate = new Date(application.appliedDate || application.createdAt.toDate());
          const dayOfWeek = applicationDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            weekdayCount++;
          }
          totalApplications++;
        }
      });
      
      return totalApplications > 0 ? (weekdayCount / totalApplications) > 0.5 : true;
    } catch (error) {
      return true; // Default fallback
    }
  }

  private async getPreferredTimeOfDay(userId: string): Promise<number> {
    try {
      const applicationsSnapshot = await admin.firestore()
        .collection('job_applications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      if (applicationsSnapshot.empty) {
        return 14; // Default: 2 PM
      }
      
      let totalHours = 0;
      let applicationCount = 0;
      
      applicationsSnapshot.docs.forEach(doc => {
        const application = doc.data();
        
        if (application.createdAt) {
          const applicationDate = application.createdAt.toDate();
          totalHours += applicationDate.getHours();
          applicationCount++;
        }
      });
      
      return applicationCount > 0 ? Math.round(totalHours / applicationCount) : 14;
    } catch (error) {
      return 14; // Default fallback
    }
  }

  private async getApplicationMethod(userId: string): Promise<number> {
    try {
      // Check how user typically applies (direct, referral, platform)
      // This would analyze application source data
      // For now, return a simplified score:
      // 1 = direct application, 2 = through platform, 3 = referral
      
      const userSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      if (userSnapshot.exists) {
        const userData = userSnapshot.data();
        
        // Check if user has referral history
        if (userData?.referralCount && userData.referralCount > 0) {
          return 3; // Referral method
        }
        
        // Check platform usage patterns
        if (userData?.platformApplications && userData.platformApplications > userData?.directApplications) {
          return 2; // Platform method
        }
      }
      
      return 1; // Default: direct application
    } catch (error) {
      return 1; // Default fallback
    }
  }

  private async getCVOptimizationLevel(userId: string): Promise<number> {
    try {
      // Analyze CV update frequency and optimization activities
      const cvHistorySnapshot = await admin.firestore()
        .collection('cv_versions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      if (cvHistorySnapshot.empty) {
        return 0.3; // Low optimization if no history
      }
      
      const cvVersions = cvHistorySnapshot.docs.length;
      const recentUpdates = cvHistorySnapshot.docs.filter(doc => {
        const createdAt = doc.data().createdAt;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return createdAt && createdAt.toDate() > thirtyDaysAgo;
      }).length;
      
      // Calculate optimization score based on update frequency and recency
      let optimizationScore = 0.3; // Base score
      
      if (cvVersions > 5) {
        optimizationScore += 0.2; // Active optimizer
      }
      
      if (recentUpdates > 2) {
        optimizationScore += 0.3; // Recent activity
      }
      
      // Check if user uses optimization features
      const optimizationSnapshot = await admin.firestore()
        .collection('optimization_activities')
        .where('userId', '==', userId)
        .limit(5)
        .get();
      
      if (!optimizationSnapshot.empty) {
        optimizationScore += 0.2; // Uses optimization features
      }
      
      return Math.min(1.0, optimizationScore);
    } catch (error) {
      return 0.5; // Default fallback
    }
  }

  private async getPlatformEngagement(userId: string): Promise<number> {
    try {
      // Analyze user engagement with the platform
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get user activity metrics
      const [loginCount, sessionDuration, featureUsage] = await Promise.all([
        this.getLoginCount(userId, thirtyDaysAgo),
        this.getAverageSessionDuration(userId, thirtyDaysAgo),
        this.getFeatureUsageCount(userId, thirtyDaysAgo)
      ]);
      
      // Calculate engagement score (0-1)
      let engagementScore = 0;
      
      // Login frequency (max 0.3)
      const loginScore = Math.min(0.3, (loginCount / 30) * 0.3);
      engagementScore += loginScore;
      
      // Session duration (max 0.3)
      const durationScore = Math.min(0.3, (sessionDuration / 30) * 0.3); // 30 min = max score
      engagementScore += durationScore;
      
      // Feature usage diversity (max 0.4)
      const featureScore = Math.min(0.4, (featureUsage / 10) * 0.4); // 10 different features = max
      engagementScore += featureScore;
      
      return Math.min(1.0, engagementScore);
    } catch (error) {
      return 0.5; // Default fallback
    }
  }

  private async getPreviousApplicationCount(userId: string): Promise<number> {
    try {
      const applicationsSnapshot = await admin.firestore()
        .collection('job_applications')
        .where('userId', '==', userId)
        .get();
      
      return applicationsSnapshot.size || 0;
    } catch (error) {
      return 0; // Default fallback
    }
  }

  private async getLoginCount(userId: string, since: Date): Promise<number> {
    try {
      const loginSnapshot = await admin.firestore()
        .collection('user_sessions')
        .where('userId', '==', userId)
        .where('loginTime', '>=', admin.firestore.Timestamp.fromDate(since))
        .get();
      
      return loginSnapshot.size;
    } catch (error) {
      return 10; // Default reasonable activity level
    }
  }

  private async getAverageSessionDuration(userId: string, since: Date): Promise<number> {
    try {
      const sessionSnapshot = await admin.firestore()
        .collection('user_sessions')
        .where('userId', '==', userId)
        .where('loginTime', '>=', admin.firestore.Timestamp.fromDate(since))
        .get();
      
      if (sessionSnapshot.empty) {
        return 15; // Default 15 minutes
      }
      
      let totalDuration = 0;
      let sessionCount = 0;
      
      sessionSnapshot.docs.forEach(doc => {
        const session = doc.data();
        
        if (session.duration && typeof session.duration === 'number') {
          totalDuration += session.duration;
          sessionCount++;
        } else if (session.loginTime && session.logoutTime) {
          const duration = session.logoutTime.toDate().getTime() - session.loginTime.toDate().getTime();
          totalDuration += duration / (1000 * 60); // Convert to minutes
          sessionCount++;
        }
      });
      
      return sessionCount > 0 ? totalDuration / sessionCount : 15;
    } catch (error) {
      return 15; // Default fallback
    }
  }

  private async getFeatureUsageCount(userId: string, since: Date): Promise<number> {
    try {
      const featureUsageSnapshot = await admin.firestore()
        .collection('feature_usage')
        .where('userId', '==', userId)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(since))
        .get();
      
      if (featureUsageSnapshot.empty) {
        return 3; // Default moderate usage
      }
      
      // Count unique features used
      const uniqueFeatures = new Set();
      
      featureUsageSnapshot.docs.forEach(doc => {
        const usage = doc.data();
        if (usage.featureName) {
          uniqueFeatures.add(usage.featureName);
        }
      });
      
      return uniqueFeatures.size;
    } catch (error) {
      return 3; // Default fallback
    }
  }

  private getCachedData(key: string): any | undefined {
    const cached = this.behaviorCache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < BehaviorFeatureService.CACHE_TTL) {
        return cached.data;
      } else {
        this.behaviorCache.delete(key);
      }
    }
    
    return undefined;
  }

  private setCachedData(key: string, data: any): void {
    this.behaviorCache.set(key, {
      data,
      timestamp: new Date()
    });
    
    // Clean up old cache entries
    if (this.behaviorCache.size > 500) {
      const cutoffTime = Date.now() - BehaviorFeatureService.CACHE_TTL;
      
      for (const [cacheKey, cacheEntry] of this.behaviorCache.entries()) {
        if (cacheEntry.timestamp.getTime() < cutoffTime) {
          this.behaviorCache.delete(cacheKey);
        }
      }
    }
  }
}