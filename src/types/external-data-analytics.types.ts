/**
 * External Data Analytics Types for CV Processing
 */

export interface ExternalDataSource {
  id: string;
  name: string;
  type: 'api' | 'scraper' | 'database' | 'file';
  endpoint?: string;
  credentials?: ExternalCredentials;
  rateLimit?: RateLimit;
  dataTypes: string[];
}

export interface ExternalCredentials {
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
  oauth?: OAuthCredentials;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit?: number;
}

export interface ExternalDataRequest {
  id: string;
  userId: string;
  source: string;
  query: ExternalDataQuery;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cached';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: RequestMetadata;
}

export interface ExternalDataQuery {
  type: 'job_market' | 'salary_data' | 'skills_demand' | 'industry_trends' | 'company_info' | 'certification_value';
  parameters: QueryParameters;
  filters?: QueryFilters;
  options?: QueryOptions;
}

export interface QueryParameters {
  keywords?: string[];
  location?: Location;
  industry?: string;
  jobTitle?: string;
  experience?: ExperienceLevel;
  skills?: string[];
  salary?: SalaryRange;
  company?: string;
  dateRange?: DateRange;
}

export interface Location {
  country: string;
  state?: string;
  city?: string;
  remote?: boolean;
  coordinates?: Coordinates;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface ExperienceLevel {
  min?: number;
  max?: number;
  level?: 'entry' | 'mid' | 'senior' | 'executive';
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'yearly';
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface QueryFilters {
  includeRemote?: boolean;
  companySize?: CompanySize[];
  workType?: WorkType[];
  benefits?: string[];
  excludeKeywords?: string[];
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeAnalytics?: boolean;
  cacheResult?: boolean;
  cacheDuration?: number;
}

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
export type WorkType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';

export interface RequestMetadata {
  source: string;
  version: string;
  cost?: number;
  cached?: boolean;
  cacheExpiry?: Date;
  processingTime?: number;
}

export interface ExternalDataResponse {
  id: string;
  requestId: string;
  source: string;
  data: ExternalData;
  analytics?: ExternalDataAnalytics;
  metadata: ResponseMetadata;
  status: 'success' | 'partial' | 'error';
  errors?: ResponseError[];
}

export interface ExternalData {
  jobMarket?: JobMarketData;
  salaryData?: SalaryData;
  skillsDemand?: SkillsDemandData;
  industryTrends?: IndustryTrendsData;
  companyInfo?: CompanyInfoData;
  certificationValue?: CertificationValueData;
}

export interface JobMarketData {
  totalJobs: number;
  activeJobs: number;
  jobGrowth: number;
  competitionLevel: number;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  topEmployers: Employer[];
  jobDistribution: JobDistribution;
  requirementTrends: RequirementTrend[];
}

export interface Employer {
  name: string;
  jobCount: number;
  avgSalary?: number;
  rating?: number;
  benefits?: string[];
  locations?: Location[];
}

export interface JobDistribution {
  byLocation: LocationDistribution[];
  byLevel: LevelDistribution[];
  byIndustry: IndustryDistribution[];
  byCompanySize: CompanySizeDistribution[];
}

export interface LocationDistribution {
  location: string;
  jobCount: number;
  percentage: number;
  avgSalary?: number;
}

export interface LevelDistribution {
  level: string;
  jobCount: number;
  percentage: number;
  avgSalary?: number;
}

export interface IndustryDistribution {
  industry: string;
  jobCount: number;
  percentage: number;
  avgSalary?: number;
}

export interface CompanySizeDistribution {
  size: CompanySize;
  jobCount: number;
  percentage: number;
  avgSalary?: number;
}

export interface RequirementTrend {
  requirement: string;
  frequency: number;
  trend: 'rising' | 'stable' | 'declining';
  importance: number;
  salaryImpact?: number;
}

export interface SalaryData {
  averageSalary: number;
  medianSalary: number;
  salaryRange: SalaryRange;
  percentiles: SalaryPercentiles;
  trend: SalaryTrend;
  factors: SalaryFactor[];
  benchmarks: SalaryBenchmark[];
}

export interface SalaryPercentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SalaryTrend {
  direction: 'increasing' | 'stable' | 'decreasing';
  rate: number;
  confidence: number;
  factors: string[];
}

export interface SalaryFactor {
  factor: string;
  impact: number;
  description: string;
  examples?: string[];
}

export interface SalaryBenchmark {
  company: string;
  role: string;
  salary: number;
  benefits?: BenefitValue[];
  totalComp?: number;
}

export interface BenefitValue {
  benefit: string;
  value: number;
  description?: string;
}

export interface SkillsDemandData {
  topSkills: SkillDemand[];
  emergingSkills: SkillDemand[];
  decliningSkills: SkillDemand[];
  skillCombinations: SkillCombination[];
  certificationImpact: CertificationImpact[];
}

export interface SkillDemand {
  skill: string;
  demand: number;
  growth: number;
  salaryPremium: number;
  jobCount: number;
  competitionLevel: number;
  learningPath?: LearningResource[];
}

export interface SkillCombination {
  skills: string[];
  frequency: number;
  salaryBoost: number;
  jobCount: number;
  description?: string;
}

export interface CertificationImpact {
  certification: string;
  salaryIncrease: number;
  hirabilityBoost: number;
  roi: number;
  timeToComplete?: number;
  cost?: number;
}

export interface LearningResource {
  name: string;
  type: 'course' | 'certification' | 'bootcamp' | 'degree';
  provider: string;
  duration: number;
  cost?: number;
  rating?: number;
}

export interface IndustryTrendsData {
  growthRate: number;
  employmentTrend: 'growing' | 'stable' | 'declining';
  innovations: InnovationTrend[];
  disruptionFactors: DisruptionFactor[];
  futureOutlook: FutureOutlook;
  keyPlayers: KeyPlayer[];
}

export interface InnovationTrend {
  innovation: string;
  impact: number;
  timeline: string;
  description: string;
  skillsNeeded?: string[];
}

export interface DisruptionFactor {
  factor: string;
  probability: number;
  impact: number;
  timeline: string;
  mitigation?: string[];
}

export interface FutureOutlook {
  timeframe: string;
  prediction: string;
  confidence: number;
  keyFactors: string[];
  opportunities: string[];
  risks: string[];
}

export interface KeyPlayer {
  name: string;
  marketShare?: number;
  influence: number;
  innovations?: string[];
  hiring?: boolean;
}

export interface CompanyInfoData {
  basicInfo: CompanyBasicInfo;
  culture: CompanyCulture;
  benefits: CompanyBenefits;
  hiring: HiringInfo;
  growth: CompanyGrowth;
  reviews: CompanyReviews;
}

export interface CompanyBasicInfo {
  name: string;
  industry: string;
  size: CompanySize;
  founded?: number;
  headquarters?: Location;
  website?: string;
  description?: string;
}

export interface CompanyCulture {
  values: string[];
  workEnvironment: string;
  diversityScore?: number;
  workLifeBalance?: number;
  innovationLevel?: number;
}

export interface CompanyBenefits {
  healthcare: boolean;
  retirement: boolean;
  paidTimeOff?: number;
  remote: boolean;
  flexible: boolean;
  learning?: boolean;
  perks?: string[];
}

export interface HiringInfo {
  activeJobs: number;
  hiringRate: number;
  avgTimeToHire?: number;
  interviewProcess?: InterviewStage[];
  requirements?: string[];
}

export interface InterviewStage {
  stage: string;
  duration?: number;
  format: string;
  focus?: string[];
}

export interface CompanyGrowth {
  revenue?: RevenueInfo;
  employeeGrowth: number;
  funding?: FundingInfo;
  expansion?: ExpansionInfo[];
}

export interface RevenueInfo {
  amount?: number;
  growth?: number;
  public: boolean;
}

export interface FundingInfo {
  totalFunding?: number;
  lastRound?: FundingRound;
  investors?: string[];
}

export interface FundingRound {
  type: string;
  amount: number;
  date: Date;
  investors?: string[];
}

export interface ExpansionInfo {
  type: 'geographic' | 'product' | 'market';
  details: string;
  timeline?: string;
}

export interface CompanyReviews {
  overallRating: number;
  reviewCount: number;
  categories: ReviewCategory[];
  pros: string[];
  cons: string[];
  ceoRating?: number;
}

export interface ReviewCategory {
  category: string;
  rating: number;
  trend?: 'improving' | 'stable' | 'declining';
}

export interface CertificationValueData {
  certifications: CertificationInfo[];
  industryRecognition: IndustryRecognition[];
  roi: ROIAnalysis[];
  alternatives: Alternative[];
}

export interface CertificationInfo {
  name: string;
  provider: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number;
  cost: number;
  passRate?: number;
  renewalRequired?: boolean;
  renewalPeriod?: number;
}

export interface IndustryRecognition {
  industry: string;
  recognition: 'high' | 'medium' | 'low';
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  salaryImpact: number;
}

export interface ROIAnalysis {
  timeframe: number;
  salaryIncrease: number;
  jobOpportunities: number;
  careerAdvancement: number;
  overallROI: number;
}

export interface Alternative {
  name: string;
  type: 'certification' | 'degree' | 'experience' | 'course';
  comparison: string;
  pros: string[];
  cons: string[];
}

export interface ExternalDataAnalytics {
  confidence: number;
  freshness: number;
  coverage: number;
  sources: SourceAnalytics[];
  reliability: ReliabilityMetrics;
  insights: AnalyticalInsight[];
}

export interface SourceAnalytics {
  source: string;
  contribution: number;
  quality: number;
  lastUpdated: Date;
  coverage: number;
}

export interface ReliabilityMetrics {
  dataQuality: number;
  completeness: number;
  consistency: number;
  timeliness: number;
  accuracy?: number;
}

export interface AnalyticalInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction';
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
}

export interface ResponseMetadata {
  retrievedAt: Date;
  processingTime: number;
  dataSize: number;
  sources: string[];
  cached: boolean;
  cacheExpiry?: Date;
  cost?: number;
  quotaUsed?: QuotaUsage;
}

export interface QuotaUsage {
  source: string;
  used: number;
  limit: number;
  resetTime?: Date;
}

export interface ResponseError {
  code: string;
  message: string;
  source?: string;
  details?: any;
  recoverable: boolean;
  retryAfter?: number;
}

export interface ExternalDataUsageEvent {
  id: string;
  userId: string;
  cvId?: string;
  timestamp: Date;
  dataSource: string;
  requestType: string;
  cost?: number;
  success: boolean;
  errorMessage?: string;
  dataReturned: number;
  processingTime: number;
}