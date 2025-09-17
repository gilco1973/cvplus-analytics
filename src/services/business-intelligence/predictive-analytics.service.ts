/**
 * Predictive Analytics Service
 * Handles machine learning models and prediction generation
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import {
  PredictiveModel,
  PredictionResult
} from '../../types/business-intelligence.types';

export class PredictiveAnalytics {
  private models: Map<string, PredictiveModel> = new Map();
  private predictions: Map<string, PredictionResult> = new Map();

  /**
   * Train a new predictive model
   */
  async trainModel(config: {
    name: string;
    type: 'churn' | 'revenue' | 'conversion' | 'engagement';
    features: string[];
    target: string;
    algorithm?: 'linear_regression' | 'random_forest' | 'neural_network';
  }): Promise<PredictiveModel> {
    const modelId = `model_${Date.now()}`;

    const model: PredictiveModel = {
      id: modelId,
      name: config.name,
      type: config.type,
      features: config.features,
      target: config.target,
      algorithm: config.algorithm || 'random_forest',
      accuracy: 0,
      status: 'training',
      createdAt: new Date(),
      lastTrained: new Date(),
      version: 1
    };

    this.models.set(modelId, model);

    // Simulate training process
    await this.performTraining(modelId);

    return model;
  }

  /**
   * Perform model training (simulated)
   */
  private async performTraining(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) return;

    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate training results based on model type
    switch (model.type) {
      case 'churn':
        model.accuracy = 0.85 + Math.random() * 0.1; // 85-95% accuracy
        break;
      case 'revenue':
        model.accuracy = 0.75 + Math.random() * 0.15; // 75-90% accuracy
        break;
      case 'conversion':
        model.accuracy = 0.80 + Math.random() * 0.12; // 80-92% accuracy
        break;
      case 'engagement':
        model.accuracy = 0.78 + Math.random() * 0.14; // 78-92% accuracy
        break;
    }

    model.status = 'ready';
    model.lastTrained = new Date();
  }

  /**
   * Make a prediction using a trained model
   */
  async makePrediction(
    modelId: string,
    features: Record<string, any>
  ): Promise<PredictionResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (model.status !== 'ready') {
      throw new Error(`Model ${modelId} is not ready for predictions (status: ${model.status})`);
    }

    const predictionId = `pred_${Date.now()}`;
    const prediction = await this.generatePrediction(model, features);

    const result: PredictionResult = {
      id: predictionId,
      modelId,
      features,
      prediction,
      confidence: this.calculateConfidence(model, features),
      createdAt: new Date()
    };

    this.predictions.set(predictionId, result);
    return result;
  }

  /**
   * Generate prediction based on model type
   */
  private async generatePrediction(
    model: PredictiveModel,
    features: Record<string, any>
  ): Promise<any> {
    switch (model.type) {
      case 'churn':
        return this.predictChurn(features);
      case 'revenue':
        return this.predictRevenue(features);
      case 'conversion':
        return this.predictConversion(features);
      case 'engagement':
        return this.predictEngagement(features);
      default:
        throw new Error(`Unsupported model type: ${model.type}`);
    }
  }

  /**
   * Predict customer churn probability
   */
  private predictChurn(features: Record<string, any>): any {
    // Simulate churn prediction logic
    const baseChurnRate = 0.15;
    const recencyWeight = features.days_since_last_login ? features.days_since_last_login * 0.01 : 0;
    const engagementWeight = features.session_count ? (100 - features.session_count) * 0.001 : 0;
    const supportWeight = features.support_tickets ? features.support_tickets * 0.02 : 0;

    const churnProbability = Math.min(0.95, baseChurnRate + recencyWeight + engagementWeight + supportWeight);

    return {
      churn_probability: Math.round(churnProbability * 1000) / 1000,
      risk_level: churnProbability > 0.7 ? 'high' : churnProbability > 0.4 ? 'medium' : 'low',
      factors: {
        recency: recencyWeight,
        engagement: engagementWeight,
        support: supportWeight
      },
      recommendations: this.getChurnRecommendations(churnProbability)
    };
  }

  /**
   * Predict revenue for next period
   */
  private predictRevenue(features: Record<string, any>): any {
    const baseRevenue = features.current_revenue || 10000;
    const growthFactor = 1 + (Math.random() * 0.3 - 0.1); // -10% to +20% growth
    const seasonalFactor = Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30)) * 0.1 + 1; // Monthly seasonality

    const predictedRevenue = baseRevenue * growthFactor * seasonalFactor;

    return {
      predicted_revenue: Math.round(predictedRevenue),
      growth_rate: Math.round((growthFactor - 1) * 1000) / 10, // Percentage
      confidence_interval: {
        lower: Math.round(predictedRevenue * 0.9),
        upper: Math.round(predictedRevenue * 1.1)
      },
      factors: {
        base: baseRevenue,
        growth: growthFactor,
        seasonal: seasonalFactor
      }
    };
  }

  /**
   * Predict conversion probability
   */
  private predictConversion(features: Record<string, any>): any {
    const baseConversion = 0.15;
    const pageViewsWeight = features.page_views ? Math.min(features.page_views * 0.01, 0.2) : 0;
    const timeOnSiteWeight = features.time_on_site ? Math.min(features.time_on_site * 0.0001, 0.1) : 0;
    const sourceWeight = features.traffic_source === 'organic' ? 0.05 : 0;

    const conversionProbability = Math.min(0.9, baseConversion + pageViewsWeight + timeOnSiteWeight + sourceWeight);

    return {
      conversion_probability: Math.round(conversionProbability * 1000) / 1000,
      likelihood: conversionProbability > 0.6 ? 'high' : conversionProbability > 0.3 ? 'medium' : 'low',
      factors: {
        page_views: pageViewsWeight,
        time_on_site: timeOnSiteWeight,
        traffic_source: sourceWeight
      },
      recommendations: this.getConversionRecommendations(conversionProbability)
    };
  }

  /**
   * Predict user engagement score
   */
  private predictEngagement(features: Record<string, any>): any {
    const baseScore = 50;
    const loginFrequency = features.logins_per_week ? features.logins_per_week * 5 : 0;
    const featureUsage = features.features_used ? features.features_used * 3 : 0;
    const socialActivity = features.social_interactions ? features.social_interactions * 2 : 0;

    const engagementScore = Math.min(100, baseScore + loginFrequency + featureUsage + socialActivity);

    return {
      engagement_score: Math.round(engagementScore),
      level: engagementScore > 80 ? 'high' : engagementScore > 50 ? 'medium' : 'low',
      components: {
        login_frequency: loginFrequency,
        feature_usage: featureUsage,
        social_activity: socialActivity
      },
      projected_30_day: Math.round(engagementScore * (0.9 + Math.random() * 0.2))
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(
    model: PredictiveModel,
    features: Record<string, any>
  ): number {
    // Base confidence on model accuracy
    let confidence = model.accuracy;

    // Adjust based on feature completeness
    const featureCompleteness = Object.keys(features).length / model.features.length;
    confidence *= featureCompleteness;

    // Add some randomness to simulate real-world variance
    confidence *= (0.9 + Math.random() * 0.2);

    return Math.min(0.99, Math.max(0.1, confidence));
  }

  /**
   * Get churn prevention recommendations
   */
  private getChurnRecommendations(churnProbability: number): string[] {
    if (churnProbability > 0.7) {
      return [
        'Immediate customer success outreach',
        'Offer personalized discount or upgrade',
        'Schedule product demo or training session',
        'Assign dedicated account manager'
      ];
    } else if (churnProbability > 0.4) {
      return [
        'Send targeted re-engagement email campaign',
        'Provide additional product training resources',
        'Offer feature usage insights and tips'
      ];
    } else {
      return [
        'Continue regular engagement campaigns',
        'Monitor for changes in usage patterns'
      ];
    }
  }

  /**
   * Get conversion optimization recommendations
   */
  private getConversionRecommendations(conversionProbability: number): string[] {
    if (conversionProbability > 0.6) {
      return [
        'Present premium offer or trial extension',
        'Highlight key value propositions',
        'Provide social proof and testimonials'
      ];
    } else if (conversionProbability > 0.3) {
      return [
        'Send educational content about product benefits',
        'Offer free consultation or demo',
        'Provide case studies relevant to user profile'
      ];
    } else {
      return [
        'Focus on basic value demonstration',
        'Offer extended trial period',
        'Provide step-by-step onboarding guide'
      ];
    }
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<PredictiveModel | null> {
    return this.models.get(modelId) || null;
  }

  /**
   * Get all models
   */
  async getAllModels(): Promise<PredictiveModel[]> {
    return Array.from(this.models.values());
  }

  /**
   * Get prediction by ID
   */
  async getPrediction(predictionId: string): Promise<PredictionResult | null> {
    return this.predictions.get(predictionId) || null;
  }

  /**
   * Get recent predictions for a model
   */
  async getModelPredictions(modelId: string, limit = 100): Promise<PredictionResult[]> {
    return Array.from(this.predictions.values())
      .filter(pred => pred.modelId === modelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Retrain a model with new data
   */
  async retrainModel(modelId: string): Promise<PredictiveModel> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    model.status = 'training';
    model.version++;

    await this.performTraining(modelId);
    return model;
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<void> {
    this.models.delete(modelId);

    // Clean up associated predictions
    const predictions = Array.from(this.predictions.entries());
    predictions.forEach(([predId, pred]) => {
      if (pred.modelId === modelId) {
        this.predictions.delete(predId);
      }
    });
  }
}