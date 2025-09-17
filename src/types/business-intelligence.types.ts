/**
 * CVPlus Analytics - Business Intelligence & Dashboard Types
// Advanced BI, reporting, and predictive analytics types

/**
 * Dashboard type enumeration
*/
export enum DashboardType {
  EXECUTIVE = 'executive',
  PRODUCT = 'product',
  MARKETING = 'marketing',
  REVENUE = 'revenue',
  USER_BEHAVIOR = 'user_behavior',
  OPERATIONAL = 'operational',
  CUSTOM = 'custom'
}

/**
 * Widget type enumeration
*/
export enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  AREA_CHART = 'area_chart',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  FUNNEL = 'funnel',
  COHORT_TABLE = 'cohort_table',
  MAP = 'map',
  GAUGE = 'gauge',
  PROGRESS_BAR = 'progress_bar',
  SCATTER_PLOT = 'scatter_plot',
  HISTOGRAM = 'histogram'
}

/**
 * Time aggregation periods
*/
export enum TimeAggregation {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Metric calculation types
*/
export enum MetricCalculation {
  SUM = 'sum',
  COUNT = 'count',
  AVERAGE = 'average',
  MEDIAN = 'median',
  MIN = 'min',
  MAX = 'max',
  UNIQUE = 'unique',
  PERCENTAGE = 'percentage',
  GROWTH_RATE = 'growth_rate',
  CUMULATIVE = 'cumulative'
}

/**
 * Report format types
*/
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  HTML = 'html'
}

/**
 * Alert condition types
*/
export enum AlertCondition {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  PERCENTAGE_CHANGE = 'percentage_change',
  THRESHOLD_BREACH = 'threshold_breach',
  ANOMALY_DETECTED = 'anomaly_detected'
}

/**
 * Business metric definition
*/
export interface BusinessMetric {
  metricId: string;
  name: string;
  description: string;
  category: 'revenue' | 'growth' | 'engagement' | 'retention' | 'conversion' | 'operational';
  
  // Calculation definition
  calculation: {
    type: MetricCalculation;
    formula: string;            // Mathematical formula
    dataSource: string;         // Source table/collection
    filters?: MetricFilter[];   // Default filters
    dimensions?: string[];      // Grouping dimensions
  };
  
  // Display properties
  display: {
    format: 'number' | 'percentage' | 'currency' | 'duration';
    decimals: number;
    prefix?: string;
    suffix?: string;
    color?: string;
  };
  
  // Target and thresholds
  targets?: {
    good: number;
    warning: number;
    critical: number;
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  tags: string[];
}

/**
 * Metric filter definition
*/
export interface MetricFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: any;
  logicalOperator?: 'and' | 'or';
}

/**
 * Dashboard configuration
*/
export interface Dashboard {
  dashboardId: string;
  name: string;
  description: string;
  type: DashboardType;
  
  // Access control
  visibility: 'private' | 'team' | 'organization' | 'public';
  ownerId: string;
  sharedWith: string[];        // User/team IDs with access
  permissions: DashboardPermissions;
  
  // Layout configuration
  layout: {
    columns: number;
    rowHeight: number;
    margin: [number, number];   // [x, y] margins
    responsive: boolean;
  };
  
  // Widgets
  widgets: DashboardWidget[];
  
  // Filters (applied to all widgets)
  globalFilters: GlobalFilter[];
  
  // Auto-refresh settings
  autoRefresh: {
    enabled: boolean;
    interval: number;           // Seconds
    pauseWhenNotVisible: boolean;
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastViewedAt: number;
  viewCount: number;
  tags: string[];
  
  // Theme and styling
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    gridLines: boolean;
    darkMode: boolean;
  };
}

/**
 * Dashboard permissions
*/
export interface DashboardPermissions {
  canView: string[];           // User/role IDs
  canEdit: string[];           // User/role IDs
  canShare: string[];          // User/role IDs
  canDelete: string[];         // User/role IDs
  canExport: string[];         // User/role IDs
}

/**
 * Dashboard widget configuration
*/
export interface DashboardWidget {
  widgetId: string;
  title: string;
  description?: string;
  type: WidgetType;
  
