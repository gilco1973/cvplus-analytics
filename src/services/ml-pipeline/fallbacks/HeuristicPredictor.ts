/**/**
 * Heuristic Predictor Service
 * 
 * Provides rule-based predictions using domain knowledge and statistical
 * models when ML services are unavailable.
 */

import { SalaryPrediction, TimeToHirePrediction, PredictiveRecommendation } from '../../../types/phase2-models';
import { PredictionRequest } from '../core/MLPipelineOrchestrator';

export class HeuristicPredictor {

  /**
   * Predict interview probability using heuristic rules
   */
  async predictInterviewProbability(request: PredictionRequest): Promise<number> {
    
    const { cv, jobDescription } = request;
    
    let score = 0.12; // Base probability (12%)
    
    // Experience factor (30% weight)
    const experienceYears = this.calculateTotalExperience(cv.experience);
    if (experienceYears >= 5) {
      score += 0.15;
    } else if (experienceYears >= 2) {
      score += 0.10;
    } else if (experienceYears >= 1) {
      score += 0.05;
    }
    
    // Skills matching (25% weight)
    const skillMatch = await this.calculateSkillMatch(cv, jobDescription);
    score += skillMatch * 0.25;
    
    // Education factor (15% weight)
    const educationLevel = this.getEducationLevel(cv.education);
    if (educationLevel >= 3) { // Bachelor's or higher
      score += 0.15;
    } else if (educationLevel >= 2) { // Associate's
      score += 0.08;
    }
    
    // CV quality factor (15% weight)
    const cvQuality = this.assessCVQuality(cv);
    score += cvQuality * 0.15;
    
    // Title matching (10% weight)
    const titleMatch = await this.calculateTitleMatch(cv, jobDescription);
    score += titleMatch * 0.10;
    
    // Industry experience (5% weight)
    const industryBonus = this.getIndustryBonus(cv, jobDescription);
    score += industryBonus * 0.05;
    
    return Math.max(0.02, Math.min(0.85, score));
  }

  /**
   * Predict offer probability using heuristic rules
   */
  async predictOfferProbability(request: PredictionRequest): Promise<number> {
    
    const interviewProb = await this.predictInterviewProbability(request);
    
    // Base conversion rate from interview to offer (35-40%)
    let conversionRate = 0.35;
    
    // Strong skill match increases conversion
    const skillMatch = await this.calculateSkillMatch(request.cv, request.jobDescription);
    if (skillMatch > 0.8) {
      conversionRate += 0.15;
    } else if (skillMatch > 0.6) {
      conversionRate += 0.10;
    } else if (skillMatch > 0.4) {
      conversionRate += 0.05;
    }
    
    // Experience relevance
    const experienceYears = this.calculateTotalExperience(request.cv.experience);
    const requiredExperience = this.extractRequiredExperience(request.jobDescription);
    
    if (experienceYears >= requiredExperience && experienceYears <= requiredExperience * 2) {
      conversionRate += 0.10; // Sweet spot for experience
    } else if (experienceYears < requiredExperience * 0.7) {
      conversionRate -= 0.15; // Underqualified penalty
    } else if (experienceYears > requiredExperience * 3) {
      conversionRate -= 0.10; // Overqualified penalty
    }
    
    // Education alignment
    const educationMatch = this.assessEducationMatch(request.cv.education || [], request.jobDescription);
    conversionRate += educationMatch * 0.05;
    
    return Math.max(0.01, Math.min(0.70, interviewProb * conversionRate));
  }

