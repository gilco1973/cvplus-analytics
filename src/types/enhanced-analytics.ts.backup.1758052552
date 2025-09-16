/**
 * Enhanced Analytics Types
 * 
 * Analytics and tracking types for enhanced CV features.
 * Extracted from enhanced-models.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Public CV profile data
 */
export interface PublicCVProfile {
  id: string;
  userId: string;
  jobId: string;
  slug: string;
  isPublic: boolean;
  seoTitle?: string;
  seoDescription?: string;
  metaTags?: Record<string, string>;
  customDomain?: string;
  publicUrl?: string;
  allowContactForm?: boolean;
  showAnalytics?: boolean;
  contactEmail?: string;
  parsedCV?: any; // Parsed CV data with PII masking
  features?: Record<string, any>; // Public profile features
  template?: string; // Template name
  qrCodeUrl?: string; // QR code URL for the profile
  analytics: PublicProfileAnalytics;
  socialSharing: {
    enabled: boolean;
    platforms: string[];
    customMessage?: string;
  };
  privacySettings?: {
    enabled?: boolean;
    level?: 'public' | 'private' | 'restricted';
    maskingRules?: {
      maskEmail?: boolean;
      maskPhone?: boolean;
      maskAddress?: boolean;
      name?: boolean;
    };
    publicEmail?: boolean;
    publicPhone?: boolean;
  };
  additionalInfo?: {
    availabilityCalendar?: any;
    testimonials?: any[];
    personalityProfile?: any;
    skillsVisualization?: any;
    certifications?: any[];
    contactEmail?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt?: Date;
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
 * Feature interaction tracking
 */
export interface FeatureInteraction {
  type: string; // 'view', 'click', 'submit', etc.
  timestamp: Date;
  duration?: number; // For time-based interactions
  metadata?: Record<string, any>;
  userAgent?: string;
  ipHash?: string; // Hashed IP for privacy
  // Legacy properties for backward compatibility
  featureId?: string;
  userId?: string;
  jobId?: string;
  interactionType?: 'view' | 'click' | 'download' | 'share' | 'contact';
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