/**
 * User Outcomes Types - Complete Implementation
 *
 * Comprehensive user outcome tracking for CVPlus analytics platform.
 * Tracks career progression, job success, and platform effectiveness.
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Career outcome types that CVPlus tracks
 */
export enum OutcomeType {
  JOB_APPLICATION = 'job_application',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  JOB_OFFER_RECEIVED = 'job_offer_received',
  JOB_OFFER_ACCEPTED = 'job_offer_accepted',
  JOB_OFFER_DECLINED = 'job_offer_declined',
  SALARY_NEGOTIATION = 'salary_negotiation',
  CAREER_ADVANCEMENT = 'career_advancement',
  SKILL_CERTIFICATION = 'skill_certification',
  NETWORKING_SUCCESS = 'networking_success',
  PROFILE_VIEW = 'profile_view',
  PROFILE_CONTACT = 'profile_contact',
  CV_DOWNLOAD = 'cv_download',
  PREMIUM_UPGRADE = 'premium_upgrade',
  NO_RESPONSE = 'no_response',
  REFERRAL_GENERATED = 'referral_generated'
}

/**
 * Job application outcome status
 */
export enum ApplicationStatus {
  APPLIED = 'applied',
  UNDER_REVIEW = 'under_review',
  SCREENING = 'screening',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEWED = 'interviewed',
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

/**
 * Interview outcome details
 */
export interface InterviewOutcome {
  interviewType: 'phone' | 'video' | 'in_person' | 'technical' | 'behavioral' | 'panel';
  duration: number; // minutes
  feedback?: string;
  rating?: number; // 1-5 scale
  nextSteps?: string;
  interviewerCount?: number;
  technicalAssessment?: boolean;
}

/**
 * Job offer details
 */
export interface JobOfferDetails {
  jobTitle: string;
  company: string;
  baseSalary: number;
  currency: string;
  totalCompensation?: number;
  equity?: number;
  bonus?: number;
  benefits?: string[];
  startDate?: Date;
  location?: string;
  remote?: boolean;
  negotiated?: boolean;
  originalOffer?: number;
  negotiationRounds?: number;
}

/**
 * Career advancement metrics
 */
export interface CareerAdvancement {
  promotionType: 'title' | 'salary' | 'responsibility' | 'team_size' | 'location';
  previousRole?: string;
  newRole?: string;
  salaryIncrease?: number;
  timePeriod?: number; // months since last advancement
  skillsUsed?: string[];
  achievementsHighlighted?: string[];
}

/**
 * Main UserOutcome interface with complete implementation
 */
export interface UserOutcome {
  // Core identification
  id: string;
  userId: string;
  outcomeType: OutcomeType;
  timestamp: Timestamp;

  // Outcome-specific data
  jobApplication?: {
    jobId?: string;
    jobTitle: string;
    company: string;
    jobBoard?: string;
    applicationMethod: 'direct' | 'referral' | 'recruiter' | 'job_board' | 'linkedin' | 'company_website';
    status: ApplicationStatus;
    applicationDate: Date;
    responseTime?: number; // days to get response
    cvVersion?: string;
    coverLetterUsed?: boolean;
  };

  interview?: InterviewOutcome;

  jobOffer?: JobOfferDetails;

  careerAdvancement?: CareerAdvancement;

  // Success metrics
  metrics: {
    // Financial impact
    salaryImpact?: number;
    compensationIncrease?: number;

    // Time metrics
    timeToOutcome?: number; // days from CV creation/profile update
    responseTime?: number; // days to get response
    processTime?: number; // total hiring process time

    // Engagement metrics
    profileViews?: number;
    cvDownloads?: number;
    contactsReceived?: number;

    // Quality metrics
    matchScore?: number; // how well the outcome matched user preferences
    satisfactionScore?: number; // user-reported satisfaction 1-5
    likelihood?: number; // AI-predicted likelihood this outcome type

    // Attribution
    cvPlusAttribution?: number; // 0-1 score of how much CVPlus contributed
    featuresUsed?: string[]; // which CVPlus features were used
    recommendationsFollowed?: string[];
  };

  // Context and attribution
  source: {
    platform: 'cvplus_profile' | 'external_cv' | 'linkedin' | 'direct_contact' | 'referral';
    campaign?: string;
    referrer?: string;
    attribution?: {
      cvPlusFeatures: string[];
      aiRecommendationsUsed: boolean;
      profileOptimizationScore?: number;
      lastProfileUpdate?: Date;
    };
  };

