export interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit?: string;
  format?: 'number' | 'currency' | 'percentage';
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface DashboardLayout {
  widgets: WidgetLayout[];
}

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

// Additional missing types for compatibility
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  description?: string;
  widgets: string[];
  refreshInterval: number; // seconds
  isPublic: boolean;
  owner: string;
  permissions: {
    view: string[];
    edit: string[];
  };
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DashboardWidget {
  widgetId: string;
  type: 'metric' | 'chart' | 'table' | 'text' | 'image';
  title: string;
  description?: string;
  config: Record<string, any>;
  dataSource: string;
  query?: string;
  refreshRate: number; // seconds
  size: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
}