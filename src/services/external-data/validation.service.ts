/**
 * Data Validation Service
 * 
 * Validates and sanitizes external data, removes PII,
 * and ensures data quality and consistency
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import { 
  EnrichedCVData,
  _ValidationStatus,
  ValidationIssue
} from './types';

export class ValidationService {
  // PII patterns to detect and remove
  private readonly piiPatterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    phone: /\b(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    bankAccount: /\b[A-Z]{2}\d{2}[\s-]?[A-Z0-9]{4}[\s-]?\d{7}(?:\d{3})?\b/g
  };
  
  // Sensitive keywords to flag
  private readonly sensitiveKeywords = [
    'password', 'secret', 'token', 'api_key', 'private_key',
    'confidential', 'internal', 'proprietary', 'classified'
  ];
  
  constructor() {
    logger.info('[VALIDATION-SERVICE] Validation service initialized');
  }

  /**
   * Validate and sanitize enriched CV data
   */
  async validate(data: EnrichedCVData): Promise<EnrichedCVData> {
    logger.info('[VALIDATION-SERVICE] Starting validation', { 
      userId: data.userId,
      sources: data.sources.length 
    });
    
    const issues: ValidationIssue[] = [];
    
    // Deep clone the data to avoid mutations
    const sanitizedData = JSON.parse(JSON.stringify(data));
    
    // Validate and sanitize each section
    if (sanitizedData.github) {
      this.validateGitHubData(sanitizedData.github, issues);
      sanitizedData.github = this.sanitizeObject(sanitizedData.github);
    }
    
    if (sanitizedData.linkedin) {
      this.validateLinkedInData(sanitizedData.linkedin, issues);
      sanitizedData.linkedin = this.sanitizeObject(sanitizedData.linkedin);
    }
    
    if (sanitizedData.webPresence) {
      this.validateWebPresence(sanitizedData.webPresence, issues);
      sanitizedData.webPresence = this.sanitizeObject(sanitizedData.webPresence);
    }
    
    if (sanitizedData.personalWebsite) {
      this.validateWebsite(sanitizedData.personalWebsite, issues);
      sanitizedData.personalWebsite = this.sanitizeObject(sanitizedData.personalWebsite);
    }
    
    // Validate aggregated data
    this.validateAggregatedData(sanitizedData, issues);
    
    // Check for PII and sensitive data
    const hasPII = this.containsPII(JSON.stringify(sanitizedData));
    const hasSensitive = this.containsSensitiveData(JSON.stringify(sanitizedData));
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(sanitizedData, issues);
    
    // Set validation status
    sanitizedData.validationStatus = {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      hasPersonalInfo: hasPII,
      hasSensitiveData: hasSensitive,
      qualityScore,
      issues
    };
    
    logger.info('[VALIDATION-SERVICE] Validation completed', {
      isValid: sanitizedData.validationStatus.isValid,
      issueCount: issues.length,
      qualityScore
    });
    
    return sanitizedData;
  }

  /**
   * Validate GitHub data
   */
  private validateGitHubData(data: any, issues: ValidationIssue[]): void {
    if (!data.profile?.username) {
      issues.push({
        field: 'github.profile.username',
        issue: 'Missing GitHub username',
        severity: 'error'
      });
    }
    
    if (data.repositories && !Array.isArray(data.repositories)) {
      issues.push({
        field: 'github.repositories',
        issue: 'Repositories must be an array',
        severity: 'error'
      });
    }
    
    // Check for suspicious repository counts
    if (data.stats?.totalContributions > 10000) {
      issues.push({
        field: 'github.stats.totalContributions',
        issue: 'Unusually high contribution count',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate LinkedIn data
   */
  private validateLinkedInData(data: any, issues: ValidationIssue[]): void {
    if (data.experience && !Array.isArray(data.experience)) {
      issues.push({
        field: 'linkedin.experience',
        issue: 'Experience must be an array',
        severity: 'error'
      });
    }
    
    // Validate dates
    data.experience?.forEach((exp: any, index: number) => {
      if (exp.startDate && !this.isValidDate(exp.startDate)) {
        issues.push({
          field: `linkedin.experience[${index}].startDate`,
          issue: 'Invalid date format',
          severity: 'warning'
        });
      }
    });
    
    // Check for duplicate entries
    if (data.skills && Array.isArray(data.skills)) {
      const uniqueSkills = new Set(data.skills);
      if (uniqueSkills.size < data.skills.length) {
        issues.push({
          field: 'linkedin.skills',
          issue: 'Duplicate skills detected',
          severity: 'info'
        });
      }
    }
  }

  /**
   * Validate web presence data
   */
  private validateWebPresence(data: any, issues: ValidationIssue[]): void {
    if (data.searchResults && !Array.isArray(data.searchResults)) {
      issues.push({
        field: 'webPresence.searchResults',
        issue: 'Search results must be an array',
        severity: 'error'
      });
    }
    
    // Validate URLs
    data.searchResults?.forEach((result: any, index: number) => {
      if (result.url && !this.isValidUrl(result.url)) {
        issues.push({
          field: `webPresence.searchResults[${index}].url`,
          issue: 'Invalid URL format',
          severity: 'warning'
        });
      }
    });
  }

  /**
   * Validate website data
   */
  private validateWebsite(data: any, issues: ValidationIssue[]): void {
    if (!data.url || !this.isValidUrl(data.url)) {
      issues.push({
        field: 'personalWebsite.url',
        issue: 'Invalid or missing website URL',
        severity: 'error'
      });
    }
    
    // Check portfolio projects
    if (data.portfolioProjects && data.portfolioProjects.length > 50) {
      issues.push({
        field: 'personalWebsite.portfolioProjects',
        issue: 'Too many portfolio projects (max 50)',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate aggregated data
   */
  private validateAggregatedData(data: any, issues: ValidationIssue[]): void {
    // Remove duplicate skills
    if (data.aggregatedSkills && Array.isArray(data.aggregatedSkills)) {
      const uniqueSkills = Array.from(new Set(data.aggregatedSkills));
      if (uniqueSkills.length < data.aggregatedSkills.length) {
        data.aggregatedSkills = uniqueSkills;
        issues.push({
          field: 'aggregatedSkills',
          issue: 'Duplicate skills removed',
          severity: 'info'
        });
      }
    }
    
    // Validate project count
    if (data.aggregatedProjects && data.aggregatedProjects.length > 20) {
      data.aggregatedProjects = data.aggregatedProjects.slice(0, 20);
      issues.push({
        field: 'aggregatedProjects',
        issue: 'Projects limited to 20',
        severity: 'info'
      });
    }
  }

  /**
   * Sanitize object by removing PII and sensitive data
   */
  private sanitizeObject(obj: any): any {
    if (!obj) return obj;
    
    const sanitized = JSON.stringify(obj);
    
    // Remove PII patterns
    let cleaned = sanitized;
    for (const [type, pattern] of Object.entries(this.piiPatterns)) {
      cleaned = cleaned.replace(pattern, '[REDACTED]');
    }
    
    // Parse back to object
    try {
      return JSON.parse(cleaned);
    } catch {
      logger.error('[VALIDATION-SERVICE] Failed to parse sanitized data');
      return obj;
    }
  }

  /**
   * Check if text contains PII
   */
  private containsPII(text: string): boolean {
    for (const pattern of Object.values(this.piiPatterns)) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if text contains sensitive data
   */
  private containsSensitiveData(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.sensitiveKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Calculate data quality score
   */
  private calculateQualityScore(data: EnrichedCVData, issues: ValidationIssue[]): number {
    let score = 100;
    
    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'error':
          score -= 10;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    });
    
    // Bonus points for complete data
    if (data.github?.profile) score += 5;
    if (data.linkedin?.profile) score += 5;
    if (data.webPresence?.searchResults?.length > 0) score += 3;
    if (data.personalWebsite?.portfolioProjects?.length > 0) score += 5;
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Validate date format
   */
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Remove duplicate entries from array
   */
  removeDuplicates<T>(array: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}