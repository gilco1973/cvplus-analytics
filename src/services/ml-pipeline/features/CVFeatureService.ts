/**
 * CV Feature Service
 * 
 * Extracts features specifically from CV content including structural,
 * content quality, and formatting characteristics.
 */

import { ParsedCV } from '../../../types/job';
import { FeatureVector } from '../../../types/phase2-models';

export class CVFeatureService {
  
  /**
   * Extract comprehensive features from CV structure and content
   */
  async extractFeatures(cv: ParsedCV): Promise<FeatureVector['cvFeatures']> {
    
    const features = {
      keywordMatch: this.calculateKeywordMatch(cv),
      skillsAlignment: this.calculateSkillsAlignment(cv),
      experienceRelevance: this.calculateExperienceRelevance(cv),
      educationMatch: this.calculateEducationMatch(cv),
      educationLevel: this.getEducationLevel(cv.education)
    };
    
    return features;
  }

  /**
   * Health check for CV feature service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test feature extraction with minimal CV
      const testCV: ParsedCV = {
        personalInfo: { 
          name: 'Test User', 
          email: 'test@example.com',
          summary: 'Test summary with some words for testing purposes.'
        },
        experience: [{
          company: 'Test Company',
          position: 'Test Position',
          duration: '3 years',
          startDate: '2020-01',
          endDate: '2023-01',
          description: 'Test experience description'
        }],
        skills: ['JavaScript', 'Python', 'React'],
        education: [{
          institution: 'Test University',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          graduationDate: '2020'
        }]
      };
      
      const features = await this.extractFeatures(testCV);
      
      // Verify basic feature extraction worked
      return (features?.keywordMatch || 0) >= 0 && 
             (features?.skillsAlignment || 0) >= 0 && 
             (features?.educationLevel || 0) >= 0;
             
    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private calculateWordCount(cv: ParsedCV): number {
    let totalWords = 0;
    
    // Count words in summary
    if (cv.personalInfo?.summary) {
      totalWords += this.countWordsInText(cv.personalInfo.summary);
    }
    
    // Count words in experience descriptions
    if (cv.experience && Array.isArray(cv.experience)) {
      cv.experience.forEach(exp => {
        if (exp.description) {
          totalWords += this.countWordsInText(exp.description);
        }
      });
    }
    
    // Count words in education descriptions
    if (cv.education && Array.isArray(cv.education)) {
      cv.education.forEach(edu => {
        if (edu.description) {
          totalWords += this.countWordsInText(edu.description);
        }
      });
    }
    
    // Count words in project descriptions
    if (cv.projects && Array.isArray(cv.projects)) {
      cv.projects.forEach(project => {
        if (project.description) {
          totalWords += this.countWordsInText(project.description);
        }
      });
    }
    
    return totalWords;
  }

  private countWordsInText(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  private countCVSections(cv: ParsedCV): number {
    let sectionCount = 0;
    
    if (cv.personalInfo) sectionCount++;
    if (cv.experience && cv.experience.length > 0) sectionCount++;
    if (cv.skills && this.hasValidSkills(cv.skills)) sectionCount++;
    if (cv.education && cv.education.length > 0) sectionCount++;
    if (cv.projects && cv.projects.length > 0) sectionCount++;
    if (cv.certifications && cv.certifications.length > 0) sectionCount++;
    if ((cv as any).languages && (cv as any).languages.length > 0) sectionCount++;
    if ((cv as any).awards && (cv as any).awards.length > 0) sectionCount++;
    
    return sectionCount;
  }

  private hasValidSkills(skills: any): boolean {
    if (Array.isArray(skills)) {
      return skills.length > 0;
    } else if (skills && typeof skills === 'object') {
      return (skills.technical && skills.technical.length > 0) ||
             (skills.soft && skills.soft.length > 0) ||
             ((skills as any).languages && (skills as any).languages.length > 0);
    }
    return false;
  }

  private countSkills(skills: any): number {
    if (Array.isArray(skills)) {
      return skills.length;
    } else if (skills && typeof skills === 'object') {
      let count = 0;
      if (skills.technical && Array.isArray(skills.technical)) {
        count += skills.technical.length;
      }
      if (skills.soft && Array.isArray(skills.soft)) {
        count += skills.soft.length;
      }
      if ((skills as any).languages && Array.isArray((skills as any).languages)) {
        count += (skills as any).languages.length;
      }
      return count;
    }
    return 0;
  }

  private calculateTotalExperience(experience?: any[]): number {
    if (!experience || !Array.isArray(experience) || experience.length === 0) {
      return 0;
    }
    
    let totalMonths = 0;
    const currentDate = new Date();
    
    experience.forEach(exp => {
      if (exp.startDate) {
        const startDate = this.parseDate(exp.startDate);
        const endDate = exp.endDate && exp.endDate !== 'Present' 
          ? this.parseDate(exp.endDate) 
          : currentDate;
        
        if (startDate && endDate) {
          const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (endDate.getMonth() - startDate.getMonth());
          totalMonths += Math.max(0, monthsDiff);
        }
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10; // Years with 1 decimal place
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    // Handle various date formats
    const formats = [
      /^\d{4}-\d{2}$/, // YYYY-MM
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{4}$/, // MM/YYYY
      /^\d{4}$/ // YYYY
    ];
    
    for (const format of formats) {
      if (format.test(dateString)) {
        if (dateString.match(/^\d{4}$/)) {
          return new Date(parseInt(dateString), 0, 1); // January 1st of the year
        } else if (dateString.match(/^\d{4}-\d{2}$/)) {
          const [year, month] = dateString.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, 1);
        } else if (dateString.match(/^\d{2}\/\d{4}$/)) {
          const [month, year] = dateString.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, 1);
        } else {
          return new Date(dateString);
        }
      }
    }
    
    return new Date(dateString); // Fallback to native parsing
  }

  private getEducationLevel(education?: any[]): number {
    if (!education || !Array.isArray(education) || education.length === 0) {
      return 1; // No formal education
    }
    
    const degrees = education.map(edu => (edu.degree || '').toLowerCase());
    
    // Check for highest degree level
    if (degrees.some(d => d.includes('phd') || d.includes('doctorate') || d.includes('ph.d'))) {
      return 5; // Doctorate
    }
    
    if (degrees.some(d => d.includes('master') || d.includes('mba') || d.includes('ms') || d.includes('ma'))) {
      return 4; // Master's
    }
    
    if (degrees.some(d => d.includes('bachelor') || d.includes('bs') || d.includes('ba') || d.includes('bsc'))) {
      return 3; // Bachelor's
    }
    
    if (degrees.some(d => d.includes('associate') || d.includes('diploma'))) {
      return 2; // Associate/Diploma
    }
    
    return 1; // High school or equivalent
  }

  private countCertifications(certifications?: any[]): number {
    if (!certifications || !Array.isArray(certifications)) {
      return 0;
    }
    return certifications.length;
  }

  private countProjects(projects?: any[]): number {
    if (!projects || !Array.isArray(projects)) {
      return 0;
    }
    return projects.length;
  }

  private countAchievements(cv: ParsedCV): number {
    let achievementCount = 0;
    
    // Count explicit achievements/awards
    if ((cv as any).awards && Array.isArray((cv as any).awards)) {
      achievementCount += (cv as any).awards.length;
    }
    
    // Count quantified achievements in experience descriptions
    if (cv.experience && Array.isArray(cv.experience)) {
      cv.experience.forEach(exp => {
        if (exp.description) {
          // Look for quantified achievements (numbers with % or currency)
          const quantifiedMatches = exp.description.match(/\d+%|\$\d+|\d+\+|increased.*\d+|decreased.*\d+|improved.*\d+/gi);
          if (quantifiedMatches) {
            achievementCount += quantifiedMatches.length;
          }
        }
      });
    }
    
    return achievementCount;
  }

  private calculateKeywordDensity(cv: ParsedCV): number {
    const allText = this.getAllTextContent(cv);
    if (!allText || allText.length === 0) return 0;
    
    const words = allText.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords === 0) return 0;
    
    // Common professional keywords
    const professionalKeywords = [
      'managed', 'developed', 'created', 'implemented', 'designed', 'led', 'coordinated',
      'improved', 'increased', 'decreased', 'optimized', 'analyzed', 'strategic',
      'innovative', 'collaborative', 'leadership', 'project', 'team', 'client',
      'customer', 'solution', 'technology', 'software', 'system', 'process'
    ];
    
    let keywordCount = 0;
    words.forEach(word => {
      if (professionalKeywords.includes(word)) {
        keywordCount++;
      }
    });
    
    return keywordCount / totalWords;
  }

  private calculateReadabilityScore(cv: ParsedCV): number {
    const allText = this.getAllTextContent(cv);
    if (!allText || allText.length === 0) return 0;
    
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = allText.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const averageWordsPerSentence = words.length / sentences.length;
    
    // Ideal range for professional documents is 15-20 words per sentence
    let score = 0.5; // Base score
    
    if (averageWordsPerSentence >= 15 && averageWordsPerSentence <= 20) {
      score = 0.9; // Excellent readability
    } else if (averageWordsPerSentence >= 12 && averageWordsPerSentence <= 25) {
      score = 0.7; // Good readability
    } else if (averageWordsPerSentence >= 8 && averageWordsPerSentence <= 30) {
      score = 0.6; // Acceptable readability
    }
    
    // Penalize very short or very long sentences
    if (averageWordsPerSentence < 5 || averageWordsPerSentence > 35) {
      score = 0.3;
    }
    
    return score;
  }

  private calculateFormattingScore(cv: ParsedCV): number {
    let score = 0.5; // Base score
    
    // Check for consistent date formats in experience
    if (cv.experience && Array.isArray(cv.experience) && cv.experience.length > 0) {
      const hasConsistentDates = cv.experience.every(exp => 
        exp.startDate && exp.endDate && 
        this.isValidDateFormat(exp.startDate) && 
        (exp.endDate === 'Present' || this.isValidDateFormat(exp.endDate))
      );
      
      if (hasConsistentDates) {
        score += 0.2;
      }
    }
    
    // Check for structured sections
    const requiredSections = [cv.personalInfo, cv.experience, cv.skills, cv.education]
      .filter(section => section !== undefined && section !== null).length;
    
    if (requiredSections >= 4) {
      score += 0.2;
    } else if (requiredSections >= 3) {
      score += 0.1;
    }
    
    // Check for quantified achievements
    if (cv.experience && Array.isArray(cv.experience)) {
      const hasQuantifiedAchievements = cv.experience.some(exp => 
        exp.description && /\d+%|\$\d+|\d+\+|improved.*\d+|increased.*\d+/gi.test(exp.description)
      );
      
      if (hasQuantifiedAchievements) {
        score += 0.2;
      }
    }
    
    // Check for contact information completeness
    if (cv.personalInfo) {
      let contactScore = 0;
      if (cv.personalInfo.email) contactScore += 0.05;
      if (cv.personalInfo.phone) contactScore += 0.05;
      if ((cv.personalInfo as any).location || cv.personalInfo.address) contactScore += 0.05;
      score += contactScore;
    }
    
    return Math.min(1.0, score);
  }

  private isValidDateFormat(date: string): boolean {
    if (!date) return false;
    
    // Check for common professional date formats
    const validFormats = [
      /^\d{4}-\d{2}$/, // YYYY-MM
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{4}$/, // MM/YYYY
      /^\d{4}$/ // YYYY
    ];
    
    return validFormats.some(format => format.test(date));
  }

  private getAllTextContent(cv: ParsedCV): string {
    let allText = '';
    
    // Personal info
    if (cv.personalInfo?.summary) {
      allText += cv.personalInfo.summary + ' ';
    }
    
    // Experience descriptions
    if (cv.experience && Array.isArray(cv.experience)) {
      cv.experience.forEach(exp => {
        if (exp.description) {
          allText += exp.description + ' ';
        }
      });
    }
    
    // Education descriptions
    if (cv.education && Array.isArray(cv.education)) {
      cv.education.forEach(edu => {
        if (edu.description) {
          allText += edu.description + ' ';
        }
      });
    }
    
    // Project descriptions
    if (cv.projects && Array.isArray(cv.projects)) {
      cv.projects.forEach(project => {
        if (project.description) {
          allText += project.description + ' ';
        }
      });
    }
    
    return allText.trim();
  }

  private calculateKeywordMatch(cv: ParsedCV): number {
    // Simple keyword matching score (0-1)
    const skillsCount = this.countSkills(cv.skills);
    return Math.min(skillsCount / 10, 1); // Normalize to 0-1
  }

  private calculateSkillsAlignment(cv: ParsedCV): number {
    // Calculate how well skills align with standard formats
    const skillsCount = this.countSkills(cv.skills);
    return skillsCount > 0 ? Math.min(skillsCount / 15, 1) : 0;
  }

  private calculateExperienceRelevance(cv: ParsedCV): number {
    // Calculate experience relevance score
    const yearsExp = this.calculateTotalExperience(cv.experience);
    return Math.min(yearsExp / 10, 1); // Normalize to 0-1
  }

  private calculateEducationMatch(cv: ParsedCV): number {
    // Calculate education matching score
    const eduLevel = this.getEducationLevel(cv.education);
    return eduLevel / 5; // Normalize to 0-1 (assuming max level is 5)
  }
}