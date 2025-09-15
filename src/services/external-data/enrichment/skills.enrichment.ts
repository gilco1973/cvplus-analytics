/**
 * Skills Enrichment Module
 * 
 * Validates and enriches technical skills from GitHub language stats,
 * LinkedIn endorsements, and project descriptions
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { ParsedCV } from '../../../types/job';
import { EnrichedCVData, GitHubStats } from '../types';

export interface SkillEnrichmentResult {
  enrichedSkills: {
    technical: SkillWithMetadata[];
    soft: SkillWithMetadata[];
    languages: SkillWithMetadata[];
    tools: SkillWithMetadata[];
    frameworks: SkillWithMetadata[];
  };
  newSkillsAdded: number;
  skillsValidated: number;
  proficiencyLevels: Map<string, ProficiencyLevel>;
  qualityScore: number;
}

export interface SkillWithMetadata {
  name: string;
  category: string;
  proficiency: ProficiencyLevel;
  validated: boolean;
  endorsements?: number;
  yearsOfExperience?: number;
  lastUsed?: string;
  sources: string[];
  confidence: number;
}

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export class SkillsEnrichmentService {
  /**
   * Enriches CV skills with validation and proficiency data
   */
  async enrichSkills(
    cv: ParsedCV,
    externalData: Partial<EnrichedCVData>
  ): Promise<SkillEnrichmentResult> {
    console.log('Starting skills enrichment');
    
    const existingSkills = this.extractExistingSkills(cv);
    const githubSkills = this.extractGitHubSkills(externalData.github);
    const linkedInSkills = this.extractLinkedInSkills(externalData);
    const projectSkills = this.extractProjectSkills(cv, externalData);
    
    // Merge and validate skills
    const mergedSkills = this.mergeSkills(
      existingSkills,
      githubSkills,
      linkedInSkills,
      projectSkills
    );
    
    // Calculate proficiency levels
    const proficiencyLevels = this.calculateProficiencyLevels(mergedSkills);
    
    // Organize skills by category
    const organizedSkills = this.organizeSkillsByCategory(mergedSkills);
    
    // Calculate enrichment metrics
    const result: SkillEnrichmentResult = {
      enrichedSkills: organizedSkills,
      newSkillsAdded: this.countNewSkills(existingSkills, mergedSkills),
      skillsValidated: this.countValidatedSkills(mergedSkills),
      proficiencyLevels,
      qualityScore: this.calculateQualityScore(mergedSkills)
    };
    
    console.log(`Skills enrichment complete: ${result.newSkillsAdded} new, ${result.skillsValidated} validated`);
    return result;
  }

  /**
   * Extract existing skills from CV
   */
  private extractExistingSkills(cv: ParsedCV): SkillWithMetadata[] {
    const skills: SkillWithMetadata[] = [];
    
    if (Array.isArray(cv.skills)) {
      cv.skills.forEach(skill => {
        skills.push(this.createSkillMetadata(skill, 'technical', ['cv']));
      });
    } else if (cv.skills) {
      Object.entries(cv.skills).forEach(([category, categorySkills]) => {
        if (Array.isArray(categorySkills)) {
          categorySkills.forEach(skill => {
            skills.push(this.createSkillMetadata(skill, category, ['cv']));
          });
        }
      });
    }
    
    return skills;
  }

  /**
   * Extract skills from GitHub statistics
   */
  private extractGitHubSkills(github?: any): SkillWithMetadata[] {
    if (!github?.stats) return [];
    
    const skills: SkillWithMetadata[] = [];
    const stats = github.stats as GitHubStats;
    
    // Extract programming languages with usage statistics
    Object.entries(stats.languages || {}).forEach(([language, bytes]) => {
      const totalBytes = Object.values(stats.languages).reduce((a, b) => a + b, 0);
      const percentage = (bytes / totalBytes) * 100;
      
      skills.push({
        name: language,
        category: 'languages',
        proficiency: this.getProficiencyFromUsage(percentage),
        validated: true,
        sources: ['github'],
        confidence: Math.min(0.5 + (percentage / 100), 1.0)
      });
    });
    
    // Extract tools and frameworks from repository topics
    github.repositories?.forEach((repo: any) => {
      repo.topics?.forEach((topic: string) => {
        if (this.isFrameworkOrTool(topic)) {
          skills.push({
            name: this.formatSkillName(topic),
            category: this.categorizeSkill(topic),
            proficiency: 'intermediate',
            validated: true,
            sources: ['github'],
            confidence: 0.7
          });
        }
      });
    });
    
    return skills;
  }

  /**
   * Extract skills from LinkedIn data
   */
  private extractLinkedInSkills(externalData: Partial<EnrichedCVData>): SkillWithMetadata[] {
    const skills: SkillWithMetadata[] = [];
    const linkedIn = externalData.linkedin;
    
    if (!linkedIn) return skills;
    
    // Extract endorsed skills
    linkedIn.skills?.forEach(skill => {
      skills.push({
        name: skill,
        category: this.categorizeSkill(skill),
        proficiency: 'intermediate',
        validated: true,
        endorsements: linkedIn.endorsements,
        sources: ['linkedin'],
        confidence: 0.85
      });
    });
    
    // Extract skills from experience descriptions
    linkedIn.experience?.forEach(exp => {
      exp.skills?.forEach(skill => {
        skills.push({
          name: skill,
          category: this.categorizeSkill(skill),
          proficiency: 'intermediate',
          validated: false,
          sources: ['linkedin-experience'],
          confidence: 0.6
        });
      });
    });
    
    return skills;
  }

  /**
   * Extract skills from projects
   */
  private extractProjectSkills(cv: ParsedCV, externalData: Partial<EnrichedCVData>): SkillWithMetadata[] {
    const skills: SkillWithMetadata[] = [];
    
    // From CV projects
    cv.projects?.forEach(project => {
      project.technologies?.forEach(tech => {
        skills.push({
          name: tech,
          category: this.categorizeSkill(tech),
          proficiency: 'intermediate',
          validated: false,
          sources: ['cv-projects'],
          confidence: 0.7
        });
      });
    });
    
    // From aggregated projects
    externalData.aggregatedProjects?.forEach(project => {
      project.technologies?.forEach(tech => {
        skills.push({
          name: tech,
          category: this.categorizeSkill(tech),
          proficiency: 'intermediate',
          validated: false,
          sources: ['external-projects'],
          confidence: 0.6
        });
      });
    });
    
    return skills;
  }

  /**
   * Merge skills from multiple sources
   */
  private mergeSkills(...skillGroups: SkillWithMetadata[][]): SkillWithMetadata[] {
    const merged = new Map<string, SkillWithMetadata>();
    
    skillGroups.forEach(group => {
      group.forEach(skill => {
        const key = this.getSkillKey(skill.name);
        const existing = merged.get(key);
        
        if (existing) {
          // Merge skill data
          merged.set(key, this.mergeSkillData(existing, skill));
        } else {
          merged.set(key, skill);
        }
      });
    });
    
    return Array.from(merged.values())
      .filter(s => s.confidence > 0.4)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Merge data for duplicate skills
   */
  private mergeSkillData(existing: SkillWithMetadata, additional: SkillWithMetadata): SkillWithMetadata {
    return {
      ...existing,
      validated: existing.validated || additional.validated,
      endorsements: Math.max(existing.endorsements || 0, additional.endorsements || 0),
      sources: Array.from(new Set(existing.sources.concat(additional.sources))),
      confidence: Math.max(existing.confidence, additional.confidence),
      proficiency: this.higherProficiency(existing.proficiency, additional.proficiency)
    };
  }

  /**
   * Calculate proficiency levels based on evidence
   */
  private calculateProficiencyLevels(skills: SkillWithMetadata[]): Map<string, ProficiencyLevel> {
    const proficiencyMap = new Map<string, ProficiencyLevel>();
    
    skills.forEach(skill => {
      let proficiency: ProficiencyLevel = 'beginner';
      
      // Calculate based on multiple factors
      if (skill.validated && skill.sources.length > 2) {
        proficiency = 'expert';
      } else if (skill.validated && skill.sources.length > 1) {
        proficiency = 'advanced';
      } else if (skill.validated || skill.sources.length > 1) {
        proficiency = 'intermediate';
      }
      
      // Adjust based on endorsements
      if (skill.endorsements && skill.endorsements > 10) {
        proficiency = this.higherProficiency(proficiency, 'advanced');
      }
      
      proficiencyMap.set(skill.name, proficiency);
    });
    
    return proficiencyMap;
  }

  /**
   * Organize skills by category
   */
  private organizeSkillsByCategory(skills: SkillWithMetadata[]): any {
    const organized: any = {
      technical: [],
      soft: [],
      languages: [],
      tools: [],
      frameworks: []
    };
    
    skills.forEach(skill => {
      const category = this.mapToStandardCategory(skill.category);
      if (organized[category]) {
        organized[category].push(skill);
      } else {
        organized.technical.push(skill);
      }
    });
    
    // Sort each category by confidence
    Object.keys(organized).forEach(category => {
      organized[category].sort((a: SkillWithMetadata, b: SkillWithMetadata) => 
        b.confidence - a.confidence
      );
    });
    
    return organized;
  }

  /**
   * Helper methods
   */
  private createSkillMetadata(name: string, category: string, sources: string[]): SkillWithMetadata {
    return {
      name,
      category,
      proficiency: 'intermediate',
      validated: false,
      sources,
      confidence: sources.includes('cv') ? 0.8 : 0.5
    };
  }

  private getSkillKey(skill: string): string {
    return skill.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private categorizeSkill(skill: string): string {
    const lower = skill.toLowerCase();
    
    if (this.isProgrammingLanguage(lower)) return 'languages';
    if (this.isFramework(lower)) return 'frameworks';
    if (this.isTool(lower)) return 'tools';
    if (this.isSoftSkill(lower)) return 'soft';
    
    return 'technical';
  }

  private mapToStandardCategory(category: string): string {
    const mapping: Record<string, string> = {
      'programming': 'languages',
      'frontend': 'frameworks',
      'backend': 'frameworks',
      'databases': 'tools',
      'cloud': 'tools',
      'competencies': 'soft'
    };
    
    return mapping[category] || category;
  }

  private isProgrammingLanguage(skill: string): boolean {
    const languages = ['javascript', 'python', 'java', 'c++', 'c#', 'ruby', 
                      'go', 'rust', 'kotlin', 'swift', 'php', 'typescript'];
    return languages.some(lang => skill.includes(lang));
  }

  private isFramework(skill: string): boolean {
    const frameworks = ['react', 'angular', 'vue', 'django', 'flask', 'spring',
                       'express', 'rails', 'laravel', 'next', 'nuxt'];
    return frameworks.some(fw => skill.includes(fw));
  }

  private isFrameworkOrTool(topic: string): boolean {
    return this.isFramework(topic) || this.isTool(topic);
  }

  private isTool(skill: string): boolean {
    const tools = ['docker', 'kubernetes', 'git', 'jenkins', 'aws', 'azure',
                  'gcp', 'mongodb', 'postgresql', 'redis', 'elasticsearch'];
    return tools.some(tool => skill.includes(tool));
  }

  private isSoftSkill(skill: string): boolean {
    const soft = ['leadership', 'communication', 'teamwork', 'problem-solving',
                 'analytical', 'creative', 'management', 'agile'];
    return soft.some(s => skill.includes(s));
  }

  private formatSkillName(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getProficiencyFromUsage(percentage: number): ProficiencyLevel {
    if (percentage > 40) return 'expert';
    if (percentage > 20) return 'advanced';
    if (percentage > 10) return 'intermediate';
    return 'beginner';
  }

  private higherProficiency(p1: ProficiencyLevel, p2: ProficiencyLevel): ProficiencyLevel {
    const levels: ProficiencyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const i1 = levels.indexOf(p1);
    const i2 = levels.indexOf(p2);
    return levels[Math.max(i1, i2)];
  }

  private countNewSkills(existing: SkillWithMetadata[], merged: SkillWithMetadata[]): number {
    const existingKeys = new Set(existing.map(s => this.getSkillKey(s.name)));
    return merged.filter(s => !existingKeys.has(this.getSkillKey(s.name))).length;
  }

  private countValidatedSkills(skills: SkillWithMetadata[]): number {
    return skills.filter(s => s.validated).length;
  }

  private calculateQualityScore(skills: SkillWithMetadata[]): number {
    if (skills.length === 0) return 0;
    
    const validatedRatio = this.countValidatedSkills(skills) / skills.length;
    const avgSources = skills.reduce((sum, s) => sum + s.sources.length, 0) / skills.length;
    const avgConfidence = skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length;
    
    return Math.round((validatedRatio * 40) + (avgSources * 20) + (avgConfidence * 40));
  }
}