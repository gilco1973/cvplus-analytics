/**
 * Analytics Types
 * 
 * Types for business analytics, reporting, and insights in the admin dashboard.
 */

import type { TrendData } from './dashboard.types';

// ============================================================================
// Business Analytics Overview
// ============================================================================

export interface BusinessAnalytics {
  timeRange: AnalyticsTimeRange;
  overview: BusinessOverview;
  revenue: RevenueAnalytics;
  users: UserAnalytics;
  content: ContentAnalytics;
  performance: BehaviorAnalytics;
  conversion: EngagementAnalytics;
  retention: UserAnalytics;
  segmentation: BehaviorAnalytics;
  predictions: PredictiveAnalytics;
  insights: BusinessInsight[];
  kpis: KPIMetrics;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  preset: TimeRangePreset;
  comparison?: ComparisonPeriod;
}

export enum TimeRangePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  MONTH_TO_DATE = 'month_to_date',
  QUARTER_TO_DATE = 'quarter_to_date',
  YEAR_TO_DATE = 'year_to_date',
  CUSTOM = 'custom'
}

export interface ComparisonPeriod {
  start: Date;
  end: Date;
  type: ComparisonType;
}

export enum ComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  CUSTOM = 'custom'
}

// ============================================================================
// Business Overview
// ============================================================================

export interface BusinessOverview {
  totalRevenue: MetricValue;
  totalUsers: MetricValue;
  activeUsers: MetricValue;
  newUsers: MetricValue;
  conversionRate: MetricValue;
  churnRate: MetricValue;
  customerLifetimeValue: MetricValue;
  averageRevenuePerUser: MetricValue;
  monthlyRecurringRevenue: MetricValue;
  growthRate: MetricValue;
}

export interface MetricValue {
  current: number;
  previous?: number;
  change: MetricChange;
  trend: TrendData;
  target?: number;
  status: MetricStatus;
}

export interface MetricChange {
  absolute: number;
  percentage: number;
  direction: ChangeDirection;
}

export enum ChangeDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable'
}

export enum MetricStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  BELOW_TARGET = 'below_target',
  CONCERNING = 'concerning'
}

// ============================================================================
// Revenue Analytics
// ============================================================================

export interface RevenueAnalytics {
  overview: RevenueOverview;
  streams: RevenueStream[];
  forecasting: RevenueForecast;
  cohorts: RevenueCohortAnalysis;
  geography: GeographicRevenueAnalysis;
  trends: RevenueTrends;
  optimization: RevenueOptimization;
}

export interface RevenueOverview {
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
  refundedRevenue: number;
  netRevenue: number;
  grossMargin: number;
  revenueGrowthRate: number;
  averageOrderValue: number;
}

export interface RevenueStream {
  id: string;
  name: string;
  type: RevenueType;
  revenue: number;
  percentage: number;
  growth: number;
  customers: number;
  averageValue: number;
}

export enum RevenueType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  USAGE_BASED = 'usage_based',
  COMMISSION = 'commission',
  ADVERTISING = 'advertising'
}

export interface RevenueForecast {
  nextMonth: ForecastValue;
  nextQuarter: ForecastValue;
  nextYear: ForecastValue;
  methodology: ForecastMethodology;
  scenarios: ForecastScenario[];
}

export interface ForecastValue {
  predicted: number;
  confidence: number;
  range: {
    min: number;
    max: number;
  };
}

export interface ForecastMethodology {
  model: ForecastModel;
  accuracy: number;
  lastUpdated: Date;
  dataPoints: number;
}

export enum ForecastModel {
  LINEAR_REGRESSION = 'linear_regression',
  ARIMA = 'arima',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  MACHINE_LEARNING = 'machine_learning'
}

export interface ForecastScenario {
  name: string;
  probability: number;
  revenue: number;
  assumptions: string[];
}

export interface RevenueCohortAnalysis {
  cohorts: RevenueCohort[];
  averageLifetimeValue: number;
  paybackPeriod: number;
  retentionCurve: RetentionCurvePoint[];
}

export interface RevenueCohort {
  cohortDate: Date;
  size: number;
  totalRevenue: number;
  lifetimeValue: number;
  retentionMonths: MonthlyRetention[];
}

