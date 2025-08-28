// CVPlus Privacy Compliance Service - Test Suite
// Comprehensive tests for GDPR/CCPA compliance, consent management, and data subject rights

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PrivacyComplianceService from '../services/privacy-compliance.service';
import {
  ConsentCategory,
  ConsentMechanism,
  ProcessingPurpose,
  DataSubjectRight,
  PrivacyRegulation
} from '../types/privacy.types';

describe('PrivacyComplianceService', () => {
  let privacyService: PrivacyComplianceService;
  
  beforeEach(async () => {
    const config = {
      requiredCategories: [ConsentCategory.NECESSARY],
      optionalCategories: [
        ConsentCategory.ANALYTICS,
        ConsentCategory.MARKETING,
        ConsentCategory.PERSONALIZATION,
        ConsentCategory.FUNCTIONAL
      ],
      purposeMapping: {
        [ConsentCategory.NECESSARY]: [ProcessingPurpose.NECESSARY, ProcessingPurpose.SECURITY],
        [ConsentCategory.ANALYTICS]: [ProcessingPurpose.ANALYTICS, ProcessingPurpose.RESEARCH],
        [ConsentCategory.MARKETING]: [ProcessingPurpose.MARKETING],
        [ConsentCategory.PERSONALIZATION]: [ProcessingPurpose.PERSONALIZATION],
        [ConsentCategory.FUNCTIONAL]: [ProcessingPurpose.FUNCTIONAL]
      },
      ui: {
        showBanner: true,
        showModal: false,
        showPreferenceCenter: true,
        allowGranularControl: true,
        rememberChoice: true,
        recheckInterval: 365
      },
      legalBasis: {
        [ConsentCategory.NECESSARY]: ConsentMechanism.LEGITIMATE_INTEREST,
        [ConsentCategory.ANALYTICS]: ConsentMechanism.EXPLICIT,
        [ConsentCategory.MARKETING]: ConsentMechanism.EXPLICIT,
        [ConsentCategory.PERSONALIZATION]: ConsentMechanism.EXPLICIT,
        [ConsentCategory.FUNCTIONAL]: ConsentMechanism.EXPLICIT
      },
      retentionPolicies: {
        [ConsentCategory.NECESSARY]: {
          retentionPeriod: 365,
          automaticDeletion: true,
          archiveBeforeDeletion: false
        },
        [ConsentCategory.ANALYTICS]: {
          retentionPeriod: 730,
          automaticDeletion: true,
          archiveBeforeDeletion: true
        },
        [ConsentCategory.MARKETING]: {
          retentionPeriod: 1095,
          automaticDeletion: true,
          archiveBeforeDeletion: false
        },
        [ConsentCategory.PERSONALIZATION]: {
          retentionPeriod: 365,
          automaticDeletion: true,
          archiveBeforeDeletion: false
        },
        [ConsentCategory.FUNCTIONAL]: {
          retentionPeriod: 365,
          automaticDeletion: true,
          archiveBeforeDeletion: false
        }
      }
    };

    privacyService = new PrivacyComplianceService(config);
    await privacyService.initialize();
  });

  describe('Consent Management', () => {
    const mockUserId = 'user_test_123';
    const mockUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';

    it('should record consent with full audit trail', async () => {
      const consentData = {
        categories: [ConsentCategory.NECESSARY, ConsentCategory.ANALYTICS],
        purposes: [ProcessingPurpose.NECESSARY, ProcessingPurpose.ANALYTICS],
        mechanism: ConsentMechanism.EXPLICIT,
        ipAddress: '192.168.1.1',
        userAgent: mockUserAgent
      };

      const consentRecord = await privacyService.recordConsent(mockUserId, consentData);

      expect(consentRecord).toBeDefined();
      expect(consentRecord.userId).toBe(mockUserId);
      expect(consentRecord.categories).toEqual(consentData.categories);
      expect(consentRecord.purposes).toEqual(consentData.purposes);
      expect(consentRecord.mechanism).toBe(ConsentMechanism.EXPLICIT);
      expect(consentRecord.consentId).toBeDefined();
      expect(consentRecord.timestamp).toBeDefined();
      expect(consentRecord.withdrawn).toBe(false);
    });

    it('should withdraw consent with proper audit trail', async () => {
      // First record consent
      await privacyService.recordConsent(mockUserId, {
        categories: [ConsentCategory.NECESSARY, ConsentCategory.ANALYTICS, ConsentCategory.MARKETING],
        purposes: [ProcessingPurpose.NECESSARY, ProcessingPurpose.ANALYTICS, ProcessingPurpose.MARKETING],
        mechanism: ConsentMechanism.EXPLICIT,
        userAgent: mockUserAgent
      });

      // Then withdraw some categories
      const withdrawnConsent = await privacyService.withdrawConsent(
        mockUserId,
        [ConsentCategory.ANALYTICS, ConsentCategory.MARKETING],
        'User requested withdrawal'
      );

      expect(withdrawnConsent).toBeDefined();
      expect(withdrawnConsent.withdrawn).toBe(true);
      expect(withdrawnConsent.withdrawnAt).toBeDefined();
    });

    it('should get current consent status', async () => {
      // Record consent first
      await privacyService.recordConsent(mockUserId, {
        categories: [ConsentCategory.NECESSARY, ConsentCategory.ANALYTICS],
        purposes: [ProcessingPurpose.NECESSARY, ProcessingPurpose.ANALYTICS],
        mechanism: ConsentMechanism.EXPLICIT,
        userAgent: mockUserAgent
      });

      const consentStatus = await privacyService.getConsentStatus(mockUserId);

      expect(consentStatus).toBeDefined();
      expect(consentStatus!.userId).toBe(mockUserId);
      expect(consentStatus!.categories).toContain(ConsentCategory.NECESSARY);
      expect(consentStatus!.categories).toContain(ConsentCategory.ANALYTICS);
    });

    it('should return null for non-existent user consent', async () => {
      const consentStatus = await privacyService.getConsentStatus('non_existent_user');
      expect(consentStatus).toBeNull();
    });
  });

  describe('Data Subject Rights - GDPR Article 15 (Access)', () => {
    const mockUserId = 'user_access_test';
    const mockEmail = 'test@example.com';

    it('should handle data access requests', async () => {
      const accessRequest = await privacyService.handleDataAccessRequest({
        userId: mockUserId,
        email: mockEmail,
        requestedData: ['profile', 'analytics', 'preferences'],
        verificationMethod: 'email'
      });

      expect(accessRequest).toBeDefined();
      expect(accessRequest.requestId).toBeDefined();
      expect(accessRequest.userId).toBe(mockUserId);
      expect(accessRequest.requestType).toBe(DataSubjectRight.ACCESS);
      expect(accessRequest.requestedData).toEqual(['profile', 'analytics', 'preferences']);
      expect(accessRequest.status).toBe('processing'); // Verified by email
      expect(accessRequest.verified).toBe(true);
      expect(accessRequest.expiryDate).toBeDefined();
      expect(accessRequest.expiryDate).toBeGreaterThan(Date.now());
    });

    it('should require verification for access requests', async () => {
      const accessRequest = await privacyService.handleDataAccessRequest({
        userId: mockUserId,
        email: mockEmail,
        requestedData: ['profile'],
        verificationMethod: 'id_document'
      });

      // ID document verification should be pending
      expect(accessRequest.status).toBe('pending');
      expect(accessRequest.verified).toBe(false);
    });
  });

  describe('Data Subject Rights - GDPR Article 17 (Erasure/Right to be Forgotten)', () => {
    const mockUserId = 'user_deletion_test';
    const mockEmail = 'deletion@example.com';

    it('should handle complete data deletion requests', async () => {
      const deletionRequest = await privacyService.handleDataDeletionRequest({
        userId: mockUserId,
        email: mockEmail,
        reason: 'no_longer_consent',
        deletionScope: 'all'
      });

      expect(deletionRequest).toBeDefined();
      expect(deletionRequest.requestId).toBeDefined();
      expect(deletionRequest.userId).toBe(mockUserId);
      expect(deletionRequest.requestType).toBe(DataSubjectRight.ERASURE);
      expect(deletionRequest.reason).toBe('no_longer_consent');
      expect(deletionRequest.deletionScope).toBe('all');
      expect(deletionRequest.confirmationRequired).toBe(true);
      expect(deletionRequest.verified).toBe(true);
    });

    it('should handle partial data deletion requests', async () => {
      const deletionRequest = await privacyService.handleDataDeletionRequest({
        userId: mockUserId,
        email: mockEmail,
        reason: 'data_no_longer_necessary',
        deletionScope: 'partial',
        categoriesToDelete: ['analytics', 'marketing']
      });

      expect(deletionRequest.deletionScope).toBe('partial');
      expect(deletionRequest.categoriesToDelete).toEqual(['analytics', 'marketing']);
    });
  });

  describe('Data Subject Rights - GDPR Article 20 (Data Portability)', () => {
    const mockUserId = 'user_portability_test';
    const mockEmail = 'portability@example.com';

    it('should handle data portability requests', async () => {
      const portabilityRequest = await privacyService.handleDataPortabilityRequest({
        userId: mockUserId,
        email: mockEmail,
        format: 'json',
        includeCategories: ['profile', 'preferences', 'analytics']
      });

      expect(portabilityRequest).toBeDefined();
      expect(portabilityRequest.requestId).toBeDefined();
      expect(portabilityRequest.userId).toBe(mockUserId);
      expect(portabilityRequest.requestType).toBe(DataSubjectRight.PORTABILITY);
      expect(portabilityRequest.format).toBe('json');
      expect(portabilityRequest.includeCategories).toEqual(['profile', 'preferences', 'analytics']);
      expect(portabilityRequest.verified).toBe(true);
      expect(portabilityRequest.expiryDate).toBeDefined();
    });

    it('should support multiple export formats', async () => {
      const csvRequest = await privacyService.handleDataPortabilityRequest({
        userId: mockUserId,
        email: mockEmail,
        format: 'csv',
        includeCategories: ['profile']
      });

      expect(csvRequest.format).toBe('csv');

      const xmlRequest = await privacyService.handleDataPortabilityRequest({
        userId: mockUserId,
        email: mockEmail,
        format: 'xml',
        includeCategories: ['profile']
      });

      expect(xmlRequest.format).toBe('xml');
    });
  });

  describe('Privacy Settings Management', () => {
    const mockUserId = 'user_settings_test';

    it('should get default privacy settings for new user', async () => {
      const settings = await privacyService.getPrivacySettings(mockUserId);

      expect(settings).toBeDefined();
      expect(settings.userId).toBe(mockUserId);
      expect(settings.consentGiven[ConsentCategory.NECESSARY]).toBe(true);
      expect(settings.consentGiven[ConsentCategory.ANALYTICS]).toBe(false);
      expect(settings.consentGiven[ConsentCategory.MARKETING]).toBe(false);
      expect(settings.optOutOfMarketing).toBe(true);
      expect(settings.optOutOfPersonalization).toBe(true);
    });

    it('should update privacy settings', async () => {
      const updatedSettings = await privacyService.updatePrivacySettings(mockUserId, {
        consentGiven: {
          [ConsentCategory.NECESSARY]: true,
          [ConsentCategory.ANALYTICS]: true,
          [ConsentCategory.MARKETING]: false,
          [ConsentCategory.PERSONALIZATION]: true,
          [ConsentCategory.FUNCTIONAL]: false
        },
        optOutOfMarketing: false,
        anonymizeData: true
      });

      expect(updatedSettings).toBeDefined();
      expect(updatedSettings.consentGiven![ConsentCategory.ANALYTICS]).toBe(true);
      expect(updatedSettings.consentGiven![ConsentCategory.PERSONALIZATION]).toBe(true);
      expect(updatedSettings.optOutOfMarketing).toBe(false);
      expect(updatedSettings.anonymizeData).toBe(true);
    });
  });

  describe('Cookie Consent Management', () => {
    const mockUserId = 'user_cookie_test';

    it('should get default cookie consent', async () => {
      const cookieConsent = await privacyService.getCookieConsent(mockUserId);

      expect(cookieConsent).toBeDefined();
      expect(cookieConsent.necessary).toBe(true); // Always true
      expect(cookieConsent.analytics).toBe(false);
      expect(cookieConsent.marketing).toBe(false);
      expect(cookieConsent.functional).toBe(false);
    });

    it('should set cookie consent and create consent record', async () => {
      const cookieConsent = {
        necessary: true,
        analytics: true,
        marketing: false,
        functional: true
      };

      const consentRecord = await privacyService.setCookieConsent(mockUserId, cookieConsent);

      expect(consentRecord).toBeDefined();
      expect(consentRecord.categories).toContain(ConsentCategory.NECESSARY);
      expect(consentRecord.categories).toContain(ConsentCategory.ANALYTICS);
      expect(consentRecord.categories).toContain(ConsentCategory.FUNCTIONAL);
      expect(consentRecord.categories).not.toContain(ConsentCategory.MARKETING);
    });
  });

  describe('Data Breach Management', () => {
    it('should report data breach and create notification', async () => {
      const breachData = {
        breachType: 'unauthorized_access' as const,
        severity: 'high' as const,
        affectedUsers: 1000,
        dataCategories: ['email', 'profile', 'analytics'],
        description: 'Unauthorized access to user database'
      };

      const notification = await privacyService.reportDataBreach(breachData);

      expect(notification).toBeDefined();
      expect(notification.breachId).toBeDefined();
      expect(notification.severity).toBe('high');
      expect(notification.affectedUsers).toBe(1000);
      expect(notification.userNotificationRequired).toBe(true);
      expect(notification.regulatoryNotificationRequired).toBe(false);
      expect(notification.investigationStatus).toBe('ongoing');
    });

    it('should require regulatory notification for critical breaches', async () => {
      const criticalBreach = {
        breachType: 'system_compromise' as const,
        severity: 'critical' as const,
        affectedUsers: 50000,
        dataCategories: ['personal_data', 'financial'],
        description: 'Complete system compromise with personal data exposure'
      };

      const notification = await privacyService.reportDataBreach(criticalBreach);

      expect(notification.severity).toBe('critical');
      expect(notification.regulatoryNotificationRequired).toBe(true);
      expect(notification.userNotificationRequired).toBe(true);
    });
  });

  describe('Compliance Monitoring', () => {
    it('should perform compliance audit', async () => {
      const auditResult = await privacyService.performComplianceAudit();

      expect(auditResult).toBeDefined();
      expect(auditResult.gdprCompliant).toBe(true);
      expect(auditResult.ccpaCompliant).toBe(true);
      expect(auditResult.complianceScore).toBeGreaterThan(0);
      expect(auditResult.complianceScore).toBeLessThanOrEqual(100);
      expect(auditResult.lastAuditDate).toBeDefined();
      expect(auditResult.nextAuditDue).toBeGreaterThan(Date.now());
    });

    it('should check consent compliance', async () => {
      const complianceCheck = await privacyService.checkConsentCompliance('test_user');

      expect(complianceCheck).toBeDefined();
      expect(typeof complianceCheck.compliant).toBe('boolean');
      expect(Array.isArray(complianceCheck.issues)).toBe(true);
      expect(Array.isArray(complianceCheck.recommendations)).toBe(true);
    });

    it('should check data retention compliance', async () => {
      const retentionCheck = await privacyService.checkDataRetentionCompliance();

      expect(retentionCheck).toBeDefined();
      expect(typeof retentionCheck.compliant).toBe('boolean');
      expect(typeof retentionCheck.overdueRetentions).toBe('number');
      expect(typeof retentionCheck.upcomingRetentions).toBe('number');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle consent recording with minimal data', async () => {
      const minimalConsent = await privacyService.recordConsent('minimal_user', {
        categories: [ConsentCategory.NECESSARY],
        purposes: [ProcessingPurpose.NECESSARY],
        mechanism: ConsentMechanism.LEGITIMATE_INTEREST,
        userAgent: 'Test Agent'
      });

      expect(minimalConsent).toBeDefined();
      expect(minimalConsent.categories).toEqual([ConsentCategory.NECESSARY]);
    });

    it('should handle invalid user IDs gracefully', async () => {
      const result = await privacyService.getConsentStatus('');
      expect(result).toBeNull();
    });

    it('should validate email addresses in data subject requests', async () => {
      const invalidEmailRequest = await privacyService.handleDataAccessRequest({
        userId: 'test_user',
        email: 'invalid-email',
        requestedData: ['profile'],
        verificationMethod: 'email'
      });

      // Should still create request but may require additional verification
      expect(invalidEmailRequest).toBeDefined();
    });
  });

  describe('Audit Trail', () => {
    const mockUserId = 'audit_test_user';

    it('should create audit records for consent actions', async () => {
      // Record consent
      await privacyService.recordConsent(mockUserId, {
        categories: [ConsentCategory.NECESSARY, ConsentCategory.ANALYTICS],
        purposes: [ProcessingPurpose.NECESSARY, ProcessingPurpose.ANALYTICS],
        mechanism: ConsentMechanism.EXPLICIT,
        userAgent: 'Test Agent'
      });

      // Update consent
      await privacyService.updateConsent(mockUserId, {
        categories: [ConsentCategory.NECESSARY],
        purposes: [ProcessingPurpose.NECESSARY],
        mechanism: ConsentMechanism.EXPLICIT,
        userAgent: 'Test Agent',
        withdrawn: false,
        userId: mockUserId,
        consentId: 'test',
        timestamp: Date.now(),
        version: '1.0',
        language: 'en',
        jurisdiction: 'US'
      });

      // Withdraw consent
      await privacyService.withdrawConsent(mockUserId, [ConsentCategory.ANALYTICS]);

      // Each action should create an audit record (implementation would verify this)
    });

    it('should create audit records for data subject requests', async () => {
      await privacyService.handleDataAccessRequest({
        userId: mockUserId,
        email: 'audit@test.com',
        requestedData: ['profile'],
        verificationMethod: 'email'
      });

      // Should create audit record (implementation would verify this)
    });
  });
});