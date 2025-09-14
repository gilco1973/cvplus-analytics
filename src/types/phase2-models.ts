/**
 * Phase 2 ML Models Types
 * 
 * TypeScript type definitions for machine learning models and predictions
 * in the CVPlus analytics platform.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Base ML Types
export interface MLModelMetadata {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
  features: string[];
}

// Feature Vector Types
export interface FeatureVector {
  cvFeatures: CVFeatures;
  matchingFeatures: MatchingFeatures;
  marketFeatures: MarketFeatures;
  behaviorFeatures: BehaviorFeatures;
  derivedFeatures: DerivedFeatures;
}

export interface CVFeatures {
  experienceYears: number;
  educationLevel: number; // 0-5 scale
  skillsCount: number;
  certificationsCount: number;
  languagesCount: number;
  industryExperience: number;
  leadershipExperience: number;
  techStackRelevance: number; // 0-1 scale
  careerProgression: number; // 0-1 scale
  gapInEmployment: number; // months
}

export interface MatchingFeatures {
  skillsMatch: number; // 0-1 percentage
  experienceMatch: number; // 0-1 percentage
  industryMatch: number; // 0-1 percentage
  locationMatch: number; // 0-1 percentage
  salaryExpectationMatch: number; // 0-1 percentage
  overallCompatibility: number; // 0-1 percentage
  roleComplexity: number; // 1-10 scale
  requirementsFit: number; // 0-1 percentage
}

export interface MarketFeatures {
  industryDemand: number; // 0-1 scale
  locationCompetitiveness: number; // 0-1 scale
  salaryBenchmark: number; // actual salary value
  availablePositions: number;
  talentSupply: number; // 0-1 scale (supply vs demand)
  marketGrowthRate: number; // -1 to 1 scale
  seasonalFactor: number; // 0.5-1.5 multiplier
  economicIndicator: number; // 0-1 scale
}

export interface BehaviorFeatures {
  profileCompleteness: number; // 0-1 percentage
  activityLevel: number; // 0-1 scale
  responseTime: number; // hours
  applicationQuality: number; // 0-1 scale
  networkSize: number;
  endorsementCount: number;
  jobSearchDuration: number; // days
  interviewAcceptanceRate: number; // 0-1 percentage
}

export interface DerivedFeatures {
  overallScore: number; // 0-100 composite score
  competitivenessRating: number; // 0-1 scale
  hirabilityIndex: number; // 0-1 scale
  marketValue: number; // salary equivalent
  riskScore: number; // 0-1 scale (higher = more risk)
  confidenceScore: number; // 0-1 scale
  trendingScore: number; // -1 to 1 scale
  uniquenessScore: number; // 0-1 scale
}

// Prediction Result Types
export interface SuccessPrediction {
  userId: string;
  predictionId: string;
  timestamp: Date;
  confidence: number; // 0-1 scale
  
  // Core predictions
  interviewProbability: number; // 0-1 percentage
  offerProbability: number; // 0-1 percentage
  acceptanceProbability: number; // 0-1 percentage
  
  // Detailed predictions
  salaryPrediction: SalaryPrediction;
  timeToHire: TimeToHirePrediction;
  
  // Success factors
  strengthsIdentified: string[];
  improvementAreas: string[];
  riskFactors: string[];
  
  // Market context
  marketPosition: 'top_10' | 'top_25' | 'top_50' | 'average' | 'below_average';
  competitorCount: number;
  marketTrend: 'rising' | 'stable' | 'declining';
}

export interface SalaryPrediction {
  estimatedSalary: number;
  salaryRange: {
    min: number;
    max: number;
    percentile25: number;
    percentile50: number;
    percentile75: number;
  };
  currency: string;
  location: string;
  confidence: number;
  factors: SalaryFactor[];
}

export interface SalaryFactor {
  factor: string;
  impact: number; // positive or negative amount
  weight: number; // 0-1 importance
  explanation: string;
}

export interface TimeToHirePrediction {
  estimatedDays: number;
  range: {
    min: number;
    max: number;
    mostLikely: number;
  };
  confidence: number;
  milestones: HiringMilestone[];
  factors: TimeToHireFactor[];
}

export interface HiringMilestone {
  stage: 'application' | 'screening' | 'interview' | 'decision' | 'offer' | 'acceptance';
  estimatedDays: number;
  probability: number;
  requirements: string[];
}

export interface TimeToHireFactor {
  factor: string;
  impact: number; // days added/subtracted
  weight: number;
  explanation: string;
}

// Recommendation Types
export interface PredictiveRecommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  category: 'skills' | 'experience' | 'profile' | 'strategy' | 'market';
  
  title: string;
  description: string;
  actionItems: ActionItem[];
  
  expectedImpact: {
    interviewIncrease: number; // percentage points
    salaryIncrease: number; // currency amount
    timeReduction: number; // days saved
  };
  
  effort: 'low' | 'medium' | 'high';
  timeline: string; // "1-2 weeks", "1 month", etc.
  
  confidence: number;
  evidenceStrength: number;
}

export interface ActionItem {
  id: string;
  task: string;
  description: string;
  priority: number; // 1-10
  estimatedHours: number;
  resources?: string[];
  prerequisites?: string[];
}

export enum RecommendationType {
  SKILL_ENHANCEMENT = 'skill_enhancement',
  EXPERIENCE_HIGHLIGHTING = 'experience_highlighting',
  PROFILE_OPTIMIZATION = 'profile_optimization',
  STRATEGIC_POSITIONING = 'strategic_positioning',
  MARKET_TIMING = 'market_timing',
  NETWORKING_EXPANSION = 'networking_expansion',
  INTERVIEW_PREPARATION = 'interview_preparation',
  SALARY_NEGOTIATION = 'salary_negotiation'
}

// User Outcome Types
export interface UserOutcome {
  userId: string;
  outcomeId: string;
  timestamp: Date;
  type: OutcomeType;
  
  // Outcome details
  success: boolean;
  stage: HiringStage;
  
  // Job details
  jobTitle?: string;
  company?: string;
  industry?: string;
  location?: string;
  salary?: number;
  
  // Process metrics
  applicationDate: Date;
  firstResponseDate?: Date;
  interviewDates: Date[];
  offerDate?: Date;
  acceptanceDate?: Date;
  
  // Performance metrics
  timeToInterview?: number; // days
  timeToOffer?: number; // days
  timeToHire?: number; // days
  
  // Context
  numberOfApplications: number;
  numberOfInterviews: number;
  competitorCount?: number;
  
  // Prediction accuracy
  predictedOutcome?: SuccessPrediction;
  accuracyScores?: {
    interview: number;
    offer: number;
    salary: number;
    timeline: number;
  };
}

export enum OutcomeType {
  APPLICATION_SUBMITTED = 'application_submitted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER_RECEIVED = 'offer_received',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',
  APPLICATION_REJECTED = 'application_rejected',
  PROCESS_ABANDONED = 'process_abandoned'
}

export enum HiringStage {
  APPLIED = 'applied',
  SCREENING = 'screening',
  PHONE_INTERVIEW = 'phone_interview',
  TECHNICAL_INTERVIEW = 'technical_interview',
  ONSITE_INTERVIEW = 'onsite_interview',
  FINAL_INTERVIEW = 'final_interview',
  OFFER_NEGOTIATION = 'offer_negotiation',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

// ML Training and Configuration Types
export interface MLTrainingConfig {
  modelType: 'regression' | 'classification' | 'neural_network' | 'ensemble';
  features: string[];
  target: string;
  
  // Training parameters
  trainingDataSize: number;
  validationSplit: number;
  testSplit: number;
  
  // Model parameters
  hyperparameters: Record<string, any>;
  crossValidationFolds: number;
  
  // Performance criteria
  targetAccuracy: number;
  acceptableLoss: number;
  
  // Training constraints
  maxTrainingTime: number; // minutes
  earlyStoppingPatience: number;
  
  // Data quality
  minDataQuality: number;
  handleMissingData: 'drop' | 'impute' | 'flag';
  
  // Model lifecycle
  retrainingSchedule: string; // cron expression
  performanceThreshold: number; // retrain if accuracy drops below
}

// Utility Types
export type PredictionRequest = {
  userId: string;
  cvData?: any; // CV data structure
  jobDescription?: string;
  targetRole?: string;
  location?: string;
  salaryExpectation?: number;
  preferences?: Record<string, any>;
  context?: Record<string, any>;
};

export type ModelPredictionResult = {
  prediction: SuccessPrediction;
  recommendations: PredictiveRecommendation[];
  confidence: number;
  explanations: string[];
  metadata: Record<string, any>;
};

export type MLPipelineResult = {
  success: boolean;
  prediction?: SuccessPrediction;
  recommendations?: PredictiveRecommendation[];
  error?: string;
  processingTime: number;
  modelVersion: string;
  dataQuality: number;
};