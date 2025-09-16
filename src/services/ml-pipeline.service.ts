/**/**
 * ML Pipeline Service - Clean Modular Architecture
 * 
 * This service provides a simplified interface to the ML Pipeline
 * using the new modular architecture for improved maintainability.
 */

import { 
  SuccessPrediction, 
  UserOutcome,
  MLTrainingConfig
} from '../types/phase2-models';
import { ParsedCV } from '../types/job';

// Import the new modular architecture
import { 
  MLPipelineOrchestrator, 
  PredictionRequest as OrchestratorRequest
} from './ml-pipeline';

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

export class MLPipelineService {
  private orchestrator: MLPipelineOrchestrator;
  
  constructor() {
    this.orchestrator = new MLPipelineOrchestrator();
  }

  /**
   * Generate comprehensive success prediction for a job application
   */
  async predictSuccess(request: PredictionRequest): Promise<SuccessPrediction> {
    
    // Convert to orchestrator format
    const orchestratorRequest: OrchestratorRequest = {
      userId: request.userId,
      jobId: request.jobId,
      cv: request.cv,
      jobDescription: request.jobDescription,
      targetRole: request.targetRole,
      industry: request.industry,
      location: request.location,
      marketContext: request.marketContext
    };
    
    // Delegate to modular orchestrator
    const prediction = await this.orchestrator.predictSuccess(orchestratorRequest);
    
    return prediction;
  }

  /**
   * Extract comprehensive features from CV and job context
   * @deprecated Use orchestrator.extractFeatures() directly for better performance
   */
  async extractFeatures(request: PredictionRequest) {
    
    // For backward compatibility, delegate to orchestrator
    return this.orchestrator['featureExtractor'].extractFeatures(request);
  }

  /**
   * Train or retrain ML models with new data
   * @deprecated Model training will be handled by dedicated training service
   */
  async trainModel(config: MLTrainingConfig): Promise<{ success: boolean; modelId: string; metrics: any }> {
    
    return {
      success: false,
      modelId: '',
      metrics: { error: 'Model training not available in refactored service. Use dedicated training service.' }
    };
  }

  /**
   * Record user outcome for model improvement
   */
  async recordOutcome(outcome: UserOutcome): Promise<void> {
    return this.orchestrator.recordOutcome(outcome);
  }

  /**
   * Get prediction statistics
   */
  async getStatistics(userId: string): Promise<any> {
    // Delegate to orchestrator's health status which includes statistics
    const healthStatus = await this.orchestrator.getHealthStatus();
    // Return basic statistics structure (userStatistics not implemented in health status)
    return {
      totalPredictions: 0,
      averageSuccessProbability: 0,
      averageInterviewProbability: 0,
      averageOfferProbability: 0,
      lastPrediction: null,
      healthStatus
    };
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    return this.orchestrator.getHealthStatus();
  }

  /**
   * Get orchestrator instance for advanced usage
   */
  getOrchestrator(): MLPipelineOrchestrator {
    return this.orchestrator;
  }
}

/**
 * Export singleton instance for backward compatibility
 */
export const mlPipelineService = new MLPipelineService();

/**
 * Export the orchestrator for direct access to new architecture
 */
export { MLPipelineOrchestrator };

/**
 * Export types for external usage
 */
export type { FeatureVector, SuccessPrediction, UserOutcome, MLTrainingConfig } from '../types/phase2-models';