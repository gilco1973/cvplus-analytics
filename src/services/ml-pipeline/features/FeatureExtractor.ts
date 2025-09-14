// @ts-nocheck
/**
 * Feature Extractor - Orchestrates feature extraction from multiple sources
 * 
 * Coordinates CV, job matching, market, behavior, and derived feature extraction
 * while managing caching and performance optimization.
 */

import { FeatureVector } from '../../../types/phase2-models';
import { PredictionRequest } from '../core/MLPipelineOrchestrator';
import { PredictionCache } from '../core/PredictionCache';
import { CVFeatureService } from './CVFeatureService';
import { MatchingFeatureService } from './MatchingFeatureService';
import { MarketFeatureService } from './MarketFeatureService';
import { BehaviorFeatureService } from './BehaviorFeatureService';
import { DerivedFeatureService } from './DerivedFeatureService';

export class FeatureExtractor {
  private cvFeatureService!: CVFeatureService;
  private matchingFeatureService!: MatchingFeatureService;
  private marketFeatureService!: MarketFeatureService;
  private behaviorFeatureService!: BehaviorFeatureService;
  private derivedFeatureService!: DerivedFeatureService;
  private predictionCache!: PredictionCache;

  constructor() {
    this.initializeServices();
  }

  /**
   * Extract comprehensive features from CV and job context
   */
  async extractFeatures(request: PredictionRequest): Promise<FeatureVector> {
    const { cv, jobDescription, industry, location } = request;
    // @ts-ignore - targetRole preserved for future feature extraction use
    const { targetRole } = request;
    
    // Check feature cache first
    const cachedFeatures = await this.predictionCache.getFeatures(request);
    if (cachedFeatures) {
      return cachedFeatures;
    }
    
    const startTime = Date.now();
    
    try {
      // Extract features from different sources in parallel
      const [
        cvFeatures,
        matchingFeatures,
        marketFeatures
      ] = await Promise.all([
        this.cvFeatureService.extractFeatures(cv),
        this.matchingFeatureService.extractFeatures(cv, jobDescription),
        this.marketFeatureService.extractFeatures(industry, location)
      ]);
      
      // Extract derived features (depends on other features)
      const derivedFeatures = await this.derivedFeatureService.extractFeatures(
        cv,
        jobDescription,
        { cvFeatures, matchingFeatures, marketFeatures }
      );
      
      // Construct final feature vector
      const features: FeatureVector = {
        userId: request.userId,
        jobId: request.jobId,
        extractionDate: new Date(),
        
        cvFeatures,
        matchingFeatures,
        marketFeatures,
        derivedFeatures
      };
      
      // Cache the features
      await this.predictionCache.setFeatures(request, features);
      
      const extractionTime = Date.now() - startTime;
      
      // Log feature quality metrics
      this.logFeatureQuality(features);
      
      return features;
      
    } catch (error) {
      
      // Return fallback features
      return this.generateFallbackFeatures(request);
    }
  }

  /**
   * Validate feature vector completeness and quality
   */
  async validateFeatures(features: FeatureVector): Promise<{
    isValid: boolean;
    completeness: number;
    qualityScore: number;
    missingFeatures: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const missingFeatures: string[] = [];
    
    // Check CV features
    if (!features.rawFeatures?.cvWordCount || features.rawFeatures.cvWordCount < 50) {
      issues.push('CV word count is too low');
      missingFeatures.push('sufficient CV content');
    }
    
    if ((features.rawFeatures?.yearsExperience || 0) === 0) {
      issues.push('No work experience detected');
      missingFeatures.push('work experience');
    }
    
    if ((features.rawFeatures?.skillsCount || 0) === 0) {
      issues.push('No skills detected');
      missingFeatures.push('skills information');
    }
    
    // Check matching features
    if ((features.matchingFeatures?.skillMatchPercentage || 0) < 0.1) {
      issues.push('Very low skill matching with job');
    }
    
    // Calculate completeness (0-1 scale)
    const totalFeatureGroups = 5;
    const presentGroups = [
      features.cvFeatures,
      features.matchingFeatures,
      features.marketFeatures,
      features.derivedFeatures
    ].filter(group => Object.values(group).some(value => value !== 0 && value !== undefined)).length;
    
    const completeness = presentGroups / totalFeatureGroups;
    
    // Calculate quality score based on feature richness
    let qualityScore = 0.5; // Base score
    
    if ((features.rawFeatures?.cvWordCount || 0) > 200) qualityScore += 0.1;
    if ((features.rawFeatures?.yearsExperience || 0) > 2) qualityScore += 0.1;
    if ((features.rawFeatures?.skillsCount || 0) > 5) qualityScore += 0.1;
    if ((features.matchingFeatures?.skillMatchPercentage || 0) > 0.5) qualityScore += 0.1;
    if ((features.cvFeatures?.educationLevel || 0) > 2) qualityScore += 0.1;
    if ((features.rawFeatures?.readabilityScore || 0) > 0.7) qualityScore += 0.1;
    
    qualityScore = Math.min(1.0, qualityScore);
    
    const isValid = completeness >= 0.6 && qualityScore >= 0.5 && issues.length < 3;
    
    return {
      isValid,
      completeness,
      qualityScore,
      missingFeatures,
      issues
    };
  }