  // Position and size
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
  };
  
  // Data configuration
  dataConfig: WidgetDataConfig;
  
  // Visualization configuration
  visualization: WidgetVisualization;
  
  // Interaction settings
  interactions: {
    drillDown?: DrillDownConfig;
    filters?: WidgetFilter[];
    clickActions?: ClickAction[];
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastRefreshed?: number;
  
  // Cache settings
  cache: {
    enabled: boolean;
    ttl: number;                // Time to live in seconds
  };
}

/**
 * Widget data configuration
*/
export interface WidgetDataConfig {
  // Data source
  dataSource: string;
  query: AnalyticsQuery;
  
  // Time range
  timeRange: TimeRange;
  
  // Aggregation
  aggregation: {
    period: TimeAggregation;
    timezone: string;
  };
  
  // Limits
  limit?: number;
  offset?: number;
}

/**
 * Widget visualization configuration
*/
export interface WidgetVisualization {
  // Chart-specific settings
  chartConfig?: ChartConfig;
  
  // Table-specific settings
  tableConfig?: TableConfig;
  
  // Metric card settings
  metricConfig?: MetricCardConfig;
  
  // Funnel settings
  funnelConfig?: FunnelConfig;
  
  // Cohort table settings
  cohortConfig?: CohortTableConfig;
}

/**
 * Chart configuration
*/
export interface ChartConfig {
  // Axes
  xAxis: {
    field: string;
    title?: string;
    format?: string;
    scale?: 'linear' | 'log' | 'time';
  };
  yAxis: {
    field: string;
    title?: string;
    format?: string;
    scale?: 'linear' | 'log';
    min?: number;
    max?: number;
  };
  
  // Series
  series: ChartSeries[];
  
  // Styling
  colors: string[];
  legend: {
    enabled: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  
  // Interactivity
  zoom: boolean;
  pan: boolean;
  tooltip: boolean;
}

/**
 * Chart series configuration
*/
export interface ChartSeries {
  name: string;
  field: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
  color?: string;
  yAxisIndex?: number;
  showInLegend: boolean;
}

/**
 * Table configuration
*/
export interface TableConfig {
  columns: TableColumn[];
  pagination: {
    enabled: boolean;
    pageSize: number;
  };
  sorting: {
    enabled: boolean;
    defaultSort?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  filtering: {
    enabled: boolean;
    searchable: boolean;
  };
  styling: {
    striped: boolean;
    hover: boolean;
    compact: boolean;
  };
}

/**
 * Table column configuration
*/
export interface TableColumn {
  field: string;
  title: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  width?: number;
  sortable: boolean;
  filterable: boolean;
  format?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Metric card configuration
*/
export interface MetricCardConfig {
  value: {
    field: string;
    format: 'number' | 'percentage' | 'currency' | 'duration';
    decimals: number;
    prefix?: string;
    suffix?: string;
  };
  comparison?: {
    field: string;
    period: 'previous_period' | 'same_period_last_year' | 'custom';
    format: 'percentage' | 'absolute';
    showTrend: boolean;
  };
  target?: {
    value: number;
    showProgress: boolean;
  };
  sparkline?: {
    enabled: boolean;
    field: string;
    color: string;
  };
}

/**
 * Funnel configuration
*/
export interface FunnelConfig {
  steps: FunnelStep[];
  orientation: 'vertical' | 'horizontal';
  showPercentages: boolean;
  showConversions: boolean;
  colorScheme: string[];
}

/**
 * Funnel step definition
*/
export interface FunnelStep {
  name: string;
  eventName: string;
  filters?: MetricFilter[];
}

/**
 * Cohort table configuration
*/
export interface CohortTableConfig {
  cohortField: string;        // Field to cohort by (usually registration date)
  periodField: string;        // Field to measure periods (usually last activity)
  valueField: string;         // Field to measure (retention, revenue, etc.)
  periods: number;            // Number of periods to show
  periodType: 'day' | 'week' | 'month';
  format: 'percentage' | 'absolute';
}

/**
 * Global dashboard filter
*/
export interface GlobalFilter {
  filterId: string;
  name: string;
  field: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'text';
  options?: FilterOption[];
  defaultValue?: any;
  required: boolean;
  appliesTo: string[];        // Widget IDs this filter applies to
}

/**
 * Filter option
*/
export interface FilterOption {
  value: any;
  label: string;
}

/**
 * Widget filter
*/
export interface WidgetFilter {
  field: string;
  operator: string;
  value: any;
  enabled: boolean;
}

/**
 * Drill-down configuration
*/
export interface DrillDownConfig {
  enabled: boolean;
  levels: DrillDownLevel[];
}

/**
 * Drill-down level
*/
export interface DrillDownLevel {
  field: string;
  title: string;
  filters?: MetricFilter[];
}

/**
 * Click action configuration
*/
export interface ClickAction {
  type: 'filter' | 'navigate' | 'modal' | 'export';
  config: Record<string, any>;
}

/**
 * Analytics query interface
*/
export interface AnalyticsQuery {
  // Data source
  from: string;
  
