/**
 * Revenue Analytics Service
 * 
 * Comprehensive revenue intelligence platform for CVPlus business analytics.
 * Provides real-time financial metrics, cohort analysis, and growth forecasting.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @since Phase 3 - Analytics & Revenue Intelligence
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue  
  conversionRate: number; // Free to paid conversion
  churnRate: number; // Monthly churn percentage
  ltv: number; // Customer Lifetime Value
  cac: number; // Customer Acquisition Cost
  cohortAnalysis: CohortData[];
  revenueGrowth: GrowthData[];
  arpu: number; // Average Revenue Per User
  netRevenueRetention: number; // Net Revenue Retention
}

export interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionRates: number[]; // Month 0, 1, 2, etc.
  revenueRetentionRates: number[]; // Revenue retention by month
  totalRevenue: number;
  avgRevenuePerUser: number;
}

export interface GrowthData {
  period: string;
  revenue: number;
  growthRate: number;
  newCustomers: number;
  churnedRevenue: number;
  expandedRevenue: number;
}

interface CachedMetric {
  data: any;
  timestamp: number;
  ttl: number;
}

interface SubscriptionData {
  userId: string;
  tier: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'grace_period';
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  stripeSubscriptionId?: string;
  monthlyRevenue: number;
  features: string[];
}

interface PaymentData {
  userId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  createdAt: Date;
  subscriptionId?: string;
  invoiceId?: string;
}

export class RevenueAnalyticsService {
  private readonly db = getFirestore();
  private readonly cache = new Map<string, CachedMetric>();
  private readonly stripe: Stripe;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }

  /**
   * Get comprehensive revenue metrics for specified date range
   */
  async getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
    const cacheKey = `revenue_metrics_${dateRange.start.getTime()}_${dateRange.end.getTime()}`;
    
    // Check cache first
    const cached = this.getCachedResult<RevenueMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    logger.info('Calculating revenue metrics', { dateRange });

    try {
      const [
        subscriptions,
        payments,
        cancellations,
        cohortData
      ] = await Promise.all([
        this.getActiveSubscriptions(dateRange),
        this.getPaymentData(dateRange),
        this.getCancellationData(dateRange),
        this.generateCohortAnalysis(dateRange)
      ]);

      const metrics: RevenueMetrics = {
        mrr: this.calculateMRR(subscriptions),
        arr: this.calculateARR(subscriptions),
        conversionRate: await this.calculateConversionRate(dateRange),
        churnRate: this.calculateChurnRate(cancellations, subscriptions),
        ltv: this.calculateLifetimeValue(subscriptions, payments),
        cac: await this.calculateCustomerAcquisitionCost(dateRange),
        cohortAnalysis: cohortData,
        revenueGrowth: await this.calculateRevenueGrowth(dateRange),
        arpu: this.calculateARPU(subscriptions, payments),
        netRevenueRetention: await this.calculateNetRevenueRetention(dateRange)
      };

      // Cache result
      this.setCacheResult(cacheKey, metrics);
      
      logger.info('Revenue metrics calculated successfully', {
        mrr: metrics.mrr,
        arr: metrics.arr,
        cohorts: cohortData.length
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to calculate revenue metrics', error);
      throw new Error('Revenue metrics calculation failed');
    }
  }

  /**
   * Calculate Monthly Recurring Revenue (MRR)
   */
  private calculateMRR(subscriptions: SubscriptionData[]): number {
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.status === 'active' || sub.status === 'grace_period'
    );

    return activeSubscriptions.reduce((total, sub) => {
      return total + sub.monthlyRevenue;
    }, 0);
  }

  /**
   * Calculate Annual Recurring Revenue (ARR)
   */
  private calculateARR(subscriptions: SubscriptionData[]): number {
    const mrr = this.calculateMRR(subscriptions);
    return mrr * 12;
  }

  /**
   * Calculate Average Revenue Per User (ARPU)
   */
  private calculateARPU(subscriptions: SubscriptionData[], payments: PaymentData[]): number {
    const activeUsers = subscriptions.filter(sub => sub.status === 'active').length;
    if (activeUsers === 0) return 0;

    const totalRevenue = payments
      .filter(payment => payment.status === 'succeeded')
      .reduce((sum, payment) => sum + payment.amount, 0);

    return totalRevenue / activeUsers;
  }

  /**
   * Calculate customer lifetime value
   */
  private calculateLifetimeValue(
    subscriptions: SubscriptionData[], 
    payments: PaymentData[]
  ): number {
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    if (activeSubscriptions.length === 0) return 0;

    const avgMonthlyRevenue = this.calculateMRR(subscriptions) / activeSubscriptions.length;
    const avgLifespanMonths = this.calculateAverageLifespan(subscriptions);
    
    return avgMonthlyRevenue * avgLifespanMonths;
  }

  /**
   * Calculate churn rate for the period
   */
  private calculateChurnRate(
    cancellations: SubscriptionData[], 
    totalSubscriptions: SubscriptionData[]
  ): number {
    const startOfPeriod = totalSubscriptions.filter(sub => 
      sub.createdAt <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    if (startOfPeriod === 0) return 0;

    const monthlyChurns = cancellations.filter(cancel => 
      cancel.cancelledAt && 
      cancel.cancelledAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return (monthlyChurns / startOfPeriod) * 100;
  }

  /**
   * Calculate conversion rate from free to paid
   */
  private async calculateConversionRate(dateRange: DateRange): Promise<number> {
    try {
      // Get all users who signed up in the period
      const usersSnapshot = await this.db.collection('users')
        .where('createdAt', '>=', Timestamp.fromDate(dateRange.start))
        .where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
        .get();

      const totalUsers = usersSnapshot.size;
      if (totalUsers === 0) return 0;

      // Get users who converted to paid in the same period
      const convertedUsersSnapshot = await this.db.collection('subscriptions')
        .where('createdAt', '>=', Timestamp.fromDate(dateRange.start))
        .where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
        .where('tier', '!=', 'free')
        .get();

      const convertedUsers = convertedUsersSnapshot.size;

      return (convertedUsers / totalUsers) * 100;

    } catch (error) {
      logger.error('Failed to calculate conversion rate', error);
      return 0;
    }
  }

  /**
   * Generate cohort analysis data
   */
  async generateCohortAnalysis(dateRange: DateRange): Promise<CohortData[]> {
    try {
      const cohorts: CohortData[] = [];
      const monthsBack = 12; // Analyze last 12 months

      for (let i = 0; i < monthsBack; i++) {
        const cohortDate = new Date();
        cohortDate.setMonth(cohortDate.getMonth() - i);
        const cohortStart = new Date(cohortDate.getFullYear(), cohortDate.getMonth(), 1);
        const cohortEnd = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 0);

        // Get users who subscribed in this cohort month
        const cohortSubscriptions = await this.db.collection('subscriptions')
          .where('createdAt', '>=', Timestamp.fromDate(cohortStart))
          .where('createdAt', '<=', Timestamp.fromDate(cohortEnd))
          .where('tier', '!=', 'free')
          .get();

        const cohortUsers = cohortSubscriptions.docs.map(doc => doc.data());
        const cohortSize = cohortUsers.length;

        if (cohortSize === 0) continue;

        // Calculate retention and revenue retention for each subsequent month
        const retentionRates: number[] = [];
        const revenueRetentionRates: number[] = [];
        let totalRevenue = 0;

        for (let month = 0; month <= i; month++) {
          const checkDate = new Date(cohortStart);
          checkDate.setMonth(checkDate.getMonth() + month);

          const activeInMonth = await this.getActiveUsersInMonth(cohortUsers, checkDate);
          const revenueInMonth = await this.getRevenueInMonth(cohortUsers, checkDate);

          retentionRates.push((activeInMonth / cohortSize) * 100);
          revenueRetentionRates.push((revenueInMonth / (cohortSize * 29)) * 100); // Assuming $29 avg price
          totalRevenue += revenueInMonth;
        }

        cohorts.push({
          cohortMonth: cohortStart.toISOString().substring(0, 7),
          cohortSize,
          retentionRates,
          revenueRetentionRates,
          totalRevenue,
          avgRevenuePerUser: totalRevenue / cohortSize
        });
      }

      return cohorts.reverse(); // Most recent first

    } catch (error) {
      logger.error('Failed to generate cohort analysis', error);
      return [];
    }
  }

  /**
   * Calculate revenue growth over time
   */
  private async calculateRevenueGrowth(dateRange: DateRange): Promise<GrowthData[]> {
    try {
      const growthData: GrowthData[] = [];
      const months = this.getMonthsBetween(dateRange.start, dateRange.end);

      for (const month of months) {
        const monthStart = new Date(month.year, month.month, 1);
        const monthEnd = new Date(month.year, month.month + 1, 0);

        const [revenue, newCustomers, churnedRevenue, expandedRevenue] = await Promise.all([
          this.getMonthlyRevenue(monthStart, monthEnd),
          this.getNewCustomersCount(monthStart, monthEnd),
          this.getChurnedRevenue(monthStart, monthEnd),
          this.getExpandedRevenue(monthStart, monthEnd)
        ]);

        const previousMonthRevenue = await this.getMonthlyRevenue(
          new Date(month.year, month.month - 1, 1),
          new Date(month.year, month.month, 0)
        );

        const growthRate = previousMonthRevenue > 0 
          ? ((revenue - previousMonthRevenue) / previousMonthRevenue) * 100 
          : 0;

        growthData.push({
          period: `${month.year}-${String(month.month + 1).padStart(2, '0')}`,
          revenue,
          growthRate,
          newCustomers,
          churnedRevenue,
          expandedRevenue
        });
      }

      return growthData;

    } catch (error) {
      logger.error('Failed to calculate revenue growth', error);
      return [];
    }
  }

  /**
   * Calculate Net Revenue Retention (NRR)
   */
  private async calculateNetRevenueRetention(dateRange: DateRange): Promise<number> {
    try {
      const startDate = new Date(dateRange.start);
      startDate.setMonth(startDate.getMonth() - 12); // Look at last 12 months

      const startingMRR = await this.getMRRAtDate(startDate);
      const currentMRR = await this.getMRRAtDate(dateRange.end);

      if (startingMRR === 0) return 0;

      return (currentMRR / startingMRR) * 100;

    } catch (error) {
      logger.error('Failed to calculate Net Revenue Retention', error);
      return 0;
    }
  }

  /**
   * Helper methods
   */
  private async getActiveSubscriptions(dateRange: DateRange): Promise<SubscriptionData[]> {
    const snapshot = await this.db.collection('subscriptions')
      .where('status', 'in', ['active', 'grace_period'])
      .where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        tier: data.tier,
        status: data.status,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate(),
        stripeSubscriptionId: data.stripeSubscriptionId,
        monthlyRevenue: this.getTierMonthlyRevenue(data.tier),
        features: data.features || []
      };
    });
  }

  private async getPaymentData(dateRange: DateRange): Promise<PaymentData[]> {
    const snapshot = await this.db.collection('payments')
      .where('createdAt', '>=', Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        createdAt: data.createdAt?.toDate(),
        subscriptionId: data.subscriptionId,
        invoiceId: data.invoiceId
      };
    });
  }

  private async getCancellationData(dateRange: DateRange): Promise<SubscriptionData[]> {
    const snapshot = await this.db.collection('subscriptions')
      .where('status', '==', 'cancelled')
      .where('cancelledAt', '>=', Timestamp.fromDate(dateRange.start))
      .where('cancelledAt', '<=', Timestamp.fromDate(dateRange.end))
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        tier: data.tier,
        status: data.status,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate(),
        stripeSubscriptionId: data.stripeSubscriptionId,
        monthlyRevenue: this.getTierMonthlyRevenue(data.tier),
        features: data.features || []
      };
    });
  }

  private getTierMonthlyRevenue(tier: string): number {
    const pricing = {
      free: 0,
      premium: 29,
      enterprise: 99
    };
    return pricing[tier as keyof typeof pricing] || 0;
  }

  private calculateAverageLifespan(subscriptions: SubscriptionData[]): number {
    const cancelledSubs = subscriptions.filter(sub => 
      sub.status === 'cancelled' && sub.cancelledAt
    );

    if (cancelledSubs.length === 0) return 12; // Default 12 months if no cancelled subs

    const totalLifespanMonths = cancelledSubs.reduce((total, sub) => {
      const months = this.getMonthsDifference(sub.createdAt, sub.cancelledAt!);
      return total + months;
    }, 0);

    return totalLifespanMonths / cancelledSubs.length;
  }

  private async calculateCustomerAcquisitionCost(dateRange: DateRange): Promise<number> {
    // This would integrate with marketing spend data
    // For now, return a calculated estimate based on conversion rates
    const newCustomers = await this.getNewCustomersCount(dateRange.start, dateRange.end);
    const estimatedMarketingSpend = 5000; // Would be from marketing analytics
    
    return newCustomers > 0 ? estimatedMarketingSpend / newCustomers : 0;
  }

  private getCachedResult<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCacheResult<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  }

  private getMonthsBetween(start: Date, end: Date): Array<{year: number, month: number}> {
    const months = [];
    const current = new Date(start);
    
    while (current <= end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth()
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  private getMonthsDifference(start: Date, end: Date): number {
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();
    
    return (endYear - startYear) * 12 + (endMonth - startMonth);
  }

  // Placeholder methods - would be implemented with actual data queries
  private async getActiveUsersInMonth(cohortUsers: any[], month: Date): Promise<number> {
    // Implementation would check subscription status in given month
    return Math.floor(cohortUsers.length * 0.85); // Placeholder
  }

  private async getRevenueInMonth(cohortUsers: any[], month: Date): Promise<number> {
    // Implementation would sum revenue for cohort users in given month
    return cohortUsers.length * 25; // Placeholder
  }

  private async getMonthlyRevenue(start: Date, end: Date): Promise<number> {
    // Implementation would sum all revenue in the month
    return 50000; // Placeholder
  }

  private async getNewCustomersCount(start: Date, end: Date): Promise<number> {
    const snapshot = await this.db.collection('subscriptions')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .where('tier', '!=', 'free')
      .get();

    return snapshot.size;
  }

  private async getChurnedRevenue(start: Date, end: Date): Promise<number> {
    const snapshot = await this.db.collection('subscriptions')
      .where('cancelledAt', '>=', Timestamp.fromDate(start))
      .where('cancelledAt', '<=', Timestamp.fromDate(end))
      .get();

    let churnedRevenue = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      churnedRevenue += this.getTierMonthlyRevenue(data.tier);
    });

    return churnedRevenue;
  }

  private async getExpandedRevenue(start: Date, end: Date): Promise<number> {
    // Implementation would track upgrades and expansions
    return 2000; // Placeholder
  }

  private async getMRRAtDate(date: Date): Promise<number> {
    const subscriptions = await this.getActiveSubscriptions({
      start: new Date(0),
      end: date
    });
    
    return this.calculateMRR(subscriptions);
  }
}

export const revenueAnalyticsService = new RevenueAnalyticsService();