/**
 * Alert Manager Service
 * Handles alert creation, monitoring, and notification management
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import {
  Alert,
  AlertCondition,
  BusinessMetric
} from '../../types/business-intelligence.types';

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new alert
   */
  async createAlert(config: {
    name: string;
    metricId: string;
    condition: AlertCondition;
    recipients: string[];
    isActive?: boolean;
  }): Promise<Alert> {
    const alertId = `alert_${Date.now()}`;

    const alert: Alert = {
      id: alertId,
      name: config.name,
      metricId: config.metricId,
      condition: config.condition,
      recipients: config.recipients,
      isActive: config.isActive !== false,
      createdAt: new Date(),
      lastTriggered: null,
      triggerCount: 0
    };

    this.alerts.set(alertId, alert);

    if (alert.isActive) {
      this.startMonitoring(alertId);
    }

    return alert;
  }

  /**
   * Start monitoring an alert
   */
  private startMonitoring(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || !alert.isActive) return;

    // Check alert condition every 5 minutes
    const timer = setInterval(async () => {
      await this.checkAlert(alertId);
    }, 5 * 60 * 1000);

    this.activeMonitoring.set(alertId, timer);
  }

  /**
   * Stop monitoring an alert
   */
  private stopMonitoring(alertId: string): void {
    const timer = this.activeMonitoring.get(alertId);
    if (timer) {
      clearInterval(timer);
      this.activeMonitoring.delete(alertId);
    }
  }

  /**
   * Check if alert condition is met
   */
  async checkAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert || !alert.isActive) return;

    try {
      const currentValue = await this.getCurrentMetricValue(alert.metricId);
      const conditionMet = this.evaluateCondition(currentValue, alert.condition);

      if (conditionMet) {
        await this.triggerAlert(alertId, currentValue);
      }
    } catch (error) {
      console.error(`Error checking alert ${alertId}:`, error);
    }
  }

  /**
   * Get current metric value from the metrics engine
   */
  private async getCurrentMetricValue(metricId: string): Promise<number> {
    try {
      const { admin } = await import('@cvplus/core');
      const db = admin.firestore();

      // Get the latest metric value from analytics aggregates
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const metricQuery = await db.collection('analyticsAggregates')
        .where('metricType', '==', metricId)
        .where('timestamp', '>=', oneHourAgo)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!metricQuery.empty) {
        const latestMetric = metricQuery.docs[0].data();
        return this.extractMetricValue(latestMetric, metricId);
      }

      // Fallback: calculate metric in real-time
      return await this.calculateMetricRealTime(metricId);

    } catch (error) {
      console.error(`Error getting metric value for ${metricId}:`, error);

      // Fallback to calculation if database query fails
      return await this.calculateMetricRealTime(metricId);
    }
  }

  /**
   * Extract specific metric value from aggregate data
   */
  private extractMetricValue(aggregateData: any, metricId: string): number {
    switch (metricId) {
      case 'error_rate':
        const totalRequests = aggregateData.totalRequests || 1;
        const errorCount = aggregateData.errorCount || 0;
        return errorCount / totalRequests;

      case 'response_time':
        return aggregateData.averageResponseTime || 0;

      case 'user_churn':
        const activeUsers = aggregateData.activeUsers || 1;
        const churnedUsers = aggregateData.churnedUsers || 0;
        return churnedUsers / activeUsers;

      case 'revenue_drop':
        const currentRevenue = aggregateData.currentRevenue || 0;
        const previousRevenue = aggregateData.previousRevenue || currentRevenue;
        return previousRevenue > 0 ? (currentRevenue - previousRevenue) / previousRevenue : 0;

      case 'conversion_rate':
        const visitors = aggregateData.visitors || 1;
        const conversions = aggregateData.conversions || 0;
        return conversions / visitors;

      case 'bounce_rate':
        const sessions = aggregateData.sessions || 1;
        const bounces = aggregateData.bounces || 0;
        return bounces / sessions;

      case 'page_load_time':
        return aggregateData.averagePageLoadTime || 0;

      case 'active_users':
        return aggregateData.activeUsers || 0;

      case 'server_cpu_usage':
        return aggregateData.averageCpuUsage || 0;

      case 'memory_usage':
        return aggregateData.averageMemoryUsage || 0;

      default:
        return aggregateData.value || aggregateData.count || 0;
    }
  }

  /**
   * Calculate metric in real-time as fallback
   */
  private async calculateMetricRealTime(metricId: string): Promise<number> {
    try {
      const { admin } = await import('@cvplus/core');
      const db = admin.firestore();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      switch (metricId) {
        case 'error_rate': {
          const [totalEvents, errorEvents] = await Promise.all([
            db.collection('analyticsEvents')
              .where('timestamp', '>=', oneHourAgo)
              .where('category', 'in', ['api', 'system'])
              .get(),
            db.collection('analyticsEvents')
              .where('timestamp', '>=', oneHourAgo)
              .where('eventName', 'in', ['error', 'exception', 'api_error'])
              .get()
          ]);

          const total = totalEvents.size || 1;
          const errors = errorEvents.size;
          return errors / total;
        }

        case 'response_time': {
          const responseTimeEvents = await db.collection('analyticsEvents')
            .where('timestamp', '>=', oneHourAgo)
            .where('eventName', '==', 'api_response')
            .get();

          if (responseTimeEvents.empty) return 0;

          const responseTimes = responseTimeEvents.docs
            .map(doc => doc.data().properties?.responseTime)
            .filter(time => typeof time === 'number');

          return responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;
        }

        case 'user_churn': {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const [oldActiveUsers, recentActiveUsers] = await Promise.all([
            db.collection('analyticsEvents')
              .where('timestamp', '>=', thirtyDaysAgo)
              .where('timestamp', '<', sevenDaysAgo)
              .where('eventName', '==', 'user_session')
              .get(),
            db.collection('analyticsEvents')
              .where('timestamp', '>=', sevenDaysAgo)
              .where('eventName', '==', 'user_session')
              .get()
          ]);

          const oldUsers = new Set(oldActiveUsers.docs.map(doc => doc.data().userId));
          const recentUsers = new Set(recentActiveUsers.docs.map(doc => doc.data().userId));

          const churnedUsers = [...oldUsers].filter(userId => !recentUsers.has(userId));
          return oldUsers.size > 0 ? churnedUsers.length / oldUsers.size : 0;
        }

        case 'conversion_rate': {
          const [visitEvents, conversionEvents] = await Promise.all([
            db.collection('analyticsEvents')
              .where('timestamp', '>=', oneHourAgo)
              .where('eventName', '==', 'page_view')
              .get(),
            db.collection('analyticsEvents')
              .where('timestamp', '>=', oneHourAgo)
              .where('eventName', 'in', ['purchase', 'signup', 'subscription'])
              .get()
          ]);

          const visits = visitEvents.size || 1;
          const conversions = conversionEvents.size;
          return conversions / visits;
        }

        default:
          // Return 0 for unknown metrics
          console.warn(`Unknown metric ID: ${metricId}`);
          return 0;
      }
    } catch (error) {
      console.error(`Error calculating real-time metric ${metricId}:`, error);
      return 0;
    }
  }

  /**
   * Evaluate if condition is met
   */
  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return value > condition.threshold;
      case 'less_than':
        return value < condition.threshold;
      case 'equals':
        return Math.abs(value - condition.threshold) < 0.001;
      case 'greater_than_or_equal':
        return value >= condition.threshold;
      case 'less_than_or_equal':
        return value <= condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert and send notifications
   */
  async triggerAlert(alertId: string, currentValue: number): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    // Update alert state
    alert.lastTriggered = new Date();
    alert.triggerCount++;

    // Send notifications
    await this.sendNotifications(alert, currentValue);

    console.log(`Alert triggered: ${alert.name} - Value: ${currentValue}`);
  }

  /**
   * Send notifications to recipients
   */
  private async sendNotifications(alert: Alert, currentValue: number): Promise<void> {
    const message = `Alert: ${alert.name}\n` +
                   `Metric: ${alert.metricId}\n` +
                   `Current Value: ${currentValue}\n` +
                   `Threshold: ${alert.condition.threshold}\n` +
                   `Time: ${new Date().toISOString()}`;

    // In real implementation, would integrate with email/SMS/Slack services
    for (const recipient of alert.recipients) {
      await this.sendNotification(recipient, message);
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(recipient: string, message: string): Promise<void> {
    try {
      // Determine notification type based on recipient format
      if (recipient.includes('@')) {
        // Email notification
        await this.sendEmailNotification(recipient, message);
      } else if (recipient.startsWith('+')) {
        // SMS notification
        await this.sendSMSNotification(recipient, message);
      } else if (recipient.startsWith('#')) {
        // Slack channel notification
        await this.sendSlackNotification(recipient, message);
      } else if (recipient.startsWith('webhook:')) {
        // Webhook notification
        const webhookUrl = recipient.replace('webhook:', '');
        await this.sendWebhookNotification(webhookUrl, message);
      } else {
        // Push notification (user ID)
        await this.sendPushNotification(recipient, message);
      }
    } catch (error) {
      console.error(`Failed to send notification to ${recipient}:`, error);
      // Log to audit trail for compliance
      await this.logNotificationFailure(recipient, message, error);
    }
  }

  /**
   * Send email notification using Firebase Cloud Functions
   */
  private async sendEmailNotification(email: string, message: string): Promise<void> {
    const { admin } = await import('@cvplus/core');
    const db = admin.firestore();

    // Queue email for sending via mail service
    await db.collection('mailQueue').add({
      to: email,
      subject: 'CVPlus Analytics Alert',
      text: message,
      html: `<pre>${message}</pre>`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'analytics_alert',
      status: 'pending'
    });
  }

  /**
   * Send SMS notification using Twilio
   */
  private async sendSMSNotification(phoneNumber: string, message: string): Promise<void> {
    // Integration with Twilio SMS service
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn('Twilio credentials not configured, skipping SMS notification');
      return;
    }

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: phoneNumber,
          Body: message.substring(0, 160) // SMS length limit
        })
      });

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }
    } catch (error) {
      console.error('SMS notification failed:', error);
      throw error;
    }
  }

  /**
   * Send Slack notification using Webhook
   */
  private async sendSlackNotification(channel: string, message: string): Promise<void> {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.warn('Slack webhook URL not configured, skipping Slack notification');
      return;
    }

    try {
      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channel,
          text: `🚨 CVPlus Analytics Alert`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*CVPlus Analytics Alert*\n\`\`\`${message}\`\`\``
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Slack notification failed:', error);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(webhookUrl: string, message: string): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CVPlus-Analytics/1.0'
        },
        body: JSON.stringify({
          type: 'analytics_alert',
          message: message,
          timestamp: new Date().toISOString(),
          source: 'cvplus-analytics'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
      throw error;
    }
  }

  /**
   * Send push notification using Firebase Cloud Messaging
   */
  private async sendPushNotification(userId: string, message: string): Promise<void> {
    try {
      const { admin } = await import('@cvplus/core');
      const db = admin.firestore();

      // Get user's FCM tokens
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        console.warn(`No FCM tokens found for user ${userId}`);
        return;
      }

      // Send push notification
      const messaging = admin.messaging();
      await messaging.sendMulticast({
        tokens: fcmTokens,
        notification: {
          title: 'CVPlus Analytics Alert',
          body: message.substring(0, 100) + (message.length > 100 ? '...' : '')
        },
        data: {
          type: 'analytics_alert',
          message: message,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Push notification failed:', error);
      throw error;
    }
  }

  /**
   * Log notification failure for audit purposes
   */
  private async logNotificationFailure(recipient: string, message: string, error: any): Promise<void> {
    try {
      const { admin } = await import('@cvplus/core');
      const db = admin.firestore();

      await db.collection('notificationFailures').add({
        recipient,
        message: message.substring(0, 500), // Truncate for storage
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'analytics_alert'
      });
    } catch (logError) {
      console.error('Failed to log notification failure:', logError);
    }
  }

  /**
   * Update alert configuration
   */
  async updateAlert(
    alertId: string,
    updates: Partial<Alert>
  ): Promise<Alert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const wasActive = alert.isActive;
    Object.assign(alert, updates);

    // Handle activation/deactivation
    if (wasActive && !alert.isActive) {
      this.stopMonitoring(alertId);
    } else if (!wasActive && alert.isActive) {
      this.startMonitoring(alertId);
    }

    return alert;
  }

  /**
   * Delete alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    this.stopMonitoring(alertId);
    this.alerts.delete(alertId);
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<Alert | null> {
    return this.alerts.get(alertId) || null;
  }

  /**
   * Get all alerts
   */
  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts for specific metric
   */
  async getAlertsForMetric(metricId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.metricId === metricId);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.isActive);
  }

  /**
   * Get recently triggered alerts
   */
  async getRecentAlerts(hours = 24): Promise<Alert[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.alerts.values())
      .filter(alert => alert.lastTriggered && alert.lastTriggered > cutoff)
      .sort((a, b) => (b.lastTriggered?.getTime() || 0) - (a.lastTriggered?.getTime() || 0));
  }

  /**
   * Test alert (manually trigger for testing)
   */
  async testAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const testValue = alert.condition.threshold + 1; // Force trigger
    await this.triggerAlert(alertId, testValue);
  }

  /**
   * Health check for alert manager
   */
  async healthCheck(): Promise<boolean> {
    try {
      const activeAlerts = await this.getActiveAlerts();
      const monitoringCount = this.activeMonitoring.size;

      // Health check passes if monitoring count matches active alerts
      return monitoringCount === activeAlerts.length;
    } catch (error) {
      console.error('Alert manager health check failed:', error);
      return false;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(): Promise<{
    total: number;
    active: number;
    triggered24h: number;
    avgTriggersPerAlert: number;
  }> {
    const allAlerts = await this.getAllAlerts();
    const activeAlerts = await this.getActiveAlerts();
    const recentAlerts = await this.getRecentAlerts(24);

    const totalTriggers = allAlerts.reduce((sum, alert) => sum + alert.triggerCount, 0);
    const avgTriggersPerAlert = allAlerts.length > 0 ? totalTriggers / allAlerts.length : 0;

    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      triggered24h: recentAlerts.length,
      avgTriggersPerAlert: Math.round(avgTriggersPerAlert * 100) / 100
    };
  }
}