  /**
   * Predict salary using heuristic rules
   */
  async predictSalary(request: PredictionRequest): Promise<SalaryPrediction> {
    
    const { cv, industry, location } = request;
    
    // Base salary by industry
    let baseSalary = this.getBaseSalaryByIndustry(industry);
    
    // Experience multiplier
    const experienceYears = this.calculateTotalExperience(cv.experience);
    const experienceMultiplier = 1 + (experienceYears * 0.08); // 8% per year
    baseSalary *= experienceMultiplier;
    
    // Education premium
    const educationLevel = this.getEducationLevel(cv.education);
    const educationMultiplier = this.getEducationMultiplier(educationLevel);
    baseSalary *= educationMultiplier;
    
    // Location adjustment
    const locationMultiplier = this.getLocationMultiplier(location);
    baseSalary *= locationMultiplier;
    
    // Skills premium
    const skillsCount = this.countSkills(cv.skills);
    const skillsMultiplier = 1 + Math.min(0.20, skillsCount * 0.02); // Max 20% bonus
    baseSalary *= skillsMultiplier;
    
    const median = Math.round(baseSalary);
    const min = Math.round(median * 0.8);
    const max = Math.round(median * 1.25);
    
    return {
      predictedSalaryRange: {
        min,
        max,
        median,
        currency: 'USD'
      },
      predictedRange: {
        min,
        max,
        median,
        currency: 'USD'
      },
      confidenceInterval: {
        lower: Math.round(min * 0.9),
        upper: Math.round(max * 1.1)
      },
      regionalAdjustment: {
        baseLocation: 'US',
        adjustmentFactor: locationMultiplier,
        costOfLivingIndex: Math.round(locationMultiplier * 100)
      },
      industryBenchmark: {
        industryMedian: Math.round(median),
        percentileRank: 50
      },
      factors: [{
        factor: 'experience',
        impact: 0.1,
        description: 'Experience multiplier effect'
      }]
    };
  }

  /**
   * Predict time to hire using heuristic rules
   */
  async predictTimeToHire(request: PredictionRequest): Promise<TimeToHirePrediction> {
    
    const { jobDescription, industry } = request;
    
    // Base timeline by industry
    let baseDays = this.getBaseTimeToHireByIndustry(industry);
    
    // Adjust for role complexity
    const complexity = this.assessRoleComplexity(jobDescription);
    baseDays *= (0.8 + complexity * 0.4); // 0.8x to 1.2x multiplier
    
    // Company size effect (estimated from job description)
    const companySize = this.estimateCompanySize(jobDescription);
    if (companySize === 'large') {
      baseDays *= 1.3; // Larger companies take longer
    } else if (companySize === 'startup') {
      baseDays *= 0.7; // Startups move faster
    }
    
    const estimatedDays = Math.round(baseDays);
    
    return {
      estimatedDays: {
        min: Math.round(estimatedDays * 0.8),
        max: Math.round(estimatedDays * 1.3),
        median: estimatedDays
      },
      phaseBreakdown: {
        application: Math.round(estimatedDays * 0.15),
        screening: Math.round(estimatedDays * 0.25), 
        interviews: Math.round(estimatedDays * 0.35),
        decision: Math.round(estimatedDays * 0.15),
        negotiation: Math.round(estimatedDays * 0.10)
      },
      seasonalFactors: {
        currentSeason: this.getCurrentSeason(),
        seasonalAdjustment: 1.0
      },
      confidence: 0.6
    };
  }

  /**
   * Calculate competitiveness score
   */
  calculateCompetitivenessScore(request: PredictionRequest): number {
    const skillMatch = this.calculateSkillMatchSync(request.cv, request.jobDescription);
    const experienceYears = this.calculateTotalExperience(request.cv.experience);
    const educationLevel = this.getEducationLevel(request.cv.education);
    const cvQuality = this.assessCVQuality(request.cv);
    
    const score = (
      skillMatch * 30 +
      Math.min(experienceYears / 10, 1) * 25 +
      (educationLevel / 5) * 20 +
      cvQuality * 25
    );
    
    return Math.round(Math.max(10, Math.min(95, score)));
  }

