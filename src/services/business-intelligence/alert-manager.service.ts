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
   * Get current metric value (simplified - would integrate with metrics engine)
   */
  private async getCurrentMetricValue(metricId: string): Promise<number> {
    // In real implementation, this would call the metrics engine
    // For now, simulate metric values
    switch (metricId) {
      case 'error_rate':
        return Math.random() * 0.1; // 0-10% error rate
      case 'response_time':
        return 100 + Math.random() * 200; // 100-300ms response time
      case 'user_churn':
        return Math.random() * 0.05; // 0-5% churn rate
      case 'revenue_drop':
        return -0.02 + Math.random() * 0.04; // -2% to +2% revenue change
      default:
        return Math.random() * 100;
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
    // Simulate sending notification
    console.log(`Sending notification to ${recipient}: ${message}`);

    // In real implementation:
    // - Email: Use service like SendGrid, AWS SES
    // - SMS: Use service like Twilio
    // - Slack: Use Slack Web API
    // - Push: Use Firebase Cloud Messaging
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