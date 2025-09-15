/**
 * Main Enrichment Service
 * 
 * Orchestrates all enrichment modules to enhance CV with external data
 * while maintaining data attribution and quality scoring
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { ParsedCV } from '../../../types/job';
import { EnrichedCVData } from '../types';
import { PortfolioEnrichmentService, PortfolioEnrichmentResult } from './portfolio.enrichment';
import { CertificationEnrichmentService, CertificationEnrichmentResult } from './certification.enrichment';
import { HobbiesEnrichmentService, HobbiesEnrichmentResult } from './hobbies.enrichment';
import { SkillsEnrichmentService, SkillEnrichmentResult } from './skills.enrichment';

export interface EnrichmentResult {
  enrichedCV: ParsedCV;
  enrichmentSummary: {
    portfolio: PortfolioEnrichmentResult;
    certifications: CertificationEnrichmentResult;
    hobbies: HobbiesEnrichmentResult;
    skills: SkillEnrichmentResult;
  };
  dataAttribution: DataAttribution[];
  qualityImprovement: {
    before: number;
    after: number;
    improvement: number;
  };
  conflictsResolved: ConflictResolution[];
  timestamp: string;
}

export interface DataAttribution {
  field: string;
  source: string;
  confidence: number;
  added: boolean;
  enhanced: boolean;
}

export interface ConflictResolution {
  field: string;
  sources: string[];
  resolution: string;
  reason: string;
}

export class EnrichmentService {
  private portfolioService: PortfolioEnrichmentService;
  private certificationService: CertificationEnrichmentService;
  private hobbiesService: HobbiesEnrichmentService;
  private skillsService: SkillsEnrichmentService;

  constructor() {
    this.portfolioService = new PortfolioEnrichmentService();
    this.certificationService = new CertificationEnrichmentService();
    this.hobbiesService = new HobbiesEnrichmentService();
    this.skillsService = new SkillsEnrichmentService();
  }

  /**
   * Main enrichment orchestration method
   */
  async enrichCV(
    originalCV: ParsedCV,
    externalData: Partial<EnrichedCVData>
  ): Promise<EnrichmentResult> {
    console.log('Starting CV enrichment orchestration');
    
    // Calculate initial quality score
    const beforeQuality = this.calculateCVQualityScore(originalCV);
    
    // Deep clone CV to avoid mutations
    const enrichedCV = JSON.parse(JSON.stringify(originalCV)) as ParsedCV;
    
    // Track attribution and conflicts
    const attributions: DataAttribution[] = [];
    const conflicts: ConflictResolution[] = [];
    
    // 1. Enrich Portfolio/Projects
    const portfolioResult = await this.portfolioService.enrichPortfolio(
      enrichedCV,
      externalData
    );
    this.applyPortfolioEnrichment(enrichedCV, portfolioResult, attributions);
    
    // 2. Enrich Certifications
    const certificationResult = await this.certificationService.enrichCertifications(
      enrichedCV,
      externalData
    );
    this.applyCertificationEnrichment(enrichedCV, certificationResult, attributions);
    
    // 3. Enrich Hobbies/Interests
    const hobbiesResult = await this.hobbiesService.enrichHobbies(
      enrichedCV,
      externalData
    );
    this.applyHobbiesEnrichment(enrichedCV, hobbiesResult, attributions);
    
    // 4. Enrich Skills
    const skillsResult = await this.skillsService.enrichSkills(
      enrichedCV,
      externalData
    );
    this.applySkillsEnrichment(enrichedCV, skillsResult, attributions);
    
    // 5. Enrich Professional Summary if available
    if (externalData.professionalSummary) {
      this.enrichProfessionalSummary(enrichedCV, externalData.professionalSummary, attributions);
    }
    
    // 6. Handle conflicts
    this.resolveConflicts(enrichedCV, originalCV, conflicts);
    
    // Calculate final quality score
    const afterQuality = this.calculateCVQualityScore(enrichedCV);
    
    const result: EnrichmentResult = {
      enrichedCV,
      enrichmentSummary: {
        portfolio: portfolioResult,
        certifications: certificationResult,
        hobbies: hobbiesResult,
        skills: skillsResult
      },
      dataAttribution: attributions,
      qualityImprovement: {
        before: beforeQuality,
        after: afterQuality,
        improvement: afterQuality - beforeQuality
      },
      conflictsResolved: conflicts,
      timestamp: new Date().toISOString()
    };
    
    console.log(`CV enrichment complete. Quality improved by ${result.qualityImprovement.improvement}%`);
    return result;
  }

  /**
   * Apply portfolio enrichment to CV
   */
  private applyPortfolioEnrichment(
    cv: ParsedCV,
    result: PortfolioEnrichmentResult,
    attributions: DataAttribution[]
  ): void {
    // Update projects section
    cv.projects = result.enrichedProjects.map(project => ({
      name: project.name,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
      images: project.images
    }));
    
    // Track attribution
    if (result.newProjectsAdded > 0) {
      attributions.push({
        field: 'projects',
        source: 'github/website',
        confidence: 0.8,
        added: true,
        enhanced: false
      });
    }
    
    if (result.projectsEnhanced > 0) {
      attributions.push({
        field: 'projects',
        source: 'github/website',
        confidence: 0.9,
        added: false,
        enhanced: true
      });
    }
  }

  /**
   * Apply certification enrichment to CV
   */
  private applyCertificationEnrichment(
    cv: ParsedCV,
    result: CertificationEnrichmentResult,
    attributions: DataAttribution[]
  ): void {
    // Update certifications section
    cv.certifications = result.enrichedCertifications.map(cert => ({
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
      credentialId: cert.credentialId,
      certificateImage: cert.certificateImage
    }));
    
    // Track attribution
    if (result.newCertificationsAdded > 0) {
      attributions.push({
        field: 'certifications',
        source: 'linkedin/web',
        confidence: 0.85,
        added: true,
        enhanced: false
      });
    }
    
    if (result.certificationsVerified > 0) {
      attributions.push({
        field: 'certifications',
        source: 'linkedin',
        confidence: 0.95,
        added: false,
        enhanced: true
      });
    }
  }

  /**
   * Apply hobbies enrichment to CV
   */
  private applyHobbiesEnrichment(
    cv: ParsedCV,
    result: HobbiesEnrichmentResult,
    attributions: DataAttribution[]
  ): void {
    // Update interests section with categorized interests
    const allInterests = [
      ...result.categorizedInterests.technical,
      ...result.categorizedInterests.creative,
      ...result.categorizedInterests.community,
      ...result.categorizedInterests.professional,
      ...result.categorizedInterests.personal
    ];
    
    // Keep unique interests
    cv.interests = Array.from(new Set(allInterests)).slice(0, 8);
    
    if (result.newInterestsAdded > 0) {
      attributions.push({
        field: 'interests',
        source: 'github/web',
        confidence: 0.7,
        added: true,
        enhanced: false
      });
    }
  }

  /**
   * Apply skills enrichment to CV
   */
  private applySkillsEnrichment(
    cv: ParsedCV,
    result: SkillEnrichmentResult,
    attributions: DataAttribution[]
  ): void {
    // Update skills with enriched and validated data
    const enrichedSkills = result.enrichedSkills;
    
    // Preserve existing structure or create categorized structure
    if (Array.isArray(cv.skills)) {
      // Convert to categorized structure if significant enrichment
      if (result.newSkillsAdded > 5) {
        cv.skills = {
          technical: enrichedSkills.technical.map(s => s.name),
          frameworks: enrichedSkills.frameworks.map(s => s.name),
          tools: enrichedSkills.tools.map(s => s.name),
          languages: enrichedSkills.languages.map(s => s.name)
        };
      } else {
        // Keep flat structure but add validated skills
        const allSkills = [
          ...enrichedSkills.technical,
          ...enrichedSkills.frameworks,
          ...enrichedSkills.tools,
          ...enrichedSkills.languages
        ].filter(s => s.validated);
        
        cv.skills = Array.from(new Set([
          ...cv.skills,
          ...allSkills.map(s => s.name)
        ]));
      }
    } else {
      // Update categorized skills
      cv.skills = {
        ...cv.skills,
        technical: enrichedSkills.technical.map(s => s.name),
        frameworks: enrichedSkills.frameworks.map(s => s.name),
        tools: enrichedSkills.tools.map(s => s.name),
        languages: enrichedSkills.languages.map(s => s.name)
      };
    }
    
    // Track attribution
    if (result.newSkillsAdded > 0) {
      attributions.push({
        field: 'skills',
        source: 'github/linkedin',
        confidence: 0.85,
        added: true,
        enhanced: false
      });
    }
    
    if (result.skillsValidated > 0) {
      attributions.push({
        field: 'skills',
        source: 'github/linkedin',
        confidence: 0.9,
        added: false,
        enhanced: true
      });
    }
  }

  /**
   * Enrich professional summary
   */
  private enrichProfessionalSummary(
    cv: ParsedCV,
    newSummary: string,
    attributions: DataAttribution[]
  ): void {
    if (!cv.summary || cv.summary.length < 50) {
      cv.summary = newSummary;
      attributions.push({
        field: 'summary',
        source: 'ai-generated',
        confidence: 0.8,
        added: true,
        enhanced: false
      });
    }
  }

  /**
   * Resolve conflicts between original and enriched data
   */
  private resolveConflicts(
    enrichedCV: ParsedCV,
    originalCV: ParsedCV,
    conflicts: ConflictResolution[]
  ): void {
    // Check for major discrepancies
    if (originalCV.experience && enrichedCV.experience) {
      const origLength = originalCV.experience.length;
      const enrichedLength = enrichedCV.experience.length;
      
      if (Math.abs(origLength - enrichedLength) > 2) {
        conflicts.push({
          field: 'experience',
          sources: ['cv', 'external'],
          resolution: 'kept original',
          reason: 'Significant discrepancy detected'
        });
        
        // Restore original experience
        enrichedCV.experience = originalCV.experience;
      }
    }
  }

  /**
   * Calculate CV quality score
   */
  private calculateCVQualityScore(cv: ParsedCV): number {
    let score = 0;
    const weights = {
      personalInfo: 10,
      summary: 15,
      experience: 25,
      education: 10,
      skills: 15,
      projects: 10,
      certifications: 5,
      achievements: 5,
      interests: 5
    };
    
    // Personal info completeness
    if (cv.personalInfo?.name) score += weights.personalInfo * 0.3;
    if (cv.personalInfo?.email) score += weights.personalInfo * 0.3;
    if (cv.personalInfo?.title) score += weights.personalInfo * 0.4;
    
    // Summary quality
    if (cv.summary && cv.summary.length > 100) score += weights.summary;
    else if (cv.summary && cv.summary.length > 50) score += weights.summary * 0.5;
    
    // Experience quality
    if (cv.experience && cv.experience.length > 0) {
      const avgDescLength = cv.experience.reduce((sum, exp) => 
        sum + (exp.description?.length || 0), 0) / cv.experience.length;
      
      if (avgDescLength > 100) score += weights.experience;
      else if (avgDescLength > 50) score += weights.experience * 0.6;
      else score += weights.experience * 0.3;
    }
    
    // Education
    if (cv.education && cv.education.length > 0) score += weights.education;
    
    // Skills
    const skillCount = Array.isArray(cv.skills) 
      ? cv.skills.length 
      : Object.values(cv.skills || {}).flat().length;
    
    if (skillCount > 10) score += weights.skills;
    else if (skillCount > 5) score += weights.skills * 0.6;
    else if (skillCount > 0) score += weights.skills * 0.3;
    
    // Projects
    if (cv.projects && cv.projects.length > 2) score += weights.projects;
    else if (cv.projects && cv.projects.length > 0) score += weights.projects * 0.5;
    
    // Certifications
    if (cv.certifications && cv.certifications.length > 0) score += weights.certifications;
    
    // Achievements
    if (cv.achievements && cv.achievements.length > 2) score += weights.achievements;
    else if (cv.achievements && cv.achievements.length > 0) score += weights.achievements * 0.5;
    
    // Interests
    if (cv.interests && cv.interests.length > 3) score += weights.interests;
    else if (cv.interests && cv.interests.length > 0) score += weights.interests * 0.5;
    
    return Math.round(score);
  }

  /**
   * Generate enrichment report
   */
  generateEnrichmentReport(result: EnrichmentResult): string {
    const report = [
      '=== CV Enrichment Report ===',
      `Generated: ${result.timestamp}`,
      '',
      '📊 Quality Improvement:',
      `  Before: ${result.qualityImprovement.before}%`,
      `  After: ${result.qualityImprovement.after}%`,
      `  Improvement: +${result.qualityImprovement.improvement}%`,
      '',
      '📁 Portfolio Enhancement:',
      `  New Projects: ${result.enrichmentSummary.portfolio.newProjectsAdded}`,
      `  Enhanced Projects: ${result.enrichmentSummary.portfolio.projectsEnhanced}`,
      `  Quality Score: ${result.enrichmentSummary.portfolio.qualityScore}%`,
      '',
      '🏆 Certification Enhancement:',
      `  New Certifications: ${result.enrichmentSummary.certifications.newCertificationsAdded}`,
      `  Verified: ${result.enrichmentSummary.certifications.certificationsVerified}`,
      `  Quality Score: ${result.enrichmentSummary.certifications.qualityScore}%`,
      '',
      '💡 Skills Enhancement:',
      `  New Skills: ${result.enrichmentSummary.skills.newSkillsAdded}`,
      `  Validated: ${result.enrichmentSummary.skills.skillsValidated}`,
      `  Quality Score: ${result.enrichmentSummary.skills.qualityScore}%`,
      '',
      '🎯 Interests Enhancement:',
      `  New Interests: ${result.enrichmentSummary.hobbies.newInterestsAdded}`,
      `  Quality Score: ${result.enrichmentSummary.hobbies.qualityScore}%`,
      '',
      '📝 Data Sources Used:',
      ...Array.from(new Set(result.dataAttribution.map(a => `  - ${a.source}`))),
      '',
      `✅ Total Enhancements: ${result.dataAttribution.length}`
    ];
    
    return report.join('\n');
  }
}