/**/**
 * Churn Prediction Service
 * 
 * ML-powered churn prediction and automated retention system.
 * Identifies at-risk users and triggers proactive intervention campaigns.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @since Phase 3 - Analytics & Revenue Intelligence
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface ChurnPrediction {
  userId: string;
  riskScore: number; // 0.0 - 1.0
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: ChurnRiskFactor[];
  confidence: number; // Model confidence
  predictedChurnDate?: Date;
  recommendations: RetentionRecommendation[];
  lastUpdated: Date;
}

export interface ChurnRiskFactor {
  factor: string;
  impact: number; // -1.0 to 1.0
  description: string;
  category: 'usage' | 'billing' | 'engagement' | 'support' | 'product';
}

export interface UserFeatures {
  // Subscription features
  daysSinceLastPayment: number;
  subscriptionLength: number;
  paymentFailures: number;
  downgrades: number;
  supportTickets: number;
  
  // Usage features
  dailyActiveRatio: number; // % of days active in last 30
  featureUsageDecline: number; // % decline in feature usage
  lastLoginDays: number;
  avgSessionDuration: number;
  
  // Engagement features
  cvGeneratedLastWeek: number;
  premiumFeatureUsage: number;
  emailOpenRate: number;
  socialSharing: number;
  
  // Product interaction
  newFeatureAdoption: number;
  helpDocumentViews: number;
  feedbackSubmissions: number;
  referralsGenerated: number;
}

export interface AtRiskUser {
  userId: string;
  email: string;
  name: string;
  subscriptionTier: string;
  riskScore: number;
  riskFactors: ChurnRiskFactor[];
  recommendedActions: RetentionAction[];
  urgency: 'immediate' | 'urgent' | 'moderate' | 'low';
  potentialRevenueLoss: number;
  lastInteractionDate: Date;
}

export interface RetentionAction {
  type: 'personal_call' | 'email_campaign' | 'discount_offer' | 'feature_tutorial' | 'billing_support';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: number; // Expected reduction in churn probability
  cost: number; // Estimated cost of intervention
  timeline: number; // Days to execute
  parameters?: Record<string, any>;
}

export interface RetentionRecommendation {
  action: string;
  reason: string;
  expectedImpact: number;
  confidence: number;
  urgency: number;
}

interface ModelPrediction {
  probability: number;
  features: Record<string, number>;
  importance: Record<string, number>;
}

export class ChurnPredictionService {
  private readonly db = getFirestore();
  private readonly model: ChurnPredictionModel;

  constructor() {
    this.model = new ChurnPredictionModel();
  }

  /**
   * Predict churn risk for a specific user
   */
  async predictChurn(userId: string): Promise<ChurnPrediction> {
    logger.info('Predicting churn for user', { userId });

    try {
      const userFeatures = await this.extractUserFeatures(userId);
      const prediction = await this.model.predict(userFeatures);
      
      const riskScore = prediction.probability;
      const riskLevel = this.calculateRiskLevel(riskScore);
      const riskFactors = this.identifyRiskFactors(userFeatures, prediction.importance);
      const recommendations = await this.generateRecommendations(userId, riskFactors);
      
      const churnPrediction: ChurnPrediction = {
        userId,
        riskScore,
        riskLevel,
        riskFactors,
        confidence: this.calculateConfidence(userFeatures, prediction),
        predictedChurnDate: this.estimateChurnDate(riskScore, userFeatures),
        recommendations,
        lastUpdated: new Date()
      };

      // Store prediction for tracking accuracy
      await this.storePrediction(churnPrediction);
      
      logger.info('Churn prediction completed', { 
        userId, 
        riskScore, 
        riskLevel 
      });

      return churnPrediction;

    } catch (error) {
      logger.error('Failed to predict churn', { userId, error });
      throw new Error('Churn prediction failed');
    }
  }

