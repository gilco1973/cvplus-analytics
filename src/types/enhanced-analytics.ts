/**
 * Enhanced Analytics Types
 * 
 * Analytics and tracking types for enhanced CV features.
 * Extracted from enhanced-models.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Feature Analytics Types
export interface FeatureUsage {
  featureId: string;
  userId: string;
  usageCount: number;
  lastUsed: Date;
  totalTime: number;
  completionRate: number;
  errorRate: number;
  conversionEvents: number;
}

export interface FeatureInteraction {
  interactionId: string;
  featureId: string;
  userId: string;
  interactionType: 'click' | 'view' | 'complete' | 'error' | 'abandon';
  timestamp: Date;
  duration: number;
  metadata?: Record<string, any>;
}

export interface FeatureConfig {
  featureId: string;
  name: string;
  enabled: boolean;
  version: string;
  rolloutPercentage: number;
  targetUserSegments?: string[];
  config: Record<string, any>;
  analytics: {
    trackUsage: boolean;
    trackPerformance: boolean;
    trackConversions: boolean;
  };
}

export interface UserExperience {
  userId: string;
  experienceId: string;
  sessionId: string;
  journey: {
    steps: string[];
    currentStep: number;
    completionRate: number;
  };
  satisfaction: {
    score: number;
    feedback?: string;
    timestamp: Date;
  };
  performance: {
    loadTimes: number[];
    errorCount: number;
    completionTime: number;
  };
}

export interface UserPersonality {
  userId: string;
  profileId: string;
  traits: {
    technical: number;
    creative: number;
    analytical: number;
    collaborative: number;
    detail_oriented: number;
  };
  preferences: {
    interface_complexity: 'simple' | 'moderate' | 'advanced';
    feature_discovery: 'guided' | 'explorative';
    feedback_frequency: 'minimal' | 'moderate' | 'frequent';
  };
  confidence: number;
  lastUpdated: Date;
}

export interface FeaturePersonalityAnalysis {
  analysisId: string;
  userId: string;
  featureId: string;
  personalityMatch: {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  };
  usage_prediction: {
    likelihood: number;
    frequency: 'low' | 'medium' | 'high';
    optimal_timing: string[];
  };
  customization_suggestions: {
    interface_adjustments: Record<string, any>;
    feature_variations: string[];
  };
  confidence: number;
  timestamp: Date;
}

/**
 * Public CV Profile analytics (summary level)
 */
export interface PublicProfileAnalytics {
  totalViews: number;
  uniqueVisitors: number;
  averageTimeOnPage: number;
  bounceRate: number;
  featureUsage: Record<string, number>;
  conversionRate: number;
  lastAnalyticsUpdate: Date;
  views?: number; // Alias for totalViews for backward compatibility
  qrScans?: number; // QR code scan count
  contactSubmissions?: number; // Contact form submissions
  lastViewedAt?: Date | null; // Last time the profile was viewed
}

/**
 * Feature analytics tracking (detailed interactions)
 */
export interface FeatureAnalytics {
  jobId: string;
  featureId: string;
  userId?: string; // Visitor ID if available
  interactions: FeatureInteraction[];
  aggregates: {
    totalInteractions: number;
    uniqueUsers: number;
    averageEngagementTime: number;
    lastInteraction: Date;
  };
  // Legacy properties for backward compatibility
  totalViews?: number;
  uniqueVisitors?: number;
  averageTimeOnPage?: number;
  bounceRate?: number;
  featureUsage?: Record<string, number>;
  conversionRate?: number;
  lastAnalyticsUpdate?: Date;
  views?: number;
  qrScans?: number;
  contactSubmissions?: number;
}

/**
 * Contact form submission data
 */
export interface ContactFormSubmission {
  id: string;
  jobId: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  phoneNumber?: string;
  company?: string;
  linkedinUrl?: string;
  interestedServices?: string[];
  preferredContactMethod: 'email' | 'phone' | 'linkedin';
  isRead: boolean;
  isReplied: boolean;
  submittedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  source: 'cv' | 'qr' | 'direct';
  timestamp?: Date; // For backward compatibility
  status?: string; // For status tracking
}

/**
 * QR code scan tracking
 */
export interface QRCodeScan {
  id: string;
  jobId: string;
  qrType: 'primary' | 'contact' | 'chat' | 'menu';
  scannedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
  };
  converted: boolean;
  conversionType?: 'view' | 'contact' | 'chat' | 'download';
  scanId?: string; // For backward compatibility
  timestamp?: Date; // For backward compatibility
}