  // Fields to select
  select: QueryField[];
  
  // Filters
  where?: QueryCondition[];
  
  // Grouping
  groupBy?: string[];
  
  // Ordering
  orderBy?: QueryOrderBy[];
  
  // Limits
  limit?: number;
  offset?: number;
  
  // Time range
  timeRange?: TimeRange;
  
  // Joins
  joins?: QueryJoin[];
  
  // Subqueries
  subQueries?: Record<string, AnalyticsQuery>;
}

/**
 * Query field specification
*/
export interface QueryField {
  field: string;
  alias?: string;
  aggregation?: MetricCalculation;
  format?: string;
}

/**
 * Query condition
*/
export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'and' | 'or';
}

/**
 * Query ordering
*/
export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Query join
*/
export interface QueryJoin {
  table: string;
  type: 'inner' | 'left' | 'right' | 'full';
  on: QueryCondition[];
}

/**
 * Time range specification
*/
export interface TimeRange {
  type: 'relative' | 'absolute' | 'custom';
  
  // Relative time range
  relative?: {
    period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
    count: number;
    offset?: number;           // Offset from current time
  };
  
  // Absolute time range
  absolute?: {
    start: number;             // Unix timestamp
    end: number;               // Unix timestamp
  };
  
  // Custom time range (for comparisons)
  custom?: {
    periods: TimeRange[];
    comparison?: 'previous_period' | 'same_period_last_year';
  };
}

/**
 * Report definition
*/
export interface Report {
  reportId: string;
  name: string;
  description: string;
  category: 'executive' | 'operational' | 'financial' | 'marketing' | 'product';
  
  // Report configuration
  config: ReportConfig;
  
  // Scheduling
  schedule?: ReportSchedule;
  
  // Distribution
  distribution: ReportDistribution;
  
  // Access control
  visibility: 'private' | 'team' | 'organization';
  permissions: ReportPermissions;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastGenerated?: number;
  generationCount: number;
}

/**
 * Report configuration
*/
export interface ReportConfig {
  // Data sources
  dataSources: string[];
  
  // Sections
  sections: ReportSection[];
  
  // Filters
  filters: ReportFilter[];
  
  // Time range
  timeRange: TimeRange;
  
  // Format settings
  format: ReportFormat;
  
  // Template
  template?: string;
  
  // Branding
  branding: {
    logo?: string;
    colors: string[];
    font: string;
  };
}

/**
 * Report section
*/
export interface ReportSection {
  sectionId: string;
  title: string;
  type: 'text' | 'chart' | 'table' | 'metrics' | 'image';
  content: ReportSectionContent;
  order: number;
}

/**
 * Report section content
*/
export interface ReportSectionContent {
  // Text content
  text?: {
    content: string;
    format: 'plain' | 'markdown' | 'html';
  };
  
  // Chart content
  chart?: {
    widgetId: string;
    title?: string;
    width?: number;
    height?: number;
  };
  
  // Table content
  table?: {
    query: AnalyticsQuery;
    columns: TableColumn[];
    maxRows?: number;
  };
  
  // Metrics content
  metrics?: {
    metricIds: string[];
    layout: 'grid' | 'list';
  };
  
  // Image content
  image?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

/**
 * Report filter
*/
export interface ReportFilter {
  field: string;
  operator: string;
  value: any;
  appliesTo: string[];        // Section IDs this filter applies to
}

/**
 * Report schedule
*/
export interface ReportSchedule {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time?: string;              // Time of day (HH:mm format)
  dayOfWeek?: number;         // For weekly reports (0=Sunday)
  dayOfMonth?: number;        // For monthly reports
  timezone: string;
  
  // Advanced scheduling
  cron?: string;              // Cron expression for complex schedules
  
