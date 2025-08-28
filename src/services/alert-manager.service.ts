/**
 * Alert Manager Service
 * 
 * Intelligent alert system for CVPlus video generation platform.
 * Monitors performance thresholds, quality degradation, error patterns,
 * and business metrics with automated escalation and response procedures.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import * as admin from 'firebase-admin';
import { config } from '../config/environment';
import { PerformanceAlert } from './performance-monitor.service';
import { BusinessMetrics, QualityInsights } from './analytics-engine.service';

// Alert configuration interfaces
export interface AlertRule {
  ruleId: string;
  name: string;
  description: string;
  type: 'performance' | 'quality' | 'business' | 'system' | 'security';
  metric: string;
  condition: 'above' | 'below' | 'equals' | 'change_rate';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  escalationRules: EscalationRule[];
  autoActions: AutoAction[];
  notificationChannels: NotificationChannel[];
}

export interface EscalationRule {
  escalationId: string;
  triggerAfterMinutes: number;
  severity: 'medium' | 'high' | 'critical';
  notificationChannels: NotificationChannel[];
  autoActions: AutoAction[];
}

export interface AutoAction {
  actionId: string;
  type: 'restart_service' | 'scale_resources' | 'switch_provider' | 'throttle_requests' | 'notify_team';
  parameters: Record<string, any>;
  conditions: string[];
}

export interface NotificationChannel {
  channelId: string;
  type: 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty';
  configuration: Record<string, any>;
  severity: ('low' | 'medium' | 'high' | 'critical')[];
}

export interface AlertInstance {
  alertId: string;
  ruleId: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  context: Record<string, any>;
  escalationLevel: number;
  lastEscalatedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  suppressedUntil?: Date;
  notificationsSent: NotificationRecord[];
  actionsExecuted: ActionRecord[];
  id?: string; // Firestore document ID for compatibility
}

export interface NotificationRecord {
  sentAt: Date;
  channel: string;
  type: string;
  recipient: string;
  success: boolean;
  errorMessage?: string;
}

export interface ActionRecord {
  executedAt: Date;
  actionType: string;
  parameters: Record<string, any>;
  success: boolean;
  result?: any;
  errorMessage?: string;
}

export class AlertManagerService {
  private firestore: admin.firestore.Firestore;
  private readonly alertRulesCollection = 'alert_rules';
  private readonly alertInstancesCollection = 'alert_instances';
  private readonly alertHistoryCollection = 'alert_history';
  
  // Default alert rules
  private readonly defaultRules: AlertRule[] = [
    {
      ruleId: 'slow_generation',
      name: 'Slow Video Generation',
      description: 'Video generation taking longer than expected',
      type: 'performance',
      metric: 'average_generation_time',
      condition: 'above',
      threshold: 90000, // 90 seconds
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 15,
      escalationRules: [
        {
          escalationId: 'slow_generation_high',
          triggerAfterMinutes: 30,
          severity: 'high',
          notificationChannels: [{ channelId: 'tech_team_slack', type: 'slack', configuration: {}, severity: ['high'] }],
          autoActions: [{ actionId: 'switch_provider', type: 'switch_provider', parameters: {}, conditions: [] }]
        }
      ],
      autoActions: [],
      notificationChannels: [{ channelId: 'alerts_email', type: 'email', configuration: {}, severity: ['medium', 'high'] }]
    },
    {
      ruleId: 'low_success_rate',
      name: 'Low Generation Success Rate',
      description: 'Video generation success rate below threshold',
      type: 'performance',
      metric: 'success_rate',
      condition: 'below',
      threshold: 0.95, // 95%
      severity: 'high',
      enabled: true,
      cooldownMinutes: 10,
      escalationRules: [
        {
          escalationId: 'low_success_critical',
          triggerAfterMinutes: 20,
          severity: 'critical',
          notificationChannels: [{ channelId: 'oncall_pager', type: 'pagerduty', configuration: {}, severity: ['critical'] }],
          autoActions: [{ actionId: 'enable_fallback', type: 'switch_provider', parameters: { enableAllProviders: true }, conditions: [] }]
        }
      ],
      autoActions: [{ actionId: 'throttle_requests', type: 'throttle_requests', parameters: { rate: 0.5 }, conditions: [] }],
      notificationChannels: [{ channelId: 'tech_team_slack', type: 'slack', configuration: {}, severity: ['high'] }]
    },
    {
      ruleId: 'quality_degradation',
      name: 'Video Quality Degradation',
      description: 'Average video quality score below acceptable threshold',
      type: 'quality',
      metric: 'average_quality_score',
      condition: 'below',
      threshold: 8.0, // 8.0/10
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 20,
      escalationRules: [],
      autoActions: [],
      notificationChannels: [{ channelId: 'quality_team_email', type: 'email', configuration: {}, severity: ['medium'] }]
    },
    {
      ruleId: 'user_satisfaction_drop',
      name: 'User Satisfaction Drop',
      description: 'User satisfaction score below acceptable level',
      type: 'quality',
      metric: 'user_satisfaction_score',
      condition: 'below',
      threshold: 4.0, // 4.0/5
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 30,
      escalationRules: [],
      autoActions: [],
      notificationChannels: [{ channelId: 'product_team_slack', type: 'slack', configuration: {}, severity: ['medium'] }]
    },
    {
      ruleId: 'conversion_rate_drop',
      name: 'Conversion Rate Drop',
      description: 'Premium conversion rate below baseline',
      type: 'business',
      metric: 'premium_conversion_rate',
      condition: 'below',
      threshold: 0.50, // 50%
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 60,
      escalationRules: [],
      autoActions: [],
      notificationChannels: [{ channelId: 'business_team_email', type: 'email', configuration: {}, severity: ['medium'] }]
    }
  ];

  constructor() {
    this.firestore = admin.firestore();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules if they don't exist
   */
  private async initializeDefaultRules(): Promise<void> {
    try {
      const rulesSnapshot = await this.firestore
        .collection(this.alertRulesCollection)
        .get();

      if (rulesSnapshot.empty) {
        for (const rule of this.defaultRules) {
          await this.firestore
            .collection(this.alertRulesCollection)
            .doc(rule.ruleId)
            .set(rule);
        }
      }
    } catch (error) {
    }
  }

  /**
   * Check metrics against alert rules and trigger alerts if necessary
   */
  async checkAlerts(metrics: {
    performance?: any;
    quality?: QualityInsights;
    business?: BusinessMetrics;
    system?: any;
  }): Promise<AlertInstance[]> {
    try {
      const triggeredAlerts: AlertInstance[] = [];

      // Get all enabled alert rules
      const rulesSnapshot = await this.firestore
        .collection(this.alertRulesCollection)
        .where('enabled', '==', true)
        .get();

      const rules = rulesSnapshot.docs.map(doc => doc.data() as AlertRule);

      for (const rule of rules) {
        const metricValue = this.extractMetricValue(metrics, rule.metric, rule.type);
        
        if (metricValue !== null && this.evaluateCondition(metricValue, rule.condition, rule.threshold)) {
          // Check if alert is already active or in cooldown
          const existingAlert = await this.getActiveAlert(rule.ruleId);
          
          if (!existingAlert && await this.isOutOfCooldown(rule)) {
            const alert = await this.createAlert(rule, metricValue, metrics);
            triggeredAlerts.push(alert);
            
            // Send notifications and execute auto actions
            await this.processAlert(alert);
          }
        } else {
          // Check if we should resolve any active alerts for this rule
          await this.resolveActiveAlert(rule.ruleId, 'condition_resolved');
        }
      }

      return triggeredAlerts;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Process escalation for active alerts
   */
  async processEscalations(): Promise<void> {
    try {
      const activeAlertsSnapshot = await this.firestore
        .collection(this.alertInstancesCollection)
        .where('status', 'in', ['active', 'acknowledged'])
        .get();

      const activeAlerts = activeAlertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertInstance & { id: string }));

      for (const alert of activeAlerts) {
        await this.checkEscalation(alert);
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      await this.firestore
        .collection(this.alertInstancesCollection)
        .doc(alertId)
        .update({
          status: 'acknowledged',
          acknowledgedBy,
          acknowledgedAt: new Date()
        });


    } catch (error) {
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date()
      };

      if (resolution) {
        updateData.resolution = resolution;
      }

      await this.firestore
        .collection(this.alertInstancesCollection)
        .doc(alertId)
        .update(updateData);


    } catch (error) {
      throw error;
    }
  }

  /**
   * Suppress an alert for a specified duration
   */
  async suppressAlert(alertId: string, suppressedBy: string, durationMinutes: number): Promise<void> {
    try {
      const suppressedUntil = new Date(Date.now() + (durationMinutes * 60 * 1000));

      await this.firestore
        .collection(this.alertInstancesCollection)
        .doc(alertId)
        .update({
          status: 'suppressed',
          suppressedBy,
          suppressedAt: new Date(),
          suppressedUntil
        });


    } catch (error) {
      throw error;
    }
  }

  /**
   * Get alert dashboard data
   */
  async getAlertDashboard(): Promise<{
    activeAlerts: AlertInstance[];
    alertSummary: {
      total: number;
      bySeverity: Record<string, number>;
      byType: Record<string, number>;
    };
    recentHistory: AlertInstance[];
  }> {
    try {
      // Get active alerts
      const activeAlertsSnapshot = await this.firestore
        .collection(this.alertInstancesCollection)
        .where('status', 'in', ['active', 'acknowledged'])
        .orderBy('triggeredAt', 'desc')
        .get();

      const activeAlerts = activeAlertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertInstance));

      // Get recent history (last 24 hours)
      const dayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
      const historySnapshot = await this.firestore
        .collection(this.alertInstancesCollection)
        .where('triggeredAt', '>=', dayAgo)
        .orderBy('triggeredAt', 'desc')
        .limit(50)
        .get();

      const recentHistory = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertInstance));

      // Calculate summary statistics
      const alertSummary = {
        total: activeAlerts.length,
        bySeverity: this.groupAlertsBySeverity(activeAlerts),
        byType: this.groupAlertsByType(activeAlerts)
      };

      return {
        activeAlerts,
        alertSummary,
        recentHistory
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private extractMetricValue(metrics: any, metricName: string, type: string): number | null {
    try {
      switch (type) {
        case 'performance':
          if (metrics.performance) {
            switch (metricName) {
              case 'average_generation_time':
                return metrics.performance.averageGenerationTime;
              case 'success_rate':
                return metrics.performance.successRate;
              case 'error_rate':
                return metrics.performance.errorRate;
              default:
                return null;
            }
          }
          break;

        case 'quality':
          if (metrics.quality) {
            switch (metricName) {
              case 'average_quality_score':
                return metrics.quality.overallQualityScore;
              case 'user_satisfaction_score':
                return metrics.quality.satisfactionAnalysis.averageRating;
              default:
                return null;
            }
          }
          break;

        case 'business':
          if (metrics.business) {
            switch (metricName) {
              case 'premium_conversion_rate':
                return metrics.business.conversionRates.userToPremium;
              case 'revenue_per_user':
                return metrics.business.revenuePerUser;
              default:
                return null;
            }
          }
          break;

        default:
          return null;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'above':
        return value > threshold;
      case 'below':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.001;
      default:
        return false;
    }
  }

  private async getActiveAlert(ruleId: string): Promise<AlertInstance | null> {
    try {
      const alertSnapshot = await this.firestore
        .collection(this.alertInstancesCollection)
        .where('ruleId', '==', ruleId)
        .where('status', 'in', ['active', 'acknowledged'])
        .limit(1)
        .get();

      return alertSnapshot.empty ? null : alertSnapshot.docs[0].data() as AlertInstance;
    } catch (error) {
      return null;
    }
  }

  private async isOutOfCooldown(rule: AlertRule): Promise<boolean> {
    try {
      const cooldownTime = new Date(Date.now() - (rule.cooldownMinutes * 60 * 1000));
      
      const recentAlertSnapshot = await this.firestore
        .collection(this.alertInstancesCollection)
        .where('ruleId', '==', rule.ruleId)
        .where('triggeredAt', '>', cooldownTime)
        .limit(1)
        .get();

      return recentAlertSnapshot.empty;
    } catch (error) {
      return true;
    }
  }

  private async createAlert(rule: AlertRule, metricValue: number, context: any): Promise<AlertInstance> {
    const alertId = `${rule.ruleId}_${Date.now()}`;
    
    const alert: AlertInstance = {
      alertId,
      ruleId: rule.ruleId,
      triggeredAt: new Date(),
      status: 'active',
      severity: rule.severity,
      metric: rule.metric,
      currentValue: metricValue,
      threshold: rule.threshold,
      message: this.generateAlertMessage(rule, metricValue),
      context,
      escalationLevel: 0,
      notificationsSent: [],
      actionsExecuted: []
    };

    await this.firestore
      .collection(this.alertInstancesCollection)
      .doc(alertId)
      .set(alert);

    return alert;
  }

  private generateAlertMessage(rule: AlertRule, value: number): string {
    return `${rule.name}: ${rule.metric} is ${value.toFixed(2)}, ${rule.condition} threshold of ${rule.threshold}`;
  }

  private async processAlert(alert: AlertInstance): Promise<void> {
    try {
      const rule = await this.getAlertRule(alert.ruleId);
      if (!rule) return;

      // Send notifications
      for (const channel of rule.notificationChannels) {
        if (channel.severity.includes(alert.severity)) {
          await this.sendNotification(alert, channel);
        }
      }

      // Execute auto actions
      for (const action of rule.autoActions) {
        await this.executeAutoAction(alert, action);
      }

    } catch (error) {
    }
  }

  private async checkEscalation(alert: AlertInstance & { id: string }): Promise<void> {
    try {
      const rule = await this.getAlertRule(alert.ruleId);
      if (!rule || rule.escalationRules.length === 0) return;

      const alertAge = Date.now() - alert.triggeredAt.getTime();
      
      for (const escalation of rule.escalationRules) {
        const triggerTime = escalation.triggerAfterMinutes * 60 * 1000;
        
        if (alertAge >= triggerTime && 
            alert.escalationLevel < rule.escalationRules.indexOf(escalation) + 1) {
          
          await this.escalateAlert(alert, escalation);
          break;
        }
      }

    } catch (error) {
    }
  }

  private async escalateAlert(alert: AlertInstance & { id: string }, escalation: EscalationRule): Promise<void> {
    try {
      // Update alert with escalation info
      await this.firestore
        .collection(this.alertInstancesCollection)
        .doc(alert.id)
        .update({
          escalationLevel: alert.escalationLevel + 1,
          lastEscalatedAt: new Date(),
          severity: escalation.severity
        });

      // Send escalation notifications
      for (const channel of escalation.notificationChannels) {
        await this.sendNotification(alert, channel);
      }

      // Execute escalation actions
      for (const action of escalation.autoActions) {
        await this.executeAutoAction(alert, action);
      }


    } catch (error) {
    }
  }

  private async sendNotification(alert: AlertInstance, channel: NotificationChannel): Promise<void> {
    try {
      const notification: NotificationRecord = {
        sentAt: new Date(),
        channel: channel.channelId,
        type: channel.type,
        recipient: channel.configuration.recipient || 'default',
        success: false
      };

      // Implement notification sending based on channel type
      switch (channel.type) {
        case 'email':
          notification.success = await this.sendEmailNotification(alert, channel);
          break;
        case 'slack':
          notification.success = await this.sendSlackNotification(alert, channel);
          break;
        case 'sms':
          notification.success = await this.sendSMSNotification(alert, channel);
          break;
        case 'webhook':
          notification.success = await this.sendWebhookNotification(alert, channel);
          break;
        default:
          notification.success = false;
          notification.errorMessage = `Unsupported notification type: ${channel.type}`;
      }

      // Update alert with notification record
      await this.firestore
        .collection(this.alertInstancesCollection)
        .doc(alert.alertId)
        .update({
          notificationsSent: admin.firestore.FieldValue.arrayUnion(notification)
        });

    } catch (error) {
    }
  }

  private async executeAutoAction(alert: AlertInstance, action: AutoAction): Promise<void> {
    try {
      const actionRecord: ActionRecord = {
        executedAt: new Date(),
        actionType: action.type,
        parameters: action.parameters,
        success: false
      };

      // Implement auto action execution based on action type
      switch (action.type) {
        case 'switch_provider':
          actionRecord.success = await this.switchProvider(action.parameters);
          break;
        case 'throttle_requests':
          actionRecord.success = await this.throttleRequests(action.parameters);
          break;
        case 'restart_service':
          actionRecord.success = await this.restartService(action.parameters);
          break;
        default:
          actionRecord.success = false;
          actionRecord.errorMessage = `Unsupported action type: ${action.type}`;
      }

      // Update alert with action record
      await this.firestore
        .collection(this.alertInstancesCollection)
        .doc(alert.alertId)
        .update({
          actionsExecuted: admin.firestore.FieldValue.arrayUnion(actionRecord)
        });

    } catch (error) {
    }
  }

  private async resolveActiveAlert(ruleId: string, resolution: string): Promise<void> {
    try {
      const activeAlert = await this.getActiveAlert(ruleId);
      if (activeAlert) {
        await this.resolveAlert(activeAlert.alertId, 'system', resolution);
      }
    } catch (error) {
    }
  }

  private async getAlertRule(ruleId: string): Promise<AlertRule | null> {
    try {
      const ruleDoc = await this.firestore
        .collection(this.alertRulesCollection)
        .doc(ruleId)
        .get();

      return ruleDoc.exists ? ruleDoc.data() as AlertRule : null;
    } catch (error) {
      return null;
    }
  }

  private groupAlertsBySeverity(alerts: AlertInstance[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupAlertsByType(alerts: AlertInstance[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      // Extract type from ruleId or use default
      const type = alert.ruleId.split('_')[0] || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Notification implementation methods (simplified)
  private async sendEmailNotification(alert: AlertInstance, channel: NotificationChannel): Promise<boolean> {
    return true; // Would implement actual email sending
  }

  private async sendSlackNotification(alert: AlertInstance, channel: NotificationChannel): Promise<boolean> {
    return true; // Would implement actual Slack API call
  }

  private async sendSMSNotification(alert: AlertInstance, channel: NotificationChannel): Promise<boolean> {
    return true; // Would implement actual SMS sending
  }

  private async sendWebhookNotification(alert: AlertInstance, channel: NotificationChannel): Promise<boolean> {
    return true; // Would implement actual webhook call
  }

  // Auto action implementation methods (simplified)
  private async switchProvider(parameters: any): Promise<boolean> {
    return true; // Would implement actual provider switching
  }

  private async throttleRequests(parameters: any): Promise<boolean> {
    return true; // Would implement actual request throttling
  }

  private async restartService(parameters: any): Promise<boolean> {
    return true; // Would implement actual service restart
  }
}