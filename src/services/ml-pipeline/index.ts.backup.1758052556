/**
 * ML Pipeline Service - Refactored Entry Point
 * 
 * Maintains backward compatibility with the original MLPipelineService
 * while delegating to the new modular architecture.
 */

import { MLPipelineOrchestrator, PredictionRequest } from './core/MLPipelineOrchestrator';
import { 
  SuccessPrediction, 
  UserOutcome,
  MLTrainingConfig
} from '../../types/phase2-models';
// @ts-ignore - ParsedCV import preserved for future use
import { ParsedCV } from '../../types/job';

/**
 * Main ML Pipeline Service - Backward Compatible Interface
 * 
 * This class maintains the same API as the original MLPipelineService
 * but delegates all operations to the new modular architecture.
 */
export class MLPipelineService {
  private orchestrator: MLPipelineOrchestrator;

  constructor() {
    this.orchestrator = new MLPipelineOrchestrator();
  }

  /**
   * Generate comprehensive success prediction for a job application
   * @deprecated Use orchestrator.predictSuccess() directly for better performance
   */
  async predictSuccess(request: PredictionRequest): Promise<SuccessPrediction> {
    return this.orchestrator.predictSuccess(request);
  }

  /**
   * Extract comprehensive features from CV and job context
   * @deprecated Access through orchestrator.featureExtractor for more control
   */
  async extractFeatures(request: PredictionRequest) {
    // This method is now handled internally by the orchestrator
    
    // For backward compatibility, we can still provide this method
    const orchestratorFeatures = await this.orchestrator['featureExtractor'].extractFeatures(request);
    return orchestratorFeatures;
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
export { MLPipelineOrchestrator, PredictionRequest };

/**
 * Export individual services for fine-grained control
 */
export { FeatureExtractor } from './features/FeatureExtractor';
export { CVFeatureService } from './features/CVFeatureService';
export { MatchingFeatureService } from './features/MatchingFeatureService';
export { MarketFeatureService } from './features/MarketFeatureService';
export { BehaviorFeatureService } from './features/BehaviorFeatureService';
export { DerivedFeatureService } from './features/DerivedFeatureService';

export { PredictionCache } from './core/PredictionCache';
export { InterviewPredictor } from './predictions/InterviewPredictor';

/**
 * Export types for external usage
 */
export type { FeatureVector, SuccessPrediction, UserOutcome, MLTrainingConfig } from '../../types/phase2-models';