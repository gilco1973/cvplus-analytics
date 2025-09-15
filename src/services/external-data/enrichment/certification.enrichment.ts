/**
 * Certification Enrichment Module
 * 
 * Verifies and merges certifications from LinkedIn, Credly, and other sources
 * into CV certifications section
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { ParsedCV } from '../../../types/job';
import { LinkedInCertification, EnrichedCVData } from '../types';

export interface CertificationEnrichmentResult {
  enrichedCertifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
    credentialUrl?: string;
    expirationDate?: string;
    certificateImage?: string;
    source: 'cv' | 'linkedin' | 'credly' | 'web';
    verified: boolean;
    confidence: number;
  }>;
  newCertificationsAdded: number;
  certificationsVerified: number;
  qualityScore: number;
}

export class CertificationEnrichmentService {
  /**
   * Enriches CV certifications with external verification
   */
  async enrichCertifications(
    cv: ParsedCV,
    externalData: Partial<EnrichedCVData>
  ): Promise<CertificationEnrichmentResult> {
    console.log('Starting certification enrichment');
    
    const existingCerts = this.extractExistingCertifications(cv);
    const linkedInCerts = externalData.linkedin?.certifications || [];
    const webCerts = this.extractWebCertifications(externalData);
    
    // Merge and verify certifications
    const mergedCerts = this.mergeCertifications(
      existingCerts,
      linkedInCerts,
      webCerts
    );
    
    // Calculate enrichment metrics
    const result: CertificationEnrichmentResult = {
      enrichedCertifications: mergedCerts,
      newCertificationsAdded: this.countNewCertifications(existingCerts, mergedCerts),
      certificationsVerified: this.countVerifiedCertifications(mergedCerts),
      qualityScore: this.calculateQualityScore(mergedCerts)
    };
    
    console.log(`Certification enrichment complete: ${result.newCertificationsAdded} new, ${result.certificationsVerified} verified`);
    return result;
  }

  /**
   * Extract existing certifications from CV
   */
  private extractExistingCertifications(cv: ParsedCV): any[] {
    const certs = cv.certifications || [];
    return certs.map(cert => ({
      ...cert,
      source: 'cv' as const,
      verified: false,
      confidence: 0.7
    }));
  }

  /**
   * Extract certifications from web search results
   */
  private extractWebCertifications(externalData: Partial<EnrichedCVData>): any[] {
    const certs: any[] = [];
    
    // Extract from awards if they look like certifications
    externalData.webPresence?.awards?.forEach(award => {
      if (this.isLikelyCertification(award.title)) {
        certs.push({
          name: award.title,
          issuer: award.organization,
          date: award.date || '',
          source: 'web' as const,
          verified: false,
          confidence: 0.5
        });
      }
    });
    
    return certs;
  }

  /**
   * Merge certifications from multiple sources
   */
  private mergeCertifications(
    existing: any[],
    linkedIn: LinkedInCertification[],
    web: any[]
  ): any[] {
    const merged = new Map<string, any>();
    
    // Start with existing CV certifications
    existing.forEach(cert => {
      const key = this.getCertificationKey(cert);
      merged.set(key, cert);
    });
    
    // Enhance with LinkedIn certifications (higher trust)
    linkedIn.forEach(liCert => {
      const key = this.getCertificationKey(liCert);
      const existing = merged.get(key);
      
      if (existing) {
        // Verify and enhance existing certification
        merged.set(key, this.enhanceCertification(existing, {
          ...liCert,
          source: 'linkedin',
          verified: true,
          confidence: 0.95
        }));
      } else {
        // Add new verified certification
        merged.set(key, {
          ...liCert,
          source: 'linkedin',
          verified: true,
          confidence: 0.95
        });
      }
    });
    
    // Add web certifications with lower confidence
    web.forEach(webCert => {
      const key = this.getCertificationKey(webCert);
      if (!merged.has(key)) {
        merged.set(key, webCert);
      }
    });
    
    return Array.from(merged.values())
      .sort((a, b) => {
        // Sort by verification status and date
        if (a.verified !== b.verified) return b.verified ? 1 : -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }

  /**
   * Enhance existing certification with additional data
   */
  private enhanceCertification(existing: any, additional: any): any {
    return {
      ...existing,
      credentialId: existing.credentialId || additional.credentialId,
      credentialUrl: existing.credentialUrl || additional.credentialUrl,
      expirationDate: existing.expirationDate || additional.expirationDate,
      certificateImage: existing.certificateImage || additional.certificateImage,
      source: additional.source,
      verified: additional.verified || existing.verified,
      confidence: Math.max(existing.confidence, additional.confidence)
    };
  }

  /**
   * Generate unique key for certification deduplication
   */
  private getCertificationKey(cert: any): string {
    const name = (cert.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const issuer = (cert.issuer || cert.issuingOrganization || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
    return `${name}_${issuer}`;
  }

  /**
   * Check if an award is likely a certification
   */
  private isLikelyCertification(title: string): boolean {
    const certKeywords = [
      'certified', 'certification', 'certificate',
      'accredited', 'licensed', 'credential',
      'qualified', 'professional', 'specialist'
    ];
    
    const lowerTitle = title.toLowerCase();
    return certKeywords.some(keyword => lowerTitle.includes(keyword));
  }

  /**
   * Count newly added certifications
   */
  private countNewCertifications(existing: any[], merged: any[]): number {
    const existingKeys = new Set(existing.map(c => this.getCertificationKey(c)));
    return merged.filter(c => !existingKeys.has(this.getCertificationKey(c))).length;
  }

  /**
   * Count verified certifications
   */
  private countVerifiedCertifications(certs: any[]): number {
    return certs.filter(c => c.verified).length;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(certs: any[]): number {
    if (certs.length === 0) return 0;
    
    const scores = certs.map(cert => {
      let score = 0;
      if (cert.verified) score += 40;
      if (cert.credentialId) score += 20;
      if (cert.credentialUrl) score += 20;
      if (cert.expirationDate) score += 10;
      if (cert.certificateImage) score += 10;
      return score;
    });
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / certs.length);
  }

  /**
   * Check if certification is expired
   */
  isExpired(cert: any): boolean {
    if (!cert.expirationDate) return false;
    return new Date(cert.expirationDate) < new Date();
  }

  /**
   * Get certification validity status
   */
  getValidityStatus(cert: any): 'valid' | 'expired' | 'expiring_soon' | 'unknown' {
    if (!cert.expirationDate) return 'unknown';
    
    const expDate = new Date(cert.expirationDate);
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    
    if (expDate < now) return 'expired';
    if (expDate < threeMonths) return 'expiring_soon';
    return 'valid';
  }
}