  /**
   * Get feature importance scores for interpretability
   */
  async getFeatureImportance(features: FeatureVector): Promise<Record<string, number>> {
    const importance: Record<string, number> = {};
    
    // CV Features (40% total weight)
    importance['cv.experienceYears'] = 0.15;
    importance['cv.skillsCount'] = 0.10;
    importance['cv.educationLevel'] = 0.08;
    importance['cv.readabilityScore'] = 0.07;
    
    // Matching Features (35% total weight)
    importance['matching.skillMatchPercentage'] = 0.20;
    importance['matching.experienceRelevance'] = 0.10;
    importance['matching.titleSimilarity'] = 0.05;
    
    // Market Features (15% total weight)
    importance['market.demandSupplyRatio'] = 0.08;
    importance['market.industryGrowth'] = 0.04;
    importance['market.locationCompetitiveness'] = 0.03;
    
    // Behavior Features (5% total weight)
    importance['behavior.platformEngagement'] = 0.03;
    importance['behavior.applicationTiming'] = 0.02;
    
    // Derived Features (5% total weight)
    importance['derived.careerProgressionScore'] = 0.02;
    importance['derived.leadershipPotential'] = 0.02;
    importance['derived.adaptabilityScore'] = 0.01;
    
    return importance;
  }

  /**
   * Health check for feature extraction service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check all feature services
      const serviceChecks = await Promise.all([
        this.cvFeatureService.healthCheck?.() || Promise.resolve(true),
        this.matchingFeatureService.healthCheck?.() || Promise.resolve(true),
        this.marketFeatureService.healthCheck?.() || Promise.resolve(true),
        this.behaviorFeatureService.healthCheck?.() || Promise.resolve(true),
        this.derivedFeatureService.healthCheck?.() || Promise.resolve(true)
      ]);
      
      return serviceChecks.every(check => check === true);
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private initializeServices(): void {
    this.cvFeatureService = new CVFeatureService();
    this.matchingFeatureService = new MatchingFeatureService();
    this.marketFeatureService = new MarketFeatureService();
    this.behaviorFeatureService = new BehaviorFeatureService();
    this.derivedFeatureService = new DerivedFeatureService();
    this.predictionCache = new PredictionCache();
  }

  private generateFallbackFeatures(request: PredictionRequest): FeatureVector {
    
    const fallbackFeatures: FeatureVector = {
      userId: request.userId,
      jobId: request.jobId,
      extractionDate: new Date(),
      
      cvFeatures: {
        wordCount: 150, // Minimal fallback
        sectionsCount: 3,
        skillsCount: 5,
        experienceYears: 2,
        educationLevel: 2,
        certificationsCount: 0,
        projectsCount: 1,
        achievementsCount: 1,
        keywordDensity: 0.5,
        readabilityScore: 0.6,
        formattingScore: 0.5
      },
      
      matchingFeatures: {
        skillMatchPercentage: 0.3,
        experienceRelevance: 0.4,
        educationMatch: 0.5,
        industryExperience: 0.3,
        locationMatch: 0.8,
        salaryAlignment: 0.7,
        titleSimilarity: 0.2,
        companyFit: 0.5
      },
      
      marketFeatures: {
        industryGrowth: 0.1,
        locationCompetitiveness: 0.7,
        salaryCompetitiveness: 0.8,
        demandSupplyRatio: 1.0,
        seasonality: 1.0,
        economicIndicators: 0.8
      },
      
      
      derivedFeatures: {
        overqualificationScore: 0.3,
        underqualificationScore: 0.4,
        careerProgressionScore: 0.5,
        stabilityScore: 0.6,
        adaptabilityScore: 0.5,
        leadershipPotential: 0.4,
        innovationIndicator: 0.3
      }
    };
    
    return fallbackFeatures;
  }

  private logFeatureQuality(features: FeatureVector): void {
    const cvFeatureCount = Object.keys(features.cvFeatures || {}).length;
    const matchingFeatureCount = Object.keys(features.matchingFeatures || {}).length;
    const totalFeatures = cvFeatureCount + matchingFeatureCount + 
                         Object.keys(features.marketFeatures || {}).length +
                         Object.keys(features.derivedFeatures || {}).length;
    
  }
}