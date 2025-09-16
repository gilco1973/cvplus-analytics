/**/**
 * Dependency Injection Usage Examples
 * Shows how to properly use the enhanced premium guard with dependency injection
 * Author: Gil Klainert
 * Date: August 29, 2025
 * 
 * ARCHITECTURAL FIX EXAMPLE: Demonstrates the corrected dependency injection pattern
 */

import { Request, Response } from 'express';
import { IFeatureRegistry, Feature } from '@cvplus/core';
import { enhancedPremiumGuard, premiumFeatureGuard, enterpriseFeatureGuard } from '../middleware/enhancedPremiumGuard';

/**
 * Example 1: Using with Premium Module's FeatureRegistryAdapter
 * 
 * This is the recommended approach for production use.
 * The FeatureRegistryAdapter provides interface compliance for the existing FeatureRegistry.
 */
export function exampleWithPremiumAdapter() {
  // In a real Firebase Function, you would import:
  
  // Mock for demonstration
  const mockFeatureRegistry: IFeatureRegistry = {
    getFeature: (id: string) => ({
      id,
      name: 'Mock Feature',
      description: 'A mock feature',
      tier: 'premium' as const,
      usageLimits: { free: 5, premium: 50, enterprise: -1 }
    }),
    registerFeature: () => {},
    getAllFeatures: () => [],
    getFeaturesForTier: () => []
  };
  
  // Create middleware with injected dependency
  const premiumMiddleware = enhancedPremiumGuard({
    requiredFeature: 'advancedAnalytics',
    trackUsage: true,
    allowGracePeriod: true,
    rateLimitPerMinute: 10
  }, mockFeatureRegistry);
  
  return premiumMiddleware;
}

/**
 * Example 2: Using convenience wrappers with dependency injection
 */
export function exampleWithConvenienceWrappers() {
  // Mock registry for demonstration
  const mockFeatureRegistry: IFeatureRegistry = {
    getFeature: (id: string) => ({
      id,
      name: 'Mock Feature',
      description: 'A mock feature',
      tier: 'premium' as const,
      usageLimits: { free: 5, premium: 50, enterprise: -1 }
    }),
    registerFeature: () => {},
    getAllFeatures: () => [],
    getFeaturesForTier: () => []
  };
  
  // Premium feature guard
  const premiumGuard = premiumFeatureGuard('videoGeneration', {
    customErrorMessage: 'Video generation requires premium subscription'
  }, mockFeatureRegistry);
  
  // Enterprise feature guard
  const enterpriseGuard = enterpriseFeatureGuard('enterpriseAnalytics', {
    rateLimitPerMinute: 100
  }, mockFeatureRegistry);
  
  return { premiumGuard, enterpriseGuard };
}

/**
 * Example 3: Complete Firebase Function with proper dependency injection
 */
