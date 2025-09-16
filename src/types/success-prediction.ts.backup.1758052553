/**
 * Success Prediction Types - Stub implementation
 * Note: These types should be moved to analytics or ml module
 */

export interface SuccessPrediction {
  score: number;
  confidence: number;
  factors: string[];
}

export interface PredictionResult {
  success: boolean;
  prediction?: SuccessPrediction;
  error?: string;
}

// Additional exports required by phase2 types
export interface SalaryPrediction {
  predictedSalary: number;
  range: { min: number; max: number };
  confidence: number;
}

export interface TimeToHirePrediction {
  estimatedDays: number;
  confidence: number;
  factors: string[];
}

export interface PredictiveRecommendation {
  type: string;
  recommendation: string;
  impact: number;
}

export enum PredictionTypes {
  SALARY = 'salary',
  TIME_TO_HIRE = 'time_to_hire',
  SUCCESS_RATE = 'success_rate',
  SKILL_MATCH = 'skill_match'
}