  /**
   * Generate basic recommendations
   */
  async generateBasicRecommendations(request: PredictionRequest): Promise<PredictiveRecommendation[]> {
    const recommendations: PredictiveRecommendation[] = [];
    
    // Skill-based recommendations
    const skillMatch = await this.calculateSkillMatch(request.cv, request.jobDescription);
    if (skillMatch < 0.6) {
      recommendations.push({
        recommendationId: 'improve_skills',
        type: 'skill',
        priority: 'high',
        expectedImpact: {
          interviewProbabilityIncrease: 0.2,
          offerProbabilityIncrease: 0.15,
          salaryIncrease: 8
        },
        title: 'Improve skill alignment',
        description: 'Your skills match could be stronger for this role',
        implementation: {
          estimatedTimeToComplete: 90,
          difficulty: 'medium',
          cost: 150,
          resources: ['Online courses', 'Skill assessments']
        },
        evidence: {
          dataPoints: 200,
          successRate: 0.8,
          similarProfiles: 75
        },
        dateGenerated: new Date()
      });
    }
    
    // Experience recommendations
    const experienceYears = this.calculateTotalExperience(request.cv.experience);
    const requiredExperience = this.extractRequiredExperience(request.jobDescription);
    
    if (experienceYears < requiredExperience * 0.8) {
      recommendations.push({
        recommendationId: 'highlight_experience',
        type: 'experience',
        priority: 'medium',
        expectedImpact: {
          interviewProbabilityIncrease: 0.15,
          offerProbabilityIncrease: 0.20,
          salaryIncrease: 5
        },
        title: 'Better highlight relevant experience',
        description: 'Emphasize experience that directly relates to this role',
        implementation: {
          estimatedTimeToComplete: 30,
          difficulty: 'easy',
          cost: 0,
          resources: ['CV optimization guide']
        },
        evidence: {
          dataPoints: 300,
          successRate: 0.9,
          similarProfiles: 100
        },
        dateGenerated: new Date()
      });
    }
    
    return recommendations;
  }

