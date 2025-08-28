/**
 * Cohort Analysis Service
 * 
 * Advanced customer cohort analysis for retention and revenue tracking.
 * Provides detailed insights into customer behavior patterns over time.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @since Phase 3 - Analytics & Revenue Intelligence
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface CohortAnalysisParams {
  startDate: Date;
  endDate: Date;
  cohortType: 'monthly' | 'weekly' | 'quarterly';
  metricType: 'retention' | 'revenue' | 'both';
}

export interface CohortMetrics {
  cohortId: string;
  cohortDate: Date;
  cohortSize: number;
  periods: CohortPeriod[];
  totalRevenue: number;
  avgRevenuePerUser: number;
  lifetimeValue: number;
  churnRate: number;
}

export interface CohortPeriod {
  period: number; // 0 = initial period, 1 = next period, etc.
  periodDate: Date;
  activeUsers: number;
  retentionRate: number;
  revenue: number;
  revenueRetentionRate: number;
  avgRevenuePerActiveUser: number;
  churnedUsers: number;
  newUsers: number; // For expansion cohorts
}

export interface CohortComparison {
  cohortA: CohortMetrics;
  cohortB: CohortMetrics;
  retentionImprovement: number;
  revenueImprovement: number;
  statisticalSignificance: number;
}

export interface CohortTrend {
  metric: 'retention' | 'revenue' | 'ltv';
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number; // -1 to 1
  periodComparison: number; // Percentage change
  significance: 'high' | 'medium' | 'low';
}

interface UserCohortData {
  userId: string;
  cohortDate: Date;
  subscriptionTier: string;
  firstPaymentDate?: Date;
  lastActivityDate: Date;
  totalRevenue: number;
  isActive: boolean;
  churnDate?: Date;
}

export class CohortAnalysisService {
  private readonly db = getFirestore();
  private readonly cache = new Map<string, any>();

  /**
   * Generate comprehensive cohort analysis
   */
  async generateCohortAnalysis(params: CohortAnalysisParams): Promise<CohortMetrics[]> {
    const cacheKey = `cohort_${params.cohortType}_${params.metricType}_${params.startDate.getTime()}_${params.endDate.getTime()}`;
    
    // Check cache
    const cached = this.getCachedResult<CohortMetrics[]>(cacheKey);
    if (cached) {
      return cached;
    }

    logger.info('Generating cohort analysis', { params });

    try {
      const cohortPeriods = this.generateCohortPeriods(params);
      const cohorts: CohortMetrics[] = [];

      for (const cohortPeriod of cohortPeriods) {
        const cohortMetrics = await this.analyzeCohort(cohortPeriod, params);
        if (cohortMetrics) {
          cohorts.push(cohortMetrics);
        }
      }

      // Cache results
      this.setCacheResult(cacheKey, cohorts, 3600000); // 1 hour cache
      
      logger.info('Cohort analysis completed', { 
        cohortsAnalyzed: cohorts.length,
        type: params.cohortType 
      });

      return cohorts;

    } catch (error) {
      logger.error('Failed to generate cohort analysis', error);
      throw new Error('Cohort analysis generation failed');
    }
  }

  /**
   * Analyze a specific cohort
   */
  private async analyzeCohort(
    cohortStart: Date, 
    params: CohortAnalysisParams
  ): Promise<CohortMetrics | null> {
    const cohortEnd = this.getCohortEndDate(cohortStart, params.cohortType);
    const cohortUsers = await this.getCohortUsers(cohortStart, cohortEnd);

    if (cohortUsers.length === 0) {
      return null;
    }

    const cohortId = this.generateCohortId(cohortStart, params.cohortType);
    const periods = await this.analyzeCohortPeriods(cohortUsers, cohortStart, params);

    const totalRevenue = cohortUsers.reduce((sum, user) => sum + user.totalRevenue, 0);
    const avgRevenuePerUser = totalRevenue / cohortUsers.length;
    const lifetimeValue = this.calculateCohortLTV(periods);
    const churnRate = this.calculateCohortChurnRate(periods);

    return {
      cohortId,
      cohortDate: cohortStart,
      cohortSize: cohortUsers.length,
      periods,
      totalRevenue,
      avgRevenuePerUser,
      lifetimeValue,
      churnRate
    };
  }

  /**
   * Analyze cohort periods (monthly, weekly, etc.)
   */
  private async analyzeCohortPeriods(
    cohortUsers: UserCohortData[],
    cohortStart: Date,
    params: CohortAnalysisParams
  ): Promise<CohortPeriod[]> {
    const periods: CohortPeriod[] = [];
    const maxPeriods = this.getMaxPeriodsForCohortType(params.cohortType);

    for (let period = 0; period < maxPeriods; period++) {
      const periodStart = this.getPeriodDate(cohortStart, period, params.cohortType);
      const periodEnd = this.getPeriodDate(cohortStart, period + 1, params.cohortType);

      // Don't analyze future periods
      if (periodStart > new Date()) {
        break;
      }

      const periodMetrics = await this.analyzePeriod(
        cohortUsers,
        periodStart,
        periodEnd,
        period
      );

      periods.push(periodMetrics);
    }

    return periods;
  }

  /**
   * Analyze a specific period within a cohort
   */
  private async analyzePeriod(
    cohortUsers: UserCohortData[],
    periodStart: Date,
    periodEnd: Date,
    periodNumber: number
  ): Promise<CohortPeriod> {
    const initialCohortSize = cohortUsers.length;
    
    // Get active users in this period
    const activeUsers = await this.getActiveUsersInPeriod(
      cohortUsers,
      periodStart,
      periodEnd
    );

    // Calculate revenue for this period
    const periodRevenue = await this.getPeriodRevenue(
      cohortUsers,
      periodStart,
      periodEnd
    );

    // Calculate churned users
    const churnedUsers = periodNumber === 0 ? 0 : 
      await this.getChurnedUsersInPeriod(cohortUsers, periodStart, periodEnd);

    const retentionRate = (activeUsers.length / initialCohortSize) * 100;
    const avgRevenuePerActiveUser = activeUsers.length > 0 ? 
      periodRevenue / activeUsers.length : 0;

    // Calculate revenue retention rate
    const initialPeriodRevenue = periodNumber === 0 ? periodRevenue :
      await this.getPeriodRevenue(cohortUsers, cohortUsers[0].cohortDate, 
        this.getPeriodDate(cohortUsers[0].cohortDate, 1, 'monthly'));
    
    const revenueRetentionRate = initialPeriodRevenue > 0 ? 
      (periodRevenue / initialPeriodRevenue) * 100 : 0;

    return {
      period: periodNumber,
      periodDate: periodStart,
      activeUsers: activeUsers.length,
      retentionRate,
      revenue: periodRevenue,
      revenueRetentionRate,
      avgRevenuePerActiveUser,
      churnedUsers,
      newUsers: 0 // Would track expansions in advanced implementation
    };
  }

  /**
   * Compare two cohorts for A/B testing or trend analysis
   */
  async compareCohorts(
    cohortA: string,
    cohortB: string,
    params: CohortAnalysisParams
  ): Promise<CohortComparison | null> {
    try {
      const [metricsA, metricsB] = await Promise.all([
        this.getCohortMetrics(cohortA, params),
        this.getCohortMetrics(cohortB, params)
      ]);

      if (!metricsA || !metricsB) {
        return null;
      }

      const retentionImprovement = this.calculateImprovement(
        metricsA.churnRate,
        metricsB.churnRate,
        true // Lower is better for churn
      );

      const revenueImprovement = this.calculateImprovement(
        metricsA.avgRevenuePerUser,
        metricsB.avgRevenuePerUser
      );

      const statisticalSignificance = this.calculateStatisticalSignificance(
        metricsA,
        metricsB
      );

      return {
        cohortA: metricsA,
        cohortB: metricsB,
        retentionImprovement,
        revenueImprovement,
        statisticalSignificance
      };

    } catch (error) {
      logger.error('Failed to compare cohorts', error);
      return null;
    }
  }

  /**
   * Analyze cohort trends over time
   */
  async analyzeCohortTrends(
    params: CohortAnalysisParams,
    lookbackPeriods: number = 6
  ): Promise<CohortTrend[]> {
    try {
      const cohorts = await this.generateCohortAnalysis(params);
      const recentCohorts = cohorts.slice(-lookbackPeriods);
      
      const trends: CohortTrend[] = [];

      // Retention trend
      const retentionTrend = this.calculateTrend(
        recentCohorts.map(c => 100 - c.churnRate)
      );
      trends.push({
        metric: 'retention',
        trend: retentionTrend.direction,
        trendStrength: retentionTrend.strength,
        periodComparison: retentionTrend.change,
        significance: retentionTrend.significance
      });

      // Revenue trend
      const revenueTrend = this.calculateTrend(
        recentCohorts.map(c => c.avgRevenuePerUser)
      );
      trends.push({
        metric: 'revenue',
        trend: revenueTrend.direction,
        trendStrength: revenueTrend.strength,
        periodComparison: revenueTrend.change,
        significance: revenueTrend.significance
      });

      // LTV trend
      const ltvTrend = this.calculateTrend(
        recentCohorts.map(c => c.lifetimeValue)
      );
      trends.push({
        metric: 'ltv',
        trend: ltvTrend.direction,
        trendStrength: ltvTrend.strength,
        periodComparison: ltvTrend.change,
        significance: ltvTrend.significance
      });

      return trends;

    } catch (error) {
      logger.error('Failed to analyze cohort trends', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  private generateCohortPeriods(params: CohortAnalysisParams): Date[] {
    const periods: Date[] = [];
    const current = new Date(params.startDate);

    while (current <= params.endDate) {
      periods.push(new Date(current));
      
      switch (params.cohortType) {
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarterly':
          current.setMonth(current.getMonth() + 3);
          break;
      }
    }

    return periods;
  }

  private generateCohortId(date: Date, type: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (type) {
      case 'weekly':
        const week = Math.ceil(day / 7);
        return `${year}-W${week}`;
      case 'monthly':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'quarterly':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      default:
        return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  private getCohortEndDate(start: Date, type: string): Date {
    const end = new Date(start);
    
    switch (type) {
      case 'weekly':
        end.setDate(end.getDate() + 6);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        end.setDate(0);
        break;
    }

    return end;
  }

  private getPeriodDate(cohortStart: Date, period: number, type: string): Date {
    const date = new Date(cohortStart);
    
    switch (type) {
      case 'weekly':
        date.setDate(date.getDate() + (period * 7));
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + period);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + (period * 3));
        break;
    }

    return date;
  }

  private getMaxPeriodsForCohortType(type: string): number {
    switch (type) {
      case 'weekly':
        return 52; // 1 year of weeks
      case 'monthly':
        return 24; // 2 years of months
      case 'quarterly':
        return 8; // 2 years of quarters
      default:
        return 12;
    }
  }

  private async getCohortUsers(start: Date, end: Date): Promise<UserCohortData[]> {
    const snapshot = await this.db.collection('subscriptions')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .where('tier', '!=', 'free')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        cohortDate: data.createdAt?.toDate(),
        subscriptionTier: data.tier,
        firstPaymentDate: data.firstPaymentDate?.toDate(),
        lastActivityDate: data.lastActivityDate?.toDate() || new Date(),
        totalRevenue: data.totalRevenue || 0,
        isActive: data.status === 'active',
        churnDate: data.cancelledAt?.toDate()
      };
    });
  }

  private async getActiveUsersInPeriod(
    cohortUsers: UserCohortData[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<UserCohortData[]> {
    return cohortUsers.filter(user => {
      // User was active if they had no churn date or churned after period start
      return !user.churnDate || user.churnDate > periodStart;
    });
  }

  private async getPeriodRevenue(
    cohortUsers: UserCohortData[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    let totalRevenue = 0;

    for (const user of cohortUsers) {
      // Get payments for this user in this period
      const paymentsSnapshot = await this.db.collection('payments')
        .where('userId', '==', user.userId)
        .where('createdAt', '>=', Timestamp.fromDate(periodStart))
        .where('createdAt', '<=', Timestamp.fromDate(periodEnd))
        .where('status', '==', 'succeeded')
        .get();

      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        totalRevenue += payment.amount || 0;
      });
    }

    return totalRevenue;
  }

  private async getChurnedUsersInPeriod(
    cohortUsers: UserCohortData[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    return cohortUsers.filter(user => 
      user.churnDate && 
      user.churnDate >= periodStart && 
      user.churnDate <= periodEnd
    ).length;
  }

  private calculateCohortLTV(periods: CohortPeriod[]): number {
    return periods.reduce((sum, period) => sum + period.avgRevenuePerActiveUser, 0);
  }

  private calculateCohortChurnRate(periods: CohortPeriod[]): number {
    if (periods.length === 0) return 0;
    
    const lastPeriod = periods[periods.length - 1];
    const firstPeriod = periods[0];
    
    return ((firstPeriod.activeUsers - lastPeriod.activeUsers) / firstPeriod.activeUsers) * 100;
  }

  private async getCohortMetrics(
    cohortId: string, 
    params: CohortAnalysisParams
  ): Promise<CohortMetrics | null> {
    const cohorts = await this.generateCohortAnalysis(params);
    return cohorts.find(c => c.cohortId === cohortId) || null;
  }

  private calculateImprovement(baseValue: number, compareValue: number, lowerIsBetter = false): number {
    if (baseValue === 0) return 0;
    
    const improvement = ((compareValue - baseValue) / baseValue) * 100;
    return lowerIsBetter ? -improvement : improvement;
  }

  private calculateStatisticalSignificance(
    cohortA: CohortMetrics, 
    cohortB: CohortMetrics
  ): number {
    // Simplified chi-square test for cohort comparison
    const totalA = cohortA.cohortSize;
    const totalB = cohortB.cohortSize;
    const retainedA = Math.round(totalA * (1 - cohortA.churnRate / 100));
    const retainedB = Math.round(totalB * (1 - cohortB.churnRate / 100));
    
    // Chi-square calculation (simplified)
    const expected = (retainedA + retainedB) / (totalA + totalB);
    const chiSquare = 
      Math.pow(retainedA - totalA * expected, 2) / (totalA * expected) +
      Math.pow(retainedB - totalB * expected, 2) / (totalB * expected);
    
    // Convert to p-value (simplified approximation)
    return Math.max(0, Math.min(1, 1 - chiSquare / 10));
  }

  private calculateTrend(values: number[]): {
    direction: 'improving' | 'declining' | 'stable';
    strength: number;
    change: number;
    significance: 'high' | 'medium' | 'low';
  } {
    if (values.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        change: 0,
        significance: 'low'
      };
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    const strength = Math.abs(change) / 100;
    
    let direction: 'improving' | 'declining' | 'stable';
    if (Math.abs(change) < 5) {
      direction = 'stable';
    } else {
      direction = change > 0 ? 'improving' : 'declining';
    }

    const significance: 'high' | 'medium' | 'low' = 
      Math.abs(change) > 20 ? 'high' : 
      Math.abs(change) > 10 ? 'medium' : 'low';

    return { direction, strength, change, significance };
  }

  private getCachedResult<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCacheResult<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}

export const cohortAnalysisService = new CohortAnalysisService();