  /**
   * Identify all at-risk users and prioritize interventions
   */
  async identifyAtRiskUsers(threshold: number = 0.5): Promise<AtRiskUser[]> {
    logger.info('Identifying at-risk users', { threshold });

    try {
      const activeSubscriptions = await this.getActiveSubscriptions();
      const atRiskUsers: AtRiskUser[] = [];

      for (const subscription of activeSubscriptions) {
        const prediction = await this.predictChurn(subscription.userId);
        
        if (prediction.riskScore > threshold) {
          const user = await this.getUserDetails(subscription.userId);
          const potentialRevenueLoss = this.calculatePotentialRevenueLoss(
            subscription.tier, 
            prediction.riskScore
          );

          atRiskUsers.push({
            userId: subscription.userId,
            email: user.email,
            name: user.name,
            subscriptionTier: subscription.tier,
            riskScore: prediction.riskScore,
            riskFactors: prediction.riskFactors,
            recommendedActions: this.generateRetentionActions(prediction),
            urgency: this.calculateUrgency(prediction),
            potentialRevenueLoss,
            lastInteractionDate: user.lastInteractionDate
          });
        }
      }

      // Sort by risk score and potential revenue loss
      atRiskUsers.sort((a, b) => {
        const aScore = a.riskScore * a.potentialRevenueLoss;
        const bScore = b.riskScore * b.potentialRevenueLoss;
        return bScore - aScore;
      });

      logger.info('At-risk user identification completed', {
        totalUsersAnalyzed: activeSubscriptions.length,
        atRiskUsers: atRiskUsers.length
      });

      return atRiskUsers;

    } catch (error) {
      logger.error('Failed to identify at-risk users', error);
      return [];
    }
  }

  /**
   * Extract comprehensive user features for ML model
   */
  private async extractUserFeatures(userId: string): Promise<UserFeatures> {
    const [subscription, payments, usage, engagement] = await Promise.all([
      this.getSubscriptionHistory(userId),
      this.getPaymentHistory(userId),
      this.getUsageMetrics(userId),
      this.getEngagementMetrics(userId)
    ]);

    return {
      // Subscription features
      daysSinceLastPayment: this.daysSince(payments.lastPaymentDate),
      subscriptionLength: this.daysSince(subscription.createdAt),
      paymentFailures: payments.failureCount,
      downgrades: subscription.downgradeCount,
      supportTickets: engagement.supportTicketCount,
      
      // Usage features  
      dailyActiveRatio: usage.dailyActiveRatio,
      featureUsageDecline: usage.featureUsageDecline,
      lastLoginDays: this.daysSince(usage.lastLoginDate),
      avgSessionDuration: usage.avgSessionDuration,
      
      // Engagement features
      cvGeneratedLastWeek: usage.cvGeneratedLastWeek,
      premiumFeatureUsage: usage.premiumFeatureUsage,
      emailOpenRate: engagement.emailOpenRate,
      socialSharing: engagement.socialSharingCount,
      
      // Product interaction
      newFeatureAdoption: engagement.newFeatureAdoption,
      helpDocumentViews: engagement.helpDocumentViews,
      feedbackSubmissions: engagement.feedbackSubmissions,
      referralsGenerated: engagement.referralsGenerated
    };
  }

