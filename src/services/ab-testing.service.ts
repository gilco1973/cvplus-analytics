/**
 * CVPlus Analytics - A/B Testing Service
// Comprehensive experimentation framework with statistical analysis

import {
  Experiment,
  ExperimentType,
  ExperimentStatus,
  ExperimentVariant,
  ExperimentGoal,
  VariantAssignment,
  ExperimentResults,
  VariantResults,
  StatisticalAnalysis,
  SampleSizeCalculation,
  FeatureFlag,
  FeatureFlagVariation,
  ABTestEvent,
  StatisticalMethod,
  MetricType,
  TrafficAllocation
} from '../types/ab-testing.types';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * A/B Testing Service
 * Complete experimentation platform with statistical analysis
*/
export class ABTestingService {
  private experimentManager: ExperimentManager;
  private variantAssignmentManager: VariantAssignmentManager;
  private statisticalAnalyzer: StatisticalAnalyzer;
  private featureFlagManager: FeatureFlagManager;
  private eventTracker: ABTestEventTracker;

  constructor() {
    this.experimentManager = new ExperimentManager();
    this.variantAssignmentManager = new VariantAssignmentManager();
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.featureFlagManager = new FeatureFlagManager();
    this.eventTracker = new ABTestEventTracker();
  }

  /**
   * Initialize A/B testing service
  */
  async initialize(): Promise<void> {
    await this.experimentManager.initialize();
    await this.featureFlagManager.initialize();
    await this.eventTracker.initialize();
  }

  /**
   * Experiment Management
  */

  async createExperiment(config: {
    name: string;
    description: string;
    hypothesis: string;
    type: ExperimentType;
    variants: Omit<ExperimentVariant, 'variantId' | 'createdAt' | 'updatedAt'>[];
    goals: Omit<ExperimentGoal, 'goalId'>[];
    trafficAllocation: TrafficAllocation;
    totalTrafficPercentage: number;
    owner: string;
    tags?: string[];
  }): Promise<Experiment> {
    // Validate experiment configuration
    await this.validateExperimentConfig(config);

    // Calculate sample size requirements
    const sampleSizeCalc = await this.statisticalAnalyzer.calculateSampleSize({
      baselineConversion: 0.1, // Default baseline, would be configurable
      minimumDetectableEffect: 0.1, // 10% improvement
      significanceLevel: 0.05,
      power: 0.8,
      variants: config.variants.length + 1 // +1 for control
    });

    // Create experiment
    const experiment: Experiment = {
      experimentId: this.generateExperimentId(),
      name: config.name,
      description: config.description,
      hypothesis: config.hypothesis,
      type: config.type,
      status: ExperimentStatus.DRAFT,
      owner: config.owner,
      
      variants: config.variants.map((variant, index) => ({
        ...variant,
        variantId: this.generateVariantId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })),
      
      goals: config.goals.map(goal => ({
        ...goal,
        goalId: this.generateGoalId()
      })),
      
      trafficAllocation: config.trafficAllocation,
      totalTrafficPercentage: config.totalTrafficPercentage,
      
      statisticalConfig: {
        method: StatisticalMethod.FREQUENTIST,
        significanceLevel: 0.05,
        power: 0.8,
        minimumSampleSize: sampleSizeCalc.results.sampleSizePerVariant,
        maximumDuration: 30, // 30 days default
        earlyStoppingEnabled: true
      },
      
      sampleSizeCalculation: sampleSizeCalc,
      preTestChecklist: this.generatePreTestChecklist(),
      
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: config.owner,
      lastModifiedBy: config.owner,
      tags: config.tags || []
    };

    // Store experiment
    await this.experimentManager.createExperiment(experiment);

    return experiment;
  }