export function exampleFirebaseFunction() {
  // In a real implementation, import the adapter
  
  // Mock for demonstration
  const featureRegistry: IFeatureRegistry = {
    getFeature: (id: string) => ({
      id,
      name: 'Test Feature',
      description: 'Test feature description',
      tier: 'premium' as const,
      usageLimits: { free: 3, premium: 50, enterprise: -1 }
    }),
    registerFeature: () => {},
    getAllFeatures: () => [],
    getFeaturesForTier: () => []
  };
  
  // Create the middleware
  const guard = enhancedPremiumGuard({
    requiredFeature: 'aiRecommendations',
    trackUsage: true,
    allowGracePeriod: true,
    gracePeriodDays: 7,
    rateLimitPerMinute: 20
  }, featureRegistry);
  
  // Example Firebase Function handler
  return async (req: Request, res: Response) => {
    // Apply the middleware
    await new Promise<void>((resolve, reject) => {
      guard(req, res, (error?: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    // If we reach here, the user has access to the feature
    res.json({
      message: 'Access granted to AI recommendations feature',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Example 4: Custom feature registry implementation
 * 
 * This shows how you could create a custom implementation of IFeatureRegistry
 * for specific use cases or testing.
 */
export class CustomFeatureRegistry implements IFeatureRegistry {
  private features: Map<string, Feature> = new Map();
  
  constructor() {
    // Initialize with some features
    this.features.set('customFeature', {
      id: 'customFeature',
      name: 'Custom Feature',
      description: 'A custom feature implementation',
      tier: 'premium',
      usageLimits: {
        free: 0,
        premium: 25,
        enterprise: 100
      },
      rateLimit: {
        requests: 10,
        windowMs: 60000 // 1 minute
      }
    });
  }
  
  getFeature(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }
  
  registerFeature(feature: Feature): void {
    this.features.set(feature.id, feature);
  }
  
  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }
  
  getFeaturesForTier(tier: string): Feature[] {
    const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
    const tierLevel = tierHierarchy[tier as keyof typeof tierHierarchy] || 0;
    
    return this.getAllFeatures().filter(feature => {
      const featureTierLevel = tierHierarchy[feature.tier] || 0;
      return featureTierLevel <= tierLevel;
    });
  }
}

/**
 * Example 5: Error handling for missing registry
 */
export function exampleErrorHandling() {
  // This will properly handle the missing registry case
  const middlewareWithoutRegistry = enhancedPremiumGuard({
    requiredFeature: 'testFeature'
  }); // No registry provided
  
  return async (req: Request, res: Response) => {
    try {
      await new Promise<void>((resolve, reject) => {
        middlewareWithoutRegistry(req, res, (error?: any) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      // Will catch the FEATURE_REGISTRY_MISSING error
      console.error('Registry missing error:', error);
      return res.status(500).json({
        error: 'Service configuration error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Example 6: Recommended production usage pattern
 */
export function productionUsageExample() {
  // This is how you should structure your Firebase Functions
  
  /*
  // Step 1: Import the adapter (in real code)
  
  // Step 2: Create middleware with injected dependency
  const analyticsGuard = premiumFeatureGuard('advancedAnalytics', {
    trackUsage: true,
    allowGracePeriod: true,
    rateLimitPerMinute: 50
  }, featureRegistryInstance);
  
  // Step 3: Use in Firebase Function
  export const getAdvancedAnalytics = https.onCall(async (data, context) => {
    // Apply middleware (you'd need to adapt this for Firebase callable functions)
    // ... middleware logic ...
    
    // Your function logic here
    return {
      success: true,
      data: 'Advanced analytics data'
    };
  });
  */
  
  return 'See comments above for production usage pattern';
}

/**
 * Testing utilities for the new architecture
 */
export function createMockFeatureRegistry(customFeatures?: Feature[]): IFeatureRegistry {
  const defaultFeatures: Feature[] = [
    {
      id: 'basicFeature',
      name: 'Basic Feature',
      description: 'A basic free feature',
      tier: 'free'
    },
    {
      id: 'premiumFeature',
      name: 'Premium Feature',
      description: 'A premium feature',
      tier: 'premium',
      usageLimits: { free: 0, premium: 50, enterprise: -1 }
    },
    {
      id: 'enterpriseFeature',
      name: 'Enterprise Feature',
      description: 'An enterprise-only feature',
      tier: 'enterprise',
      usageLimits: { enterprise: -1 }
    }
  ];
  
  const features = customFeatures || defaultFeatures;
  const featureMap = new Map(features.map(f => [f.id, f]));
  
  return {
    getFeature: (id: string) => featureMap.get(id),
    registerFeature: (feature: Feature) => featureMap.set(feature.id, feature),
    getAllFeatures: () => Array.from(featureMap.values()),
    getFeaturesForTier: (tier: string) => {
      const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
      const tierLevel = tierHierarchy[tier as keyof typeof tierHierarchy] || 0;
      
      return Array.from(featureMap.values()).filter(feature => {
        const featureTierLevel = tierHierarchy[feature.tier] || 0;
        return featureTierLevel <= tierLevel;
      });
    }
  };
}