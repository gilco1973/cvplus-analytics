/**/**
 * Matching Feature Service
 * 
 * Extracts features that measure how well a CV matches a specific job description,
 * including skill alignment, experience relevance, and role compatibility.
 */

import { ParsedCV } from '../../../types/job';
import { FeatureVector } from '../../../types/phase2-models';

export class MatchingFeatureService {
  
  /**
   * Extract job matching features between CV and job description
   */
  async extractFeatures(cv: ParsedCV, jobDescription: string): Promise<FeatureVector['matchingFeatures']> {
    
    const jobKeywords = await this.extractJobKeywords(jobDescription);
    const cvSkills = this.extractCVSkills(cv);
    const jobRequirements = this.parseJobRequirements(jobDescription);
    
    const features = {
      skillMatchPercentage: this.calculateSkillMatch(cvSkills, jobKeywords),
      experienceRelevance: this.calculateExperienceRelevance(cv.experience, jobDescription, jobRequirements),
      educationMatch: this.calculateEducationMatch(cv.education, jobDescription, jobRequirements),
      industryExperience: this.calculateIndustryExperience(cv.experience, jobDescription),
      locationMatch: this.calculateLocationMatch(cv.personalInfo, jobDescription),
      salaryAlignment: this.calculateSalaryAlignment(cv, jobDescription, jobRequirements),
      titleSimilarity: this.calculateTitleSimilarity(cv.experience, jobDescription),
      companyFit: this.calculateCompanyFit(cv.experience, jobDescription)
    };
    
    
    return features;
  }

