/**
 * Hobbies Enrichment Module
 * 
 * Extracts and enriches hobbies and interests from GitHub activity,
 * personal websites, and web presence
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { ParsedCV } from '../../../types/job';
import { 
  EnrichedCVData,
  GitHubRepository,
  BlogPost
} from '../types';

export interface HobbiesEnrichmentResult {
  enrichedInterests: Array<{
    category: 'technical' | 'creative' | 'community' | 'personal' | 'professional';
    interest: string;
    evidence: string[];
    source: 'cv' | 'github' | 'website' | 'web';
    confidence: number;
  }>;
  categorizedInterests: {
    technical: string[];
    creative: string[];
    community: string[];
    professional: string[];
    personal: string[];
  };
  newInterestsAdded: number;
  qualityScore: number;
}

export class HobbiesEnrichmentService {
  /**
   * Enriches CV hobbies and interests with external data
   */
  async enrichHobbies(
    cv: ParsedCV,
    externalData: Partial<EnrichedCVData>
  ): Promise<HobbiesEnrichmentResult> {
    console.log('Starting hobbies enrichment');
    
    const existingInterests = this.extractExistingInterests(cv);
    const githubInterests = this.extractGitHubInterests(externalData.github);
    const websiteInterests = this.extractWebsiteInterests(externalData);
    const webInterests = this.extractWebPresenceInterests(externalData);
    
    // Merge and categorize interests
    const mergedInterests = this.mergeInterests(
      existingInterests,
      githubInterests,
      websiteInterests,
      webInterests
    );
    
    // Categorize interests
    const categorized = this.categorizeInterests(mergedInterests);
    
    // Calculate enrichment metrics
    const result: HobbiesEnrichmentResult = {
      enrichedInterests: mergedInterests,
      categorizedInterests: categorized,
      newInterestsAdded: this.countNewInterests(existingInterests, mergedInterests),
      qualityScore: this.calculateQualityScore(mergedInterests)
    };
    
    console.log(`Hobbies enrichment complete: ${result.newInterestsAdded} new interests added`);
    return result;
  }

  /**
   * Extract existing interests from CV
   */
  private extractExistingInterests(cv: ParsedCV): any[] {
    const interests = cv.interests || [];
    return interests.map(interest => ({
      category: this.categorizeInterest(interest),
      interest,
      evidence: ['Listed in CV'],
      source: 'cv' as const,
      confidence: 1.0
    }));
  }

  /**
   * Extract interests from GitHub activity
   */
  private extractGitHubInterests(github?: any): any[] {
    if (!github) return [];
    
    const interests: any[] = [];
    const repos = github.repositories || [];
    
    // Analyze repository topics and languages
    const topics = new Set<string>();
    const languages = new Set<string>();
    
    repos.forEach((repo: GitHubRepository) => {
      repo.topics?.forEach(topic => topics.add(topic));
      if (repo.language) languages.add(repo.language);
    });
    
    // Extract technical interests from topics
    topics.forEach(topic => {
      if (this.isInterestingTopic(topic)) {
        interests.push({
          category: 'technical',
          interest: this.formatTopic(topic),
          evidence: [`GitHub topic: ${topic}`],
          source: 'github',
          confidence: 0.7
        });
      }
    });
    
    // Extract programming language interests
    if (languages.size > 3) {
      interests.push({
        category: 'technical',
        interest: 'Polyglot Programming',
        evidence: [`Works with ${languages.size} programming languages`],
        source: 'github',
        confidence: 0.8
      });
    }
    
    // Check for open source contribution
    const hasForkedRepos = repos.some((r: GitHubRepository) => r.name.includes('fork'));
    if (hasForkedRepos || github.stats?.totalContributions > 100) {
      interests.push({
        category: 'community',
        interest: 'Open Source Contribution',
        evidence: ['Active GitHub contributor'],
        source: 'github',
        confidence: 0.9
      });
    }
    
    return interests;
  }

  /**
   * Extract interests from personal website
   */
  private extractWebsiteInterests(externalData: Partial<EnrichedCVData>): any[] {
    const interests: any[] = [];
    const website = externalData.personalWebsite;
    
    if (!website) return interests;
    
    // Extract from blog posts
    const blogTopics = this.extractBlogTopics(website.blogPosts || []);
    blogTopics.forEach(topic => {
      interests.push({
        category: this.categorizeInterest(topic),
        interest: topic,
        evidence: ['Blog posts on personal website'],
        source: 'website',
        confidence: 0.8
      });
    });
    
    return interests;
  }

  /**
   * Extract interests from web presence
   */
  private extractWebPresenceInterests(externalData: Partial<EnrichedCVData>): any[] {
    const interests: any[] = [];
    const webPresence = externalData.webPresence;
    
    if (!webPresence) return interests;
    
    // Extract from speaking engagements
    if (webPresence.speakingEngagements?.length > 0) {
      interests.push({
        category: 'community',
        interest: 'Public Speaking',
        evidence: webPresence.speakingEngagements.map(e => e.event),
        source: 'web',
        confidence: 0.9
      });
    }
    
    // Extract from publications
    if (webPresence.publications?.length > 0) {
      const topics = this.extractPublicationTopics(webPresence.publications);
      topics.forEach(topic => {
        interests.push({
          category: 'professional',
          interest: topic,
          evidence: ['Published articles'],
          source: 'web',
          confidence: 0.8
        });
      });
    }
    
    return interests;
  }

  /**
   * Merge interests from multiple sources
   */
  private mergeInterests(...interestGroups: any[][]): any[] {
    const merged = new Map<string, any>();
    
    interestGroups.forEach(group => {
      group.forEach(interest => {
        const key = this.getInterestKey(interest);
        const existing = merged.get(key);
        
        if (existing) {
          // Merge evidence and update confidence
          merged.set(key, {
            ...existing,
            evidence: Array.from(new Set(existing.evidence.concat(interest.evidence))),
            confidence: Math.max(existing.confidence, interest.confidence)
          });
        } else {
          merged.set(key, interest);
        }
      });
    });
    
    return Array.from(merged.values())
      .filter(i => i.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Categorize interests into groups
   */
  private categorizeInterests(interests: any[]): any {
    const categorized: any = {
      technical: [],
      creative: [],
      community: [],
      professional: [],
      personal: []
    };
    
    interests.forEach(interest => {
      if (!categorized[interest.category].includes(interest.interest)) {
        categorized[interest.category].push(interest.interest);
      }
    });
    
    return categorized;
  }

  /**
   * Categorize a single interest
   */
  private categorizeInterest(interest: string): string {
    const lower = interest.toLowerCase();
    
    if (this.isTechnicalInterest(lower)) return 'technical';
    if (this.isCreativeInterest(lower)) return 'creative';
    if (this.isCommunityInterest(lower)) return 'community';
    if (this.isProfessionalInterest(lower)) return 'professional';
    
    return 'personal';
  }

  /**
   * Check if topic is interesting enough to include
   */
  private isInterestingTopic(topic: string): boolean {
    const boringTopics = ['website', 'portfolio', 'personal', 'test', 'demo', 'example'];
    return !boringTopics.some(boring => topic.toLowerCase().includes(boring));
  }

  /**
   * Format topic for display
   */
  private formatTopic(topic: string): string {
    return topic
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract topics from blog posts
   */
  private extractBlogTopics(posts: BlogPost[]): string[] {
    const topics = new Set<string>();
    
    posts.forEach(post => {
      post.tags?.forEach(tag => {
        if (this.isInterestingTopic(tag)) {
          topics.add(this.formatTopic(tag));
        }
      });
    });
    
    return Array.from(topics);
  }

  /**
   * Extract topics from publications
   */
  private extractPublicationTopics(publications: any[]): string[] {
    const topics = new Set<string>();
    
    publications.forEach(pub => {
      if (pub.type === 'article') topics.add('Technical Writing');
      if (pub.type === 'paper') topics.add('Research');
    });
    
    return Array.from(topics);
  }

  /**
   * Generate unique key for interest deduplication
   */
  private getInterestKey(interest: any): string {
    return interest.interest.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Check if interest is technical
   */
  private isTechnicalInterest(interest: string): boolean {
    const technical = ['programming', 'coding', 'development', 'tech', 'software', 
                      'hardware', 'ai', 'machine learning', 'data', 'cloud'];
    return technical.some(t => interest.includes(t));
  }

  /**
   * Check if interest is creative
   */
  private isCreativeInterest(interest: string): boolean {
    const creative = ['design', 'art', 'music', 'writing', 'photography', 
                     'video', 'creative', 'drawing', 'painting'];
    return creative.some(c => interest.includes(c));
  }

  /**
   * Check if interest is community-related
   */
  private isCommunityInterest(interest: string): boolean {
    const community = ['volunteer', 'mentor', 'teaching', 'speaking', 'community',
                      'open source', 'contribution', 'organizing'];
    return community.some(c => interest.includes(c));
  }

  /**
   * Check if interest is professional
   */
  private isProfessionalInterest(interest: string): boolean {
    const professional = ['leadership', 'management', 'business', 'entrepreneur',
                         'innovation', 'strategy', 'consulting'];
    return professional.some(p => interest.includes(p));
  }

  /**
   * Count newly added interests
   */
  private countNewInterests(existing: any[], merged: any[]): number {
    const existingKeys = new Set(existing.map(i => this.getInterestKey(i)));
    return merged.filter(i => !existingKeys.has(this.getInterestKey(i))).length;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(interests: any[]): number {
    if (interests.length === 0) return 0;
    
    const diversity = new Set(interests.map(i => i.category)).size;
    const avgConfidence = interests.reduce((sum, i) => sum + i.confidence, 0) / interests.length;
    const evidenceQuality = interests.filter(i => i.evidence.length > 1).length / interests.length;
    
    return Math.round((diversity * 20) + (avgConfidence * 50) + (evidenceQuality * 30));
  }
}