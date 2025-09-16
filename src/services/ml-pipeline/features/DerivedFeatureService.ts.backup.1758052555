/**
 * Derived Feature Service
 * 
 * Calculates advanced features derived from CV content, job matching,
 * and other feature combinations for enhanced ML prediction accuracy.
 */

import { ParsedCV } from '../../../types/job';
import { FeatureVector } from '../../../types/phase2-models';

export class DerivedFeatureService {
  
  /**
   * Extract derived features based on CV, job description, and other features
   */
  async extractFeatures(
    cv: ParsedCV, 
    jobDescription: string,
    baseFeatures: {
      cvFeatures: FeatureVector['cvFeatures'];
      matchingFeatures: FeatureVector['matchingFeatures'];
      marketFeatures: FeatureVector['marketFeatures'];
      // behaviorFeatures: FeatureVector['behaviorFeatures']; // Removed
    }
  ): Promise<FeatureVector['derivedFeatures']> {
    
    const features = {
      overqualificationScore: this.calculateOverqualification(cv, jobDescription, baseFeatures),
      underqualificationScore: this.calculateUnderqualification(cv, jobDescription, baseFeatures),
      careerProgressionScore: this.calculateCareerProgression(cv.experience),
      stabilityScore: this.calculateStabilityScore(cv.experience),
      adaptabilityScore: this.calculateAdaptabilityScore(cv, baseFeatures),
      leadershipPotential: this.calculateLeadershipPotential(cv, baseFeatures),
      innovationIndicator: this.calculateInnovationIndicator(cv, baseFeatures)
    };
    
    
    return features;
  }

