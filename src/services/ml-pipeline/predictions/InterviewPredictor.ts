// @ts-nocheck
/**
 * Interview Predictor Service
 * 
 * Predicts the probability of getting an interview based on CV-job matching,
 * market conditions, and user behavior patterns.
 */

import { FeatureVector } from '../../../types/phase2-models';

export class InterviewPredictor {
  private static readonly ML_API_ENDPOINT = process.env.ML_API_ENDPOINT || 'https://ml-api.cvplus.com/v1';
  private static readonly ML_API_KEY = process.env.ML_API_KEY || '';
  
  /**
   * Predict interview probability based on feature vector
   */
  async predict(features: FeatureVector): Promise<number> {
    try {
      
      // Try ML service first
      const mlPrediction = await this.callMLService(features);
      
      if (mlPrediction !== null) {
        return mlPrediction;
      }
      
      // Fallback to heuristic prediction
      const heuristicPrediction = this.calculateHeuristicPrediction(features);
      
      return heuristicPrediction;
      
    } catch (error) {
      return this.calculateHeuristicPrediction(features);
    }
  }

  /**
   * Health check for interview predictor
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Create test feature vector
      const testFeatures = this.createTestFeatures();
      const prediction = await this.predict(testFeatures);
      
      return prediction >= 0 && prediction <= 1;
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private async callMLService(features: FeatureVector): Promise<number | null> {
    try {
      if (!InterviewPredictor.ML_API_KEY) {
        return null; // No API key configured
      }
      
      const response = await fetch(`${InterviewPredictor.ML_API_ENDPOINT}/predict/interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${InterviewPredictor.ML_API_KEY}`,
          'X-Service': 'cvplus-interview-predictor'
        },
        body: JSON.stringify({ features }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      
      if (result.probability !== undefined && typeof result.probability === 'number') {
        return Math.max(0, Math.min(1, result.probability));
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private calculateHeuristicPrediction(features: FeatureVector): number {
    
    let score = 0.15; // Base probability (industry average ~15%)
    
    // 1. Skill Matching (40% weight)
    const skillMatch = features.matchingFeatures.skillMatchPercentage;
    score += skillMatch * 0.40;
    
    // 2. Experience Relevance (25% weight)
    const experienceRelevance = features.matchingFeatures.experienceRelevance;
    score += experienceRelevance * 0.25;
    
    // 3. Title Similarity (15% weight)
    const titleSimilarity = features.matchingFeatures.titleSimilarity;
    score += titleSimilarity * 0.15;
    
    // 4. Education Match (10% weight)
    const educationMatch = features.matchingFeatures.educationMatch;
    score += educationMatch * 0.10;
    
    // 5. CV Quality Bonus (5% weight)
    const cvQuality = this.calculateCVQuality(features.cvFeatures);
    score += cvQuality * 0.05;
    
    // 6. Market Conditions Adjustment (5% weight)
    const marketBonus = this.calculateMarketBonus(features.marketFeatures);
    score += marketBonus * 0.05;
    
    // Apply derived feature modifiers
    score = this.applyDerivedFeatureModifiers(score, features.derivedFeatures);
    
    // Apply behavior modifiers
    score = this.applyBehaviorModifiers(score, features.behaviorFeatures);
    
    // Apply overqualification/underqualification penalties
    score = this.applyQualificationAdjustments(score, features.derivedFeatures);
    
    // Clamp result between 0.01 and 0.95
    return Math.max(0.01, Math.min(0.95, score));
  }

  private calculateCVQuality(cvFeatures: FeatureVector['cvFeatures']): number {
    let qualityScore = 0;
    
    // Readability and formatting
    qualityScore += cvFeatures.readabilityScore * 0.4;
    qualityScore += cvFeatures.formattingScore * 0.3;
    
    // Content richness
    if (cvFeatures.wordCount >= 200) qualityScore += 0.1;
    if (cvFeatures.achievementsCount > 0) qualityScore += 0.1;
    if (cvFeatures.sectionsCount >= 4) qualityScore += 0.1;
    
    return Math.min(1.0, qualityScore);
  }

  private calculateMarketBonus(marketFeatures: FeatureVector['marketFeatures']): number {
    let marketScore = 0;
    
    // Demand-supply ratio bonus
    if (marketFeatures.demandSupplyRatio > 1.5) {
      marketScore += 0.3; // High demand market
    } else if (marketFeatures.demandSupplyRatio > 1.2) {
      marketScore += 0.2; // Moderate demand market
    } else if (marketFeatures.demandSupplyRatio > 1.0) {
      marketScore += 0.1; // Balanced market
    }
    
    // Industry growth bonus
    if (marketFeatures.industryGrowth > 0.15) {
      marketScore += 0.2; // High growth industry
    } else if (marketFeatures.industryGrowth > 0.08) {
      marketScore += 0.1; // Moderate growth industry
    }
    
    // Economic indicators
    marketScore += marketFeatures.economicIndicators * 0.2;
    
    // Seasonality adjustment
    marketScore *= marketFeatures.seasonality;
    
    return Math.min(1.0, marketScore);
  }

  private applyDerivedFeatureModifiers(
    baseScore: number, 
    derivedFeatures: FeatureVector['derivedFeatures']
  ): number {
    let modifiedScore = baseScore;
    
    // Career progression bonus
    if (derivedFeatures.careerProgressionScore > 0.8) {
      modifiedScore *= 1.15; // 15% bonus for strong progression
    } else if (derivedFeatures.careerProgressionScore > 0.6) {
      modifiedScore *= 1.08; // 8% bonus for good progression
    }
    
    // Stability bonus (but not too much - some movement is good)
    if (derivedFeatures.stabilityScore > 0.7 && derivedFeatures.stabilityScore < 0.95) {
      modifiedScore *= 1.05; // 5% bonus for balanced stability
    }
    
    // Adaptability bonus
    if (derivedFeatures.adaptabilityScore > 0.8) {
      modifiedScore *= 1.10; // 10% bonus for high adaptability
    }
    
    // Innovation bonus
    if (derivedFeatures.innovationIndicator > 0.7) {
      modifiedScore *= 1.05; // 5% bonus for innovation
    }
    
    return modifiedScore;
  }

  private applyBehaviorModifiers(
    baseScore: number, 
    behaviorFeatures: FeatureVector['behaviorFeatures']
  ): number {
    let modifiedScore = baseScore;
    
    // Application timing bonus
    if (behaviorFeatures.applicationTiming <= 2) {
      modifiedScore *= 1.10; // Applied within 2 days
    } else if (behaviorFeatures.applicationTiming <= 7) {
      modifiedScore *= 1.05; // Applied within a week
    } else if (behaviorFeatures.applicationTiming > 30) {
      modifiedScore *= 0.90; // Late application penalty
    }
    
    // Weekday application bonus
    if (behaviorFeatures.weekdayApplication) {
      modifiedScore *= 1.03; // Small bonus for professional timing
    }
    
    // CV optimization bonus
    if (behaviorFeatures.cvOptimizationLevel > 0.8) {
      modifiedScore *= 1.08; // Shows preparation and attention
    } else if (behaviorFeatures.cvOptimizationLevel > 0.6) {
      modifiedScore *= 1.03;
    }
    
    // Platform engagement bonus
    if (behaviorFeatures.platformEngagement > 0.8) {
      modifiedScore *= 1.05; // Active user bonus
    }
    
    return modifiedScore;
  }

  private applyQualificationAdjustments(
    baseScore: number,
    derivedFeatures: FeatureVector['derivedFeatures']
  ): number {
    let adjustedScore = baseScore;
    
    // Overqualification penalty
    if (derivedFeatures.overqualificationScore > 0.7) {
      adjustedScore *= 0.85; // 15% penalty for high overqualification
    } else if (derivedFeatures.overqualificationScore > 0.5) {
      adjustedScore *= 0.92; // 8% penalty for moderate overqualification
    }
    
    // Underqualification penalty
    if (derivedFeatures.underqualificationScore > 0.7) {
      adjustedScore *= 0.70; // 30% penalty for significant underqualification
    } else if (derivedFeatures.underqualificationScore > 0.5) {
      adjustedScore *= 0.85; // 15% penalty for moderate underqualification
    } else if (derivedFeatures.underqualificationScore > 0.3) {
      adjustedScore *= 0.95; // 5% penalty for minor underqualification
    }
    
    return adjustedScore;
  }

  private createTestFeatures(): FeatureVector {
    return {
      userId: 'test_user',
      jobId: 'test_job',
      extractionDate: new Date(),
      
      cvFeatures: {
        wordCount: 250,
        sectionsCount: 4,
        skillsCount: 8,
        experienceYears: 5,
        educationLevel: 3,
        certificationsCount: 2,
        projectsCount: 3,
        achievementsCount: 5,
        keywordDensity: 0.6,
        readabilityScore: 0.8,
        formattingScore: 0.7
      },
      
      matchingFeatures: {
        skillMatchPercentage: 0.75,
        experienceRelevance: 0.80,
        educationMatch: 0.85,
        industryExperience: 0.70,
        locationMatch: 0.90,
        salaryAlignment: 0.80,
        titleSimilarity: 0.65,
        companyFit: 0.70
      },
      
      marketFeatures: {
        industryGrowth: 0.12,
        locationCompetitiveness: 0.75,
        salaryCompetitiveness: 0.80,
        demandSupplyRatio: 1.3,
        seasonality: 1.0,
        economicIndicators: 0.8
      },
      
      behaviorFeatures: {
        applicationTiming: 2,
        weekdayApplication: true,
        timeOfDay: 14,
        applicationMethod: 1,
        cvOptimizationLevel: 0.8,
        platformEngagement: 0.85,
        previousApplications: 5
      },
      
      derivedFeatures: {
        overqualificationScore: 0.2,
        underqualificationScore: 0.1,
        careerProgressionScore: 0.75,
        stabilityScore: 0.80,
        adaptabilityScore: 0.70,
        leadershipPotential: 0.60,
        innovationIndicator: 0.55
      }
    };
  }
}