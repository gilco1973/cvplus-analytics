// @ts-nocheck
/**
 * Market Feature Service
 * 
 * Extracts market intelligence features including industry trends,
 * location competitiveness, salary benchmarks, and economic indicators.
 */

import { FeatureVector } from '../../../types/phase2-models';

export class MarketFeatureService {
  private static readonly MARKET_DATA_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private marketDataCache: Map<string, { data: any; timestamp: Date }> = new Map();

  /**
   * Extract market intelligence features
   */
  async extractFeatures(industry?: string, location?: string): Promise<FeatureVector['marketFeatures']> {
    
    const features = {
      industryGrowth: await this.getIndustryGrowthRate(industry),
      locationCompetitiveness: await this.getLocationCompetitiveness(location),
      salaryCompetitiveness: await this.getSalaryCompetitiveness(industry, location),
      demandSupplyRatio: await this.getDemandSupplyRatio(industry, location),
      seasonality: this.calculateSeasonality(industry),
      economicIndicators: await this.getEconomicIndicators()
    };
    
    
    return features;
  }

  /**
   * Health check for market feature service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testFeatures = await this.extractFeatures('technology', 'San Francisco');
      
      return testFeatures.industryGrowth >= 0 && 
             testFeatures.locationCompetitiveness >= 0 &&
             testFeatures.demandSupplyRatio >= 0;
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private async getIndustryGrowthRate(industry?: string): Promise<number> {
    if (!industry) return 0.05; // Default 5% growth
    
    const cacheKey = `industry_growth_${industry}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Industry growth rates (simplified - in reality would come from external APIs)
    const industryGrowthRates: Record<string, number> = {
      'technology': 0.12,
      'software': 0.15,
      'fintech': 0.18,
      'healthcare': 0.08,
      'finance': 0.06,
      'banking': 0.04,
      'retail': 0.03,
      'manufacturing': 0.02,
      'education': 0.05,
      'government': 0.01,
      'nonprofit': 0.02,
      'consulting': 0.07,
      'marketing': 0.09,
      'media': 0.06,
      'gaming': 0.20,
      'ecommerce': 0.14,
      'saas': 0.22,
      'cybersecurity': 0.25,
      'ai': 0.30,
      'data': 0.18,
      'cloud': 0.16
    };
    
    const normalizedIndustry = this.normalizeIndustry(industry);
    let growthRate = industryGrowthRates[normalizedIndustry];
    
    // If exact match not found, try partial matching
    if (growthRate === undefined) {
      for (const [key, rate] of Object.entries(industryGrowthRates)) {
        if (normalizedIndustry.includes(key) || key.includes(normalizedIndustry)) {
          growthRate = rate;
          break;
        }
      }
    }
    
    // Default fallback
    if (growthRate === undefined) {
      growthRate = 0.05; // 5% default growth
    }
    
    this.setCachedData(cacheKey, growthRate);
    return growthRate;
  }

  private async getLocationCompetitiveness(location?: string): Promise<number> {
    if (!location) return 0.5; // Neutral competitiveness
    
    const cacheKey = `location_comp_${location}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Location competitiveness scores (0-1, where 1 is most competitive)
    const locationCompetitiveness: Record<string, number> = {
      'san francisco': 0.95,
      'palo alto': 0.90,
      'seattle': 0.85,
      'new york': 0.88,
      'boston': 0.82,
      'austin': 0.78,
      'denver': 0.75,
      'chicago': 0.70,
      'los angeles': 0.72,
      'san diego': 0.68,
      'portland': 0.65,
      'atlanta': 0.62,
      'miami': 0.60,
      'dallas': 0.58,
      'houston': 0.55,
      'phoenix': 0.52,
      'remote': 0.80, // High competition for remote roles
      'philadelphia': 0.58,
      'washington dc': 0.75,
      'raleigh': 0.65,
      'nashville': 0.60
    };
    
    const normalizedLocation = location.toLowerCase().trim();
    let competitiveness = locationCompetitiveness[normalizedLocation];
    
    // Try partial matching
    if (competitiveness === undefined) {
      for (const [key, score] of Object.entries(locationCompetitiveness)) {
        if (normalizedLocation.includes(key) || key.includes(normalizedLocation)) {
          competitiveness = score;
          break;
        }
      }
    }
    
    // Default based on population density heuristics
    if (competitiveness === undefined) {
      competitiveness = 0.5; // Medium competitiveness for unknown locations
    }
    
    this.setCachedData(cacheKey, competitiveness);
    return competitiveness;
  }

  private async getSalaryCompetitiveness(industry?: string, location?: string): Promise<number> {
    const industryMultiplier = await this.getIndustryGrowthRate(industry);
    const locationMultiplier = await this.getLocationCompetitiveness(location);
    
    // Combine industry and location factors to estimate salary competitiveness
    const salaryCompetitiveness = (industryMultiplier * 2 + locationMultiplier) / 3;
    
    return Math.min(1.0, Math.max(0.1, salaryCompetitiveness));
  }

  private async getDemandSupplyRatio(industry?: string, location?: string): Promise<number> {
    const cacheKey = `demand_supply_${industry}_${location}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Demand-supply ratios by industry (>1 means more demand than supply)
    const industryDemandSupply: Record<string, number> = {
      'technology': 1.4,
      'software': 1.6,
      'ai': 2.2,
      'cybersecurity': 1.9,
      'data': 1.7,
      'cloud': 1.5,
      'fintech': 1.3,
      'healthcare': 1.2,
      'finance': 0.9,
      'banking': 0.8,
      'retail': 0.7,
      'manufacturing': 0.6,
      'education': 0.8,
      'government': 0.5,
      'consulting': 1.1,
      'marketing': 1.0,
      'gaming': 1.3,
      'ecommerce': 1.2
    };
    
    // Location demand adjustments
    const locationDemandMultipliers: Record<string, number> = {
      'san francisco': 1.3,
      'seattle': 1.2,
      'new york': 1.1,
      'boston': 1.1,
      'austin': 1.2,
      'remote': 1.4,
      'chicago': 1.0,
      'los angeles': 0.9,
      'atlanta': 0.9,
      'dallas': 0.8
    };
    
    const normalizedIndustry = this.normalizeIndustry(industry || '');
    const normalizedLocation = location?.toLowerCase() || '';
    
    let ratio = industryDemandSupply[normalizedIndustry] || 1.0;
    
    // Apply location multiplier
    const locationMultiplier = this.findBestMatch(normalizedLocation, locationDemandMultipliers) || 1.0;
    ratio *= locationMultiplier;
    
    // Add some seasonality and market volatility
    const currentMonth = new Date().getMonth();
    const seasonalAdjustment = this.getSeasonalDemandAdjustment(currentMonth);
    ratio *= seasonalAdjustment;
    
    this.setCachedData(cacheKey, ratio);
    return Math.max(0.1, Math.min(3.0, ratio)); // Clamp between 0.1 and 3.0
  }

  private calculateSeasonality(industry?: string): number {
    const currentMonth = new Date().getMonth(); // 0-11
    
    // General hiring patterns
    if (currentMonth >= 0 && currentMonth <= 2) { // Q1: Jan-Mar
      return 0.8; // Slower hiring after holidays
    } else if (currentMonth >= 3 && currentMonth <= 5) { // Q2: Apr-Jun
      return 1.1; // Strong hiring season
    } else if (currentMonth >= 6 && currentMonth <= 8) { // Q3: Jul-Sep
      return 0.9; // Summer slowdown
    } else { // Q4: Oct-Dec
      return 0.7; // Holiday slowdown
    }
  }

  private async getEconomicIndicators(): Promise<number> {
    const cacheKey = 'economic_indicators';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // In a real implementation, this would fetch from economic APIs
    // For now, using simplified indicators
    
    // @ts-ignore - currentYear preserved for future economic indicators
    const currentYear = new Date().getFullYear();
    const economicFactors = {
      gdpGrowth: 0.02, // 2% GDP growth
      unemploymentRate: 0.04, // 4% unemployment
      inflationRate: 0.03, // 3% inflation
      interestRates: 0.05, // 5% interest rates
      stockMarketPerformance: 0.08 // 8% market growth
    };
    
    // Combine factors into overall economic health score (0-1)
    const economicHealth = Math.max(0, Math.min(1, 
      (1 - economicFactors.unemploymentRate) * 0.3 +
      economicFactors.gdpGrowth * 5 * 0.25 +
      Math.max(0, (0.1 - economicFactors.inflationRate)) * 5 * 0.2 +
      economicFactors.stockMarketPerformance * 2.5 * 0.25
    ));
    
    this.setCachedData(cacheKey, economicHealth);
    return economicHealth;
  }

  private normalizeIndustry(industry: string): string {
    const normalized = industry.toLowerCase().trim();
    
    // Map common variations to standard terms
    const industryMappings: Record<string, string> = {
      'tech': 'technology',
      'it': 'technology',
      'information technology': 'technology',
      'software development': 'software',
      'web development': 'software',
      'app development': 'software',
      'financial technology': 'fintech',
      'artificial intelligence': 'ai',
      'machine learning': 'ai',
      'data science': 'data',
      'data analytics': 'data',
      'cloud computing': 'cloud',
      'devops': 'cloud',
      'e-commerce': 'ecommerce',
      'online retail': 'ecommerce',
      'digital marketing': 'marketing',
      'advertising': 'marketing',
      'video games': 'gaming',
      'game development': 'gaming'
    };
    
    return industryMappings[normalized] || normalized;
  }

  private findBestMatch<T>(key: string, mapping: Record<string, T>): T | undefined {
    // Exact match first
    if (mapping[key]) {
      return mapping[key];
    }
    
    // Partial match
    for (const [mapKey, value] of Object.entries(mapping)) {
      if (key.includes(mapKey) || mapKey.includes(key)) {
        return value;
      }
    }
    
    return undefined;
  }

  private getSeasonalDemandAdjustment(month: number): number {
    // Monthly demand adjustments (1.0 = normal, >1.0 = higher demand)
    const monthlyAdjustments = [
      0.8, // January - post-holiday slowdown
      0.9, // February - gradual recovery
      1.1, // March - spring hiring
      1.2, // April - peak spring hiring
      1.1, // May - continued strong hiring
      1.0, // June - summer starts
      0.9, // July - summer slowdown
      0.8, // August - vacation season
      1.1, // September - back-to-work surge
      1.0, // October - steady
      0.8, // November - pre-holiday slowdown
      0.7  // December - holiday season
    ];
    
    return monthlyAdjustments[month] || 1.0;
  }

  private getCachedData(key: string): number | undefined {
    const cached = this.marketDataCache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < MarketFeatureService.MARKET_DATA_CACHE_TTL) {
        return cached.data;
      } else {
        this.marketDataCache.delete(key);
      }
    }
    
    return undefined;
  }

  private setCachedData(key: string, data: number): void {
    this.marketDataCache.set(key, {
      data,
      timestamp: new Date()
    });
    
    // Clean up old cache entries periodically
    if (this.marketDataCache.size > 1000) {
      const cutoffTime = Date.now() - MarketFeatureService.MARKET_DATA_CACHE_TTL;
      
      for (const [cacheKey, cacheEntry] of this.marketDataCache.entries()) {
        if (cacheEntry.timestamp.getTime() < cutoffTime) {
          this.marketDataCache.delete(cacheKey);
        }
      }
    }
  }
}