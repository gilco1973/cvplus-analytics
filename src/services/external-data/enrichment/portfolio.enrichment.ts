/**
 * Portfolio Enrichment Module
 * 
 * Merges external portfolio data from GitHub, NPM, and personal websites
 * into CV portfolio and projects sections
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { ParsedCV } from '../../../types/job';
import {
  GitHubRepository,
  PortfolioProject,
  EnrichedCVData
} from '../types';

export interface PortfolioEnrichmentResult {
  enrichedProjects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    images?: string[];
    source: 'cv' | 'github' | 'website' | 'npm';
    metrics?: {
      stars?: number;
      forks?: number;
      contributors?: number;
      downloads?: number;
      lastUpdated?: string;
    };
    confidence: number;
  }>;
  newProjectsAdded: number;
  projectsEnhanced: number;
  qualityScore: number;
}

export class PortfolioEnrichmentService {
  /**
   * Enriches CV portfolio with external data
   */
  async enrichPortfolio(
    cv: ParsedCV,
    externalData: Partial<EnrichedCVData>
  ): Promise<PortfolioEnrichmentResult> {
    console.log('Starting portfolio enrichment');
    
    const existingProjects = this.extractExistingProjects(cv);
    const githubProjects = this.convertGitHubProjects(externalData.github?.repositories);
    const websiteProjects = externalData.personalWebsite?.portfolioProjects || [];
    
    // Merge and deduplicate projects
    const mergedProjects = this.mergeProjects(
      existingProjects,
      githubProjects,
      websiteProjects
    );
    
    // Calculate enrichment metrics
    const result: PortfolioEnrichmentResult = {
      enrichedProjects: mergedProjects,
      newProjectsAdded: this.countNewProjects(existingProjects, mergedProjects),
      projectsEnhanced: this.countEnhancedProjects(existingProjects, mergedProjects),
      qualityScore: this.calculateQualityScore(mergedProjects)
    };
    
    console.log(`Portfolio enrichment complete: ${result.newProjectsAdded} new, ${result.projectsEnhanced} enhanced`);
    return result;
  }

  /**
   * Extract existing projects from CV
   */
  private extractExistingProjects(cv: ParsedCV): any[] {
    const projects = cv.projects || [];
    return projects.map(p => ({
      ...p,
      source: 'cv' as const,
      confidence: 1.0
    }));
  }

  /**
   * Convert GitHub repositories to portfolio projects
   */
  private convertGitHubProjects(repos?: GitHubRepository[]): any[] {
    if (!repos) return [];
    
    return repos
      .filter(repo => !repo.isPrivate && repo.stars > 0)
      .map(repo => ({
        name: repo.name,
        description: repo.description || '',
        technologies: [repo.language].filter(Boolean).concat(repo.topics || []),
        url: repo.url,
        source: 'github' as const,
        metrics: {
          stars: repo.stars,
          forks: repo.forks,
          lastUpdated: repo.updatedAt
        },
        confidence: this.calculateGitHubConfidence(repo)
      }));
  }

  /**
   * Merge projects from multiple sources
   */
  private mergeProjects(
    existing: any[],
    github: any[],
    website: PortfolioProject[]
  ): any[] {
    const merged = new Map<string, any>();
    
    // Start with existing CV projects
    existing.forEach(p => {
      const key = this.getProjectKey(p);
      merged.set(key, p);
    });
    
    // Enhance with GitHub data
    github.forEach(ghProject => {
      const key = this.getProjectKey(ghProject);
      const existing = merged.get(key);
      
      if (existing) {
        // Enhance existing project
        merged.set(key, this.enhanceProject(existing, ghProject));
      } else if (ghProject.confidence > 0.6) {
        // Add new high-confidence project
        merged.set(key, ghProject);
      }
    });
    
    // Add website projects
    website.forEach(webProject => {
      const key = this.getProjectKey(webProject);
      const existing = merged.get(key);
      
      if (existing) {
        merged.set(key, this.enhanceProject(existing, {
          ...webProject,
          source: 'website',
          confidence: 0.8
        }));
      } else {
        merged.set(key, {
          ...webProject,
          source: 'website',
          confidence: 0.8
        });
      }
    });
    
    return Array.from(merged.values())
      .sort((a, b) => {
        // Sort by confidence and metrics
        const scoreA = this.getProjectScore(a);
        const scoreB = this.getProjectScore(b);
        return scoreB - scoreA;
      })
      .slice(0, 10); // Limit to top 10 projects
  }

  /**
   * Enhance existing project with additional data
   */
  private enhanceProject(existing: any, additional: any): any {
    return {
      ...existing,
      description: existing.description || additional.description,
      technologies: Array.from(new Set([
        ...(existing.technologies || []),
        ...(additional.technologies || [])
      ])),
      url: existing.url || additional.url,
      images: [...(existing.images || []), ...(additional.images || [])],
      metrics: {
        ...existing.metrics,
        ...additional.metrics
      },
      source: existing.source === 'cv' ? additional.source : existing.source,
      confidence: Math.max(existing.confidence, additional.confidence)
    };
  }

  /**
   * Generate unique key for project deduplication
   */
  private getProjectKey(project: any): string {
    const name = project.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const tech = (project.technologies?.[0] || '').toLowerCase();
    return `${name}_${tech}`;
  }

  /**
   * Calculate confidence score for GitHub project
   */
  private calculateGitHubConfidence(repo: GitHubRepository): number {
    let confidence = 0.5;
    
    if (repo.stars > 10) confidence += 0.2;
    if (repo.stars > 50) confidence += 0.1;
    if (repo.forks > 5) confidence += 0.1;
    if (repo.description) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate project score for sorting
   */
  private getProjectScore(project: any): number {
    let score = project.confidence * 100;
    
    if (project.metrics?.stars) score += Math.log(project.metrics.stars + 1) * 10;
    if (project.metrics?.forks) score += Math.log(project.metrics.forks + 1) * 5;
    if (project.url) score += 10;
    if (project.description) score += 5;
    
    return score;
  }

  /**
   * Count newly added projects
   */
  private countNewProjects(existing: any[], merged: any[]): number {
    const existingKeys = new Set(existing.map(p => this.getProjectKey(p)));
    return merged.filter(p => !existingKeys.has(this.getProjectKey(p))).length;
  }

  /**
   * Count enhanced projects
   */
  private countEnhancedProjects(existing: any[], merged: any[]): number {
    const existingKeys = new Set(existing.map(p => this.getProjectKey(p)));
    return merged.filter(p => 
      existingKeys.has(this.getProjectKey(p)) && p.source !== 'cv'
    ).length;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(projects: any[]): number {
    if (projects.length === 0) return 0;
    
    const scores = projects.map(p => {
      let score = 0;
      if (p.description) score += 20;
      if (p.url) score += 20;
      if (p.technologies?.length > 2) score += 20;
      if (p.metrics?.stars > 0) score += 20;
      if (p.images?.length > 0) score += 20;
      return score;
    });
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / projects.length);
  }
}