export interface MonthlyRetention {
  month: number;
  customers: number;
  revenue: number;
  retentionRate: number;
}

export interface RetentionCurvePoint {
  period: number;
  retentionRate: number;
  revenue: number;
}

export interface GeographicRevenueAnalysis {
  countries: CountryRevenue[];
  regions: RegionRevenue[];
  currencies: CurrencyBreakdown[];
  exchangeRateImpact: number;
}

export interface CountryRevenue {
  countryCode: string;
  countryName: string;
  revenue: number;
  percentage: number;
  customers: number;
  averageRevenuePerUser: number;
  growth: number;
}

export interface RegionRevenue {
  region: string;
  revenue: number;
  percentage: number;
  customers: number;
  growth: number;
}

export interface CurrencyBreakdown {
  currency: string;
  revenue: number;
  percentage: number;
  exchangeRate: number;
  volatility: number;
}

export interface RevenueTrends {
  daily: TrendDataPoint[];
  weekly: TrendDataPoint[];
  monthly: TrendDataPoint[];
  seasonal: SeasonalPattern[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface SeasonalPattern {
  pattern: string;
  strength: number;
  periods: SeasonalPeriod[];
}

export interface SeasonalPeriod {
  period: string;
  multiplier: number;
  confidence: number;
}

export interface RevenueOptimization {
  opportunities: OptimizationOpportunity[];
  experiments: RevenueExperiment[];
  recommendations: RevenueRecommendation[];
}

export interface OptimizationOpportunity {
  id: string;
  area: OptimizationArea;
  description: string;
  potentialImpact: number;
  effort: EffortLevel;
  priority: Priority;
}

export enum OptimizationArea {
  PRICING = 'pricing',
  CONVERSION = 'conversion',
  RETENTION = 'retention',
  UPSELLING = 'upselling',
  COST_REDUCTION = 'cost_reduction'
}

export enum EffortLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RevenueExperiment {
  id: string;
  name: string;
  status: ExperimentStatus;
  hypothesis: string;
  startDate: Date;
  endDate?: Date;
  results?: ExperimentResults;
}

export enum ExperimentStatus {
  PLANNING = 'planning',
  RUNNING = 'running',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface ExperimentResults {
  conversionLift: number;
  revenueLift: number;
  confidence: number;
  significance: boolean;
}

export interface RevenueRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  impact: ImpactEstimate;
  actionItems: string[];
}

export enum RecommendationType {
  PRICING_OPTIMIZATION = 'pricing_optimization',
  FEATURE_BUNDLING = 'feature_bundling',
  CUSTOMER_SEGMENTATION = 'customer_segmentation',
  RETENTION_IMPROVEMENT = 'retention_improvement',
  CONVERSION_OPTIMIZATION = 'conversion_optimization'
}

export interface ImpactEstimate {
  revenueIncrease: number;
  confidence: number;
  timeframe: string;
}

// ============================================================================
// User Analytics
// ============================================================================

export interface UserAnalytics {
  overview: UserOverview;
  acquisition: AcquisitionAnalytics;
  engagement: EngagementAnalytics;
  behavior: BehaviorAnalytics;
  segmentation: BehaviorAnalytics;
  journey: EngagementAnalytics;
  churn: BehaviorAnalytics;
}

export interface UserOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  userGrowthRate: number;
  activationRate: number;
  engagementScore: number;
}

export interface AcquisitionAnalytics {
  channels: AcquisitionChannel[];
  campaigns: CampaignPerformance[];
  costs: AcquisitionCosts;
  funnel: AcquisitionFunnel[];
}

export interface AcquisitionChannel {
  channel: string;
  users: number;
  cost: number;
  costPerAcquisition: number;
  conversionRate: number;
  quality: ChannelQuality;
}

export interface ChannelQuality {
  lifetimeValue: number;
  retentionRate: number;
  engagementScore: number;
  qualityScore: number;
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  channel: string;
  users: number;
  cost: number;
  roi: number;
  conversionRate: number;
}

export interface AcquisitionCosts {
  totalSpend: number;
  costPerAcquisition: number;
  costPerClick: number;
  costPerImpression: number;
  returnOnAdSpend: number;
}

export interface AcquisitionFunnel {
  stage: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface EngagementAnalytics {
  overview: EngagementOverview;
  features: FeatureEngagement[];
  time: TimeBasedEngagement;
  depth: EngagementDepth;
}

export interface EngagementOverview {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  sessionsPerUser: number;
  bounceRate: number;
}

export interface FeatureEngagement {
  feature: string;
  users: number;
  sessions: number;
  timeSpent: number;
  conversionImpact: number;
  retentionImpact: number;
}

export interface TimeBasedEngagement {
  hourly: HourlyEngagement[];
  daily: DailyEngagement[];
  monthly: MonthlyEngagement[];
}

export interface HourlyEngagement {
  hour: number;
  users: number;
  sessions: number;
  duration: number;
}

export interface DailyEngagement {
  day: string;
  users: number;
  sessions: number;
  duration: number;
}

export interface MonthlyEngagement {
  month: Date;
  users: number;
  sessions: number;
  duration: number;
}

export interface EngagementDepth {
  lowEngagement: number;
  mediumEngagement: number;
  highEngagement: number;
  powerUsers: number;
}

export interface BehaviorAnalytics {
  flows: UserFlow[];
  paths: UserPath[];
  events: EventAnalytics[];
  heatmaps: HeatmapData[];
}

export interface UserFlow {
  flowId: string;
  name: string;
  steps: FlowStep[];
  completionRate: number;
  dropOffPoints: DropOffPoint[];
}

export interface FlowStep {
  step: string;
  users: number;
  conversionRate: number;
  averageTime: number;
}

export interface DropOffPoint {
  step: string;
  dropOffRate: number;
  reasons: string[];
}

export interface UserPath {
  pathId: string;
  sequence: string[];
  users: number;
  frequency: number;
  outcome: PathOutcome;
}

export enum PathOutcome {
  CONVERSION = 'conversion',
  BOUNCE = 'bounce',
  INCOMPLETE = 'incomplete',
  ERROR = 'error'
}

export interface EventAnalytics {
  event: string;
  count: number;
  uniqueUsers: number;
  frequency: number;
  conversionImpact: number;
}

export interface HeatmapData {
  page: string;
  interactions: InteractionPoint[];
  scrollDepth: ScrollData;
  clickDensity: ClickDensityMap;
}

export interface InteractionPoint {
  x: number;
  y: number;
  clicks: number;
  dwellTime: number;
}

export interface ScrollData {
  averageDepth: number;
  exitPoints: number[];
  engagementZones: EngagementZone[];
}

export interface EngagementZone {
  start: number;
  end: number;
  engagement: number;
}

export interface ClickDensityMap {
  regions: ClickRegion[];
  totalClicks: number;
  uniqueUsers: number;
}

export interface ClickRegion {
  element: string;
  clicks: number;
  conversionRate: number;
}

// ============================================================================
// Content Analytics
// ============================================================================

export interface ContentAnalytics {
  overview: ContentOverview;
  performance: ContentPerformance;
  quality: ContentQuality;
  trends: ContentTrends;
  optimization: ContentOptimization;
}

export interface ContentOverview {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  archivedContent: number;
  averageQualityScore: number;
  contentGrowthRate: number;
}

export interface ContentPerformance {
  topContent: ContentItem[];
  categories: CategoryPerformance[];
  templates: TemplateUsage[];
  engagement: ContentEngagement;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  views: number;
  engagement: number;
  conversions: number;
  qualityScore: number;
}

export enum ContentType {
  CV = 'cv',
  PORTFOLIO = 'portfolio',
  BLOG_POST = 'blog_post',
  TUTORIAL = 'tutorial',
  TEMPLATE = 'template'
}

export interface CategoryPerformance {
  category: string;
  contentCount: number;
  views: number;
  engagement: number;
  conversionRate: number;
}

export interface TemplateUsage {
  templateId: string;
  name: string;
  usage: number;
  rating: number;
  conversionRate: number;
}

export interface ContentEngagement {
  averageTimeOnContent: number;
  shareRate: number;
  bookmarkRate: number;
  completionRate: number;
}

export interface ContentQuality {
  averageScore: number;
  scoreDistribution: QualityDistribution[];
  factors: QualityFactor[];
  improvements: QualityImprovement[];
}

export interface QualityDistribution {
  scoreRange: string;
  count: number;
  percentage: number;
}

export interface QualityFactor {
  factor: string;
  impact: number;
  averageScore: number;
}

export interface QualityImprovement {
  area: string;
  currentScore: number;
  potentialImprovement: number;
  actionItems: string[];
}

export interface ContentTrends {
  popularTopics: Topic[];
  emergingTrends: Trend[];
  seasonalPatterns: ContentSeasonality[];
}

export interface Topic {
  topic: string;
  mentions: number;
  growth: number;
  sentiment: number;
}

export interface Trend {
  trend: string;
  momentum: number;
  predictedPeak: Date;
  confidence: number;
}

export interface ContentSeasonality {
  pattern: string;
  strength: number;
  peakPeriods: string[];
}

export interface ContentOptimization {
  recommendations: ContentRecommendation[];
  opportunities: OptimizationOpportunity[];
  experiments: ContentExperiment[];
}

export interface ContentRecommendation {
  id: string;
  type: ContentRecommendationType;
  title: string;
  description: string;
  impact: ImpactEstimate;
}

export enum ContentRecommendationType {
  TOPIC_OPTIMIZATION = 'topic_optimization',
  FORMAT_OPTIMIZATION = 'format_optimization',
  DISTRIBUTION_OPTIMIZATION = 'distribution_optimization',
  QUALITY_IMPROVEMENT = 'quality_improvement'
}

export interface ContentExperiment {
  id: string;
  type: ExperimentType;
  hypothesis: string;
  status: ExperimentStatus;
  results?: ContentExperimentResults;
}

export enum ExperimentType {
  HEADLINE_TEST = 'headline_test',
  FORMAT_TEST = 'format_test',
  TIMING_TEST = 'timing_test',
  DISTRIBUTION_TEST = 'distribution_test'
}

export interface ContentExperimentResults {
  engagementLift: number;
  conversionLift: number;
  qualityScoreChange: number;
  significance: boolean;
}

// ============================================================================
// KPI & Reporting
// ============================================================================

export interface KPIMetrics {
  financial: FinancialKPIs;
  growth: GrowthKPIs;
  product: ProductKPIs;
  customer: CustomerKPIs;
  operational: OperationalKPIs;
}

export interface FinancialKPIs {
  monthlyRecurringRevenue: KPIMetric;
  annualRecurringRevenue: KPIMetric;
  grossMargin: KPIMetric;
  customerLifetimeValue: KPIMetric;
  customerAcquisitionCost: KPIMetric;
  burnRate: KPIMetric;
}

export interface GrowthKPIs {
  userGrowthRate: KPIMetric;
  revenueGrowthRate: KPIMetric;
  marketShare: KPIMetric;
  viralCoefficient: KPIMetric;
  organicGrowth: KPIMetric;
}

export interface ProductKPIs {
  dailyActiveUsers: KPIMetric;
  featureAdoption: KPIMetric;
  timeToValue: KPIMetric;
  productMarketFit: KPIMetric;
  netPromoterScore: KPIMetric;
}

export interface CustomerKPIs {
  churnRate: KPIMetric;
  retentionRate: KPIMetric;
  customerSatisfaction: KPIMetric;
  supportTicketVolume: KPIMetric;
  firstResponseTime: KPIMetric;
}

export interface OperationalKPIs {
  systemUptime: KPIMetric;
  errorRate: KPIMetric;
  responseTime: KPIMetric;
  deploymentFrequency: KPIMetric;
  leadTime: KPIMetric;
}

export interface KPIMetric {
  current: number;
  target: number;
  previous: number;
  change: MetricChange;
  status: MetricStatus;
  unit: string;
  format: MetricFormat;
}

export enum MetricFormat {
  NUMBER = 'number',
  PERCENTAGE = 'percentage',
  CURRENCY = 'currency',
  DURATION = 'duration',
  RATE = 'rate'
}

// ============================================================================
// Advanced Analytics
// ============================================================================

export interface PredictiveAnalytics {
  churnPrediction: ChurnPrediction;
  lifetimeValuePrediction: LTVPrediction;
  demandForecasting: DemandForecast;
  trendsAnalysis: TrendsAnalysis;
}

export interface ChurnPrediction {
  overview: ChurnOverview;
  riskSegments: ChurnRiskSegment[];
  factors: ChurnFactor[];
  interventions: ChurnIntervention[];
}

export interface ChurnOverview {
  predictedChurnRate: number;
  confidence: number;
  timeline: string;
  atRiskCustomers: number;
}

export interface ChurnRiskSegment {
  segment: string;
  customers: number;
  riskScore: number;
  factors: string[];
}

export interface ChurnFactor {
  factor: string;
  importance: number;
  impact: number;
  actionable: boolean;
}

export interface ChurnIntervention {
  intervention: string;
  effectiveness: number;
  cost: number;
  applicableSegments: string[];
}

export interface LTVPrediction {
  averageLTV: number;
  ltvDistribution: LTVDistribution[];
  factors: LTVFactor[];
  segments: LTVSegment[];
}

export interface LTVDistribution {
  range: string;
  customers: number;
  percentage: number;
}

export interface LTVFactor {
  factor: string;
  correlation: number;
  importance: number;
}

export interface LTVSegment {
  segment: string;
  customers: number;
  averageLTV: number;
  potential: number;
}

export interface DemandForecast {
  forecast: ForecastPoint[];
  confidence: number;
  methodology: string;
  assumptions: string[];
}

export interface ForecastPoint {
  date: Date;
  predicted: number;
  upper: number;
  lower: number;
}

export interface TrendsAnalysis {
  emergingTrends: EmergingTrend[];
  decliningTrends: DecliningTrend[];
  stableTrends: StableTrend[];
}

export interface EmergingTrend {
  trend: string;
  growth: number;
  momentum: number;
  opportunity: number;
}

export interface DecliningTrend {
  trend: string;
  decline: number;
  reasons: string[];
  alternatives: string[];
}

export interface StableTrend {
  trend: string;
  stability: number;
  duration: number;
  reliability: number;
}

export interface BusinessInsight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number;
  actionItems: ActionItem[];
  priority: Priority;
  generatedAt: Date;
}

export enum InsightType {
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
  ANOMALY = 'anomaly',
  TREND = 'trend',
  OPTIMIZATION = 'optimization'
}

export enum InsightCategory {
  REVENUE = 'revenue',
  USER_BEHAVIOR = 'user_behavior',
  PRODUCT = 'product',
  MARKETING = 'marketing',
  OPERATIONS = 'operations'
}

export enum InsightImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ActionItem {
  id: string;
  description: string;
  effort: EffortLevel;
  impact: ImpactEstimate;
  responsible?: string;
  deadline?: Date;
}

// ============================================================================
// Analytics Configuration
// ============================================================================

export interface AnalyticsConfiguration {
  dataRetention: DataRetentionSettings;
  privacySettings: PrivacySettings;
  reportingSchedule: ReportingSchedule[];
  alerts: AnalyticsAlert[];
  integrations: AnalyticsIntegration[];
}

export interface DataRetentionSettings {
  rawData: number; // days
  aggregatedData: number; // days
  personalData: number; // days
  anonymizedData: number; // days
}

export interface PrivacySettings {
  dataAnonymization: boolean;
  ipMasking: boolean;
  cookieConsent: boolean;
  dataExportEnabled: boolean;
  rightToForgotten: boolean;
}

export interface ReportingSchedule {
  reportId: string;
  name: string;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
  enabled: boolean;
}

export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  EMAIL = 'email'
}

export interface AnalyticsAlert {
  id: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  recipients: string[];
  enabled: boolean;
}

export interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeframe: string;
  frequency: string;
}

export interface AnalyticsIntegration {
  id: string;
  name: string;
  type: IntegrationType;
  configuration: Record<string, any>;
  enabled: boolean;
}

export enum IntegrationType {
  GOOGLE_ANALYTICS = 'google_analytics',
  MIXPANEL = 'mixpanel',
  AMPLITUDE = 'amplitude',
  SEGMENT = 'segment',
  CUSTOM = 'custom'
}