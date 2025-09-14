/**
 * Offer Predictor Service
 * 
 * Predicts the probability of receiving a job offer based on interview success
 * likelihood, market competition, and candidate qualifications.
 */

import { FeatureVector } from '../../../types/phase2-models';

export class OfferPredictor {
  private static readonly ML_API_ENDPOINT = process.env.ML_API_ENDPOINT || 'https://ml-api.cvplus.com/v1';
  private static readonly ML_API_KEY = process.env.ML_API_KEY || '';
  
  /**
   * Predict offer probability based on feature vector
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
   * Health check for offer predictor
   */
  async healthCheck(): Promise<boolean> {
    try {
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
      if (!OfferPredictor.ML_API_KEY) {
        return null;
      }
      
      const response = await fetch(`${OfferPredictor.ML_API_ENDPOINT}/predict/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OfferPredictor.ML_API_KEY}`,
          'X-Service': 'cvplus-offer-predictor'
        },
        body: JSON.stringify({ features }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.probability !== undefined ? Math.max(0, Math.min(1, result.probability)) : null;
      
    } catch (error) {
      return null;
    }
  }

  private calculateHeuristicPrediction(features: FeatureVector): number {
    
    // Base conversion rate from interview to offer (industry average ~35-40%)
    let score = 0.08; // Base offer probability (8% of all applications)
    
    // 1. Strong skill matching increases offer likelihood (30% weight)
    const skillMatch = features.matchingFeatures.skillMatchPercentage;
    score += skillMatch * skillMatch * 0.30; // Quadratic relationship for skills
    
    // 2. Experience relevance is crucial for offers (25% weight)
    const experienceRelevance = features.matchingFeatures.experienceRelevance;
    score += experienceRelevance * 0.25;
    
    // 3. Education match (15% weight)
    const educationMatch = features.matchingFeatures.educationMatch;
    score += educationMatch * 0.15;
    
    // 4. Title similarity (10% weight)
    const titleSimilarity = features.matchingFeatures.titleSimilarity;
    score += titleSimilarity * 0.10;
    
    // 5. Company fit assessment (10% weight)
    const companyFit = features.matchingFeatures.companyFit;
    score += companyFit * 0.10;
    
    // 6. Market demand conditions (10% weight)
    const marketBonus = this.calculateMarketBonus(features.marketFeatures);
    score += marketBonus * 0.10;
    
    // Apply derived feature modifiers
    score = this.applyDerivedFeatureModifiers(score, features.derivedFeatures);
    
    // Apply strong penalties for misalignment
    score = this.applyQualificationPenalties(score, features.derivedFeatures);
    
    // Apply competition adjustment
    score = this.applyCompetitionAdjustment(score, features.marketFeatures);
    
    // Salary alignment factor
    score *= (0.5 + features.matchingFeatures.salaryAlignment * 0.5);
    
    return Math.max(0.005, Math.min(0.85, score)); // Offers are generally harder to get
  }

  private calculateMarketBonus(marketFeatures: FeatureVector['marketFeatures']): number {
    let marketScore = 0;
    
    // High demand markets increase offer likelihood
    if (marketFeatures.demandSupplyRatio > 2.0) {
      marketScore += 0.4; // Very high demand
    } else if (marketFeatures.demandSupplyRatio > 1.5) {
      marketScore += 0.3; // High demand
    } else if (marketFeatures.demandSupplyRatio > 1.2) {
      marketScore += 0.2; // Moderate demand
    } else if (marketFeatures.demandSupplyRatio > 1.0) {
      marketScore += 0.1; // Balanced market
    }
    
    // Industry growth factor
    if (marketFeatures.industryGrowth > 0.20) {
      marketScore += 0.3; // Very high growth
    } else if (marketFeatures.industryGrowth > 0.15) {
      marketScore += 0.2; // High growth
    } else if (marketFeatures.industryGrowth > 0.10) {
      marketScore += 0.1; // Moderate growth
    }
    
    // Economic indicators
    marketScore += marketFeatures.economicIndicators * 0.3;
    
    return Math.min(1.0, marketScore);
  }

  private applyDerivedFeatureModifiers(
    baseScore: number, 
    derivedFeatures: FeatureVector['derivedFeatures']
  ): number {
    let modifiedScore = baseScore;
    
    // Leadership potential strongly correlates with offers
    if (derivedFeatures.leadershipPotential > 0.8) {
      modifiedScore *= 1.25; // 25% bonus for strong leadership
    } else if (derivedFeatures.leadershipPotential > 0.6) {
      modifiedScore *= 1.15; // 15% bonus for moderate leadership
    }
    
    // Innovation indicator
    if (derivedFeatures.innovationIndicator > 0.8) {
      modifiedScore *= 1.20; // 20% bonus for high innovation
    } else if (derivedFeatures.innovationIndicator > 0.6) {
      modifiedScore *= 1.10; // 10% bonus for moderate innovation
    }
    
    // Career progression shows trajectory
    if (derivedFeatures.careerProgressionScore > 0.8) {
      modifiedScore *= 1.18; // 18% bonus for strong progression
    } else if (derivedFeatures.careerProgressionScore > 0.6) {
      modifiedScore *= 1.10; // 10% bonus for good progression
    }
    
    // Adaptability is valuable for offers
    if (derivedFeatures.adaptabilityScore > 0.8) {
      modifiedScore *= 1.15; // 15% bonus for high adaptability
    } else if (derivedFeatures.adaptabilityScore > 0.6) {
      modifiedScore *= 1.08; // 8% bonus for moderate adaptability
    }
    
    // Stability concerns
    if (derivedFeatures.stabilityScore < 0.3) {
      modifiedScore *= 0.80; // 20% penalty for instability
    } else if (derivedFeatures.stabilityScore > 0.9) {
      modifiedScore *= 0.95; // 5% penalty for possible stagnation
    }
    
    return modifiedScore;
  }

  private applyQualificationPenalties(
    baseScore: number,
    derivedFeatures: FeatureVector['derivedFeatures']
  ): number {
    let adjustedScore = baseScore;
    
    // Severe underqualification penalty
    if (derivedFeatures.underqualificationScore > 0.8) {
      adjustedScore *= 0.40; // 60% penalty for severe underqualification
    } else if (derivedFeatures.underqualificationScore > 0.6) {
      adjustedScore *= 0.65; // 35% penalty for significant underqualification
    } else if (derivedFeatures.underqualificationScore > 0.4) {
      adjustedScore *= 0.80; // 20% penalty for moderate underqualification
    }
    
    // Overqualification penalty (employers worry about retention)
    if (derivedFeatures.overqualificationScore > 0.8) {
      adjustedScore *= 0.75; // 25% penalty for severe overqualification
    } else if (derivedFeatures.overqualificationScore > 0.6) {
      adjustedScore *= 0.88; // 12% penalty for moderate overqualification
    }
    
    return adjustedScore;
  }

  private applyCompetitionAdjustment(
    baseScore: number,
    marketFeatures: FeatureVector['marketFeatures']
  ): number {
    // Highly competitive locations reduce offer probability
    const competitiveness = marketFeatures.locationCompetitiveness;
    
    if (competitiveness > 0.9) {
      return baseScore * 0.85; // 15% reduction in very competitive markets
    } else if (competitiveness > 0.8) {
      return baseScore * 0.92; // 8% reduction in competitive markets
    } else if (competitiveness < 0.4) {
      return baseScore * 1.10; // 10% bonus in less competitive markets
    }
    
    return baseScore;
  }

  private createTestFeatures(): FeatureVector {
    return {
      vectorId: 'test_vector',
      userId: 'test_user',
      jobId: 'test_job',
      timestamp: new Date(),
      
      cvFeatures: {
        wordCount: 300,
        sectionsCount: 5,
        skillsCount: 10,
        experienceYears: 6,
        educationLevel: 3,
        certificationsCount: 3,
        projectsCount: 4,
        achievementsCount: 8,
        keywordDensity: 0.7,
        readabilityScore: 0.85,
        formattingScore: 0.8
      },
      
      matchingFeatures: {
        skillMatchPercentage: 0.80,
        experienceRelevance: 0.85,
        educationMatch: 0.90,
        industryExperience: 0.75,
        locationMatch: 0.95,
        salaryAlignment: 0.85,
        titleSimilarity: 0.75,
        companyFit: 0.80
      },
      
      marketFeatures: {
        industryGrowth: 0.15,
        locationCompetitiveness: 0.70,
        salaryCompetitiveness: 0.85,
        demandSupplyRatio: 1.4,
        seasonality: 1.0,
        economicIndicators: 0.85
      },
      
      behaviorFeatures: {
        applicationTiming: 1,
        weekdayApplication: true,
        timeOfDay: 10,
        applicationMethod: 1,
        cvOptimizationLevel: 0.9,
        platformEngagement: 0.9,
        previousApplications: 8
      },
      
      derivedFeatures: {
        overqualificationScore: 0.15,
        underqualificationScore: 0.08,
        careerProgressionScore: 0.85,
        stabilityScore: 0.75,
        adaptabilityScore: 0.80,
        leadershipPotential: 0.70,
        innovationIndicator: 0.65
      }
    };
  }
}