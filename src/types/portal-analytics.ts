/**
 * Portal Analytics and URL Types
 * 
 * Analytics tracking, metrics, and URL configuration types for portal system.
 * Extracted from portal.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Portal URL configuration
 */
export interface PortalUrls {
  /** Main portal URL */
  portal: string;
  
  /** Direct chat URL */
  chat: string;
  
  /** Contact form URL */
  contact: string;
  
  /** CV download URL */
  download: string;
  
  /** Multi-purpose QR menu URL */
  qrMenu: string;
  
  /** API endpoints */
  api: {
    chat: string;
    contact: string;
    analytics: string;
  };
  
  /** Admin/management URLs */
  admin?: {
    dashboard: string;
    analytics: string;
    settings: string;
  };
}

/**
 * Portal analytics data
 */
export interface PortalAnalytics {
  /** Basic metrics */
  metrics: PortalMetrics;
  
  /** Visitor tracking */
  visitors: VisitorAnalytics;
  
  /** Chat interactions */
  chat: ChatAnalytics;
  
  /** Feature usage */
  features: FeatureUsageAnalytics;
  
  /** Performance metrics */
  performance: PerformanceMetrics;
  
  /** QR code specific analytics */
  qrCodes: QRCodeAnalytics;
}

/**
 * Basic portal metrics
 */
export interface PortalMetrics {
  /** Total page views */
  totalViews: number;
  
  /** Unique visitors */
  uniqueVisitors: number;
  
  /** Average session duration */
  averageSessionDuration: number;
  
  /** Bounce rate */
  bounceRate: number;
  
  /** Total chat sessions */
  chatSessions: number;
  
  /** Contact form submissions */
  contactSubmissions: number;
  
  /** CV downloads */
  cvDownloads: number;
  
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Visitor analytics
 */
export interface VisitorAnalytics {
  total: number;
  unique: number;
  returning: number;
  devices: { mobile: number; tablet: number; desktop: number; };
  browsers: Record<string, number>;
  locations: Array<{ country: string; city?: string; visitors: number; }>;
  sources: { direct: number; search: number; social: number; referral: number; qr: number; };
}

/**
 * Chat analytics
 */
export interface ChatAnalytics {
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  averageSessionDuration: number;
  topics: Array<{ topic: string; count: number; }>;
  satisfaction?: { positive: number; neutral: number; negative: number; };
}

/**
 * Feature usage analytics
 */
export interface FeatureUsageAnalytics {
  contactForm: { views: number; submissions: number; conversionRate: number; };
  cvDownloads: { total: number; unique: number; formats: Record<string, number>; };
  socialLinks: Record<string, number>;
  portfolio: { views: number; itemViews: Record<string, number>; };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  pageLoadTime: number;
  chatResponseTime: number;
  apiResponseTimes: Record<string, number>;
  errorRates: { total: number; byEndpoint: Record<string, number>; };
  uptime: number;
}

/**
 * QR code analytics
 */
export interface QRCodeAnalytics {
  /** Total QR code scans */
  totalScans: number;
  
  /** Unique scan sessions */
  uniqueScans: number;
  
  /** Scan source breakdown */
  sources: {
    primary: number;     // Main QR on CV
    chat: number;        // Chat-specific QR
    contact: number;     // Contact form QR
    menu: number;        // Multi-purpose QR menu
  };
  
  /** Conversion rates */
  conversions: {
    scanToView: number;      // % of scans that result in page view
    scanToChat: number;      // % of scans that result in chat
    scanToContact: number;   // % of scans that result in contact
  };
  
  /** Device breakdown */
  devices: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  
  /** Geographic data */
  locations: Array<{
    country: string;
    city?: string;
    scans: number;
  }>;
}

/**
 * URL placement options in CV document
 */
export enum URLPlacement {
  HEADER = 'header',
  FOOTER = 'footer',
  CONTACT_SECTION = 'contact_section',
  SUMMARY_SECTION = 'summary_section',
  SEPARATE_PAGE = 'separate_page'
}

/**
 * QR code types
 */
export enum QRCodeType {
  PRIMARY_PORTAL = 'primary_portal',
  CHAT_DIRECT = 'chat_direct',
  CONTACT_FORM = 'contact_form',
  CV_DOWNLOAD = 'cv_download',
  MULTI_PURPOSE_MENU = 'multi_purpose_menu'
}

/**
 * QR code styling options
 */
export interface QRCodeStyling {
  /** Primary color */
  primaryColor: string;
  
  /** Background color */
  backgroundColor: string;
  
  /** Logo/icon to embed */
  logo?: string;
  
  /** Error correction level */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  
  /** QR code size in pixels */
  size: number;
  
  /** Border/margin in pixels */
  margin: number;
  
  /** Border width in pixels */
  borderWidth?: number;
}