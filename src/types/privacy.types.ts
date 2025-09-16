/**
 * CVPlus Analytics - Privacy & Consent Management Types
// GDPR/CCPA compliant privacy management system

import { ConsentCategory } from './tracking.types';

/**
 * Privacy regulation compliance types
 */
export enum PrivacyRegulation {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  PIPEDA = 'pipeda',
  LGPD = 'lgpd'
}

/**
 * Data processing purposes
 */
export enum ProcessingPurpose {
  NECESSARY = 'necessary',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
  FUNCTIONAL = 'functional',
  SECURITY = 'security',
  RESEARCH = 'research'
}

/**
 * Data subject rights under GDPR
 */
export enum DataSubjectRight {
  ACCESS = 'access',              // Right to access personal data
  RECTIFICATION = 'rectification', // Right to rectify inaccurate data
  ERASURE = 'erasure',            // Right to be forgotten
  PORTABILITY = 'portability',    // Right to data portability
  RESTRICTION = 'restriction',     // Right to restrict processing
  OBJECTION = 'objection',        // Right to object to processing
  WITHDRAW_CONSENT = 'withdraw_consent' // Right to withdraw consent
}

/**
 * Consent mechanism types
 */
export enum ConsentMechanism {
  EXPLICIT = 'explicit',          // Explicit consent (opt-in)
  IMPLIED = 'implied',            // Implied consent
  LEGITIMATE_INTEREST = 'legitimate_interest', // Legitimate business interest
  VITAL_INTEREST = 'vital_interest', // Vital interest
  CONTRACT = 'contract',          // Contractual necessity
  LEGAL_OBLIGATION = 'legal_obligation' // Legal compliance
}

/**
 * User consent record
 */
export interface ConsentRecord {
  userId: string;
  anonymousId?: string;
  consentId: string;
  timestamp: number;
  categories: ConsentCategory[];
  purposes: ProcessingPurpose[];
  mechanism: ConsentMechanism;
  ipAddress?: string;            // Anonymized for audit trail
  userAgent: string;
  version: string;               // Consent version
  language: string;
  jurisdiction: string;
  expiryDate?: number;          // Consent expiry timestamp
  withdrawn: boolean;
  withdrawnAt?: number;
}

/**
 * Consent configuration
 */
export interface ConsentConfiguration {
  // Required consents (cannot be opted out)
  requiredCategories: ConsentCategory[];
  
  // Optional consents (can be opted out)
  optionalCategories: ConsentCategory[];
  
  // Processing purposes mapping
  purposeMapping: Record<ConsentCategory, ProcessingPurpose[]>;
  
  // Consent UI configuration
  ui: {
    showBanner: boolean;
    showModal: boolean;
    showPreferenceCenter: boolean;
    allowGranularControl: boolean;
    rememberChoice: boolean;
    recheckInterval: number;    // Days
  };
  
  // Legal basis configuration
  legalBasis: Record<ConsentCategory, ConsentMechanism>;
  
  // Retention policies
  retentionPolicies: Record<ConsentCategory, {
    retentionPeriod: number;    // Days
    automaticDeletion: boolean;
    archiveBeforeDeletion: boolean;
  }>;
}

/**
 * Privacy settings per user
 */
export interface PrivacySettings {
  userId: string;
  consentGiven: Record<ConsentCategory, boolean>;
  consentTimestamp: Record<ConsentCategory, number>;
  doNotTrack: boolean;
  anonymizeData: boolean;
  minimizeDataCollection: boolean;
  optOutOfMarketing: boolean;
  optOutOfPersonalization: boolean;
  requestedDataDeletion: boolean;
  dataPortabilityRequests: DataPortabilityRequest[];
  accessRequests: DataAccessRequest[];
  updatedAt: number;
}

/**
 * Data access request
 */
export interface DataAccessRequest {
  requestId: string;
  userId: string;
  requestType: DataSubjectRight.ACCESS;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'denied';
  requestedData: string[];      // Categories of data requested
  deliveryMethod: 'email' | 'download' | 'api';
  completedAt?: number;
  expiryDate: number;          // Request expiry
  verificationMethod: 'email' | 'id_document' | 'security_questions';
  verified: boolean;
}

/**
 * Data portability request
 */
export interface DataPortabilityRequest {
  requestId: string;
  userId: string;
  requestType: DataSubjectRight.PORTABILITY;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'denied';
  format: 'json' | 'csv' | 'xml';
  includeCategories: string[];
  downloadUrl?: string;
  expiryDate: number;
  completedAt?: number;
  fileSize?: number;
  verified: boolean;
}

/**
 * Data deletion request
 */
export interface DataDeletionRequest {
  requestId: string;
  userId: string;
  requestType: DataSubjectRight.ERASURE;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'denied';
  reason: 'no_longer_consent' | 'data_no_longer_necessary' | 'unlawful_processing' | 'compliance_obligation';
  deletionScope: 'all' | 'partial';
  categoriesToDelete?: string[];
  retainForLegalReasons?: boolean;
  anonymizeInsteadOfDelete?: boolean;
  completedAt?: number;
  verified: boolean;
  confirmationRequired: boolean;
}

/**
 * Privacy compliance audit record
 */