  /**
   * Health check for derived feature service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testCV: ParsedCV = {
        personalInfo: { name: 'Test User', email: 'test@example.com' },
        experience: [
          {
            company: 'Tech Corp',
            position: 'Senior Software Engineer',
            duration: '3+ years',
            startDate: '2021-01',
            endDate: 'Present',
            description: 'Led team of 5 developers, implemented microservices architecture'
          },
          {
            company: 'StartupCorp',
            position: 'Software Engineer',
            duration: '3 years',
            startDate: '2018-01',
            endDate: '2021-01',
            description: 'Developed web applications using React and Node.js'
          }
        ],
        skills: ['JavaScript', 'React', 'Node.js', 'Leadership'],
        education: [{ institution: 'University', degree: 'Bachelor of Science', field: 'Computer Science', graduationDate: '2018' }]
      };
      
      const testJobDescription = 'Senior Software Engineer position requiring 5+ years experience';
      
      const baseFeatures = {
        cvFeatures: {
          wordCount: 100,
          sectionsCount: 4,
          skillsCount: 4,
          experienceYears: 5,
          educationLevel: 3,
          certificationsCount: 0,
          projectsCount: 0,
          achievementsCount: 2,
          keywordDensity: 0.5,
          readabilityScore: 0.8,
          formattingScore: 0.7
        },
        matchingFeatures: {
          skillMatchPercentage: 0.8,
          experienceRelevance: 0.9,
          educationMatch: 0.8,
          industryExperience: 0.7,
          locationMatch: 0.8,
          salaryAlignment: 0.8,
          titleSimilarity: 0.9,
          companyFit: 0.7
        },
        marketFeatures: {
          industryGrowth: 0.15,
          locationCompetitiveness: 0.7,
          salaryCompetitiveness: 0.8,
          demandSupplyRatio: 1.2,
          seasonality: 1.0,
          economicIndicators: 0.8
        }
      };
      
      const features = await this.extractFeatures(testCV, testJobDescription, baseFeatures);
      
      return (features?.careerProgressionScore || 0) >= 0 && 
             (features?.careerTrajectory || 0) >= 0 &&
             (features?.marketAlignment || 0) >= 0;
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private calculateOverqualification(
    cv: ParsedCV, 
    jobDescription: string,
    baseFeatures: any
  ): number {
    let overqualificationScore = 0;
    
    // Education overqualification
    const educationLevel = baseFeatures.cvFeatures.educationLevel;
    const jobRequiresAdvancedDegree = this.requiresAdvancedDegree(jobDescription);
    
    if (educationLevel >= 4 && !jobRequiresAdvancedDegree) {
      overqualificationScore += 0.3; // PhD/Masters for bachelor's job
    }
    
    // Experience overqualification
    const experienceYears = baseFeatures.cvFeatures.experienceYears;
    const requiredExperience = this.extractRequiredExperience(jobDescription);
    
    if (experienceYears > requiredExperience * 2) {
      overqualificationScore += 0.4; // Significantly more experience than required
    } else if (experienceYears > requiredExperience * 1.5) {
      overqualificationScore += 0.2; // Moderately more experience
    }
    
    // Seniority overqualification
    const hasLeadershipExperience = this.hasLeadershipExperience(cv.experience);
    const isJuniorPosition = this.isJuniorPosition(jobDescription);
    
    if (hasLeadershipExperience && isJuniorPosition) {
      overqualificationScore += 0.3; // Leadership experience for junior role
    }
    
    // Market demand adjustment - high demand reduces overqualification concerns
    const demandSupplyRatio = baseFeatures.marketFeatures.demandSupplyRatio;
    if (demandSupplyRatio > 1.5) {
      overqualificationScore *= 0.7; // Reduce overqualification concern in high-demand market
    }
    
    return Math.min(1.0, overqualificationScore);
  }

  private calculateUnderqualification(
    cv: ParsedCV,
    jobDescription: string,
    baseFeatures: any
  ): number {
    let underqualificationScore = 0;
    
    // Experience underqualification
    const experienceYears = baseFeatures.cvFeatures.experienceYears;
    const requiredExperience = this.extractRequiredExperience(jobDescription);
    
    if (experienceYears < requiredExperience * 0.5) {
      underqualificationScore += 0.5; // Significantly less experience
    } else if (experienceYears < requiredExperience * 0.8) {
      underqualificationScore += 0.2; // Moderately less experience
    }
    
    // Education underqualification
    const educationLevel = baseFeatures.cvFeatures.educationLevel;
    const requiresDegree = this.requiresDegree(jobDescription);
    
    if (requiresDegree && educationLevel < 3) {
      underqualificationScore += 0.3; // No bachelor's degree when required
    }
    
    // Skills gap
    const skillMatchPercentage = baseFeatures.matchingFeatures.skillMatchPercentage;
    if (skillMatchPercentage < 0.3) {
      underqualificationScore += 0.4; // Major skills gap
    } else if (skillMatchPercentage < 0.5) {
      underqualificationScore += 0.2; // Moderate skills gap
    }
    
    // Industry experience gap
    const industryExperience = baseFeatures.matchingFeatures.industryExperience;
    if (industryExperience < 0.3) {
      underqualificationScore += 0.2; // Limited industry experience
    }
    
    // Adaptability can offset underqualification
    const adaptabilityScore = this.calculateAdaptabilityScore(cv, baseFeatures);
    underqualificationScore *= (1 - adaptabilityScore * 0.3);
    
    return Math.min(1.0, underqualificationScore);
  }

  private calculateCareerProgression(experience?: any[]): number {
    if (!experience || experience.length < 2) return 0.5; // Neutral for limited history
    
    let progressionScore = 0.3; // Base score
    
    // Sort experience by date (most recent first)
    const sortedExperience = [...experience].sort((a, b) => {
      const dateA = new Date(a.startDate || '1900-01-01');
      const dateB = new Date(b.startDate || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    });
    
    // Check for title progression
    const titleProgression = this.analyzeTitleProgression(sortedExperience);
    progressionScore += titleProgression * 0.3;
    
    // Check for responsibility growth
    const responsibilityGrowth = this.analyzeResponsibilityGrowth(sortedExperience);
    progressionScore += responsibilityGrowth * 0.2;
    
    // Check for company progression (startups to enterprise, etc.)
    const companyProgression = this.analyzeCompanyProgression(sortedExperience);
    progressionScore += companyProgression * 0.1;
    
    // Check for salary progression (if available)
    const salaryProgression = this.analyzeSalaryProgression(sortedExperience);
    progressionScore += salaryProgression * 0.1;
    
    return Math.min(1.0, progressionScore);
  }

  private calculateStabilityScore(experience?: any[]): number {
    if (!experience || experience.length === 0) return 0.5;
    
    const tenures = experience.map(exp => this.calculateJobTenure(exp));
    
    if (tenures.length === 0) return 0.5;
    
    const averageTenure = tenures.reduce((sum, tenure) => sum + tenure, 0) / tenures.length;
    const tenureVariability = this.calculateTenureVariability(tenures);
    
    let stabilityScore = 0.5; // Base score
    
    // Average tenure scoring
    if (averageTenure >= 3) {
      stabilityScore += 0.3; // Very stable (3+ years average)
    } else if (averageTenure >= 2) {
      stabilityScore += 0.2; // Good stability (2-3 years)
    } else if (averageTenure >= 1) {
      stabilityScore += 0.1; // Moderate stability (1-2 years)
    }
    
    // Penalize high variability (job hopping)
    if (tenureVariability > 2) {
      stabilityScore -= 0.2; // High variability penalty
    } else if (tenureVariability > 1) {
      stabilityScore -= 0.1; // Moderate variability penalty
    }
    
    // Check for recent stability improvement
    if (tenures.length >= 2) {
      const recentTenure = tenures[0]; // Most recent job
      const previousTenure = tenures[1];
      
      if (recentTenure > previousTenure) {
        stabilityScore += 0.1; // Improving stability trend
      }
    }
    
    return Math.max(0.1, Math.min(1.0, stabilityScore));
  }

  private calculateAdaptabilityScore(cv: ParsedCV, baseFeatures: any): number {
    let adaptabilityScore = 0.4; // Base score
    
    // Diverse experience across companies/industries
    if (cv.experience) {
      const uniqueCompanies = new Set(cv.experience.map(exp => exp.company)).size;
      const totalJobs = cv.experience.length;
      
      if (uniqueCompanies === totalJobs && totalJobs >= 3) {
        adaptabilityScore += 0.2; // Each job at different company
      } else if (uniqueCompanies >= totalJobs * 0.7) {
        adaptabilityScore += 0.1; // Mostly different companies
      }
    }
    
    // Skill diversity
    const skillsCount = baseFeatures.cvFeatures.skillsCount;
    if (skillsCount >= 10) {
      adaptabilityScore += 0.2; // High skill diversity
    } else if (skillsCount >= 6) {
      adaptabilityScore += 0.1; // Good skill diversity
    }
    
    // Continuous learning (recent certifications, education updates)
    const platformEngagement = 0.5; // Default since behaviorFeatures removed
    const cvOptimizationLevel = 0.5; // Default since behaviorFeatures removed
    
    if (platformEngagement > 0.7 && cvOptimizationLevel > 0.7) {
      adaptabilityScore += 0.2; // Active learner
    } else if (platformEngagement > 0.5 || cvOptimizationLevel > 0.5) {
      adaptabilityScore += 0.1; // Moderate learning activity
    }
    
    // Technology adoption (modern skills)
    const modernSkillsScore = this.assessModernSkills(cv);
    adaptabilityScore += modernSkillsScore * 0.1;
    
    return Math.min(1.0, adaptabilityScore);
  }

  private calculateLeadershipPotential(cv: ParsedCV, baseFeatures: any): number {
    let leadershipScore = 0.2; // Base score
    
    // Direct leadership experience
    if (cv.experience) {
      cv.experience.forEach(exp => {
        const position = (exp.position || '').toLowerCase();
        const description = (exp.description || '').toLowerCase();
        
        // Leadership titles
        if (position.includes('lead') || position.includes('manager') || 
            position.includes('director') || position.includes('head') ||
            position.includes('chief') || position.includes('vp')) {
          leadershipScore += 0.3;
        }
        
        // Leadership activities in description
        const leadershipKeywords = [
          'led', 'managed', 'supervised', 'coordinated', 'directed',
          'mentored', 'coached', 'team', 'staff', 'reports',
          'budget', 'strategy', 'initiative', 'project management'
        ];
        
        const leadershipMentions = leadershipKeywords.filter(keyword => 
          description.includes(keyword)).length;
        
        if (leadershipMentions >= 3) {
          leadershipScore += 0.2;
        } else if (leadershipMentions >= 1) {
          leadershipScore += 0.1;
        }
      });
    }
    
    // Career progression as leadership indicator
    const careerProgression = this.calculateCareerProgression(cv.experience);
    leadershipScore += careerProgression * 0.2;
    
    // Communication skills (readability, formatting)
    const readabilityScore = baseFeatures.cvFeatures.readabilityScore;
    const formattingScore = baseFeatures.cvFeatures.formattingScore;
    
    if (readabilityScore > 0.8 && formattingScore > 0.8) {
      leadershipScore += 0.1; // Strong communication skills
    }
    
    // Platform engagement as leadership indicator
    const platformEngagement = 0.5; // Default since behaviorFeatures removed
    if (platformEngagement > 0.8) {
      leadershipScore += 0.1; // Proactive behavior
    }
    
    return Math.min(1.0, leadershipScore);
  }

  private calculateInnovationIndicator(cv: ParsedCV, baseFeatures: any): number {
    let innovationScore = 0.2; // Base score
    
    // Innovation keywords in experience
    if (cv.experience) {
      const innovationKeywords = [
        'innovation', 'innovative', 'created', 'developed', 'designed',
        'invented', 'pioneered', 'launched', 'built', 'architecture',
        'patent', 'research', 'algorithm', 'prototype', 'breakthrough',
        'optimization', 'efficiency', 'automation', 'ai', 'machine learning',
        'blockchain', 'microservices', 'scalable', 'performance'
      ];
      
      cv.experience.forEach(exp => {
        const description = (exp.description || '').toLowerCase();
        
        const innovationMentions = innovationKeywords.filter(keyword =>
          description.includes(keyword)).length;
        
        if (innovationMentions >= 5) {
          innovationScore += 0.3; // High innovation content
        } else if (innovationMentions >= 2) {
          innovationScore += 0.2; // Moderate innovation content
        } else if (innovationMentions >= 1) {
          innovationScore += 0.1; // Some innovation content
        }
        
        // Quantified improvements
        if (/improved.*\d+%|increased.*\d+%|reduced.*\d+%|optimized.*\d+/.test(description)) {
          innovationScore += 0.1;
        }
      });
    }
    
    // Technology adoption (modern/emerging technologies)
    const modernSkillsScore = this.assessModernSkills(cv);
    innovationScore += modernSkillsScore * 0.2;
    
    // Project diversity
    if (cv.projects && cv.projects.length > 0) {
      innovationScore += Math.min(0.2, cv.projects.length * 0.05);
    }
    
    // Continuous learning indicator
    const cvOptimizationLevel = 0.5; // Default since behaviorFeatures removed
    if (cvOptimizationLevel > 0.8) {
      innovationScore += 0.1; // Continuous improvement mindset
    }
    
    return Math.min(1.0, innovationScore);
  }

  // ================================
  // HELPER METHODS
  // ================================

  private requiresAdvancedDegree(jobDescription: string): boolean {
    const lowerDesc = jobDescription.toLowerCase();
    return lowerDesc.includes('master') || 
           lowerDesc.includes('mba') || 
           lowerDesc.includes('phd') ||
           lowerDesc.includes('doctorate');
  }

  private requiresDegree(jobDescription: string): boolean {
    const lowerDesc = jobDescription.toLowerCase();
    return lowerDesc.includes('degree') || 
           lowerDesc.includes('bachelor') ||
           lowerDesc.includes('graduation') ||
           this.requiresAdvancedDegree(jobDescription);
  }

  private extractRequiredExperience(jobDescription: string): number {
    const experienceMatch = jobDescription.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i);
    return experienceMatch ? parseInt(experienceMatch[1]) : 2; // Default 2 years
  }

  private hasLeadershipExperience(experience?: any[]): boolean {
    if (!experience) return false;
    
    return experience.some(exp => {
      const position = (exp.position || '').toLowerCase();
      const description = (exp.description || '').toLowerCase();
      
      return position.includes('lead') || 
             position.includes('manager') ||
             position.includes('director') ||
             description.includes('led') ||
             description.includes('managed');
    });
  }

  private isJuniorPosition(jobDescription: string): boolean {
    const lowerDesc = jobDescription.toLowerCase();
    return lowerDesc.includes('junior') ||
           lowerDesc.includes('entry') ||
           lowerDesc.includes('associate') ||
           lowerDesc.includes('intern');
  }

  private analyzeTitleProgression(sortedExperience: any[]): number {
    if (sortedExperience.length < 2) return 0;
    
    let progressionScore = 0;
    const seniorityLevels = ['intern', 'junior', 'associate', '', 'senior', 'lead', 'principal', 'staff', 'manager', 'director', 'vp', 'chief'];
    
    for (let i = 1; i < sortedExperience.length; i++) {
      const currentTitle = (sortedExperience[i-1].position || '').toLowerCase();
      const previousTitle = (sortedExperience[i].position || '').toLowerCase();
      
      const currentLevel = this.getTitleSeniorityLevel(currentTitle, seniorityLevels);
      const previousLevel = this.getTitleSeniorityLevel(previousTitle, seniorityLevels);
      
      if (currentLevel > previousLevel) {
        progressionScore += 0.5; // Clear progression
      } else if (currentLevel === previousLevel) {
        progressionScore += 0.2; // Lateral move
      }
    }
    
    return Math.min(1.0, progressionScore / (sortedExperience.length - 1));
  }

  private getTitleSeniorityLevel(title: string, levels: string[]): number {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (levels[i] && title.includes(levels[i])) {
        return i;
      }
    }
    return 3; // Default middle level
  }

  private analyzeResponsibilityGrowth(sortedExperience: any[]): number {
    // Simplified - would analyze description complexity, team size mentions, etc.
    return 0.5;
  }

  private analyzeCompanyProgression(sortedExperience: any[]): number {
    // Simplified - would analyze company size, reputation, industry progression
    return 0.5;
  }

  private analyzeSalaryProgression(sortedExperience: any[]): number {
    // Would analyze salary information if available
    return 0.5;
  }

  private calculateJobTenure(experience: any): number {
    if (!experience.startDate) return 1; // Default 1 year
    
    const startDate = new Date(experience.startDate);
    const endDate = experience.endDate && experience.endDate !== 'Present' 
      ? new Date(experience.endDate) 
      : new Date();
    
    const years = (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, years);
  }

  private calculateTenureVariability(tenures: number[]): number {
    if (tenures.length <= 1) return 0;
    
    const mean = tenures.reduce((sum, tenure) => sum + tenure, 0) / tenures.length;
    const variance = tenures.reduce((sum, tenure) => sum + Math.pow(tenure - mean, 2), 0) / tenures.length;
    
    return Math.sqrt(variance);
  }

  private assessModernSkills(cv: ParsedCV): number {
    const modernSkills = [
      'react', 'vue', 'angular', 'nodejs', 'python', 'typescript',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'microservices',
      'graphql', 'api', 'ai', 'machine learning', 'blockchain',
      'devops', 'cicd', 'agile', 'scrum'
    ];
    
    const cvSkills = this.extractAllSkills(cv);
    const modernSkillsFound = modernSkills.filter(skill =>
      cvSkills.some(cvSkill => cvSkill.toLowerCase().includes(skill))
    ).length;
    
    return Math.min(1.0, modernSkillsFound / 10); // Normalize to 0-1
  }

  private extractAllSkills(cv: ParsedCV): string[] {
    const skills: string[] = [];
    
    if (Array.isArray(cv.skills)) {
      skills.push(...cv.skills);
    } else if (cv.skills && typeof cv.skills === 'object') {
      if (cv.skills.technical) skills.push(...cv.skills.technical);
      if (cv.skills.soft) skills.push(...cv.skills.soft);
      if (cv.skills.languages) skills.push(...cv.skills.languages);
    }
    
    return skills;
  }
}