  /**
   * Health check for heuristic predictor
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: PredictionRequest = {
        userId: 'test',
        jobId: 'test',
        cv: {
          personalInfo: { name: 'Test User', email: 'test@example.com' },
          experience: [{
            company: 'Test Corp',
            position: 'Software Engineer',
            duration: '3 years',
            startDate: '2020-01',
            endDate: '2023-01',
            description: 'Developed applications'
          }],
          skills: ['JavaScript', 'React'],
          education: [{ institution: 'University', degree: 'Bachelor', field: 'Computer Science', graduationDate: '2020' }]
        },
        jobDescription: 'Software Engineer position requiring React experience'
      };
      
      const [interviewProb, offerProb, salaryPred, timePred] = await Promise.all([
        this.predictInterviewProbability(testRequest),
        this.predictOfferProbability(testRequest),
        this.predictSalary(testRequest),
        this.predictTimeToHire(testRequest)
      ]);
      
      return interviewProb > 0 && offerProb > 0 && 
             salaryPred.predictedRange.median > 0 && 
             timePred.estimatedDays.median > 0;
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private calculateTotalExperience(experience?: any[]): number {
    if (!experience || experience.length === 0) return 0;
    
    let totalMonths = 0;
    const currentDate = new Date();
    
    experience.forEach(exp => {
      if (exp.startDate) {
        const startDate = new Date(exp.startDate);
        const endDate = exp.endDate && exp.endDate !== 'Present' 
          ? new Date(exp.endDate) 
          : currentDate;
        
        if (startDate && endDate) {
          const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (endDate.getMonth() - startDate.getMonth());
          totalMonths += Math.max(0, monthsDiff);
        }
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10;
  }

  private async calculateSkillMatch(cv: any, jobDescription: string): Promise<number> {
    const cvSkills = this.extractCVSkills(cv);
    const jobKeywords = this.extractJobKeywords(jobDescription);
    
    if (cvSkills.length === 0 || jobKeywords.length === 0) return 0;
    
    let matches = 0;
    jobKeywords.forEach(keyword => {
      if (cvSkills.some(skill => 
        skill.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.toLowerCase())
      )) {
        matches++;
      }
    });
    
    return matches / jobKeywords.length;
  }

  private calculateSkillMatchSync(cv: any, jobDescription: string): number {
    // Synchronous version for internal use
    const cvSkills = this.extractCVSkills(cv);
    const jobKeywords = this.extractJobKeywords(jobDescription);
    
    if (cvSkills.length === 0 || jobKeywords.length === 0) return 0;
    
    let matches = 0;
    jobKeywords.forEach(keyword => {
      if (cvSkills.some(skill => 
        skill.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.toLowerCase())
      )) {
        matches++;
      }
    });
    
    return matches / jobKeywords.length;
  }

  private extractCVSkills(cv: any): string[] {
    const skills: string[] = [];
    
    if (Array.isArray(cv.skills)) {
      skills.push(...cv.skills);
    } else if (cv.skills && typeof cv.skills === 'object') {
      if (cv.skills.technical) skills.push(...cv.skills.technical);
      if (cv.skills.soft) skills.push(...cv.skills.soft);
    }
    
    return skills;
  }

  private extractJobKeywords(jobDescription: string): string[] {
    const commonTechSkills = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs',
      'express', 'django', 'spring', 'mysql', 'postgresql', 'mongodb',
      'aws', 'azure', 'docker', 'kubernetes', 'git', 'agile', 'api'
    ];
    
    const lowerDesc = jobDescription.toLowerCase();
    return commonTechSkills.filter(skill => lowerDesc.includes(skill));
  }

  private getEducationLevel(education?: any[]): number {
    if (!education || education.length === 0) return 1;
    
    const degrees = education.map(edu => (edu.degree || '').toLowerCase());
    
    if (degrees.some(d => d.includes('phd') || d.includes('doctorate'))) return 5;
    if (degrees.some(d => d.includes('master') || d.includes('mba'))) return 4;
    if (degrees.some(d => d.includes('bachelor'))) return 3;
    if (degrees.some(d => d.includes('associate'))) return 2;
    
    return 1;
  }

  private countSkills(skills: any): number {
    if (Array.isArray(skills)) return skills.length;
    if (skills && typeof skills === 'object') {
      return (skills.technical?.length || 0) + (skills.soft?.length || 0);
    }
    return 0;
  }

  private assessCVQuality(cv: any): number {
    let quality = 0.5;
    
    if (cv.personalInfo?.summary && cv.personalInfo.summary.length > 50) quality += 0.2;
    if (cv.experience && cv.experience.length > 0) quality += 0.2;
    if (cv.skills && this.countSkills(cv.skills) >= 5) quality += 0.1;
    
    return Math.min(1.0, quality);
  }

  private async calculateTitleMatch(cv: any, jobDescription: string): Promise<number> {
    if (!cv.experience || cv.experience.length === 0) return 0;
    
    const jobTitle = jobDescription.split('\n')[0]?.toLowerCase() || '';
    let bestMatch = 0;
    
    cv.experience.forEach((exp: any) => {
      if (exp.position) {
        const similarity = this.calculateStringSimilarity(
          exp.position.toLowerCase(), 
          jobTitle
        );
        bestMatch = Math.max(bestMatch, similarity);
      }
    });
    
    return bestMatch;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    let matches = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        matches++;
      }
    });
    
    return matches / Math.max(words1.length, words2.length);
  }

  private getIndustryBonus(cv: any, jobDescription: string): number {
    // Simplified industry matching
    return 0.5;
  }

  private extractRequiredExperience(jobDescription: string): number {
    const match = jobDescription.match(/(\d+)\+?\s*years?\s*experience/i);
    return match ? parseInt(match[1]) : 2;
  }

  private assessEducationMatch(education: any[], jobDescription: string): number {
    if (!education || education.length === 0) return 0.5;
    
    const jobLower = jobDescription.toLowerCase();
    if (jobLower.includes('degree') || jobLower.includes('bachelor') || jobLower.includes('master')) {
      return this.getEducationLevel(education) >= 3 ? 1.0 : 0.5;
    }
    
    return 0.8; // Neutral if no specific requirements
  }

  private getBaseSalaryByIndustry(industry?: string): number {
    const salaries: Record<string, number> = {
      'technology': 85000,
      'software': 90000,
      'fintech': 95000,
      'finance': 80000,
      'healthcare': 75000,
      'consulting': 85000,
      'marketing': 65000,
      'education': 55000,
      'retail': 50000,
      'manufacturing': 65000
    };
    
    const normalizedIndustry = industry?.toLowerCase() || 'technology';
    return salaries[normalizedIndustry] || 70000;
  }

  private getEducationMultiplier(level: number): number {
    const multipliers = [0.9, 0.95, 1.0, 1.15, 1.25]; // High school to PhD
    return multipliers[Math.min(level - 1, 4)] || 1.0;
  }

  private getLocationMultiplier(location?: string): number {
    if (!location) return 1.0;
    
    const multipliers: Record<string, number> = {
      'san francisco': 1.4,
      'new york': 1.3,
      'seattle': 1.25,
      'boston': 1.2,
      'los angeles': 1.15,
      'chicago': 1.05,
      'austin': 1.1,
      'denver': 1.0,
      'atlanta': 0.95,
      'remote': 1.1
    };
    
    const normalized = location.toLowerCase();
    for (const [city, multiplier] of Object.entries(multipliers)) {
      if (normalized.includes(city)) return multiplier;
    }
    
    return 1.0;
  }

  private estimateMarketPercentile(salary: number, industry?: string): number {
    const industryMedian = this.getBaseSalaryByIndustry(industry);
    const ratio = salary / industryMedian;
    
    if (ratio >= 1.5) return 90;
    if (ratio >= 1.3) return 80;
    if (ratio >= 1.15) return 70;
    if (ratio >= 1.0) return 60;
    if (ratio >= 0.9) return 40;
    if (ratio >= 0.8) return 30;
    return 20;
  }

  private assessMarketDemand(industry?: string): 'low' | 'medium' | 'high' {
    const highDemandIndustries = ['technology', 'software', 'ai', 'cybersecurity'];
    const lowDemandIndustries = ['retail', 'manufacturing', 'education'];
    
    const normalized = industry?.toLowerCase() || '';
    
    if (highDemandIndustries.some(ind => normalized.includes(ind))) return 'high';
    if (lowDemandIndustries.some(ind => normalized.includes(ind))) return 'low';
    return 'medium';
  }

  private getBaseTimeToHireByIndustry(industry?: string): number {
    const timelines: Record<string, number> = {
      'technology': 18,
      'software': 16,
      'fintech': 20,
      'finance': 25,
      'healthcare': 30,
      'government': 45,
      'consulting': 22,
      'startup': 12,
      'manufacturing': 28
    };
    
    const normalized = industry?.toLowerCase() || 'technology';
    return timelines[normalized] || 21;
  }

  private assessRoleComplexity(jobDescription: string): number {
    const complexityIndicators = [
      'senior', 'lead', 'principal', 'architect', 'manager', 'director',
      'phd', 'research', 'algorithm', 'machine learning', 'ai'
    ];
    
    const lowerDesc = jobDescription.toLowerCase();
    const matches = complexityIndicators.filter(indicator => 
      lowerDesc.includes(indicator)
    ).length;
    
    return Math.min(1.0, matches / 5); // Normalize to 0-1
  }

  private estimateCompanySize(jobDescription: string): 'startup' | 'medium' | 'large' {
    const lowerDesc = jobDescription.toLowerCase();
    
    if (lowerDesc.includes('startup') || lowerDesc.includes('series') || lowerDesc.includes('equity')) {
      return 'startup';
    }
    
    if (lowerDesc.includes('fortune') || lowerDesc.includes('enterprise') || lowerDesc.includes('corporation')) {
      return 'large';
    }
    
    return 'medium';
  }

  private getIndustrySpeed(industry?: string): 'slow' | 'medium' | 'fast' {
    const fastIndustries = ['technology', 'startup', 'consulting'];
    const slowIndustries = ['government', 'healthcare', 'education', 'manufacturing'];
    
    const normalized = industry?.toLowerCase() || '';
    
    if (fastIndustries.some(ind => normalized.includes(ind))) return 'fast';
    if (slowIndustries.some(ind => normalized.includes(ind))) return 'slow';
    return 'medium';
  }

  private generateStageBreakdown(totalDays: number): {
    applicationReview: number;
    initialScreening: number;
    interviews: number;
    decisionMaking: number;
    offerNegotiation: number;
  } {
    return {
      applicationReview: Math.round(totalDays * 0.15),
      initialScreening: Math.round(totalDays * 0.25),
      interviews: Math.round(totalDays * 0.35),
      decisionMaking: Math.round(totalDays * 0.15),
      offerNegotiation: Math.round(totalDays * 0.10)
    };
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'fall';
  }
}