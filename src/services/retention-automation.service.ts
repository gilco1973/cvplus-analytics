/**/**
 * Retention Automation Service
 * 
 * Automated customer retention campaigns and intervention management.
 * Orchestrates personalized retention strategies based on churn predictions.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @since Phase 3 - Analytics & Revenue Intelligence
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { AtRiskUser, RetentionAction } from './churn-prediction.service';

export interface RetentionCampaign {
  id: string;
  userId: string;
  campaignType: 'proactive' | 'reactive' | 'winback';
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  interventions: RetentionIntervention[];
  startDate: Date;
  endDate?: Date;
  successMetrics: CampaignMetrics;
  totalCost: number;
  expectedImpact: number;
}

export interface RetentionIntervention {
  id: string;
  type: 'personal_call' | 'email_campaign' | 'discount_offer' | 'feature_tutorial' | 'billing_support' | 'product_demo';
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  scheduledDate: Date;
  completedDate?: Date;
  parameters: Record<string, any>;
  results?: InterventionResult;
  cost: number;
  delay: number; // Milliseconds
}

export interface InterventionResult {
  success: boolean;
  engagementScore: number; // 0-100
  responseGenerated: boolean;
  actionTaken: boolean;
  notes: string;
  followUpRequired: boolean;
  nextSteps?: string[];
}

export interface CampaignMetrics {
  interventionsSent: number;
  interventionsCompleted: number;
  engagementRate: number;
  responseRate: number;
  conversionRate: number;
  retentionImpact: number;
  costEffectiveness: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  priority: number;
  cooldownPeriod: number; // Hours between triggers
}

export interface RuleCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'not_contains';
  value: any;
  weight: number;
}

export interface RuleAction {
  type: string;
  parameters: Record<string, any>;
  delay: number;
  conditions?: string[];
}

export class RetentionAutomationService {
  private readonly db = getFirestore();
  private readonly rules: Map<string, AutomationRule> = new Map();

  constructor() {
    this.initializeAutomationRules();
  }

  /**
   * Execute comprehensive retention campaign for at-risk user
   */
  async executeRetentionCampaign(atRiskUser: AtRiskUser): Promise<RetentionCampaign> {
    logger.info('Executing retention campaign', { userId: atRiskUser.userId });

    try {
      // Check if user already has active campaign
      const existingCampaign = await this.getActiveCampaign(atRiskUser.userId);
      if (existingCampaign) {
        logger.info('User already has active retention campaign', { 
          userId: atRiskUser.userId,
          campaignId: existingCampaign.id
        });
        return existingCampaign;
      }

      // Select appropriate interventions
      const interventions = await this.selectInterventions(atRiskUser);
      
      // Create campaign
      const campaign: RetentionCampaign = {
        id: this.generateCampaignId(),
        userId: atRiskUser.userId,
        campaignType: this.determineCampaignType(atRiskUser),
        status: 'scheduled',
        interventions,
        startDate: new Date(),
        successMetrics: this.initializeMetrics(),
        totalCost: interventions.reduce((sum, i) => sum + i.cost, 0),
        expectedImpact: this.calculateExpectedImpact(interventions)
      };

      // Store campaign
      await this.storeCampaign(campaign);

      // Schedule interventions
      for (const intervention of interventions) {
        await this.scheduleIntervention(campaign.id, intervention);
      }

      logger.info('Retention campaign created successfully', {
        userId: atRiskUser.userId,
        campaignId: campaign.id,
        interventions: interventions.length
      });

      return campaign;

    } catch (error) {
      logger.error('Failed to execute retention campaign', { 
        userId: atRiskUser.userId, 
        error 
      });
      throw new Error('Retention campaign execution failed');
    }
  }

  /**
   * Process scheduled interventions
   */
  async processScheduledInterventions(): Promise<void> {
    logger.info('Processing scheduled interventions');

    try {
      const scheduledInterventions = await this.getScheduledInterventions();
      
      for (const intervention of scheduledInterventions) {
        if (this.shouldExecuteIntervention(intervention)) {
          await this.executeIntervention(intervention);
        }
      }

      logger.info('Scheduled interventions processed', {
        processed: scheduledInterventions.length
      });

    } catch (error) {
      logger.error('Failed to process scheduled interventions', error);
    }
  }

