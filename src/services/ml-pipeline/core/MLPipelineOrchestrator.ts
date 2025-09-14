/**
 * ML Pipeline Orchestrator - Core coordination service
 * 
 * Coordinates the entire ML prediction pipeline while delegating specific
 * responsibilities to focused service modules.
 */

import { 
  SuccessPrediction,
  FeatureVector,
  UserOutcome
} from '../../../types/phase2-models';
// @ts-ignore - PredictiveRecommendation import preserved for future use
import { PredictiveRecommendation } from '../../../types/phase2-models';
import { ParsedCV } from '../../../types/job';
import { FeatureExtractor } from '../features/FeatureExtractor';
import { InterviewPredictor } from '../predictions/InterviewPredictor';
import { OfferPredictor } from '../predictions/OfferPredictor';
import { SalaryPredictor } from '../predictions/SalaryPredictor';
import { TimeToHirePredictor } from '../predictions/TimeToHirePredictor';
import { CompetitivenessAnalyzer } from '../predictions/CompetitivenessAnalyzer';
import { RecommendationEngine } from '../recommendations/RecommendationEngine';
import { OutcomeTracker } from '../outcomes/OutcomeTracker';
import { PredictionCache } from './PredictionCache';
import { FallbackManager } from '../fallbacks/FallbackManager';

export interface PredictionRequest {
  userId: string;
  jobId: string;
  cv: ParsedCV;
  jobDescription: string;
  targetRole?: string;
  industry?: string;
  location?: string;
  marketContext?: {
    competitionLevel?: 'low' | 'medium' | 'high';
    urgency?: 'low' | 'medium' | 'high';
    seasonality?: number;
  };
}

export class MLPipelineOrchestrator {
  private featureExtractor!: FeatureExtractor;
  private interviewPredictor!: InterviewPredictor;
  private offerPredictor!: OfferPredictor;
  private salaryPredictor!: SalaryPredictor;
  private timeToHirePredictor!: TimeToHirePredictor;
  private competitivenessAnalyzer!: CompetitivenessAnalyzer;
  private recommendationEngine!: RecommendationEngine;
  private outcomeTracker!: OutcomeTracker;
  private predictionCache!: PredictionCache;
  private fallbackManager!: FallbackManager;

  constructor() {
    this.initializeServices();
  }

  /**
   * Generate comprehensive success prediction for a job application
   */
  async predictSuccess(request: PredictionRequest): Promise<SuccessPrediction> {
    try {
      
      // Check cache first
      const cachedPrediction = await this.predictionCache.get(request);
      if (cachedPrediction) {
        return cachedPrediction;
      }
      
      // Extract features from CV and job context
      const features = await this.featureExtractor.extractFeatures(request);
      
      // Generate predictions in parallel
      const [
        interviewProb,
        offerProb,
        salaryPred,
        timePred,
        competitivenessScore
      ] = await Promise.all([
        this.interviewPredictor.predict(features),
        this.offerPredictor.predict(features),
        this.salaryPredictor.predict(features, request),
        this.timeToHirePredictor.predict(features, request),
        this.competitivenessAnalyzer.analyze(features, request)
      ]);
      
      // Generate predictive recommendations
      const recommendations = await this.recommendationEngine.generate(
        features,
        { interviewProb, offerProb },
        request
      );
      
      // Calculate overall confidence
      const confidence = this.calculatePredictionConfidence(features, {
        interviewProb,
        offerProb,
        salaryPred,
        timePred
      });
      
      // Construct final prediction
      const prediction: SuccessPrediction = {
        predictionId: this.generatePredictionId(),
        userId: request.userId,
        jobId: request.jobId,
        timestamp: new Date(),
        
        interviewProbability: interviewProb,
        offerProbability: offerProb,
        hireProbability: offerProb * 0.8, // Simplified conversion rate
        
        salaryPrediction: salaryPred,
        timeToHire: timePred,
        competitivenessScore,
        
        confidence,
        recommendations,
        
        modelMetadata: {
          modelVersion: '2.1.0',
          featuresUsed: this.getFeatureNames(features),
          trainingDataSize: await this.outcomeTracker.getTrainingDataSize(),
          lastTrainingDate: new Date() // TODO: Get from model registry
        }
      };
      
      // Cache the prediction
      await this.predictionCache.set(request, prediction);
      
      // Log prediction for monitoring
      await this.logPrediction(prediction, features);
      
      return prediction;
      
    } catch (error) {
      
      // Fallback to heuristic-based prediction
      return this.fallbackManager.generateFallbackPrediction(request);
    }
  }