  /**
   * Calculate risk level from numeric score
   */
  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Identify key risk factors contributing to churn prediction
   */
  private identifyRiskFactors(
    features: UserFeatures, 
    importance: Record<string, number>
  ): ChurnRiskFactor[] {
    const factors: ChurnRiskFactor[] = [];
    
    // Analyze each feature for risk contribution
    if (features.paymentFailures > 0) {
      factors.push({
        factor: 'payment_failures',
        impact: Math.min(features.paymentFailures * 0.3, 1.0),
        description: `${features.paymentFailures} recent payment failures`,
        category: 'billing'
      });
    }

    if (features.featureUsageDecline > 30) {
      factors.push({
        factor: 'declining_usage',
        impact: Math.min(features.featureUsageDecline / 100, 1.0),
        description: `${features.featureUsageDecline}% decline in feature usage`,
        category: 'usage'
      });
    }

    if (features.lastLoginDays > 14) {
      factors.push({
        factor: 'inactive_user',
        impact: Math.min(features.lastLoginDays / 30, 1.0),
        description: `${features.lastLoginDays} days since last login`,
        category: 'engagement'
      });
    }

    if (features.supportTickets > 3) {
      factors.push({
        factor: 'support_issues',
        impact: Math.min(features.supportTickets * 0.15, 1.0),
        description: `${features.supportTickets} recent support tickets`,
        category: 'support'
      });
    }

    if (features.emailOpenRate < 20) {
      factors.push({
        factor: 'low_engagement',
        impact: (30 - features.emailOpenRate) / 100,
        description: `Low email engagement (${features.emailOpenRate}%)`,
        category: 'engagement'
      });
    }

    if (features.newFeatureAdoption < 0.2) {
      factors.push({
        factor: 'feature_resistance',
        impact: (0.5 - features.newFeatureAdoption),
        description: 'Low adoption of new features',
        category: 'product'
      });
    }

    return factors.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  /**
   * Generate personalized retention recommendations
   */
  private async generateRecommendations(
    userId: string, 
    riskFactors: ChurnRiskFactor[]
  ): Promise<RetentionRecommendation[]> {
    const recommendations: RetentionRecommendation[] = [];
    
    for (const factor of riskFactors) {
      switch (factor.category) {
        case 'billing':
          recommendations.push({
            action: 'Billing support outreach',
            reason: 'Address payment issues proactively',
            expectedImpact: 0.4,
            confidence: 0.8,
            urgency: 0.9
          });
          break;
          
        case 'usage':
          recommendations.push({
            action: 'Feature tutorial campaign',
            reason: 'Re-engage with product value',
            expectedImpact: 0.3,
            confidence: 0.7,
            urgency: 0.6
          });
          break;
          
        case 'engagement':
          recommendations.push({
            action: 'Personalized content delivery',
            reason: 'Increase engagement through relevance',
            expectedImpact: 0.25,
            confidence: 0.6,
            urgency: 0.5
          });
          break;
          
        case 'support':
          recommendations.push({
            action: 'Proactive customer success contact',
            reason: 'Address ongoing support concerns',
            expectedImpact: 0.35,
            confidence: 0.75,
            urgency: 0.8
          });
          break;
      }
    }

    return recommendations.sort((a, b) => 
      (b.expectedImpact * b.confidence * b.urgency) - 
      (a.expectedImpact * a.confidence * a.urgency)
    );
  }

  /**
   * Generate specific retention actions
   */
  private generateRetentionActions(prediction: ChurnPrediction): RetentionAction[] {
    const actions: RetentionAction[] = [];
    
    if (prediction.riskScore > 0.8) {
      actions.push({
        type: 'personal_call',
        priority: 'critical',
        estimatedImpact: 0.5,
        cost: 50,
        timeline: 1,
        parameters: { urgency: 'immediate', escalateToManager: true }
      });
    }

    const billingIssues = prediction.riskFactors.some(f => f.category === 'billing');
    if (billingIssues) {
      actions.push({
        type: 'billing_support',
        priority: 'high',
        estimatedImpact: 0.4,
        cost: 25,
        timeline: 2,
        parameters: { proactiveOutreach: true }
      });
    }

    const usageIssues = prediction.riskFactors.some(f => f.category === 'usage');
    if (usageIssues) {
      actions.push({
        type: 'feature_tutorial',
        priority: 'medium',
        estimatedImpact: 0.3,
        cost: 10,
        timeline: 3,
        parameters: { personalizedContent: true }
      });
    }

    if (prediction.riskScore > 0.6) {
      const discountPercent = Math.min(Math.round(prediction.riskScore * 50), 30);
      actions.push({
        type: 'discount_offer',
        priority: 'medium',
        estimatedImpact: 0.35,
        cost: 15,
        timeline: 1,
        parameters: { 
          discountPercent, 
          validityDays: 14,
          requiresCallToAction: true 
        }
      });
    }

    return actions.sort((a, b) => 
      (b.estimatedImpact / b.cost) - (a.estimatedImpact / a.cost)
    );
  }

  /**
   * Helper methods for data retrieval
   */
  private async getActiveSubscriptions(): Promise<any[]> {
    const snapshot = await this.db.collection('subscriptions')
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    }));
  }

  private async getUserDetails(userId: string): Promise<any> {
    const doc = await this.db.collection('users').doc(userId).get();
    return { id: userId, ...doc.data() };
  }

  private calculatePotentialRevenueLoss(tier: string, riskScore: number): number {
    const tierValues = { free: 0, premium: 29 * 12, enterprise: 99 * 12 };
    const annualValue = tierValues[tier as keyof typeof tierValues] || 0;
    return annualValue * riskScore;
  }

  private calculateUrgency(prediction: ChurnPrediction): 'immediate' | 'urgent' | 'moderate' | 'low' {
    if (prediction.riskScore >= 0.9) return 'immediate';
    if (prediction.riskScore >= 0.7) return 'urgent';
    if (prediction.riskScore >= 0.5) return 'moderate';
    return 'low';
  }

  private calculateConfidence(features: UserFeatures, prediction: ModelPrediction): number {
    // Base confidence on data completeness and model certainty
    const dataCompleteness = this.calculateDataCompleteness(features);
    const modelCertainty = Math.abs(prediction.probability - 0.5) * 2;
    
    return (dataCompleteness + modelCertainty) / 2;
  }

  private calculateDataCompleteness(features: UserFeatures): number {
    const featureValues = Object.values(features);
    const nonZeroValues = featureValues.filter(v => v > 0).length;
    return nonZeroValues / featureValues.length;
  }

  private estimateChurnDate(riskScore: number, features: UserFeatures): Date | undefined {
    if (riskScore < 0.5) return undefined;
    
    // Estimate based on usage patterns and risk factors
    const baseDays = 60; // Base churn timeline
    const riskMultiplier = 1 - riskScore; // Higher risk = sooner churn
    const usageMultiplier = features.dailyActiveRatio; // Active users churn later
    
    const estimatedDays = baseDays * riskMultiplier * Math.max(usageMultiplier, 0.1);
    
    const churnDate = new Date();
    churnDate.setDate(churnDate.getDate() + Math.round(estimatedDays));
    
    return churnDate;
  }

  private async storePrediction(prediction: ChurnPrediction): Promise<void> {
    await this.db.collection('churn_predictions').doc(prediction.userId).set({
      ...prediction,
      createdAt: new Date()
    });
  }

  private daysSince(date: Date | undefined): number {
    if (!date) return 999; // High number for missing data
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Placeholder methods for data retrieval (would be implemented with actual data)
  private async getSubscriptionHistory(userId: string): Promise<any> {
    return {
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      downgradeCount: 0
    };
  }

  private async getPaymentHistory(userId: string): Promise<any> {
    return {
      lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      failureCount: 0
    };
  }

  private async getUsageMetrics(userId: string): Promise<any> {
    return {
      dailyActiveRatio: 0.7,
      featureUsageDecline: 10,
      lastLoginDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      avgSessionDuration: 15,
      cvGeneratedLastWeek: 2,
      premiumFeatureUsage: 5
    };
  }

  private async getEngagementMetrics(userId: string): Promise<any> {
    return {
      supportTicketCount: 1,
      emailOpenRate: 45,
      socialSharingCount: 2,
      newFeatureAdoption: 0.6,
      helpDocumentViews: 3,
      feedbackSubmissions: 1,
      referralsGenerated: 0
    };
  }
}

