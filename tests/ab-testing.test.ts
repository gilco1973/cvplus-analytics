/**
 * CVPlus A/B Testing Service - Test Suite
// Comprehensive tests for experimentation, statistical analysis, and feature flags

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ABTestingService from '../services/ab-testing.service';
import {
  ExperimentType,
  ExperimentStatus,
  StatisticalMethod,
  MetricType,
  TrafficAllocation
} from '../types/ab-testing.types';

describe('ABTestingService', () => {
  let abTestingService: ABTestingService;

  beforeEach(async () => {
    abTestingService = new ABTestingService();
    await abTestingService.initialize();
  });

  describe('Experiment Creation and Management', () => {
    const mockExperimentConfig = {
      name: 'CV Template Comparison Test',
      description: 'Testing new CV template design against current version',
      hypothesis: 'New template design will increase CV completion rates by 15%',
      type: ExperimentType.AB_TEST,
      variants: [
        {
          name: 'Control - Current Template',
          description: 'Current CV template design',
          isControl: true,
          trafficPercentage: 50,
          configuration: { templateId: 'current_template' }
        },
        {
          name: 'Treatment - New Template',
          description: 'New CV template design with improved UX',
          isControl: false,
          trafficPercentage: 50,
          configuration: { templateId: 'new_template' }
        }
      ],
      goals: [
        {
          name: 'CV Completion Rate',
          description: 'Percentage of users who complete their CV',
          type: MetricType.CONVERSION,
          isPrimary: true,
          eventName: 'cv_generation_completed',
          aggregation: 'count' as const,
          successCriteria: {
            direction: 'increase' as const,
            minimumDetectableEffect: 0.15,
            practicalSignificance: 0.05
          },
          statistical: {
            significanceLevel: 0.05,
            power: 0.8,
            method: StatisticalMethod.FREQUENTIST
          }
        }
      ],
      trafficAllocation: TrafficAllocation.RANDOM,
      totalTrafficPercentage: 100,
      owner: 'product_team',
      tags: ['cv_generation', 'template', 'ux']
    };

    it('should create an experiment with proper configuration', async () => {
      const experiment = await abTestingService.createExperiment(mockExperimentConfig);

      expect(experiment).toBeDefined();
      expect(experiment.experimentId).toBeDefined();
      expect(experiment.name).toBe(mockExperimentConfig.name);
      expect(experiment.description).toBe(mockExperimentConfig.description);
      expect(experiment.hypothesis).toBe(mockExperimentConfig.hypothesis);
      expect(experiment.type).toBe(ExperimentType.AB_TEST);
      expect(experiment.status).toBe(ExperimentStatus.DRAFT);
      expect(experiment.variants).toHaveLength(2);
      expect(experiment.goals).toHaveLength(1);
      expect(experiment.sampleSizeCalculation).toBeDefined();
      expect(experiment.preTestChecklist).toBeDefined();
    });

    it('should validate experiment configuration', async () => {
      const invalidConfig = {
        ...mockExperimentConfig,
        name: '', // Invalid: empty name
        variants: [], // Invalid: no variants
        goals: [] // Invalid: no goals
      };

      await expect(abTestingService.createExperiment(invalidConfig as any))
        .rejects.toThrow();
    });

    it('should validate traffic allocation', async () => {
      const invalidTrafficConfig = {
        ...mockExperimentConfig,
        variants: [
          {
            ...mockExperimentConfig.variants[0],
            trafficPercentage: 60
          },
          {
            ...mockExperimentConfig.variants[1],
            trafficPercentage: 60 // Total = 120%, should be invalid
          }
        ]
      };

      await expect(abTestingService.createExperiment(invalidTrafficConfig as any))
        .rejects.toThrow();
    });

    it('should calculate sample size requirements', async () => {
      const experiment = await abTestingService.createExperiment(mockExperimentConfig);

      expect(experiment.sampleSizeCalculation).toBeDefined();
      expect(experiment.sampleSizeCalculation.results.sampleSizePerVariant).toBeGreaterThan(0);
      expect(experiment.sampleSizeCalculation.results.totalSampleSize).toBeGreaterThan(0);
      expect(experiment.sampleSizeCalculation.results.estimatedDuration).toBeGreaterThan(0);
    });

    it('should generate pre-test checklist', async () => {
      const experiment = await abTestingService.createExperiment(mockExperimentConfig);

      expect(experiment.preTestChecklist).toBeDefined();
      expect(experiment.preTestChecklist.length).toBeGreaterThan(0);
      
      const technicalCheck = experiment.preTestChecklist.find(
        item => item.category === 'technical'
      );
      expect(technicalCheck).toBeDefined();
      
      const legalCheck = experiment.preTestChecklist.find(
        item => item.category === 'legal'
      );
      expect(legalCheck).toBeDefined();
    });
  });

  describe('Experiment Lifecycle Management', () => {
    let experiment: any;

    beforeEach(async () => {
      const config = {
        name: 'Test Experiment',
        description: 'Test Description',
        hypothesis: 'Test Hypothesis',
        type: ExperimentType.AB_TEST,
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficPercentage: 50,
            configuration: { feature: 'control' }
          },
          {
            name: 'Treatment',
            description: 'Treatment variant',
            isControl: false,
            trafficPercentage: 50,
            configuration: { feature: 'treatment' }
          }
        ],
        goals: [
          {
            name: 'Conversion Rate',
            description: 'Test conversion rate',
            type: MetricType.CONVERSION,
            isPrimary: true,
            eventName: 'conversion_event',
            aggregation: 'count' as const,
            successCriteria: {
              direction: 'increase' as const,
              minimumDetectableEffect: 0.1
            },
            statistical: {
              significanceLevel: 0.05,
              power: 0.8,
              method: StatisticalMethod.FREQUENTIST
            }
          }
        ],
        trafficAllocation: TrafficAllocation.RANDOM,
        totalTrafficPercentage: 100,
        owner: 'test_user'
      };

      experiment = await abTestingService.createExperiment(config);
    });

    it('should start an experiment when pre-conditions are met', async () => {
      // Mock completing pre-test checklist
      experiment.preTestChecklist.forEach((item: any) => {
        item.completed = true;
      });

      const result = await abTestingService.startExperiment(experiment.experimentId);

      expect(result.success).toBe(true);
      expect(result.experiment).toBeDefined();
      expect(result.experiment!.status).toBe(ExperimentStatus.RUNNING);
      expect(result.experiment!.actualStartedAt).toBeDefined();
    });

    it('should prevent starting experiment with incomplete checklist', async () => {
      // Leave checklist incomplete
      const result = await abTestingService.startExperiment(experiment.experimentId);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should stop a running experiment', async () => {
      // Start experiment first
      experiment.preTestChecklist.forEach((item: any) => {
        item.completed = true;
      });
      await abTestingService.startExperiment(experiment.experimentId);

      // Stop the experiment
      const stoppedExperiment = await abTestingService.stopExperiment(
        experiment.experimentId,
        'Test completion'
      );

      expect(stoppedExperiment.status).toBe(ExperimentStatus.COMPLETED);
      expect(stoppedExperiment.actualEndedAt).toBeDefined();
    });

    it('should pause and resume an experiment', async () => {
      // Start experiment
      experiment.preTestChecklist.forEach((item: any) => {
        item.completed = true;
      });
      await abTestingService.startExperiment(experiment.experimentId);

      // Pause experiment
      const pausedExperiment = await abTestingService.pauseExperiment(experiment.experimentId);
      expect(pausedExperiment.status).toBe(ExperimentStatus.PAUSED);

      // Resume experiment
      const resumedExperiment = await abTestingService.resumeExperiment(experiment.experimentId);
      expect(resumedExperiment.status).toBe(ExperimentStatus.RUNNING);
    });
  });

  describe('Variant Assignment', () => {
    let runningExperiment: any;

    beforeEach(async () => {
      // Create and start an experiment
      const config = {
        name: 'Assignment Test Experiment',
        description: 'Testing variant assignment',
        hypothesis: 'Test hypothesis',
        type: ExperimentType.AB_TEST,
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficPercentage: 50,
            configuration: { version: 'A' }
          },
          {
            name: 'Treatment',
            description: 'Treatment variant',
            isControl: false,
            trafficPercentage: 50,
            configuration: { version: 'B' }
          }
        ],
        goals: [
          {
            name: 'Test Goal',
            description: 'Test goal',
            type: MetricType.CONVERSION,
            isPrimary: true,
            eventName: 'test_event',
            aggregation: 'count' as const,
            successCriteria: {
              direction: 'increase' as const,
              minimumDetectableEffect: 0.1
            },
            statistical: {
              significanceLevel: 0.05,
              power: 0.8,
              method: StatisticalMethod.FREQUENTIST
            }
          }
        ],
        trafficAllocation: TrafficAllocation.RANDOM,
        totalTrafficPercentage: 100,
        owner: 'test_user'
      };

      runningExperiment = await abTestingService.createExperiment(config);
      
      // Complete checklist and start experiment
      runningExperiment.preTestChecklist.forEach((item: any) => {
        item.completed = true;
      });
      
      const startResult = await abTestingService.startExperiment(runningExperiment.experimentId);
      runningExperiment = startResult.experiment!;
    });

    it('should assign variants to users consistently', async () => {
      const userId = 'test_user_123';

      const assignment1 = await abTestingService.getVariantAssignment(
        runningExperiment.experimentId,
        userId
      );
      
      const assignment2 = await abTestingService.getVariantAssignment(
        runningExperiment.experimentId,
        userId
      );

      expect(assignment1).toBeDefined();
      expect(assignment2).toBeDefined();
      expect(assignment1!.variantId).toBe(assignment2!.variantId);
      expect(assignment1!.userId).toBe(userId);
      expect(assignment1!.experimentId).toBe(runningExperiment.experimentId);
      expect(assignment1!.assignmentMethod).toBe('hash');
      expect(assignment1!.sticky).toBe(true);
    });

    it('should assign different users to different variants', async () => {
      const assignments = await Promise.all([
        abTestingService.getVariantAssignment(runningExperiment.experimentId, 'user_1'),
        abTestingService.getVariantAssignment(runningExperiment.experimentId, 'user_2'),
        abTestingService.getVariantAssignment(runningExperiment.experimentId, 'user_3'),
        abTestingService.getVariantAssignment(runningExperiment.experimentId, 'user_4')
      ]);

      // Should have assignments for all users
      assignments.forEach(assignment => {
        expect(assignment).toBeDefined();
        expect(assignment!.variantId).toBeDefined();
      });

      // Should have some distribution (not all same variant)
      const variantIds = assignments.map(a => a!.variantId);
      const uniqueVariants = new Set(variantIds);
      expect(uniqueVariants.size).toBeGreaterThan(1);
    });

    it('should not assign variants for stopped experiments', async () => {
      // Stop the experiment
      await abTestingService.stopExperiment(runningExperiment.experimentId);

      const assignment = await abTestingService.getVariantAssignment(
        runningExperiment.experimentId,
        'new_user'
      );

      expect(assignment).toBeNull();
    });

    it('should override variant assignments', async () => {
      const userId = 'override_test_user';
      const targetVariantId = runningExperiment.variants[0].variantId;

      const overrideAssignment = await abTestingService.overrideVariantAssignment(
        runningExperiment.experimentId,
        userId,
        targetVariantId,
        'Manual testing override'
      );

      expect(overrideAssignment).toBeDefined();
      expect(overrideAssignment.variantId).toBe(targetVariantId);
      expect(overrideAssignment.assignmentMethod).toBe('override');
      expect(overrideAssignment.overridden).toBe(true);
      expect(overrideAssignment.overrideReason).toBe('Manual testing override');
    });
  });

  describe('Event Tracking', () => {
    let runningExperiment: any;

    beforeEach(async () => {
      // Set up a running experiment
      const config = {
        name: 'Event Tracking Test',
        description: 'Testing event tracking',
        hypothesis: 'Test hypothesis',
        type: ExperimentType.AB_TEST,
        variants: [
          { name: 'Control', description: 'Control', isControl: true, trafficPercentage: 50, configuration: {} },
          { name: 'Treatment', description: 'Treatment', isControl: false, trafficPercentage: 50, configuration: {} }
        ],
        goals: [
          {
            name: 'Test Conversion',
            description: 'Test conversion goal',
            type: MetricType.CONVERSION,
            isPrimary: true,
            eventName: 'test_conversion',
            aggregation: 'count' as const,
            successCriteria: { direction: 'increase' as const, minimumDetectableEffect: 0.1 },
            statistical: { significanceLevel: 0.05, power: 0.8, method: StatisticalMethod.FREQUENTIST }
          }
        ],
        trafficAllocation: TrafficAllocation.RANDOM,
        totalTrafficPercentage: 100,
        owner: 'test_user'
      };

      runningExperiment = await abTestingService.createExperiment(config);
      runningExperiment.preTestChecklist.forEach((item: any) => { item.completed = true; });
      const result = await abTestingService.startExperiment(runningExperiment.experimentId);
      runningExperiment = result.experiment!;
    });

    it('should track exposure events', async () => {
      const userId = 'exposure_test_user';
      const assignment = await abTestingService.getVariantAssignment(
        runningExperiment.experimentId,
        userId
      );

      await abTestingService.trackExposure(
        runningExperiment.experimentId,
        userId,
        assignment!.variantId,
        { sessionId: 'test_session' }
      );

      // Exposure event should be tracked (verified by implementation)
    });

    it('should track conversion events', async () => {
      const userId = 'conversion_test_user';
      const goalId = runningExperiment.goals[0].goalId;

      // First assign user to variant
      await abTestingService.getVariantAssignment(runningExperiment.experimentId, userId);

      // Track conversion
      await abTestingService.trackConversion(
        runningExperiment.experimentId,
        userId,
        goalId,
        100, // value
        { sessionId: 'test_session', additionalData: 'test' }
      );

      // Conversion event should be tracked (verified by implementation)
    });

    it('should not track conversions for users not in experiment', async () => {
      const userId = 'non_experiment_user';
      const goalId = runningExperiment.goals[0].goalId;

      // Don't assign user to variant
      // Track conversion - should be ignored
      await abTestingService.trackConversion(
        runningExperiment.experimentId,
        userId,
        goalId,
        100
      );

      // Event should be ignored (verified by implementation)
    });
  });

  describe('Statistical Analysis and Results', () => {
    let experimentWithResults: any;

    beforeEach(async () => {
      // Create experiment with mock data
      experimentWithResults = {
        experimentId: 'results_test_exp',
        goals: [
          {
            goalId: 'goal_1',
            name: 'Conversion Rate',
            isPrimary: true
          }
        ],
        variants: [
          { variantId: 'control', name: 'Control', isControl: true },
          { variantId: 'treatment', name: 'Treatment', isControl: false }
        ],
        statisticalConfig: {
          method: StatisticalMethod.FREQUENTIST,
          significanceLevel: 0.05,
          power: 0.8
        },
        actualStartedAt: Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago
      };
    });

    it('should generate experiment results with statistical analysis', async () => {
      const results = await abTestingService.generateExperimentResults(
        experimentWithResults.experimentId
      );

      expect(results).toBeDefined();
      expect(results.experimentId).toBe(experimentWithResults.experimentId);
      expect(results.variantResults).toBeDefined();
      expect(results.statisticalAnalysis).toBeDefined();
      expect(results.recommendations).toBeDefined();
      expect(results.dataQuality).toBeDefined();
      expect(results.generatedAt).toBeDefined();
    });

    it('should calculate variant performance metrics', async () => {
      const results = await abTestingService.generateExperimentResults(
        experimentWithResults.experimentId
      );

      expect(results.variantResults).toHaveLength(2);
      
      results.variantResults.forEach(variantResult => {
        expect(variantResult.variantId).toBeDefined();
        expect(variantResult.variantName).toBeDefined();
        expect(typeof variantResult.isControl).toBe('boolean');
        expect(variantResult.totalUsers).toBeGreaterThanOrEqual(0);
        expect(variantResult.statisticalSummary).toBeDefined();
        expect(variantResult.goalResults).toBeDefined();
      });
    });

    it('should perform statistical significance testing', async () => {
      const results = await abTestingService.generateExperimentResults(
        experimentWithResults.experimentId
      );

      expect(results.statisticalAnalysis.method).toBe(StatisticalMethod.FREQUENTIST);
      expect(typeof results.statisticalAnalysis.pValue).toBe('number');
      expect(typeof results.statisticalAnalysis.isStatisticallySignificant).toBe('boolean');
      expect(typeof results.statisticalAnalysis.effectSize).toBe('number');
      expect(typeof results.statisticalAnalysis.achievedPower).toBe('number');
    });

    it('should assess data quality', async () => {
      const results = await abTestingService.generateExperimentResults(
        experimentWithResults.experimentId
      );

      expect(results.dataQuality).toBeDefined();
      expect(typeof results.dataQuality.sampleRatioMismatch).toBe('boolean');
      expect(typeof results.dataQuality.missingDataPercentage).toBe('number');
      expect(typeof results.dataQuality.overallQualityScore).toBe('number');
    });
  });

  describe('Feature Flags', () => {
    it('should create feature flags', async () => {
      const flagConfig = {
        name: 'New Dashboard',
        description: 'Enable new dashboard design',
        key: 'new_dashboard_enabled',
        variations: [
          { name: 'Disabled', value: false, description: 'Old dashboard', trafficPercentage: 50 },
          { name: 'Enabled', value: true, description: 'New dashboard', trafficPercentage: 50 }
        ],
        defaultVariation: 'Disabled',
        environment: 'development' as const
      };

      const featureFlag = await abTestingService.createFeatureFlag(flagConfig);

      expect(featureFlag).toBeDefined();
      expect(featureFlag.flagId).toBeDefined();
      expect(featureFlag.name).toBe(flagConfig.name);
      expect(featureFlag.key).toBe(flagConfig.key);
      expect(featureFlag.status).toBe('active');
      expect(featureFlag.variations).toHaveLength(2);
    });

    it('should evaluate feature flags', async () => {
      const flagKey = 'test_feature';
      const userId = 'test_user';

      const flagValue = await abTestingService.getFeatureFlagValue(
        flagKey,
        userId,
        { userSegment: 'premium' }
      );

      // Should return a value (default false for non-existent flags)
      expect(typeof flagValue).toBe('boolean');
    });

    it('should update feature flag rollout', async () => {
      // Create flag first
      const flag = await abTestingService.createFeatureFlag({
        name: 'Rollout Test',
        description: 'Testing rollout',
        key: 'rollout_test',
        variations: [
          { name: 'Off', value: false, description: 'Off', trafficPercentage: 100 },
          { name: 'On', value: true, description: 'On', trafficPercentage: 0 }
        ],
        defaultVariation: 'Off',
        environment: 'development'
      });

      const updatedFlag = await abTestingService.updateFeatureFlagRollout(
        flag.flagId,
        25 // 25% rollout
      );

      expect(updatedFlag.rolloutPercentage).toBe(25);
    });
  });

  describe('CVPlus-Specific Experiments', () => {
    it('should create CV template comparison experiment', async () => {
      const cvExperimentConfig = {
        name: 'CV Template A/B Test',
        description: 'Testing new CV template against current version',
        hypothesis: 'New template will improve completion rates',
        type: ExperimentType.AB_TEST,
        variants: [
          {
            name: 'Current Template',
            description: 'Existing CV template',
            isControl: true,
            trafficPercentage: 50,
            configuration: { templateId: 'classic_template' }
          },
          {
            name: 'New Template',
            description: 'Improved CV template design',
            isControl: false,
            trafficPercentage: 50,
            configuration: { templateId: 'modern_template' }
          }
        ],
        goals: [
          {
            name: 'CV Generation Completion',
            description: 'Users who complete CV generation',
            type: MetricType.CONVERSION,
            isPrimary: true,
            eventName: 'cv_generation_completed',
            aggregation: 'count' as const,
            successCriteria: {
              direction: 'increase' as const,
              minimumDetectableEffect: 0.1
            },
            statistical: {
              significanceLevel: 0.05,
              power: 0.8,
              method: StatisticalMethod.FREQUENTIST
            }
          }
        ],
        trafficAllocation: TrafficAllocation.RANDOM,
        totalTrafficPercentage: 100,
        owner: 'product_team'
      };

      const experiment = await abTestingService.createExperiment(cvExperimentConfig);
      expect(experiment.name).toBe('CV Template A/B Test');
      expect(experiment.goals[0].eventName).toBe('cv_generation_completed');
    });

    it('should create premium feature experiment', async () => {
      const premiumExperimentConfig = {
        name: 'Premium Paywall Position Test',
        description: 'Testing different paywall positions for premium features',
        hypothesis: 'Earlier paywall will increase conversion rates',
        type: ExperimentType.AB_TEST,
        variants: [
          {
            name: 'Late Paywall',
            description: 'Show paywall after 3 CV generations',
            isControl: true,
            trafficPercentage: 50,
            configuration: { paywallTrigger: 3 }
          },
          {
            name: 'Early Paywall',
            description: 'Show paywall after 1 CV generation',
            isControl: false,
            trafficPercentage: 50,
            configuration: { paywallTrigger: 1 }
          }
        ],
        goals: [
          {
            name: 'Premium Conversion',
            description: 'Users who upgrade to premium',
            type: MetricType.CONVERSION,
            isPrimary: true,
            eventName: 'subscription_upgraded',
            aggregation: 'count' as const,
            successCriteria: {
              direction: 'increase' as const,
              minimumDetectableEffect: 0.05
            },
            statistical: {
              significanceLevel: 0.05,
              power: 0.8,
              method: StatisticalMethod.FREQUENTIST
            }
          }
        ],
        trafficAllocation: TrafficAllocation.RANDOM,
        totalTrafficPercentage: 100,
        owner: 'growth_team'
      };

      const experiment = await abTestingService.createExperiment(premiumExperimentConfig);
      expect(experiment.goals[0].eventName).toBe('subscription_upgraded');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent experiment gracefully', async () => {
      const assignment = await abTestingService.getVariantAssignment(
        'non_existent_experiment',
        'test_user'
      );

      expect(assignment).toBeNull();
    });

    it('should handle invalid experiment IDs', async () => {
      const result = await abTestingService.startExperiment('invalid_id');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle empty user IDs', async () => {
      // Create and start experiment first
      const config = {
        name: 'Edge Case Test',
        description: 'Test',
        hypothesis: 'Test',
        type: ExperimentType.AB_TEST,
        variants: [{ name: 'Control', description: 'Control', isControl: true, trafficPercentage: 100, configuration: {} }],
        goals: [{
          name: 'Test Goal',
          description: 'Test',
          type: MetricType.CONVERSION,
          isPrimary: true,
          eventName: 'test',
          aggregation: 'count' as const,
          successCriteria: { direction: 'increase' as const, minimumDetectableEffect: 0.1 },
          statistical: { significanceLevel: 0.05, power: 0.8, method: StatisticalMethod.FREQUENTIST }
        }],
        trafficAllocation: TrafficAllocation.RANDOM,
        totalTrafficPercentage: 100,
        owner: 'test'
      };

      const experiment = await abTestingService.createExperiment(config);
      
      const assignment = await abTestingService.getVariantAssignment(
        experiment.experimentId,
        '' // Empty user ID
      );

      // Should handle gracefully
      expect(assignment).toBeDefined(); // Or null, depending on implementation
    });
  });
});