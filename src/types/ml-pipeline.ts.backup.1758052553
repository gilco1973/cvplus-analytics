/**
 * ML Pipeline Types - Stub implementation
 * Note: These types should be moved to analytics or ml module
 */

export interface MLPipeline {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  accuracy?: number;
}

// Additional exports required by phase2 types
export interface MLModelMetadata {
  modelId: string;
  version: string;
  trainedAt: Date;
  accuracy: number;
  features: string[];
}

export interface FeatureVector {
  features: Record<string, number | string | boolean>;
  metadata?: Record<string, any>;
}

export interface Phase2APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PredictionResponse {
  prediction: any;
  confidence: number;
  modelUsed: string;
  timestamp: Date;
}

export interface AnalyticsResponse {
  metrics: Record<string, number>;
  insights: string[];
  recommendations?: string[];
}

export interface IndustryOptimizationResponse {
  industry: string;
  optimizations: Array<{
    field: string;
    suggestion: string;
    impact: number;
  }>;
}

export interface RegionalOptimizationResponse {
  region: string;
  localizations: Array<{
    field: string;
    suggestion: string;
    relevance: number;
  }>;
}

export interface MLTrainingConfig {
  modelType: string;
  features: string[];
  hyperparameters: Record<string, any>;
  trainingDataPath?: string;
}