  /**
   * Health check for matching feature service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testCV: ParsedCV = {
        personalInfo: { name: 'Test User', email: 'test@example.com' },
        experience: [{
          company: 'Tech Corp',
          position: 'Software Engineer',
          duration: '3 years',
          startDate: '2020-01',
          endDate: '2023-01',
          description: 'Developed web applications using React and Node.js'
        }],
        skills: ['JavaScript', 'React', 'Node.js'],
        education: [{
          institution: 'University',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          graduationDate: '2020'
        }]
      };
      
      const testJobDescription = 'Software Engineer position requiring React, Node.js, and 2+ years experience';
      const features = await this.extractFeatures(testCV, testJobDescription);
      
      return features.skillMatchPercentage > 0 && features.experienceRelevance > 0;
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private async extractJobKeywords(jobDescription: string): Promise<string[]> {
    if (!jobDescription) return [];
    
    const text = jobDescription.toLowerCase();
    
    // Extract technical skills and tools
    const technicalKeywords = this.extractTechnicalTerms(text);
    
    // Extract soft skills and qualifications
    const qualificationKeywords = this.extractQualificationTerms(text);
    
    // Extract common job-related terms
    const generalKeywords = text
      .split(/[^a-zA-Z]+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 30); // Limit to most frequent terms
    
    // Combine and deduplicate
    const allKeywords = [
      ...technicalKeywords,
      ...qualificationKeywords,
      ...generalKeywords
    ];
    
    return [...new Set(allKeywords)];
  }

  private extractTechnicalTerms(text: string): string[] {
    const commonTechnicalTerms = [
      // Programming languages
      'javascript', 'python', 'java', 'csharp', 'cpp', 'typescript', 'php', 'ruby', 'go', 'rust',
      'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql',
      
      // Frameworks and libraries
      'react', 'angular', 'vue', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel',
      'rails', 'bootstrap', 'jquery', 'webpack', 'babel',
      
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'oracle',
      'sqlite', 'firestore', 'dynamodb',
      
      // Cloud and DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'terraform',
      'ansible', 'puppet', 'chef', 'nginx', 'apache',
      
      // Tools and methodologies
      'git', 'jira', 'confluence', 'slack', 'agile', 'scrum', 'kanban', 'tdd', 'bdd',
      'cicd', 'microservices', 'api', 'rest', 'graphql', 'grpc'
    ];
    
    return commonTechnicalTerms.filter(term => text.includes(term));
  }

  private extractQualificationTerms(text: string): string[] {
    const qualificationPatterns = [
      // Experience levels
      /(\d+)\+?\s*years?\s*(of\s*)?experience/gi,
      /senior|junior|lead|principal|staff/gi,
      
      // Education requirements
      /bachelor|master|phd|doctorate|degree/gi,
      /computer\s*science|engineering|mathematics|physics/gi,
      
      // Certifications
      /certified|certification|aws|azure|google\s*cloud|cisco|microsoft/gi
    ];
    
    const matches: string[] = [];
    qualificationPatterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found.map(m => m.toLowerCase().trim()));
      }
    });
    
    return matches;
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was',
      'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now',
      'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she',
      'too', 'use', 'will', 'work', 'team', 'company', 'role', 'position', 'job', 'candidate'
    ];
    
    return stopWords.includes(word.toLowerCase());
  }

  private extractCVSkills(cv: ParsedCV): string[] {
    const skills: string[] = [];
    
    if (Array.isArray(cv.skills)) {
      skills.push(...cv.skills.map(skill => skill.toLowerCase()));
    } else if (cv.skills && typeof cv.skills === 'object') {
      if (cv.skills.technical) {
        skills.push(...cv.skills.technical.map((skill: string) => skill.toLowerCase()));
      }
      if (cv.skills.soft) {
        skills.push(...cv.skills.soft.map((skill: string) => skill.toLowerCase()));
      }
      if (cv.skills.languages) {
        skills.push(...cv.skills.languages.map((skill: string) => skill.toLowerCase()));
      }
    }
    
    // Also extract skills mentioned in experience descriptions
    if (cv.experience && Array.isArray(cv.experience)) {
      cv.experience.forEach(exp => {
        if (exp.description) {
          const mentionedSkills = this.extractSkillsFromText(exp.description);
          skills.push(...mentionedSkills);
        }
      });
    }
    
    return [...new Set(skills)]; // Remove duplicates
  }

  private extractSkillsFromText(text: string): string[] {
    const lowerText = text.toLowerCase();
    const skillKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'express',
      'django', 'flask', 'spring', 'mysql', 'postgresql', 'mongodb', 'aws', 'azure',
      'docker', 'kubernetes', 'git', 'agile', 'scrum', 'api', 'rest', 'graphql'
    ];
    
    return skillKeywords.filter(skill => lowerText.includes(skill));
  }

  private parseJobRequirements(jobDescription: string): {
    requiredExperience: number;
    preferredExperience: number;
    requiredEducation: string[];
    requiredSkills: string[];
    salaryRange?: { min: number; max: number };
  } {
    const requirements = {
      requiredExperience: 0,
      preferredExperience: 0,
      requiredEducation: [] as string[],
      requiredSkills: [] as string[],
      salaryRange: undefined as { min: number; max: number } | undefined
    };
    
    // Extract experience requirements
    const experienceMatch = jobDescription.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i);
    if (experienceMatch) {
      requirements.requiredExperience = parseInt(experienceMatch[1]);
    }
    
    // Extract education requirements
    if (jobDescription.toLowerCase().includes('bachelor')) {
      requirements.requiredEducation.push('bachelor');
    }
    if (jobDescription.toLowerCase().includes('master')) {
      requirements.requiredEducation.push('master');
    }
    
    // Extract salary information
    const salaryMatch = jobDescription.match(/\$(\d{2,3}),?(\d{3})\s*-\s*\$(\d{2,3}),?(\d{3})/);
    if (salaryMatch) {
      const min = parseInt(salaryMatch[1] + salaryMatch[2]);
      const max = parseInt(salaryMatch[3] + salaryMatch[4]);
      requirements.salaryRange = { min, max };
    }
    
    return requirements;
  }

  private calculateSkillMatch(cvSkills: string[], jobKeywords: string[]): number {
    if (cvSkills.length === 0 || jobKeywords.length === 0) return 0;
    
    let matches = 0;
    const totalJobKeywords = jobKeywords.length;
    
    jobKeywords.forEach(keyword => {
      if (cvSkills.some(skill => 
        skill.includes(keyword) || 
        keyword.includes(skill) ||
        this.calculateStringSimilarity(skill, keyword) > 0.8
      )) {
        matches++;
      }
    });
    
    return matches / totalJobKeywords;
  }

  private calculateExperienceRelevance(
    experience: any[] | undefined, 
    jobDescription: string,
    requirements: any
  ): number {
    if (!experience || experience.length === 0) return 0;
    
    const jobLower = jobDescription.toLowerCase();
    let relevanceScore = 0;
    let totalWeight = 0;
    
    experience.forEach((exp, index) => {
      const weight = index === 0 ? 0.5 : 0.3; // Most recent experience weighted more
      totalWeight += weight;
      
      let expScore = 0;
      
      // Check job title similarity
      if (exp.position && jobLower.includes(exp.position.toLowerCase())) {
        expScore += 0.4;
      }
      
      // Check description relevance
      if (exp.description) {
        const descriptionWords = exp.description.toLowerCase().split(/\s+/);
        const jobWords = jobLower.split(/\s+/);
        const commonWords = descriptionWords.filter((word: string) => jobWords.includes(word)).length;
        const relevance = commonWords / Math.max(descriptionWords.length, jobWords.length);
        expScore += relevance * 0.4;
      }
      
      // Check company relevance (if in same industry)
      if (exp.company && jobLower.includes(exp.company.toLowerCase())) {
        expScore += 0.2;
      }
      
      relevanceScore += expScore * weight;
    });
    
    return totalWeight > 0 ? relevanceScore / totalWeight : 0;
  }

  private calculateEducationMatch(
    education: any[] | undefined,
    jobDescription: string,
    requirements: any
  ): number {
    if (!education || education.length === 0) {
      return requirements.requiredEducation.length === 0 ? 0.7 : 0.2; // Neutral if no requirements
    }
    
    const jobLower = jobDescription.toLowerCase();
    let matchScore = 0.5; // Base score for having education
    
    education.forEach(edu => {
      // Check degree level match
      if (edu.degree) {
        const degreeLower = edu.degree.toLowerCase();
        if (requirements.requiredEducation.some((req: string) => degreeLower.includes(req))) {
          matchScore += 0.3;
        }
      }
      
      // Check field relevance
      if (edu.field) {
        const fieldLower = edu.field.toLowerCase();
        if (jobLower.includes(fieldLower) || fieldLower.includes('computer') || fieldLower.includes('engineering')) {
          matchScore += 0.2;
        }
      }
    });
    
    return Math.min(1.0, matchScore);
  }

  private calculateIndustryExperience(experience: any[] | undefined, jobDescription: string): number {
    if (!experience || experience.length === 0) return 0;
    
    // Extract industry indicators from job description
    const industries = this.extractIndustryKeywords(jobDescription);
    if (industries.length === 0) return 0.7; // Neutral if can't determine industry
    
    let industryScore = 0;
    let totalYears = 0;
    
    experience.forEach(exp => {
      if (exp.company && exp.description) {
        const expText = `${exp.company} ${exp.description}`.toLowerCase();
        const hasIndustryMatch = industries.some(industry => expText.includes(industry));
        
        if (hasIndustryMatch) {
          const years = this.calculateExperienceDuration(exp);
          industryScore += years;
          totalYears += years;
        }
      }
    });
    
    const totalExperience = this.calculateTotalExperience(experience);
    return totalExperience > 0 ? industryScore / totalExperience : 0;
  }

  private extractIndustryKeywords(jobDescription: string): string[] {
    const industryKeywords = [
      'fintech', 'financial', 'banking', 'insurance', 'healthcare', 'medical', 'pharmaceutical',
      'retail', 'ecommerce', 'technology', 'software', 'saas', 'gaming', 'entertainment',
      'education', 'edtech', 'government', 'nonprofit', 'manufacturing', 'automotive',
      'aerospace', 'energy', 'consulting', 'marketing', 'advertising'
    ];
    
    const jobLower = jobDescription.toLowerCase();
    return industryKeywords.filter(keyword => jobLower.includes(keyword));
  }

  private calculateLocationMatch(personalInfo: any, jobDescription: string): number {
    if (!personalInfo || !personalInfo.location) return 0.8; // Neutral if no location info
    
    const location = personalInfo.location.toLowerCase();
    const jobLower = jobDescription.toLowerCase();
    
    // Check for remote work
    if (jobLower.includes('remote') || jobLower.includes('work from home')) {
      return 1.0;
    }
    
    // Extract location from job description
    const locationKeywords = ['new york', 'san francisco', 'los angeles', 'chicago', 'boston', 'seattle', 'austin'];
    const jobLocation = locationKeywords.find(loc => jobLower.includes(loc));
    
    if (jobLocation && location.includes(jobLocation)) {
      return 1.0;
    }
    
    return 0.7; // Assume moderate match if can't determine
  }

  private calculateSalaryAlignment(cv: ParsedCV, jobDescription: string, requirements: any): number {
    // This would typically require salary expectations from CV or user profile
    // For now, return neutral score
    return 0.8;
  }

  private calculateTitleSimilarity(experience: any[] | undefined, jobDescription: string): number {
    if (!experience || experience.length === 0) return 0;
    
    const jobTitle = this.extractJobTitle(jobDescription);
    if (!jobTitle) return 0.5;
    
    let bestMatch = 0;
    
    experience.forEach(exp => {
      if (exp.position) {
        const similarity = this.calculateStringSimilarity(
          exp.position.toLowerCase(), 
          jobTitle.toLowerCase()
        );
        bestMatch = Math.max(bestMatch, similarity);
      }
    });
    
    return bestMatch;
  }

  private calculateCompanyFit(experience: any[] | undefined, jobDescription: string): number {
    // This would analyze company culture, size, and type matching
    // Simplified implementation for now
    return 0.7;
  }

  private extractJobTitle(jobDescription: string): string {
    // Extract job title from first line or common patterns
    const lines = jobDescription.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      
      // Remove common prefixes
      const cleanTitle = firstLine
        .replace(/^(job title|position|role):\s*/i, '')
        .replace(/\s*-.*$/, '') // Remove everything after dash
        .trim();
      
      return cleanTitle;
    }
    
    return '';
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    let matches = 0;
    const maxLength = Math.max(words1.length, words2.length);
    
    words1.forEach(word1 => {
      if (words2.some(word2 => 
        word1.includes(word2) || 
        word2.includes(word1) || 
        this.levenshteinDistance(word1, word2) <= 2
      )) {
        matches++;
      }
    });
    
    return maxLength > 0 ? matches / maxLength : 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculateExperienceDuration(experience: any): number {
    if (!experience.startDate) return 0;
    
    const startDate = new Date(experience.startDate);
    const endDate = experience.endDate && experience.endDate !== 'Present' 
      ? new Date(experience.endDate) 
      : new Date();
    
    const years = (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, years);
  }

  private calculateTotalExperience(experience: any[]): number {
    return experience.reduce((total, exp) => total + this.calculateExperienceDuration(exp), 0);
  }
}