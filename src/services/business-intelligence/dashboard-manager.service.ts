/**
 * Dashboard Manager Service
 * Handles dashboard creation, management, and widget orchestration
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import {
  Dashboard,
  DashboardType,
  DashboardWidget,
  WidgetType,
  BusinessMetric
} from '../../types/business-intelligence.types';

export class DashboardManager {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();

  /**
   * Create a new dashboard
   */
  async createDashboard(config: {
    name: string;
    type: DashboardType;
    userId?: string;
    isPublic?: boolean;
  }): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: `dash_${Date.now()}`,
      name: config.name,
      type: config.type,
      widgets: [],
      layout: { columns: 12, rows: 'auto' },
      userId: config.userId,
      isPublic: config.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(
    dashboardId: string,
    widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DashboardWidget> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.widgets.set(newWidget.id, newWidget);
    dashboard.widgets.push(newWidget.id);
    dashboard.updatedAt = new Date();

    return newWidget;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  /**
   * Get dashboards for user
   */
  async getUserDashboards(userId: string): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values())
      .filter(dashboard => dashboard.userId === userId || dashboard.isPublic);
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string,
    updates: Partial<Dashboard>
  ): Promise<Dashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    Object.assign(dashboard, updates, { updatedAt: new Date() });
    return dashboard;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    // Remove all widgets
    dashboard.widgets.forEach(widgetId => {
      this.widgets.delete(widgetId);
    });

    this.dashboards.delete(dashboardId);
  }

  /**
   * Get widget by ID
   */
  async getWidget(widgetId: string): Promise<DashboardWidget | null> {
    return this.widgets.get(widgetId) || null;
  }

  /**
   * Update widget
   */
  async updateWidget(
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    Object.assign(widget, updates, { updatedAt: new Date() });
    return widget;
  }

  /**
   * Get all widgets for dashboard
   */
  async getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return [];
    }

    return dashboard.widgets
      .map(widgetId => this.widgets.get(widgetId))
      .filter(widget => widget !== undefined) as DashboardWidget[];
  }

  /**
   * Clone dashboard
   */
  async cloneDashboard(
    dashboardId: string,
    newName: string,
    userId?: string
  ): Promise<Dashboard> {
    const originalDashboard = this.dashboards.get(dashboardId);
    if (!originalDashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const clonedDashboard = await this.createDashboard({
      name: newName,
      type: originalDashboard.type,
      userId,
      isPublic: false
    });

    // Clone all widgets
    const widgets = await this.getDashboardWidgets(dashboardId);
    for (const widget of widgets) {
      await this.addWidget(clonedDashboard.id, {
        type: widget.type,
        title: widget.title,
        config: { ...widget.config },
        position: { ...widget.position },
        size: { ...widget.size },
        dataSource: widget.dataSource
      });
    }

    return clonedDashboard;
  }

  /**
   * Export dashboard configuration
   */
  async exportDashboard(dashboardId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgets = await this.getDashboardWidgets(dashboardId);

    return {
      dashboard: {
        name: dashboard.name,
        type: dashboard.type,
        layout: dashboard.layout
      },
      widgets: widgets.map(widget => ({
        type: widget.type,
        title: widget.title,
        config: widget.config,
        position: widget.position,
        size: widget.size,
        dataSource: widget.dataSource
      }))
    };
  }

  /**
   * Import dashboard configuration
   */
  async importDashboard(
    config: any,
    userId?: string
  ): Promise<Dashboard> {
    const dashboard = await this.createDashboard({
      name: config.dashboard.name,
      type: config.dashboard.type,
      userId
    });

    // Import widgets
    for (const widgetConfig of config.widgets) {
      await this.addWidget(dashboard.id, widgetConfig);
    }

    return dashboard;
  }
}