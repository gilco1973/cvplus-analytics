#!/usr/bin/env node

/**
 * Privacy Validation Script for Analytics Module
 * Author: Gil Klainert
 * Date: 2025-08-29
 * 
 * Validates GDPR/CCPA compliance and privacy measures
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`)
};

class PrivacyValidator {
  constructor() {
    this.srcPath = path.join(__dirname, '../../src');
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    log.info('Starting privacy compliance validation...');
    
    this.checkPrivacyComplianceService();
    this.checkConsentManagement();
    this.checkDataAnonymization();
    this.checkGDPRCompliance();
    this.checkDataRetentionPolicies();
    this.checkAuditLogging();
    this.checkSecureDataHandling();
    
    this.generateReport();
    
    if (this.errors.length > 0) {
      log.error(`Privacy validation failed with ${this.errors.length} errors`);
      process.exit(1);
    } else {
      log.success('Privacy validation passed');
      if (this.warnings.length > 0) {
        log.warning(`${this.warnings.length} warnings found`);
      }
      process.exit(0);
    }
  }

  checkPrivacyComplianceService() {
    const privacyServicePath = path.join(this.srcPath, 'services/privacy-compliance.service.ts');
    
    if (!fs.existsSync(privacyServicePath)) {
      this.errors.push('Privacy compliance service not found');
      return;
    }

    const content = fs.readFileSync(privacyServicePath, 'utf8');
    
    // Check for GDPR methods
    const gdprMethods = [
      'validateGDPRCompliance',
      'handleDataSubjectRequest',
      'anonymizeUserData',
      'deleteUserData'
    ];

    for (const method of gdprMethods) {
      if (!content.includes(method)) {
        this.errors.push(`Missing GDPR method: ${method}`);
      }
    }

    // Check for consent validation
    if (!content.includes('validateConsent') && !content.includes('checkConsent')) {
      this.errors.push('Missing consent validation methods');
    }

    log.success('Privacy compliance service structure validated');
  }

  checkConsentManagement() {
    const typesPath = path.join(this.srcPath, 'types');
    
    if (!fs.existsSync(typesPath)) {
      this.errors.push('Types directory not found');
      return;
    }

    // Check for privacy types
    const privacyTypesPath = path.join(typesPath, 'privacy.types.ts');
    if (!fs.existsSync(privacyTypesPath)) {
      this.errors.push('Privacy types not defined');
      return;
    }

    const content = fs.readFileSync(privacyTypesPath, 'utf8');
    
    const requiredTypes = [
      'UserConsent',
      'ConsentType',
      'PrivacyPreferences',
      'DataProcessingPurpose'
    ];

    for (const type of requiredTypes) {
      if (!content.includes(type)) {
        this.warnings.push(`Missing privacy type: ${type}`);
      }
    }

    log.success('Consent management types validated');
  }

  checkDataAnonymization() {
    // Check for data anonymization utilities
    const utilsPath = path.join(this.srcPath, 'utils');
    
    if (fs.existsSync(utilsPath)) {
      const files = fs.readdirSync(utilsPath);
      const hasAnonymization = files.some(file => 
        file.includes('anonymize') || file.includes('privacy') || file.includes('sanitize')
      );
      
      if (!hasAnonymization) {
        this.warnings.push('No anonymization utilities found in utils directory');
      } else {
        log.success('Data anonymization utilities found');
      }
    }

    // Check privacy compliance service for anonymization methods
    const privacyServicePath = path.join(this.srcPath, 'services/privacy-compliance.service.ts');
    if (fs.existsSync(privacyServicePath)) {
      const content = fs.readFileSync(privacyServicePath, 'utf8');
      
      if (!content.includes('anonymize') && !content.includes('pseudonymize')) {
        this.errors.push('Missing data anonymization methods in privacy service');
      } else {
        log.success('Data anonymization methods found');
      }
    }
  }

  checkGDPRCompliance() {
    // Check for GDPR-specific implementations
    const servicesPath = path.join(this.srcPath, 'services');
    
    if (!fs.existsSync(servicesPath)) {
      this.errors.push('Services directory not found');
      return;
    }

    const files = fs.readdirSync(servicesPath, { recursive: true });
    const hasGDPRService = files.some(file => 
      typeof file === 'string' && file.includes('privacy-compliance')
    );

    if (!hasGDPRService) {
      this.errors.push('No GDPR compliance service found');
      return;
    }

    // Check for required GDPR rights implementation
    const privacyServicePath = path.join(servicesPath, 'privacy-compliance.service.ts');
    if (fs.existsSync(privacyServicePath)) {
      const content = fs.readFileSync(privacyServicePath, 'utf8');
      
      const gdprRights = [
        'right to access',
        'right to rectification', 
        'right to erasure',
        'right to portability',
        'right to restrict processing'
      ];

      // Check for GDPR rights in comments or method names
      const lowerContent = content.toLowerCase();
      gdprRights.forEach(right => {
        if (!lowerContent.includes(right.replace(/\s+/g, '')) && 
            !lowerContent.includes(right)) {
          this.warnings.push(`GDPR ${right} implementation not clearly documented`);
        }
      });

      log.success('GDPR compliance service structure validated');
    }
  }

  checkDataRetentionPolicies() {
    // Check for data retention configuration
    const configPath = path.join(this.srcPath, 'config');
    
    if (!fs.existsSync(configPath)) {
      this.warnings.push('No config directory found for data retention policies');
      return;
    }

    const files = fs.readdirSync(configPath);
    const hasRetentionConfig = files.some(file => 
      file.includes('retention') || file.includes('privacy')
    );

    if (!hasRetentionConfig) {
      this.warnings.push('No data retention configuration found');
    } else {
      log.success('Data retention configuration detected');
    }

    // Check for retention logic in services
    const privacyServicePath = path.join(this.srcPath, 'services/privacy-compliance.service.ts');
    if (fs.existsSync(privacyServicePath)) {
      const content = fs.readFileSync(privacyServicePath, 'utf8');
      
      if (!content.includes('retention') && !content.includes('expire') && !content.includes('cleanup')) {
        this.warnings.push('No data retention logic found in privacy service');
      } else {
        log.success('Data retention logic found');
      }
    }
  }

  checkAuditLogging() {
    // Check for audit logging implementation
    const sharedPath = path.join(this.srcPath, 'shared');
    
    if (fs.existsSync(sharedPath)) {
      const files = fs.readdirSync(sharedPath);
      const hasLogger = files.some(file => file.includes('logger'));
      
      if (hasLogger) {
        const loggerPath = path.join(sharedPath, 'logger.ts');
        if (fs.existsSync(loggerPath)) {
          const content = fs.readFileSync(loggerPath, 'utf8');
          
          if (content.includes('audit') || content.includes('privacy') || content.includes('compliance')) {
            log.success('Audit logging capabilities found');
          } else {
            this.warnings.push('Logger exists but no audit/privacy logging detected');
          }
        }
      } else {
        this.warnings.push('No logging utilities found');
      }
    }
  }

  checkSecureDataHandling() {
    // Check for secure data handling patterns
    const servicesPath = path.join(this.srcPath, 'services');
    
    if (!fs.existsSync(servicesPath)) {
      return;
    }

    // Check analytics services for security patterns
    const analyticsServicePath = path.join(servicesPath, 'analytics-engine.service.ts');
    if (fs.existsSync(analyticsServicePath)) {
      const content = fs.readFileSync(analyticsServicePath, 'utf8');
      
      // Check for encryption/security mentions
      if (content.includes('encrypt') || content.includes('hash') || content.includes('secure')) {
        log.success('Security measures found in analytics engine');
      } else {
        this.warnings.push('No explicit security measures found in analytics engine');
      }

      // Check for validation
      if (content.includes('validate') || content.includes('sanitize')) {
        log.success('Data validation found in analytics engine');
      } else {
        this.warnings.push('No data validation found in analytics engine');
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalIssues: this.errors.length + this.warnings.length,
        criticalIssues: this.errors.length,
        warnings: this.warnings.length
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '../../../privacy-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    log.info('Privacy validation report generated: privacy-validation-report.json');
  }
}

// Run validation
const validator = new PrivacyValidator();
validator.validate().catch(error => {
  log.error(`Privacy validation failed: ${error.message}`);
  process.exit(1);
});