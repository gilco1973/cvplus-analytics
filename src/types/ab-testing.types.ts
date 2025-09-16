/**
 * CVPlus Analytics - A/B Testing & Experimentation Types
// Comprehensive A/B testing framework with statistical analysis

/**
 * Experiment status enum
  */
export enum ExperimentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

/**
 * Experiment type enum
  */
export enum ExperimentType {
  AB_TEST = 'ab_test',
  MULTIVARIATE = 'multivariate',
  FEATURE_FLAG = 'feature_flag',
  SPLIT_TEST = 'split_test'
}

/**
 * Statistical significance method
  */
export enum StatisticalMethod {
  FREQUENTIST = 'frequentist',
  BAYESIAN = 'bayesian',
  SEQUENTIAL = 'sequential'
}

/**
 * Metric type for experiment goals
  */
export enum MetricType {
  CONVERSION = 'conversion',
  REVENUE = 'revenue',
  COUNT = 'count',
  DURATION = 'duration',
  ENGAGEMENT = 'engagement'
}

/**
 * Traffic allocation strategy
  */
export enum TrafficAllocation {
  RANDOM = 'random',
  WEIGHTED = 'weighted',
  SEGMENT_BASED = 'segment_based',
  GRADUAL_ROLLOUT = 'gradual_rollout'
}

/**
 * Experiment variant configuration
  */
export interface ExperimentVariant {
  variantId: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficPercentage: number;    // 0-100
  configuration: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Experiment goal/metric definition
  */
export interface ExperimentGoal {
  goalId: string;
  name: string;
  description: string;
  type: MetricType;
  isPrimary: boolean;
  
  // Metric calculation
  eventName?: string;           // For event-based metrics
  property?: string;            // Property to measure
  aggregation: 'sum' | 'count' | 'average' | 'median' | 'unique';
  
  // Success criteria
  successCriteria: {
    direction: 'increase' | 'decrease' | 'no_change';
    minimumDetectableEffect: number;  // Minimum effect size to detect
    practicalSignificance?: number;   // Minimum practical significance
  };
  
  // Statistical configuration
  statistical: {
    significanceLevel: number;    // Alpha (typically 0.05)
    power: number;               // Statistical power (typically 0.8)
    method: StatisticalMethod;
  };
}

/**
 * User segmentation for experiment targeting
  */
export interface ExperimentSegmentation {
  segmentId: string;
  name: string;
  description: string;
  
  // Inclusion criteria
  inclusionCriteria: SegmentCriteria[];
  
  // Exclusion criteria
  exclusionCriteria: SegmentCriteria[];
  
  // Estimated audience size
  estimatedSize: number;
  actualSize?: number;
}

/**
 * Segment criteria for user targeting
  */
export interface SegmentCriteria {
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'and' | 'or';
}

/**
 * Main experiment configuration
  */
export interface Experiment {
  // Basic Information
  experimentId: string;
  name: string;
  description: string;
  hypothesis: string;
  owner: string;
  team?: string;
  
  // Experiment Configuration
  type: ExperimentType;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  goals: ExperimentGoal[];
  
  // Targeting & Segmentation
  segmentation?: ExperimentSegmentation;
  trafficAllocation: TrafficAllocation;
  totalTrafficPercentage: number;  // 0-100, what % of users see the experiment
  
  // Scheduling
  scheduledStartAt?: number;
  actualStartedAt?: number;
  scheduledEndAt?: number;
  actualEndedAt?: number;
  
  // Statistical Configuration
  statisticalConfig: {
    method: StatisticalMethod;
    significanceLevel: number;
    power: number;
    minimumSampleSize: number;
    maximumDuration: number;      // Days
    earlyStoppingEnabled: boolean;
  };
  