  /**
   * Record user outcome for model improvement
   */
  async recordOutcome(outcome: UserOutcome): Promise<void> {
    try {
      
      await this.outcomeTracker.recordOutcome(outcome);
      
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get orchestrator health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    lastCheck: Date;
  }> {
    const services = {
      featureExtractor: await this.checkServiceHealth(() => this.featureExtractor.healthCheck?.()),
      interviewPredictor: await this.checkServiceHealth(() => this.interviewPredictor.healthCheck?.()),
      offerPredictor: await this.checkServiceHealth(() => this.offerPredictor.healthCheck?.()),
      salaryPredictor: await this.checkServiceHealth(() => this.salaryPredictor.healthCheck?.()),
      timeToHirePredictor: await this.checkServiceHealth(() => this.timeToHirePredictor.healthCheck?.()),
      cache: await this.checkServiceHealth(() => this.predictionCache.healthCheck?.()),
      recommendations: await this.checkServiceHealth(() => this.recommendationEngine.healthCheck?.()),
      outcomes: await this.checkServiceHealth(() => this.outcomeTracker.healthCheck?.())
    };

    const healthyCount = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalServices) {
      status = 'healthy';
    } else if (healthyCount >= totalServices * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      lastCheck: new Date()
    };
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private initializeServices(): void {
    this.featureExtractor = new FeatureExtractor();
    this.interviewPredictor = new InterviewPredictor();
    this.offerPredictor = new OfferPredictor();
    this.salaryPredictor = new SalaryPredictor();
    this.timeToHirePredictor = new TimeToHirePredictor();
    this.competitivenessAnalyzer = new CompetitivenessAnalyzer();
    this.recommendationEngine = new RecommendationEngine();
    this.outcomeTracker = new OutcomeTracker();
    this.predictionCache = new PredictionCache();
    this.fallbackManager = new FallbackManager();
  }

  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFeatureNames(features: FeatureVector): string[] {
    return [
      ...Object.keys(features.cvFeatures || {}),
      ...Object.keys(features.matchingFeatures || {}),
      ...Object.keys(features.marketFeatures || {}),
      ...Object.keys(features.derivedFeatures || {})
    ];
  }

  private calculatePredictionConfidence(
    features: FeatureVector,
    predictions: any
  ): SuccessPrediction['confidence'] {
    const featureQuality = this.assessFeatureQuality(features);
    const predictionCertainty = this.assessPredictionCertainty(predictions);
    
    const overall = (featureQuality + predictionCertainty) / 2;
    
    return {
      overall,
      interviewConfidence: Math.min(overall + 0.1, 1.0),
      offerConfidence: Math.max(overall - 0.1, 0.0),
      salaryConfidence: overall * 0.9
    };
  }

  private assessFeatureQuality(features: FeatureVector): number {
    let quality = 0.5;
    
    if ((features.rawFeatures?.cvWordCount || 0) > 200) quality += 0.1;
    if ((features.rawFeatures?.yearsExperience || 0) > 0) quality += 0.1;
    if ((features.rawFeatures?.skillsCount || 0) > 5) quality += 0.1;
    if ((features.matchingFeatures?.skillMatchPercentage || 0) > 0.3) quality += 0.1;
    if ((features.cvFeatures?.educationLevel || 0) > 2) quality += 0.1;
    
    return Math.min(1.0, quality);
  }

  private assessPredictionCertainty(predictions: any): number {
    // Assess prediction certainty based on model confidence intervals
    // This would typically use model-specific confidence metrics
    return 0.8; // Simplified for now
  }

  private async logPrediction(prediction: SuccessPrediction, features: FeatureVector): Promise<void> {
    // Log prediction for monitoring and model improvement
    // Implementation would store to monitoring system
  }

  private async checkServiceHealth(healthCheck?: () => Promise<boolean> | boolean): Promise<boolean> {
    try {
      if (!healthCheck) return true; // Assume healthy if no health check available
      const result = await healthCheck();
      return result === true;
    } catch (error) {
      return false;
    }
  }
}