  /**
   * Select optimal interventions for user based on risk profile
   */
  private async selectInterventions(user: AtRiskUser): Promise<RetentionIntervention[]> {
    const interventions: RetentionIntervention[] = [];
    let currentDelay = 0;

    // Critical risk users get immediate personal attention
    if (user.urgency === 'immediate' || user.riskScore > 0.9) {
      interventions.push({
        id: this.generateInterventionId(),
        type: 'personal_call',
        status: 'pending',
        priority: 'critical',
        scheduledDate: new Date(Date.now() + currentDelay),
        parameters: {
          urgency: 'immediate',
          escalateToManager: true,
          callbackRequired: true,
          maxAttempts: 3
        },
        cost: 50,
        delay: currentDelay
      });
      currentDelay += 3600000; // 1 hour later
    }

    // Address billing issues immediately
    const hasBillingIssues = user.riskFactors.some(f => f.category === 'billing');
    if (hasBillingIssues) {
      interventions.push({
        id: this.generateInterventionId(),
        type: 'billing_support',
        status: 'pending',
        priority: 'high',
        scheduledDate: new Date(Date.now() + currentDelay),
        parameters: {
          proactiveOutreach: true,
          paymentReminder: true,
          alternativePaymentOptions: true
        },
        cost: 25,
        delay: currentDelay
      });
      currentDelay += 1800000; // 30 minutes later
    }

    // Re-engage inactive users with feature tutorials
    const hasUsageIssues = user.riskFactors.some(f => f.category === 'usage');
    if (hasUsageIssues) {
      interventions.push({
        id: this.generateInterventionId(),
        type: 'feature_tutorial',
        status: 'pending',
        priority: 'medium',
        scheduledDate: new Date(Date.now() + currentDelay),
        parameters: {
          personalizedContent: true,
          interactiveTutorial: true,
          progressTracking: true,
          gamification: true
        },
        cost: 15,
        delay: currentDelay
      });
      currentDelay += 86400000; // 1 day later
    }

    // Offer discount for high-value at-risk users
    if (user.riskScore > 0.6 && user.potentialRevenueLoss > 200) {
      const discountPercent = Math.min(Math.round(user.riskScore * 50), 30);
      interventions.push({
        id: this.generateInterventionId(),
        type: 'discount_offer',
        status: 'pending',
        priority: 'medium',
        scheduledDate: new Date(Date.now() + currentDelay),
        parameters: {
          discountPercent,
          validityDays: 14,
          requiresCallToAction: true,
          personalizedMessage: true,
          scarcityMessaging: true
        },
        cost: user.potentialRevenueLoss * (discountPercent / 100) * 0.5,
        delay: currentDelay
      });
      currentDelay += 172800000; // 2 days later
    }

    // Follow-up email campaign
    if (user.riskScore > 0.4) {
      interventions.push({
        id: this.generateInterventionId(),
        type: 'email_campaign',
        status: 'pending',
        priority: 'low',
        scheduledDate: new Date(Date.now() + currentDelay),
        parameters: {
          campaignType: 'retention_sequence',
          emailCount: 3,
          personalizedContent: true,
          successStories: true,
          socialProof: true
        },
        cost: 5,
        delay: currentDelay
      });
    }

    return interventions;
  }

  /**
   * Execute individual intervention
   */
  private async executeIntervention(intervention: RetentionIntervention): Promise<void> {
    logger.info('Executing intervention', { 
      interventionId: intervention.id,
      type: intervention.type 
    });

    try {
      intervention.status = 'executing';
      await this.updateIntervention(intervention);

      let result: InterventionResult;

      switch (intervention.type) {
        case 'personal_call':
          result = await this.schedulePersonalCall(intervention);
          break;
        case 'email_campaign':
          result = await this.sendEmailCampaign(intervention);
          break;
        case 'discount_offer':
          result = await this.sendDiscountOffer(intervention);
          break;
        case 'feature_tutorial':
          result = await this.sendFeatureTutorial(intervention);
          break;
        case 'billing_support':
          result = await this.triggerBillingSupport(intervention);
          break;
        case 'product_demo':
          result = await this.scheduleProductDemo(intervention);
          break;
        default:
          throw new Error(`Unknown intervention type: ${intervention.type}`);
      }

      intervention.status = 'completed';
      intervention.completedDate = new Date();
      intervention.results = result;

      await this.updateIntervention(intervention);
      await this.trackInterventionMetrics(intervention);

      logger.info('Intervention executed successfully', {
        interventionId: intervention.id,
        success: result.success
      });

    } catch (error) {
      logger.error('Failed to execute intervention', {
        interventionId: intervention.id,
        error
      });

      intervention.status = 'failed';
      intervention.results = {
        success: false,
        engagementScore: 0,
        responseGenerated: false,
        actionTaken: false,
        notes: `Execution failed: ${error}`,
        followUpRequired: true,
        nextSteps: ['manual_review', 'retry_intervention']
      };

      await this.updateIntervention(intervention);
    }
  }