  // Quality Assurance
  sampleSizeCalculation: SampleSizeCalculation;
  preTestChecklist: PreTestChecklistItem[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastModifiedBy: string;
  tags: string[];
}

/**
 * Sample size calculation result
  */
export interface SampleSizeCalculation {
  calculationId: string;
  timestamp: number;
  parameters: {
    baselineConversion: number;
    minimumDetectableEffect: number;
    significanceLevel: number;
    power: number;
    variants: number;
  };
  results: {
    sampleSizePerVariant: number;
    totalSampleSize: number;
    estimatedDuration: number;    // Days
    confidence: number;
  };
  assumptions: string[];
}

/**
 * Pre-test checklist item
  */
export interface PreTestChecklistItem {
  itemId: string;
  description: string;
  category: 'technical' | 'business' | 'legal' | 'analytics';
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: number;
  notes?: string;
}

/**
 * Variant assignment for a user
  */
export interface VariantAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: number;
  assignmentMethod: 'hash' | 'random' | 'override';
  
  // Context information
  context: {
    sessionId?: string;
    deviceId?: string;
    ipHash?: string;
    userAgent?: string;
  };
  
  // Metadata
  sticky: boolean;              // Whether assignment persists across sessions
  overridden: boolean;          // Whether assignment was manually overridden
  overrideReason?: string;
}

/**
 * Experiment results and analysis
  */
export interface ExperimentResults {
  experimentId: string;
  generatedAt: number;
  dateRange: {
    start: number;
    end: number;
  };
  
  // Variant performance
  variantResults: VariantResults[];
  
  // Statistical analysis
  statisticalAnalysis: StatisticalAnalysis;
  
  // Recommendations
  recommendations: ExperimentRecommendation[];
  
  // Data quality
  dataQuality: DataQualityMetrics;
}

/**
 * Results for a specific variant
  */
export interface VariantResults {
  variantId: string;
  variantName: string;
  isControl: boolean;
  
  // Participation
  totalUsers: number;
  activeUsers: number;
  participationRate: number;
  
  // Goal performance
  goalResults: GoalResults[];
  
  // Statistical summary
  statisticalSummary: {
    sampleSize: number;
    conversionRate?: number;
    averageValue?: number;
    standardError?: number;
    confidenceInterval?: [number, number];
  };
}

/**
 * Results for a specific goal
  */
export interface GoalResults {
  goalId: string;
  goalName: string;
  isPrimary: boolean;
  
  // Raw metrics
  totalEvents: number;
  uniqueUsers: number;
  conversionRate: number;
  averageValue?: number;
  totalValue?: number;
  
  // Statistical metrics
  standardError: number;
  confidenceInterval: [number, number];
  
  // Comparison to control (if not control variant)
  relativeImprovement?: number;
  absoluteImprovement?: number;
}

/**
 * Statistical analysis results
  */
export interface StatisticalAnalysis {
  method: StatisticalMethod;
  
  // Significance testing
  pValue: number;
  isStatisticallySignificant: boolean;
  confidenceLevel: number;
  
  // Effect size
  effectSize: number;
  practicalSignificance: boolean;
  
  // Bayesian analysis (if applicable)
  bayesianResults?: {
    probabilityToBeatControl: number;
    posteriorDistribution: BayesianDistribution;
    credibleInterval: [number, number];
  };
  
  // Power analysis
  achievedPower: number;
  
  // Multiple testing correction
  multipleTestingCorrection?: {
    method: 'bonferroni' | 'benjamini_hochberg' | 'false_discovery_rate';
    adjustedPValue: number;
    adjustedSignificance: boolean;
  };
}

/**
 * Bayesian distribution parameters
  */
export interface BayesianDistribution {
  distributionType: 'beta' | 'gamma' | 'normal';
  parameters: Record<string, number>;
  samples?: number[];
}

/**
 * Experiment recommendation
  */
export interface ExperimentRecommendation {
  type: 'launch' | 'continue' | 'stop' | 'extend' | 'investigate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string[];
  suggestedAction: string;
  confidence: number;           // 0-1
}

/**
 * Data quality metrics for experiments
  */
export interface DataQualityMetrics {
  // Sample quality
  sampleRatioMismatch: boolean;
  expectedVsActualRatio: Record<string, number>;
  
  // Data completeness
  missingDataPercentage: number;
  incompleteAssignments: number;
  