  async startExperiment(experimentId: string): Promise<{
    success: boolean;
    experiment?: Experiment;
    errors?: string[];
  }> {
    try {
      const experiment = await this.experimentManager.getExperiment(experimentId);
      if (!experiment) {
        return { success: false, errors: ['Experiment not found'] };
      }

      // Pre-flight checks
      const validationResult = await this.validateExperimentStart(experiment);
      if (!validationResult.valid) {
        return { success: false, errors: validationResult.errors };
      }

      // Update experiment status
      const updatedExperiment = await this.experimentManager.updateExperiment(experimentId, {
        status: ExperimentStatus.RUNNING,
        actualStartedAt: Date.now()
      });

      // Initialize variant assignments
      await this.variantAssignmentManager.initializeExperiment(experimentId);

      // Start event tracking
      await this.eventTracker.startTrackingExperiment(experimentId);

      return { success: true, experiment: updatedExperiment };

    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  async stopExperiment(experimentId: string, reason?: string): Promise<Experiment> {
    const experiment = await this.experimentManager.updateExperiment(experimentId, {
      status: ExperimentStatus.COMPLETED,
      actualEndedAt: Date.now()
    });

    // Stop event tracking
    await this.eventTracker.stopTrackingExperiment(experimentId);

    // Generate final results
    await this.generateExperimentResults(experimentId);

    return experiment;
  }

  async pauseExperiment(experimentId: string): Promise<Experiment> {
    return await this.experimentManager.updateExperiment(experimentId, {
      status: ExperimentStatus.PAUSED
    });
  }

  async resumeExperiment(experimentId: string): Promise<Experiment> {
    return await this.experimentManager.updateExperiment(experimentId, {
      status: ExperimentStatus.RUNNING
    });
  }

  /**
   * Variant Assignment
  */

  async getVariantAssignment(
    experimentId: string,
    userId: string,
    context?: {
      sessionId?: string;
      deviceId?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<VariantAssignment | null> {
    const experiment = await this.experimentManager.getExperiment(experimentId);
    if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
      return null;
    }

    // Check for existing assignment
    const existingAssignment = await this.variantAssignmentManager.getAssignment(
      experimentId,
      userId
    );
    if (existingAssignment) {
      return existingAssignment;
    }

    // Create new assignment
    const variantId = await this.assignVariant(experiment, userId, context);
    const assignment: VariantAssignment = {
      userId,
      experimentId,
      variantId,
      assignedAt: Date.now(),
      assignmentMethod: 'hash',
      context: {
        sessionId: context?.sessionId,
        deviceId: context?.deviceId,
        userAgent: navigator.userAgent
      },
      sticky: true,
      overridden: false
    };

    // Store assignment
    await this.variantAssignmentManager.storeAssignment(assignment);

    // Track assignment event
    await this.eventTracker.trackAssignment(assignment);

    return assignment;
  }

  async overrideVariantAssignment(
    experimentId: string,
    userId: string,
    variantId: string,
    reason: string
  ): Promise<VariantAssignment> {
    const assignment: VariantAssignment = {
      userId,
      experimentId,
      variantId,
      assignedAt: Date.now(),
      assignmentMethod: 'override',
      context: {},
      sticky: true,
      overridden: true,
      overrideReason: reason
    };

    await this.variantAssignmentManager.storeAssignment(assignment);
    await this.eventTracker.trackAssignment(assignment);

    return assignment;
  }

  /**
   * Event Tracking
  */

  async trackExposure(
    experimentId: string,
    userId: string,
    variantId: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.eventTracker.trackEvent({
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      sessionId: context?.sessionId || 'unknown',
      experimentId,
      variantId,
      eventType: 'exposure',
      properties: context || {},
      context: {
        pageUrl: window.location.href,
        referrer: document.referrer,
        deviceType: this.getDeviceType(),
        browser: this.getBrowser()
      }
    });
  }

  async trackConversion(
    experimentId: string,
    userId: string,
    goalId: string,
    value?: number,
    properties?: Record<string, any>
  ): Promise<void> {
    const assignment = await this.variantAssignmentManager.getAssignment(experimentId, userId);
    if (!assignment) {
      return; // User not in experiment
    }

    await this.eventTracker.trackEvent({
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      sessionId: properties?.sessionId || 'unknown',
      experimentId,
      variantId: assignment.variantId,
      eventType: 'conversion',
      eventName: `goal_${goalId}_completed`,
      properties: {
        goalId,
        value,
        ...properties
      },
      context: {
        pageUrl: window.location.href,
        deviceType: this.getDeviceType(),
        browser: this.getBrowser()
      }
    });
  }

  /**
   * Results Analysis
  */

  async getExperimentResults(experimentId: string): Promise<ExperimentResults | null> {
    const experiment = await this.experimentManager.getExperiment(experimentId);
    if (!experiment) {
      return null;
    }

    return await this.generateExperimentResults(experimentId);
  }

  async generateExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.experimentManager.getExperiment(experimentId);
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Get experiment events
    const events = await this.eventTracker.getExperimentEvents(experimentId);
    
    // Calculate variant results
    const variantResults = await this.calculateVariantResults(experiment, events);
    
    // Perform statistical analysis
    const statisticalAnalysis = await this.statisticalAnalyzer.analyzeResults(
      variantResults,
      experiment.statisticalConfig
    );
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      experiment,
      variantResults,
      statisticalAnalysis
    );

    // Assess data quality
    const dataQuality = await this.assessDataQuality(experiment, events);

    const results: ExperimentResults = {
      experimentId,
      generatedAt: Date.now(),
      dateRange: {
        start: experiment.actualStartedAt || experiment.createdAt,
        end: experiment.actualEndedAt || Date.now()
      },
      variantResults,
      statisticalAnalysis,
      recommendations,
      dataQuality
    };

    // Store results
    await this.experimentManager.storeResults(experimentId, results);

    return results;
  }

  /**
   * Feature Flags
  */

  async createFeatureFlag(config: {
    name: string;
    description: string;
    key: string;
    variations: Omit<FeatureFlagVariation, 'variationId'>[];
    defaultVariation: string;
    environment: 'development' | 'staging' | 'production';
  }): Promise<FeatureFlag> {
    const featureFlag: FeatureFlag = {
      flagId: this.generateFlagId(),
      name: config.name,
      description: config.description,
      key: config.key,
      status: 'active',
      rolloutPercentage: 0,
      rolloutStrategy: 'percentage',
      targeting: {
        segments: [],
        rules: []
      },
      variations: config.variations.map(variation => ({
        ...variation,
        variationId: this.generateVariationId()
      })),
      defaultVariation: config.defaultVariation,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system',
      environment: config.environment
    };

    await this.featureFlagManager.createFlag(featureFlag);
    return featureFlag;
  }

  async getFeatureFlagValue(
    flagKey: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<any> {
    return await this.featureFlagManager.evaluateFlag(flagKey, userId, context);
  }

  async updateFeatureFlagRollout(flagId: string, percentage: number): Promise<FeatureFlag> {
    return await this.featureFlagManager.updateRollout(flagId, percentage);
  }

  /**
   * Private helper methods
  */

  private async validateExperimentConfig(config: any): Promise<void> {
    const errors: string[] = [];

    if (!config.name) errors.push('Experiment name is required');
    if (!config.description) errors.push('Experiment description is required');
    if (!config.hypothesis) errors.push('Experiment hypothesis is required');
    if (!config.variants || config.variants.length === 0) {
      errors.push('At least one variant is required');
    }
    if (!config.goals || config.goals.length === 0) {
      errors.push('At least one goal is required');
    }

    // Validate traffic allocation
    const totalTraffic = config.variants.reduce((sum: number, v: any) => sum + v.trafficPercentage, 0);
    if (totalTraffic > 100) {
      errors.push('Total traffic allocation cannot exceed 100%');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  private async validateExperimentStart(experiment: Experiment): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (experiment.status !== ExperimentStatus.DRAFT) {
      errors.push('Experiment must be in draft status to start');
    }

    // Check pre-test checklist
    const incompleteItems = experiment.preTestChecklist.filter(item => 
      item.required && !item.completed
    );
    if (incompleteItems.length > 0) {
      errors.push(`Complete required checklist items: ${incompleteItems.map(i => i.description).join(', ')}`);
    }

    // Validate goals have tracking setup
    for (const goal of experiment.goals) {
      if (!goal.eventName && goal.type !== MetricType.REVENUE) {
        errors.push(`Goal ${goal.name} missing event name`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async assignVariant(
    experiment: Experiment,
    userId: string,
    context?: any
  ): Promise<string> {
    // Use consistent hashing for variant assignment
    const hash = this.hashUserId(userId, experiment.experimentId);
    const hashValue = hash % 100;
    
    let cumulativePercentage = 0;
    for (const variant of experiment.variants) {
      cumulativePercentage += variant.trafficPercentage;
      if (hashValue < cumulativePercentage) {
        return variant.variantId;
      }
    }
    
    // Default to first variant (control)
    return experiment.variants[0].variantId;
  }

  private async calculateVariantResults(
    experiment: Experiment,
    events: ABTestEvent[]
  ): Promise<VariantResults[]> {
    const results: VariantResults[] = [];
    
    for (const variant of experiment.variants) {
      const variantEvents = events.filter(e => e.variantId === variant.variantId);
      const exposureEvents = variantEvents.filter(e => e.eventType === 'exposure');
      const conversionEvents = variantEvents.filter(e => e.eventType === 'conversion');
      
      const totalUsers = new Set(exposureEvents.map(e => e.userId)).size;
      const convertedUsers = new Set(conversionEvents.map(e => e.userId)).size;
      const conversionRate = totalUsers > 0 ? convertedUsers / totalUsers : 0;
      
      const goalResults = experiment.goals.map(goal => {
        const goalEvents = conversionEvents.filter(e => 
          e.eventName === `goal_${goal.goalId}_completed`
        );
        const goalUsers = new Set(goalEvents.map(e => e.userId)).size;
        const goalConversionRate = totalUsers > 0 ? goalUsers / totalUsers : 0;
        const totalValue = goalEvents.reduce((sum, e) => 
          sum + (e.properties.value || 0), 0
        );
        
        return {
          goalId: goal.goalId,
          goalName: goal.name,
          isPrimary: goal.isPrimary,
          totalEvents: goalEvents.length,
          uniqueUsers: goalUsers,
          conversionRate: goalConversionRate,
          averageValue: goalUsers > 0 ? totalValue / goalUsers : 0,
          totalValue,
          standardError: this.calculateStandardError(goalConversionRate, totalUsers),
          confidenceInterval: this.calculateConfidenceInterval(goalConversionRate, totalUsers)
        };
      });
      
      results.push({
        variantId: variant.variantId,
        variantName: variant.name,
        isControl: variant.isControl,
        totalUsers,
        activeUsers: totalUsers,
        participationRate: 1.0, // Assuming all assigned users are active
        goalResults,
        statisticalSummary: {
          sampleSize: totalUsers,
          conversionRate,
          standardError: this.calculateStandardError(conversionRate, totalUsers),
          confidenceInterval: this.calculateConfidenceInterval(conversionRate, totalUsers)
        }
      });
    }
    
    return results;
  }

  private generatePreTestChecklist() {
    return [
      {
        itemId: '1',
        description: 'Experiment tracking is properly implemented',
        category: 'technical' as const,
        required: true,
        completed: false
      },
      {
        itemId: '2',
        description: 'Sample size calculation is approved',
        category: 'analytics' as const,
        required: true,
        completed: false
      },
      {
        itemId: '3',
        description: 'Legal and privacy review completed',
        category: 'legal' as const,
        required: true,
        completed: false
      }
    ];
  }

  private async generateRecommendations(
    experiment: Experiment,
    variantResults: VariantResults[],
    statisticalAnalysis: StatisticalAnalysis
  ) {
    const recommendations = [];

    // Statistical significance recommendation
    if (statisticalAnalysis.isStatisticallySignificant) {
      const winningVariant = variantResults.find(v =>
        !v.isControl && v.statisticalSummary.conversionRate > 0
      );
      if (winningVariant) {
        recommendations.push({
          type: 'winner_found',
          title: 'Statistical Winner Detected',
          description: `Variant ${winningVariant.variantName} shows statistically significant improvement`,
          confidence: 'high',
          action: 'implement',
          expectedImpact: statisticalAnalysis.effectSize
        });
      }
    } else {
      recommendations.push({
        type: 'inconclusive',
        title: 'Results Not Statistically Significant',
        description: 'Continue test or increase sample size',
        confidence: 'medium',
        action: 'continue',
        suggestedDuration: 14 // days
      });
    }

    // Sample size recommendation
    const totalSample = variantResults.reduce((sum, v) => sum + v.totalUsers, 0);
    const requiredSample = experiment.statisticalConfig.minimumSampleSize * experiment.variants.length;
    if (totalSample < requiredSample) {
      recommendations.push({
        type: 'sample_size',
        title: 'Insufficient Sample Size',
        description: `Need ${requiredSample - totalSample} more participants`,
        confidence: 'high',
        action: 'continue',
        samplesNeeded: requiredSample - totalSample
      });
    }

    return recommendations;
  }

  private async assessDataQuality(experiment: Experiment, events: ABTestEvent[]) {
    const exposureEvents = events.filter(e => e.eventType === 'exposure');
    const conversionEvents = events.filter(e => e.eventType === 'conversion');

    // Calculate actual vs expected ratio
    const variantCounts: Record<string, number> = {};
    exposureEvents.forEach(event => {
      variantCounts[event.variantId] = (variantCounts[event.variantId] || 0) + 1;
    });

    const expectedVsActualRatio: Record<string, { expected: number; actual: number; ratio: number }> = {};
    experiment.variants.forEach(variant => {
      const expected = variant.trafficPercentage;
      const actual = variantCounts[variant.variantId] || 0;
      const totalEvents = exposureEvents.length;
      const actualPercentage = totalEvents > 0 ? (actual / totalEvents) * 100 : 0;

      expectedVsActualRatio[variant.variantId] = {
        expected,
        actual: actualPercentage,
        ratio: expected > 0 ? actualPercentage / expected : 0
      };
    });

    // Detect sample ratio mismatch (SRM)
    const srmThreshold = 0.05; // 5% threshold
    const sampleRatioMismatch = Object.values(expectedVsActualRatio).some(r =>
      Math.abs(r.ratio - 1) > srmThreshold
    );

    // Calculate missing data
    const uniqueUsers = new Set(exposureEvents.map(e => e.userId)).size;
    const usersWithConversions = new Set(conversionEvents.map(e => e.userId)).size;
    const missingDataPercentage = uniqueUsers > 0 ?
      ((uniqueUsers - usersWithConversions) / uniqueUsers) * 100 : 0;

    // Detect duplicate assignments
    const assignmentEvents = events.filter(e => e.eventType === 'assignment');
    const userAssignments = new Map<string, string[]>();
    assignmentEvents.forEach(event => {
      if (!userAssignments.has(event.userId)) {
        userAssignments.set(event.userId, []);
      }
      userAssignments.get(event.userId)!.push(event.variantId);
    });

    const duplicateAssignments = Array.from(userAssignments.values())
      .filter(assignments => new Set(assignments).size > 1).length;

    // Calculate overall quality score
    let qualityScore = 1.0;
    if (sampleRatioMismatch) qualityScore -= 0.3;
    if (missingDataPercentage > 20) qualityScore -= 0.2;
    if (duplicateAssignments > uniqueUsers * 0.05) qualityScore -= 0.2;

    qualityScore = Math.max(0, qualityScore);

    return {
      sampleRatioMismatch,
      expectedVsActualRatio,
      missingDataPercentage,
      incompleteAssignments: 0,
      duplicateAssignments,
      inconsistentEvents: 0,
      selectionBias: {
        detected: false,
        severity: 'low' as const,
        description: 'No selection bias detected',
        evidence: {},
        recommendations: []
      },
      survivalBias: {
        detected: false,
        severity: 'low' as const,
        description: 'No survival bias detected',
        evidence: {},
        recommendations: []
      },
      overallQualityScore: qualityScore
    };
  }

  // Utility methods
  private hashUserId(userId: string, experimentId: string): number {
    const str = userId + experimentId;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateStandardError(rate: number, n: number): number {
    if (n === 0) return 0;
    return Math.sqrt((rate * (1 - rate)) / n);
  }

  private calculateConfidenceInterval(rate: number, n: number): [number, number] {
    const se = this.calculateStandardError(rate, n);
    const z = 1.96; // 95% confidence interval
    return [
      Math.max(0, rate - z * se),
      Math.min(1, rate + z * se)
    ];
  }

  private generateExperimentId(): string {
    return 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private generateVariantId(): string {
    return 'var_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private generateGoalId(): string {
    return 'goal_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private generateFlagId(): string {
    return 'flag_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private generateVariationId(): string {
    return 'variation_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private generateEventId(): string {
    return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
  }
}

/**
 * Supporting classes for A/B testing functionality
*/

class ExperimentManager {
  async initialize(): Promise<void> {}
  
  async createExperiment(experiment: Experiment): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('ab_experiments').doc(experiment.experimentId).set({
        ...experiment,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw error;
    }
  }
  
  async getExperiment(id: string): Promise<Experiment | null> {
    try {
      const db = admin.firestore();
      const doc = await db.collection('ab_experiments').doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        experimentId: id,
        ...data,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        updatedAt: data.updatedAt?.toMillis() || Date.now()
      } as Experiment;
    } catch (error) {
      console.error('Failed to get experiment:', error);
      return null;
    }
  }
  
  async updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment> {
    try {
      const db = admin.firestore();
      const experimentRef = db.collection('ab_experiments').doc(id);

      await experimentRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const updatedDoc = await experimentRef.get();
      if (!updatedDoc.exists) {
        throw new Error('Experiment not found after update');
      }

      return { id, ...updatedDoc.data() } as Experiment;
    } catch (error) {
      console.error('Failed to update experiment:', error);
      throw error;
    }
  }
  
  async storeResults(id: string, results: ExperimentResults): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('ab_experiment_results').doc(id).set({
        ...results,
        storedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Also update the experiment with results reference
      await db.collection('ab_experiments').doc(id).update({
        hasResults: true,
        lastResultsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to store experiment results:', error);
      throw error;
    }
  }
}

class VariantAssignmentManager {
  async initializeExperiment(experimentId: string): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('ab_assignments_meta').doc(experimentId).set({
        experimentId,
        totalAssignments: 0,
        variantCounts: {},
        initializeAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to initialize experiment assignments:', error);
      throw error;
    }
  }
  
  async getAssignment(experimentId: string, userId: string): Promise<VariantAssignment | null> {
    try {
      const db = admin.firestore();
      const assignmentId = `${experimentId}_${userId}`;
      const doc = await db.collection('ab_assignments').doc(assignmentId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        userId,
        experimentId,
        variantId: data.variantId,
        assignedAt: data.assignedAt?.toMillis() || Date.now(),
        assignmentMethod: data.assignmentMethod || 'hash',
        context: data.context || {},
        sticky: data.sticky !== false,
        overridden: data.overridden || false,
        overrideReason: data.overrideReason
      };
    } catch (error) {
      console.error('Failed to get assignment:', error);
      return null;
    }
  }
  
  async storeAssignment(assignment: VariantAssignment): Promise<void> {
    try {
      const db = admin.firestore();
      const assignmentId = `${assignment.experimentId}_${assignment.userId}`;

      await db.collection('ab_assignments').doc(assignmentId).set({
        ...assignment,
        assignedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update assignment counts
      const metaRef = db.collection('ab_assignments_meta').doc(assignment.experimentId);
      await metaRef.update({
        totalAssignments: admin.firestore.FieldValue.increment(1),
        [`variantCounts.${assignment.variantId}`]: admin.firestore.FieldValue.increment(1)
      });
    } catch (error) {
      console.error('Failed to store assignment:', error);
      throw error;
    }
  }
}

class StatisticalAnalyzer {
  private calculateStatisticalPower(
    controlRate: number,
    treatmentRate: number,
    controlSize: number,
    treatmentSize: number,
    alpha: number = 0.05
  ): number {
    const pooledRate = (controlRate * controlSize + treatmentRate * treatmentSize) / (controlSize + treatmentSize);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSize + 1/treatmentSize));

    const effectSize = Math.abs(treatmentRate - controlRate);
    const zAlpha = this.inverseNormalCDF(1 - alpha/2);
    const zBeta = (effectSize / standardError) - zAlpha;

    return this.normalCDF(zBeta);
  }

  private inverseNormalCDF(p: number): number {
    // Approximation for inverse normal CDF
    if (p <= 0 || p >= 1) {
      throw new Error('Probability must be between 0 and 1');
    }

    // Using Beasley-Springer-Moro approximation
    const c = [2.515517, 0.802853, 0.010328];
    const d = [1.432788, 0.189269, 0.001308];

    if (p > 0.5) {
      const t = Math.sqrt(-2 * Math.log(1 - p));
      return t - (c[0] + c[1] * t + c[2] * t * t) / (1 + d[0] * t + d[1] * t * t + d[2] * t * t * t);
    } else {
      const t = Math.sqrt(-2 * Math.log(p));
      return -(t - (c[0] + c[1] * t + c[2] * t * t) / (1 + d[0] * t + d[1] * t * t + d[2] * t * t * t));
    }
  }

  async calculateSampleSize(params: {
    baselineConversion: number;
    minimumDetectableEffect: number;
    significanceLevel: number;
    power: number;
    variants: number;
  }): Promise<SampleSizeCalculation> {
    // Statistical calculations for sample size
    const z_alpha = 1.96; // For 95% confidence
    const z_beta = 0.84;  // For 80% power
    const p1 = params.baselineConversion;
    const p2 = p1 * (1 + params.minimumDetectableEffect);
    const p_pooled = (p1 + p2) / 2;
    
    const sampleSizePerVariant = Math.ceil(
      (2 * p_pooled * (1 - p_pooled) * Math.pow(z_alpha + z_beta, 2)) /
      Math.pow(p2 - p1, 2)
    );
    
    return {
      calculationId: 'calc_' + Date.now(),
      timestamp: Date.now(),
      parameters: params,
      results: {
        sampleSizePerVariant,
        totalSampleSize: sampleSizePerVariant * params.variants,
        estimatedDuration: Math.ceil(sampleSizePerVariant / 100), // Assuming 100 users per day
        confidence: params.power
      },
      assumptions: ['Assumes normal distribution', 'Assumes equal variance']
    };
  }
  
  async analyzeResults(
    variantResults: VariantResults[],
    config: any
  ): Promise<StatisticalAnalysis> {
    // Statistical analysis implementation
    const control = variantResults.find(v => v.isControl);
    if (!control) {
      throw new Error('No control variant found');
    }
    
    // Statistical significance testing using two-proportion z-test
    const treatment = variantResults.find(v => !v.isControl);
    if (!treatment) {
      throw new Error('No treatment variant found');
    }
    
    const controlRate = control.statisticalSummary.conversionRate || 0;
    const treatmentRate = treatment.statisticalSummary.conversionRate || 0;
    const pooledSE = Math.sqrt(
      (controlRate * (1 - controlRate) / control.totalUsers) +
      (treatmentRate * (1 - treatmentRate) / treatment.totalUsers)
    );
    
    const zScore = (treatmentRate - controlRate) / pooledSE;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    return {
      method: StatisticalMethod.FREQUENTIST,
      pValue,
      isStatisticallySignificant: pValue < config.significanceLevel,
      confidenceLevel: 1 - config.significanceLevel,
      effectSize: treatmentRate - controlRate,
      practicalSignificance: Math.abs(treatmentRate - controlRate) > 0.01, // 1% threshold
      achievedPower: this.calculateStatisticalPower(controlRate, treatmentRate, control.totalUsers, treatment.totalUsers)
    };
  }
  
  private normalCDF(x: number): number {
    // Approximation of normal CDF
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
  
  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
}

class FeatureFlagManager {
  async initialize(): Promise<void> {}

  private hashUserId(userId: string, flagId: string): number {
    const str = userId + flagId;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private evaluateTargetingRules(
    rules: any[],
    userId?: string,
    context?: Record<string, any>
  ): any {
    // Simple rule evaluation - in practice this would be more sophisticated
    for (const rule of rules) {
      if (rule.attribute === 'userId' && rule.operator === 'equals' && rule.value === userId) {
        return rule;
      }
      if (context && rule.attribute in context) {
        const contextValue = context[rule.attribute];
        if (rule.operator === 'equals' && rule.value === contextValue) {
          return rule;
        }
        if (rule.operator === 'contains' && typeof contextValue === 'string' && contextValue.includes(rule.value)) {
          return rule;
        }
      }
    }
    return null;
  }
  
  async createFlag(flag: FeatureFlag): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('feature_flags').doc(flag.flagId).set({
        ...flag,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to create feature flag:', error);
      throw error;
    }
  }
  
  async evaluateFlag(flagKey: string, userId?: string, context?: Record<string, any>): Promise<any> {
    try {
      const db = admin.firestore();
      const flagQuery = await db.collection('feature_flags')
        .where('key', '==', flagKey)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (flagQuery.empty) {
        return false; // Flag not found or inactive
      }

      const flagDoc = flagQuery.docs[0];
      const flag = flagDoc.data() as FeatureFlag;

      // Check rollout percentage
      if (userId) {
        const hash = this.hashUserId(userId, flag.flagId);
        const userPercentile = hash % 100;

        if (userPercentile >= flag.rolloutPercentage) {
          return flag.defaultVariation;
        }
      }

      // Evaluate targeting rules if present
      if (flag.targeting?.rules && flag.targeting.rules.length > 0) {
        const matchedRule = this.evaluateTargetingRules(flag.targeting.rules, userId, context);
        if (matchedRule) {
          return matchedRule.variation;
        }
      }

      // Return appropriate variation
      const variation = flag.variations.find(v => v.variationId === flag.defaultVariation);
      return variation?.value || false;
    } catch (error) {
      console.error('Failed to evaluate feature flag:', error);
      return false;
    }
  }
  
  async updateRollout(flagId: string, percentage: number): Promise<FeatureFlag> {
    try {
      const db = admin.firestore();
      const flagRef = db.collection('feature_flags').doc(flagId);

      await flagRef.update({
        rolloutPercentage: percentage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const updatedDoc = await flagRef.get();
      if (!updatedDoc.exists) {
        throw new Error('Feature flag not found after update');
      }

      const data = updatedDoc.data();
      return {
        id: flagId,
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        rolloutPercentage: percentage,
        targetAudience: data.targetAudience || {},
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to update feature flag rollout:', error);
      throw error;
    }
  }
}

class ABTestEventTracker {
  async initialize(): Promise<void> {}
  
  async startTrackingExperiment(experimentId: string): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('ab_tracking_status').doc(experimentId).set({
        experimentId,
        isTracking: true,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        eventCount: 0
      });
    } catch (error) {
      console.error('Failed to start tracking experiment:', error);
      throw error;
    }
  }
  
  async stopTrackingExperiment(experimentId: string): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('ab_tracking_status').doc(experimentId).update({
        isTracking: false,
        stoppedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to stop tracking experiment:', error);
      throw error;
    }
  }
  
  async trackEvent(event: ABTestEvent): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('ab_events').add({
        ...event,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update tracking status event count
      await db.collection('ab_tracking_status').doc(event.experimentId).update({
        eventCount: admin.firestore.FieldValue.increment(1),
        lastEventAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to track AB test event:', error);
      throw error;
    }
  }
  
  async trackAssignment(assignment: VariantAssignment): Promise<void> {
    // Track assignment event in Firestore
    const event: ABTestEvent = {
      eventId: 'evt_' + Date.now(),
      timestamp: Date.now(),
      userId: assignment.userId,
      sessionId: assignment.context.sessionId || 'unknown',
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      eventType: 'assignment',
      properties: {
        assignmentMethod: assignment.assignmentMethod,
        overridden: assignment.overridden
      },
      context: assignment.context
    };
    
    await this.trackEvent(event);
  }
  
  async getExperimentEvents(experimentId: string): Promise<ABTestEvent[]> {
    try {
      const db = admin.firestore();
      const eventsQuery = await db.collection('ab_events')
        .where('experimentId', '==', experimentId)
        .orderBy('timestamp', 'desc')
        .limit(10000) // Limit to prevent memory issues
        .get();

      return eventsQuery.docs.map(doc => {
        const data = doc.data();
        return {
          eventId: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now()
        } as ABTestEvent;
      });
    } catch (error) {
      console.error('Failed to get experiment events:', error);
      return [];
    }
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
}

export { ABTestingService as default };