export interface PrivacyAuditRecord {
  auditId: string;
  timestamp: number;
  auditType: 'consent_collection' | 'data_access' | 'data_deletion' | 'data_portability' | 'consent_withdrawal';
  userId?: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;           // Anonymized
  userAgent?: string;
  result: 'success' | 'failure' | 'partial';
  complianceStatus: 'compliant' | 'non_compliant' | 'needs_review';
}

/**
 * Data minimization configuration
 */
export interface DataMinimizationConfig {
  // Fields to collect based on consent
  consentBasedFields: Record<ConsentCategory, string[]>;
  
  // Fields that are automatically anonymized
  autoAnonymizeFields: string[];
  
  // Fields that are never collected
  prohibitedFields: string[];
  
  // Retention policies by data type
  retentionPolicies: Record<string, {
    retentionDays: number;
    anonymizeAfter?: number;
    deleteAfter?: number;
  }>;
  
  // Data aggregation rules
  aggregationRules: {
    minGroupSize: number;        // Minimum group size for aggregated data
    suppressionThreshold: number; // Suppress data below this threshold
    noiseInjection: boolean;     // Add statistical noise for privacy
  };
}

/**
 * Cookie management configuration
 */
export interface CookieConfig {
  // Necessary cookies (always allowed)
  necessaryCookies: {
    names: string[];
    description: string;
    duration: number;           // Days
  };
  
  // Optional cookies by category
  categorizedCookies: Record<ConsentCategory, {
    names: string[];
    description: string;
    duration: number;
    thirdParty: boolean;
    crossSite: boolean;
  }[]>;
  
  // Cookie consent settings
  consentSettings: {
    cookieConsentName: string;
    consentDuration: number;    // Days
    secureOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

/**
 * Privacy compliance status
 */
export interface PrivacyComplianceStatus {
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  lastAuditDate: number;
  complianceScore: number;      // 0-100
  violations: PrivacyViolation[];
  recommendations: string[];
  nextAuditDue: number;
}

/**
 * Privacy violation record
 */
export interface PrivacyViolation {
  violationId: string;
  timestamp: number;
  category: 'consent' | 'data_retention' | 'unauthorized_access' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: number;
  dataCategories: string[];
  resolved: boolean;
  resolvedAt?: number;
  resolutionActions: string[];
  regulatoryNotificationRequired: boolean;
  notificationSent: boolean;
}

/**
 * Data breach notification
 */
export interface DataBreachNotification {
  breachId: string;
  timestamp: number;
  detectedAt: number;
  reportedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  dataCategories: string[];
  breachType: 'unauthorized_access' | 'data_loss' | 'system_compromise' | 'human_error';
  containmentActions: string[];
  userNotificationRequired: boolean;
  regulatoryNotificationRequired: boolean;
  notificationsSent: boolean;
  investigationStatus: 'ongoing' | 'completed' | 'closed';
  lessonsLearned: string[];
}

/**
 * Privacy impact assessment
 */
export interface PrivacyImpactAssessment {
  assessmentId: string;
  timestamp: number;
  project: string;
  dataCategories: string[];
  processingPurposes: ProcessingPurpose[];
  legalBasis: ConsentMechanism[];
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  riskFactors: string[];
  mitigationMeasures: string[];
  residualRisk: 'low' | 'medium' | 'high' | 'very_high';
  approvedBy: string;
  reviewDate: number;
}

/**
 * Anonymization configuration
 */
export interface AnonymizationConfig {
  // Fields to anonymize
  fieldsToAnonymize: string[];
  
  // Anonymization methods
  methods: Record<string, 'hash' | 'generalize' | 'suppress' | 'pseudonymize'>;
  
  // Aggregation settings
  aggregation: {
    minimumGroupSize: number;
    suppressBelowThreshold: boolean;
    addNoise: boolean;
    noiseLevel: number;
  };
  
  // Re-identification risk thresholds
  riskThresholds: {
    acceptable: number;         // 0-1 scale
    warning: number;
    critical: number;
  };
}

/**
 * Export all privacy-related types from ConsentCategory in tracking.types.ts
 */
export type { ConsentCategory } from './tracking.types';

/**
 * GDPR Article 30 record of processing activities
 */
export interface ProcessingActivityRecord {
  activityId: string;
  controllerName: string;
  controllerContact: string;
  dpoContact?: string;
  processingPurposes: ProcessingPurpose[];
  dataCategories: string[];
  dataSubjectCategories: string[];
  recipientCategories: string[];
  thirdCountryTransfers?: {
    countries: string[];
    safeguards: string[];
    adequacyDecisions: boolean;
  };
  retentionPeriods: Record<string, number>;
  securityMeasures: string[];
  lastUpdated: number;
}

/**
 * Cross-border data transfer configuration
 */
export interface DataTransferConfig {
  // Approved transfer mechanisms
  transferMechanisms: {
    adequacyDecisions: string[];     // Countries with adequacy decisions
    standardContractualClauses: boolean;
    bindingCorporateRules: boolean;
    certificationMechanisms: string[];
  };
  
  // Transfer restrictions
  restrictions: {
    prohibitedCountries: string[];
    requireExplicitConsent: string[];
    additionalSafeguards: Record<string, string[]>;
  };
  
  // Monitoring and compliance
  monitoring: {
    logTransfers: boolean;
    assessRisks: boolean;
    regularReviews: boolean;
    reviewFrequency: number;        // Days
  };
}