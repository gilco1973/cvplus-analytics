/**
 * Fallback Manager Service
 * 
 * Manages fallback predictions when ML services are unavailable,
 * providing heuristic-based predictions and graceful degradation.
 */

import { SuccessPrediction } from '../../../types/phase2-models';
// @ts-ignore - Unused imports preserved for future use
import { SalaryPrediction, TimeToHirePrediction } from '../../../types/phase2-models';
import { PredictionRequest } from '../core/MLPipelineOrchestrator';
import { HeuristicPredictor } from './HeuristicPredictor';

export class FallbackManager {
  private heuristicPredictor: HeuristicPredictor;

  constructor() {
    this.heuristicPredictor = new HeuristicPredictor();
  }

  /**
   * Generate fallback prediction when ML services fail
   */
  async generateFallbackPrediction(request: PredictionRequest): Promise<SuccessPrediction> {
    
    try {
      // Use heuristic predictor for basic predictions
      const [interviewProb, offerProb, salaryPred, timePred] = await Promise.all([
        this.heuristicPredictor.predictInterviewProbability(request),
        this.heuristicPredictor.predictOfferProbability(request),
        this.heuristicPredictor.predictSalary(request),
        this.heuristicPredictor.predictTimeToHire(request)
      ]);

      const competitivenessScore = this.heuristicPredictor.calculateCompetitivenessScore(request);
      const recommendations = await this.heuristicPredictor.generateBasicRecommendations(request);

      const prediction: SuccessPrediction = {
        predictionId: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.userId,
        jobId: request.jobId,
        timestamp: new Date(),
        
        interviewProbability: interviewProb,
        offerProbability: offerProb,
        hireProbability: offerProb * 0.8,
        
        salaryPrediction: salaryPred,
        timeToHire: timePred,
        competitivenessScore,
        
        confidence: {
          overall: 0.6, // Lower confidence for fallback
          interviewConfidence: 0.6,
          offerConfidence: 0.5,
          salaryConfidence: 0.4
        },
        
        recommendations,
        
        modelMetadata: {
          modelVersion: 'fallback-2.0',
          featuresUsed: ['experience', 'skills', 'education', 'basic_matching'],
          trainingDataSize: 0,
          lastTrainingDate: new Date()
        }
      };

      return prediction;

    } catch (error) {
      return this.generateMinimalPrediction(request);
    }
  }

  /**
   * Get fallback service health status
   */
  async getHealthStatus(): Promise<boolean> {
    try {
      return await this.heuristicPredictor.healthCheck();
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private generateMinimalPrediction(request: PredictionRequest): SuccessPrediction {
    
    // Ultra-simple prediction based on basic CV analysis
    const experienceYears = this.calculateExperienceYears(request.cv.experience);
    const skillsCount = this.countSkills(request.cv.skills);
    const hasEducation = request.cv.education && request.cv.education.length > 0;
    
    // Base probabilities
    let interviewProb = 0.12; // 12% base
    let offerProb = 0.04;     // 4% base
    
    // Experience bonus
    if (experienceYears >= 5) {
      interviewProb += 0.08;
      offerProb += 0.03;
    } else if (experienceYears >= 2) {
      interviewProb += 0.04;
      offerProb += 0.015;
    }
    
    // Skills bonus
    if (skillsCount >= 8) {
      interviewProb += 0.05;
      offerProb += 0.02;
    } else if (skillsCount >= 4) {
      interviewProb += 0.02;
      offerProb += 0.01;
    }
    
    // Education bonus
    if (hasEducation) {
      interviewProb += 0.03;
      offerProb += 0.01;
    }
    
    // Clamp values
    interviewProb = Math.min(0.75, interviewProb);
    offerProb = Math.min(0.40, offerProb);

    return {
      predictionId: `minimal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      jobId: request.jobId,
      timestamp: new Date(),
      
      interviewProbability: interviewProb,
      offerProbability: offerProb,
      hireProbability: offerProb * 0.8,
      
      salaryPrediction: {
        predictedSalaryRange: {
          min: 50000,
          max: 90000,
          median: 70000,
          currency: 'USD'
        },
        predictedRange: {
          min: 50000,
          max: 90000,
          median: 70000,
          currency: 'USD'
        },
        confidenceInterval: {
          lower: 45000,
          upper: 95000
        },
        regionalAdjustment: {
          baseLocation: 'US',
          adjustmentFactor: 1.0,
          costOfLivingIndex: 100
        },
        industryBenchmark: {
          industryMedian: 70000,
          percentileRank: 50
        },
        factors: [{
          factor: 'experience',
          impact: 0.1,
          description: 'Years of relevant experience'
        }]
      },
      
      timeToHire: {
        estimatedDays: {
          min: 18,
          max: 35,
          median: 25
        },
        phaseBreakdown: {
          application: 4,
          screening: 6,
          interviews: 8,
          decision: 5,
          negotiation: 2
        },
        seasonalFactors: {
          currentSeason: 'spring',
          seasonalAdjustment: 1.0
        },
        confidence: 0.4
      },
      
      competitivenessScore: Math.round((interviewProb + (skillsCount / 20) + (experienceYears / 10)) * 50),
      
      confidence: {
        overall: 0.3, // Very low confidence for minimal prediction
        interviewConfidence: 0.3,
        offerConfidence: 0.2,
        salaryConfidence: 0.2
      },
      
      recommendations: [{
        recommendationId: 'general_improvement',
        type: 'skill',
        priority: 'high',
        expectedImpact: {
          interviewProbabilityIncrease: 0.1,
          offerProbabilityIncrease: 0.05,
          salaryIncrease: 0
        },
        title: 'Improve your profile',
        description: 'Consider updating your CV with more details about your experience and skills',
        implementation: {
          estimatedTimeToComplete: 60,
          difficulty: 'easy',
          cost: 0,
          resources: ['CV templates', 'Writing guides']
        },
        evidence: {
          dataPoints: 100,
          successRate: 0.7,
          similarProfiles: 50
        },
        dateGenerated: new Date()
      }],
      
      modelMetadata: {
        modelVersion: 'minimal-1.0',
        featuresUsed: ['experience_years', 'skills_count', 'has_education'],
        trainingDataSize: 0,
        lastTrainingDate: new Date()
      }
    };
  }

  private calculateExperienceYears(experience?: any[]): number {
    if (!experience || experience.length === 0) return 0;
    
    let totalMonths = 0;
    const currentDate = new Date();
    
    experience.forEach(exp => {
      if (exp.startDate) {
        const startDate = new Date(exp.startDate);
        const endDate = exp.endDate && exp.endDate !== 'Present' 
          ? new Date(exp.endDate) 
          : currentDate;
        
        if (startDate && endDate) {
          const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (endDate.getMonth() - startDate.getMonth());
          totalMonths += Math.max(0, monthsDiff);
        }
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10;
  }

  private countSkills(skills: any): number {
    if (Array.isArray(skills)) {
      return skills.length;
    } else if (skills && typeof skills === 'object') {
      let count = 0;
      if (skills.technical && Array.isArray(skills.technical)) {
        count += skills.technical.length;
      }
      if (skills.soft && Array.isArray(skills.soft)) {
        count += skills.soft.length;
      }
      if (skills.languages && Array.isArray(skills.languages)) {
        count += skills.languages.length;
      }
      return count;
    }
    return 0;
  }
}