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