  /**
   * Intervention execution methods
   */
  private async schedulePersonalCall(intervention: RetentionIntervention): Promise<InterventionResult> {
    // Integration with CRM/calling system
    const success = await this.createCRMTask({
      type: 'personal_call',
      userId: intervention.parameters.userId,
      priority: intervention.priority,
      notes: 'At-risk user requiring immediate attention',
      dueDate: new Date(),
      parameters: intervention.parameters
    });

    return {
      success,
      engagementScore: success ? 85 : 0,
      responseGenerated: success,
      actionTaken: success,
      notes: success ? 'Personal call scheduled in CRM' : 'Failed to schedule call',
      followUpRequired: true,
      nextSteps: success ? ['monitor_call_outcome', 'follow_up_in_24h'] : ['manual_scheduling']
    };
  }

  private async sendEmailCampaign(intervention: RetentionIntervention): Promise<InterventionResult> {
    // Integration with email service (SendGrid, etc.)
    const emailSent = await this.sendPersonalizedEmail({
      userId: intervention.parameters.userId,
      template: 'retention_outreach',
      personalizedContent: intervention.parameters.personalizedContent,
      urgency: intervention.priority
    });

    return {
      success: emailSent,
      engagementScore: emailSent ? 65 : 0,
      responseGenerated: emailSent,
      actionTaken: emailSent,
      notes: emailSent ? 'Personalized retention email sent' : 'Failed to send email',
      followUpRequired: true,
      nextSteps: emailSent ? ['monitor_email_engagement', 'track_click_through'] : ['retry_email']
    };
  }

  private async sendDiscountOffer(intervention: RetentionIntervention): Promise<InterventionResult> {
    const offerCreated = await this.createDiscountOffer({
      userId: intervention.parameters.userId,
      discountPercent: intervention.parameters.discountPercent,
      validityDays: intervention.parameters.validityDays,
      requiresAction: intervention.parameters.requiresCallToAction
    });

    return {
      success: offerCreated,
      engagementScore: offerCreated ? 75 : 0,
      responseGenerated: offerCreated,
      actionTaken: offerCreated,
      notes: offerCreated ? 
        `${intervention.parameters.discountPercent}% discount offer created` : 
        'Failed to create discount offer',
      followUpRequired: true,
      nextSteps: offerCreated ? 
        ['monitor_offer_usage', 'follow_up_if_unused'] : 
        ['manual_offer_creation']
    };
  }

  private async sendFeatureTutorial(intervention: RetentionIntervention): Promise<InterventionResult> {
    const tutorialSent = await this.createPersonalizedTutorial({
      userId: intervention.parameters.userId,
      interactive: intervention.parameters.interactiveTutorial,
      personalized: intervention.parameters.personalizedContent,
      withGamification: intervention.parameters.gamification
    });

    return {
      success: tutorialSent,
      engagementScore: tutorialSent ? 70 : 0,
      responseGenerated: tutorialSent,
      actionTaken: tutorialSent,
      notes: tutorialSent ? 'Interactive feature tutorial sent' : 'Failed to send tutorial',
      followUpRequired: true,
      nextSteps: tutorialSent ? 
        ['monitor_tutorial_completion', 'track_feature_usage'] : 
        ['manual_tutorial_setup']
    };
  }

  private async triggerBillingSupport(intervention: RetentionIntervention): Promise<InterventionResult> {
    const supportTicketCreated = await this.createSupportTicket({
      userId: intervention.parameters.userId,
      type: 'billing_proactive',
      priority: 'high',
      autoAssign: true,
      proactiveOutreach: intervention.parameters.proactiveOutreach
    });

    return {
      success: supportTicketCreated,
      engagementScore: supportTicketCreated ? 80 : 0,
      responseGenerated: supportTicketCreated,
      actionTaken: supportTicketCreated,
      notes: supportTicketCreated ? 'Proactive billing support ticket created' : 'Failed to create support ticket',
      followUpRequired: true,
      nextSteps: supportTicketCreated ? 
        ['monitor_ticket_resolution', 'ensure_payment_success'] : 
        ['manual_support_assignment']
    };
  }