  // Verification and quality
  verification: {
    verified: boolean;
    verificationMethod?: 'user_reported' | 'email_confirmation' | 'document_upload' | 'third_party';
    verificationDate?: Date;
    confidence: number; // 0-1 confidence score
    fraudRisk?: number; // 0-1 fraud detection score
  };

  // Function compatibility fields (backward compatibility)
  outcomeId?: string; // Alias for id
  jobId?: string; // Job ID for the application
  applicationData?: {
    applicationDate: Date;
    companyName: string;
    jobTitle: string;
    industry: string;
    location?: string;
    salaryExpected?: number;
    applicationMethod: string;
    cvVersion?: string;
  };
  cvData?: {
    atsScore?: number;
    optimizationsApplied: string[];
    version?: string;
  };
  jobDetails?: {
    industry: string;
    title: string;
    company: string;
    location: string;
  };
  timeline?: {
    applicationDate: Date;
    lastUpdate: Date;
  };
  finalResult?: {
    status: 'success' | 'rejection' | 'pending';
    timeToResult?: number;
    outcome?: string;
  };
  userFeedback?: {
    rating: number;
    comments?: string;
  };

  // Additional context
  metadata: {
    userAgent?: string;
    ipAddress?: string; // anonymized
    location?: {
      country: string;
      region?: string;
      city?: string;
    };
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    sessionId?: string;
    experimentVariant?: string; // for A/B testing
    notes?: string;
    tags?: string[];
  };

  // Privacy and compliance
  privacy: {
    dataRetentionDate?: Date;
    userConsent: boolean;
    gdprCompliant: boolean;
    anonymized: boolean;
    shareableAggregated: boolean;
  };

  // Tracking timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

/**
 * Outcome event for tracking outcome lifecycle
 */
export interface OutcomeEvent {
  id: string;
  eventType: 'outcome_created' | 'outcome_updated' | 'outcome_verified' | 'outcome_disputed' | 'outcome_deleted';
  userId: string;
  outcomeId: string;
  timestamp: Timestamp;

  // Event-specific data
  eventData: {
    previousState?: Partial<UserOutcome>;
    newState?: Partial<UserOutcome>;
    changedFields?: string[];
    trigger: 'user_action' | 'automated' | 'admin_action' | 'api_call';
    actor?: string; // who triggered the event
  };

  // Link to full outcome
  outcome: UserOutcome;

  // Event metadata
  metadata: {
    source: string;
    version: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string; // anonymized
  };
}

/**
 * Aggregated outcome analytics
 */
export interface OutcomeAnalytics {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };

  summary: {
    totalOutcomes: number;
    successfulOutcomes: number;
    successRate: number;
    averageTimeToOutcome: number; // days
    totalSalaryImpact: number;
    averageSalaryImpact: number;
  };

  breakdown: {
    byOutcomeType: Record<OutcomeType, number>;
    bySource: Record<string, number>;
    byIndustry: Record<string, number>;
    byJobLevel: Record<string, number>;
  };

  trends: {
    monthlyOutcomes: Array<{
      month: string;
      count: number;
      successRate: number;
    }>;
    salaryProgression: Array<{
      date: Date;
      salary: number;
      role: string;
    }>;
  };

  predictions: {
    nextLikelyOutcome: OutcomeType;
    probability: number;
    timeframe: number; // days
    recommendedActions: string[];
  };
}

/**
 * Platform success metrics aggregated across users
 */
export interface PlatformOutcomeMetrics {
  period: {
    start: Date;
    end: Date;
  };

  overall: {
    totalUsers: number;
    activeUsers: number;
    usersWithOutcomes: number;
    totalOutcomes: number;
    successRate: number;
    averageTimeToFirstOutcome: number;
    totalSalaryImpact: number;
  };

  featureImpact: {
    aiOptimization: {
      usersUsed: number;
      successRateIncrease: number;
      avgSalaryIncrease: number;
    };
    multimediaProfiles: {
      usersUsed: number;
      profileViewIncrease: number;
      contactRateIncrease: number;
    };
    premiumFeatures: {
      conversionRate: number;
      premiumUserSuccessRate: number;
      avgTimeToOutcome: number;
    };
  };

  benchmarks: {
    industryAverages: Record<string, {
      successRate: number;
      avgSalary: number;
      avgTimeToHire: number;
    }>;
    competitorComparison: {
      cvPlusAdvantage: number; // percentage improvement
      keyDifferentiators: string[];
    };
  };
}