  // Conditional generation
  conditions?: ReportCondition[];
}

/**
 * Report condition
*/
export interface ReportCondition {
  field: string;
  operator: AlertCondition;
  value: any;
  action: 'generate' | 'skip' | 'alert';
}

/**
 * Report distribution
*/
export interface ReportDistribution {
  // Email distribution
  email: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    body?: string;
    attachFormat?: ReportFormat;
  };
  
  // Slack distribution
  slack?: {
    enabled: boolean;
    webhook: string;
    channel: string;
    message?: string;
  };
  
  // Storage
  storage: {
    enabled: boolean;
    location: string;           // File path or cloud storage URL
    retention: number;          // Days to retain
  };
  
  // API callbacks
  webhooks?: {
    url: string;
    headers?: Record<string, string>;
    includeData: boolean;
  }[];
}

/**
 * Report permissions
*/
export interface ReportPermissions {
  canView: string[];
  canEdit: string[];
  canSchedule: string[];
  canDistribute: string[];
}

/**
 * Alert configuration
*/
export interface Alert {
  alertId: string;
  name: string;
  description: string;
  
  // Trigger configuration
  trigger: AlertTrigger;
  
  // Notification configuration
  notifications: AlertNotification[];
  
  // Status
  status: 'active' | 'inactive' | 'triggered' | 'resolved';
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastTriggered?: number;
  triggerCount: number;
}

/**
 * Alert trigger configuration
*/
export interface AlertTrigger {
  // Metric to monitor
  metricId: string;
  
  // Condition
  condition: AlertCondition;
  value: number;
  
  // Time window
  timeWindow: {
    duration: number;           // Minutes
    aggregation: MetricCalculation;
  };
  
  // Frequency check
  checkFrequency: number;       // Minutes
  
  // Threshold
  threshold?: {
    consecutive: number;        // Consecutive triggers required
    recovery: number;           // Value for recovery notification
  };
}

/**
 * Alert notification configuration
*/
export interface AlertNotification {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  recipients: string[];
  
  // Notification settings
  onTrigger: boolean;
  onResolved: boolean;
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    maxNotifications: number;   // Max notifications per hour
    cooldownPeriod: number;     // Minutes
  };
}

/**
 * Predictive analytics model configuration
*/
export interface PredictiveModel {
  modelId: string;
  name: string;
  type: 'churn_prediction' | 'ltv_prediction' | 'conversion_prediction' | 'demand_forecasting';
  
  // Model configuration
  algorithm: 'logistic_regression' | 'random_forest' | 'neural_network' | 'xgboost' | 'lstm';
  features: ModelFeature[];
  target: string;
  
  // Training configuration
  training: {
    dataSource: string;
    trainTestSplit: number;     // Percentage for training
    crossValidation: boolean;
    validationFolds: number;
  };
  
  // Performance metrics
  performance?: ModelPerformance;
  
  // Deployment
  deployment: {
    status: 'training' | 'deployed' | 'retired';
    endpoint?: string;
    batchPrediction: boolean;
    realTimePrediction: boolean;
  };
  
  // Metadata
  createdAt: number;
  lastTrained: number;
  version: string;
}

/**
 * Model feature definition
*/
export interface ModelFeature {
  name: string;
  type: 'categorical' | 'numerical' | 'boolean' | 'datetime';
  source: string;             // Data source field
  transformation?: 'log' | 'normalize' | 'one_hot' | 'binning';
  importance?: number;        // Feature importance score
}

/**
 * Model performance metrics
*/
export interface ModelPerformance {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  rmse?: number;
  mae?: number;
  
  // Confusion matrix (for classification)
  confusionMatrix?: number[][];
  
  // Feature importance
  featureImportance: Record<string, number>;
  
  // Cross-validation results
  crossValidation?: {
    meanScore: number;
    stdScore: number;
    scores: number[];
  };
}

/**
 * Prediction result
*/
export interface PredictionResult {
  modelId: string;
  predictionId: string;
  timestamp: number;
  
  // Input features
  features: Record<string, any>;
  
  // Prediction
  prediction: any;
  confidence?: number;        // Confidence score (0-1)
  probability?: Record<string, number>; // Class probabilities
  
  // Explanation
  explanation?: {
    topFeatures: {
      feature: string;
      contribution: number;
    }[];
    shap_values?: number[];
  };
}