/**
 * Simple ML Model for Churn Prediction
 * In production, this would integrate with TensorFlow.js or external ML APIs
 */
class ChurnPredictionModel {
  async predict(features: UserFeatures): Promise<ModelPrediction> {
    // Simplified rule-based model for demonstration
    // In production, this would be a trained ML model
    
    let churnProbability = 0.1; // Base probability
    
    // Payment failures strongly indicate churn risk
    churnProbability += features.paymentFailures * 0.2;
    
    // Usage decline is a strong predictor
    churnProbability += (features.featureUsageDecline / 100) * 0.3;
    
    // Inactivity increases churn risk
    if (features.lastLoginDays > 14) {
      churnProbability += Math.min(features.lastLoginDays / 30, 0.4);
    }
    
    // Support issues indicate dissatisfaction
    churnProbability += Math.min(features.supportTickets * 0.1, 0.3);
    
    // Low engagement indicates losing interest
    if (features.emailOpenRate < 30) {
      churnProbability += (30 - features.emailOpenRate) / 100;
    }
    
    // Recent CV generation is positive signal
    if (features.cvGeneratedLastWeek > 0) {
      churnProbability -= 0.15;
    }
    
    // Clamp probability between 0 and 1
    churnProbability = Math.max(0, Math.min(1, churnProbability));
    
    return {
      probability: churnProbability,
      features: features,
      importance: {
        paymentFailures: 0.2,
        featureUsageDecline: 0.3,
        lastLoginDays: 0.25,
        supportTickets: 0.15,
        emailOpenRate: 0.1
      }
    };
  }
}

export const churnPredictionService = new ChurnPredictionService();