  private async scheduleProductDemo(intervention: RetentionIntervention): Promise<InterventionResult> {
    const demoScheduled = await this.createCalendarEvent({
      userId: intervention.parameters.userId,
      type: 'product_demo',
      duration: 30,
      personalizedAgenda: true,
      followUpRequired: true
    });

    return {
      success: demoScheduled,
      engagementScore: demoScheduled ? 90 : 0,
      responseGenerated: demoScheduled,
      actionTaken: demoScheduled,
      notes: demoScheduled ? 'Personal product demo scheduled' : 'Failed to schedule demo',
      followUpRequired: true,
      nextSteps: demoScheduled ? 
        ['prepare_demo_materials', 'send_calendar_invite'] : 
        ['manual_demo_scheduling']
    };
  }

  /**
   * Helper methods
   */
  private determineCampaignType(user: AtRiskUser): 'proactive' | 'reactive' | 'winback' {
    if (user.riskScore > 0.8) return 'reactive';
    if (user.lastInteractionDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) return 'winback';
    return 'proactive';
  }

  private calculateExpectedImpact(interventions: RetentionIntervention[]): number {
    return interventions.reduce((total, intervention) => {
      const baseImpact = this.getInterventionBaseImpact(intervention.type);
      const priorityMultiplier = this.getPriorityMultiplier(intervention.priority);
      return total + (baseImpact * priorityMultiplier);
    }, 0);
  }

  private getInterventionBaseImpact(type: string): number {
    const impacts = {
      personal_call: 0.5,
      billing_support: 0.4,
      discount_offer: 0.35,
      feature_tutorial: 0.3,
      product_demo: 0.45,
      email_campaign: 0.2
    };
    return impacts[type as keyof typeof impacts] || 0.1;
  }

  private getPriorityMultiplier(priority: string): number {
    const multipliers = { critical: 1.2, high: 1.0, medium: 0.8, low: 0.6 };
    return multipliers[priority as keyof typeof multipliers] || 1.0;
  }

  private shouldExecuteIntervention(intervention: RetentionIntervention): boolean {
    return intervention.status === 'scheduled' && 
           intervention.scheduledDate <= new Date();
  }

  private initializeMetrics(): CampaignMetrics {
    return {
      interventionsSent: 0,
      interventionsCompleted: 0,
      engagementRate: 0,
      responseRate: 0,
      conversionRate: 0,
      retentionImpact: 0,
      costEffectiveness: 0
    };
  }

  private generateCampaignId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateInterventionId(): string {
    return `intervention_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private initializeAutomationRules(): void {
    // Initialize predefined automation rules
    // In production, these would be loaded from database
  }

  // Placeholder methods for external integrations
  private async createCRMTask(params: any): Promise<boolean> { return true; }
  private async sendPersonalizedEmail(params: any): Promise<boolean> { return true; }
  private async createDiscountOffer(params: any): Promise<boolean> { return true; }
  private async createPersonalizedTutorial(params: any): Promise<boolean> { return true; }
  private async createSupportTicket(params: any): Promise<boolean> { return true; }
  private async createCalendarEvent(params: any): Promise<boolean> { return true; }

  // Database operations
  private async getActiveCampaign(userId: string): Promise<RetentionCampaign | null> {
    const doc = await this.db.collection('retention_campaigns')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    return doc.empty ? null : { id: doc.docs[0].id, ...doc.docs[0].data() } as RetentionCampaign;
  }

  private async storeCampaign(campaign: RetentionCampaign): Promise<void> {
    await this.db.collection('retention_campaigns').doc(campaign.id).set(campaign);
  }

  private async scheduleIntervention(campaignId: string, intervention: RetentionIntervention): Promise<void> {
    intervention.status = 'scheduled';
    await this.db.collection('retention_interventions').doc(intervention.id).set({
      ...intervention,
      campaignId
    });
  }

  private async getScheduledInterventions(): Promise<RetentionIntervention[]> {
    const snapshot = await this.db.collection('retention_interventions')
      .where('status', '==', 'scheduled')
      .where('scheduledDate', '<=', new Date())
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RetentionIntervention));
  }

  private async updateIntervention(intervention: RetentionIntervention): Promise<void> {
    await this.db.collection('retention_interventions').doc(intervention.id).update(intervention);
  }

  private async trackInterventionMetrics(intervention: RetentionIntervention): Promise<void> {
    await this.db.collection('intervention_metrics').add({
      interventionId: intervention.id,
      type: intervention.type,
      result: intervention.results,
      timestamp: new Date()
    });
  }
}

export const retentionAutomationService = new RetentionAutomationService();