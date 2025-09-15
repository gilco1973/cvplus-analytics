/**
 * External Data Integration Types
 * 
 * Type definitions for the external data integration system
 * that enriches CVs with data from multiple sources
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

// ============================================================================
// DATA SOURCE TYPES
// ============================================================================

export interface ExternalDataSource {
  id: string;
  name: string;
  type: 'github' | 'linkedin' | 'web' | 'website' | 'social';
  priority: number;
  enabled: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface DataSourceCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
}

// ============================================================================
// GITHUB DATA TYPES
// ============================================================================

export interface GitHubProfile {
  username: string;
  name?: string;
  bio?: string;
  location?: string;
  company?: string;
  blog?: string;
  email?: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: string;
  avatarUrl?: string;
}

export interface GitHubRepository {
  name: string;
  description?: string;
  url: string;
  language?: string;
  stars: number;
  forks: number;
  watchers: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  topics?: string[];
}

export interface GitHubStats {
  totalStars: number;
  totalForks: number;
  totalContributions: number;
  languages: Record<string, number>;
  topRepositories: GitHubRepository[];
  contributionStreak: number;
}

// ============================================================================
// LINKEDIN DATA TYPES
// ============================================================================

export interface LinkedInProfile {
  profileUrl?: string;
  headline?: string;
  summary?: string;
  location?: string;
  industry?: string;
  connections?: number;
}

export interface LinkedInExperience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description?: string;
  skills?: string[];
}

export interface LinkedInEducation {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  activities?: string[];
}

export interface LinkedInCertification {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

// ============================================================================
// WEB SEARCH DATA TYPES
// ============================================================================

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore: number;
  publishedDate?: string;
}

export interface WebPresence {
  searchResults: WebSearchResult[];
  publications: WebPublication[];
  speakingEngagements: SpeakingEngagement[];
  awards: Award[];
  mentions: number;
}

export interface WebPublication {
  title: string;
  url?: string;
  publisher?: string;
  date?: string;
  authors?: string[];
  type: 'article' | 'paper' | 'book' | 'blog' | 'other';
}

export interface SpeakingEngagement {
  event: string;
  title?: string;
  date?: string;
  location?: string;
  url?: string;
}

export interface Award {
  title: string;
  organization: string;
  date?: string;
  description?: string;
}

// ============================================================================
// WEBSITE DATA TYPES
// ============================================================================

export interface PersonalWebsite {
  url: string;
  title?: string;
  description?: string;
  lastUpdated?: string;
  portfolioProjects: PortfolioProject[];
  blogPosts: BlogPost[];
  testimonials: Testimonial[];
}

export interface PortfolioProject {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  technologies?: string[];
  role?: string;
  duration?: string;
}

export interface BlogPost {
  title: string;
  url: string;
  excerpt?: string;
  publishedDate?: string;
  tags?: string[];
  readTime?: number;
}

export interface Testimonial {
  author: string;
  role?: string;
  company?: string;
  text: string;
  date?: string;
  rating?: number;
}

// ============================================================================
// AGGREGATED DATA TYPES
// ============================================================================

export interface EnrichedCVData {
  originalCVId: string;
  userId: string;
  fetchedAt: string;
  sources: DataSourceResult[];
  github?: {
    profile: GitHubProfile;
    stats: GitHubStats;
    repositories: GitHubRepository[];
  };
  linkedin?: {
    profile: LinkedInProfile;
    experience: LinkedInExperience[];
    education: LinkedInEducation[];
    certifications: LinkedInCertification[];
    skills: string[];
    endorsements: number;
  };
  webPresence?: WebPresence;
  personalWebsite?: PersonalWebsite;
  aggregatedSkills: string[];
  aggregatedProjects: PortfolioProject[];
  professionalSummary?: string;
  validationStatus: ValidationStatus;
}

export interface DataSourceResult {
  source: string;
  success: boolean;
  fetchedAt: string;
  dataPoints: number;
  error?: string;
}

export interface ValidationStatus {
  isValid: boolean;
  hasPersonalInfo: boolean;
  hasSensitiveData: boolean;
  qualityScore: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheEntry {
  key: string;
  data: any;
  createdAt: string;
  expiresAt: string;
  source: string;
  hits: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Max cache size in MB
  strategy: 'lru' | 'lfu' | 'fifo';
}

// ============================================================================
// ORCHESTRATOR TYPES
// ============================================================================

export interface OrchestrationRequest {
  userId: string;
  cvId: string;
  sources: string[];
  options?: {
    forceRefresh?: boolean;
    timeout?: number;
    priority?: 'high' | 'normal' | 'low';
  };
}

export interface OrchestrationResult {
  requestId: string;
  status: 'success' | 'partial' | 'failed';
  enrichedData: EnrichedCVData;
  fetchDuration: number;
  sourcesQueried: number;
  sourcesSuccessful: number;
  cacheHits: number;
  errors: Error[];
}

export interface RateLimitStatus {
  source: string;
  remaining: number;
  resetAt: string;
  isLimited: boolean;
}