  // Data consistency
  duplicateAssignments: number;
  inconsistentEvents: number;
  
  // Bias detection
  selectionBias: BiasDetection;
  survivalBias: BiasDetection;
  
  // Quality score
  overallQualityScore: number;  // 0-1
}

/**
 * Bias detection results
  */
export interface BiasDetection {
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: Record<string, any>;
  recommendations: string[];
}

/**
 * Feature flag configuration
  */
export interface FeatureFlag {
  flagId: string;
  name: string;
  description: string;
  key: string;                  // Unique key used in code
  
  // Status and rollout
  status: 'active' | 'inactive' | 'archived';
  rolloutPercentage: number;    // 0-100
  rolloutStrategy: 'percentage' | 'user_list' | 'segment' | 'gradual';
  
  // Targeting
  targeting: {
    segments: string[];
    userIds?: string[];
    rules: FeatureFlagRule[];
  };
  
  // Variations
  variations: FeatureFlagVariation[];
  defaultVariation: string;
  
  // Dependencies
  dependencies: FeatureFlagDependency[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Feature flag variation
  */
export interface FeatureFlagVariation {
  variationId: string;
  name: string;
  value: any;                   // Boolean, string, number, object
  description: string;
  trafficPercentage: number;
}

/**
 * Feature flag targeting rule
  */
export interface FeatureFlagRule {
  ruleId: string;
  description: string;
  conditions: FeatureFlagCondition[];
  variation: string;
  priority: number;
}

/**
 * Feature flag condition
  */
export interface FeatureFlagCondition {
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'matches_regex';
  value: any;
}

/**
 * Feature flag dependency
  */
export interface FeatureFlagDependency {
  dependsOnFlag: string;
  requiredVariation?: string;
  relationship: 'requires' | 'conflicts_with' | 'implies';
}

/**
 * A/B test event for tracking
  */
export interface ABTestEvent {
  eventId: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  experimentId: string;
  variantId: string;
  
  // Event details
  eventType: 'assignment' | 'exposure' | 'conversion' | 'goal_completion';
  eventName?: string;
  properties: Record<string, any>;
  
  // Context
  context: {
    pageUrl?: string;
    referrer?: string;
    deviceType?: string;
    browser?: string;
  };
}

/**
 * Multivariate test configuration
  */
export interface MultivariateTest extends Omit<Experiment, 'type' | 'variants'> {
  type: ExperimentType.MULTIVARIATE;
  factors: MultivariateTestFactor[];
  interactions: boolean;        // Whether to test factor interactions
}

/**
 * Multivariate test factor
  */
export interface MultivariateTestFactor {
  factorId: string;
  name: string;
  description: string;
  levels: MultivariateTestLevel[];
}

/**
 * Multivariate test level (variation within a factor)
  */
export interface MultivariateTestLevel {
  levelId: string;
  name: string;
  value: any;
  trafficPercentage: number;
}

/**
 * Sequential testing configuration for early stopping
  */
export interface SequentialTestConfig {
  enabled: boolean;
  method: 'group_sequential' | 'always_valid_inference' | 'mixture_sequential';
  
  // Spending function configuration
  spendingFunction: {
    alpha: number;              // Error rate spending
    beta: number;               // Power spending
    timing: number[];           // Information fractions for interim looks
  };
  
  // Stopping boundaries
  efficacyBoundary: number[];   // Z-scores for efficacy stopping
  futilityBoundary?: number[];  // Z-scores for futility stopping
  
  // Monitoring schedule
  interimLooks: number[];       // Planned interim analysis times
  minimumSampleSize: number;    // Minimum before first interim look
}

/**
 * Experiment archive record
  */
export interface ExperimentArchive {
  experimentId: string;
  archivedAt: number;
  archivedBy: string;
  reason: 'completed' | 'cancelled' | 'superseded' | 'compliance';
  
  // Preserved experiment data
  experimentSnapshot: Experiment;
  finalResults?: ExperimentResults;
  
  // Archival metadata
  retentionPeriod: number;      // Days to retain archived data
  accessRestrictions: string[];
  complianceNotes?: string;
}