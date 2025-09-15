/**
 * Web Search Adapter
 * 
 * Searches for professional presence, publications, and achievements
 * across the web using search APIs
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import axios from 'axios';
import { 
  WebPresence,
  WebSearchResult,
  WebPublication,
  SpeakingEngagement,
  Award
} from '../types';

export class WebSearchAdapter {
  private readonly searchApiKey: string | null;
  private readonly searchEngineId: string | null;
  private readonly googleSearchUrl = 'https://www.googleapis.com/customsearch/v1';
  
  constructor() {
    this.searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || null;
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || null;
    
    logger.info('[WEB-SEARCH-ADAPTER] Web search adapter initialized');
  }

  /**
   * Search for professional presence across the web
   */
  async fetchData(personName: string): Promise<WebPresence> {
    try {
      logger.info('[WEB-SEARCH-ADAPTER] Searching web presence', { personName });
      
      // Perform various searches in parallel
      const [
        generalResults,
        publications,
        speakingEngagements,
        awards
      ] = await Promise.all([
        this.searchGeneral(personName),
        this.searchPublications(personName),
        this.searchSpeakingEngagements(personName),
        this.searchAwards(personName)
      ]);
      
      const webPresence: WebPresence = {
        searchResults: generalResults,
        publications,
        speakingEngagements,
        awards,
        mentions: generalResults.length
      };
      
      logger.info('[WEB-SEARCH-ADAPTER] Web presence search completed', {
        personName,
        resultsCount: generalResults.length,
        publicationsCount: publications.length
      });
      
      return webPresence;
      
    } catch (error) {
      logger.error('[WEB-SEARCH-ADAPTER] Failed to search web presence', error);
      throw new Error(`Web search failed: ${(error as any)?.message || 'Unknown error'}`);
    }
  }

  /**
   * General search for person's professional presence
   */
  private async searchGeneral(personName: string): Promise<WebSearchResult[]> {
    const queries = [
      `"${personName}" professional`,
      `"${personName}" software engineer`,
      `"${personName}" developer`,
      `"${personName}" LinkedIn`
    ];
    
    const results: WebSearchResult[] = [];
    
    for (const query of queries) {
      try {
        const searchResults = await this.performSearch(query, 5);
        results.push(...searchResults);
      } catch (error) {
        logger.warn('[WEB-SEARCH-ADAPTER] Search query failed', { query, error });
      }
    }
    
    // Deduplicate by URL
    const uniqueResults = this.deduplicateResults(results);
    
    // Sort by relevance
    return uniqueResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search for publications
   */
  private async searchPublications(personName: string): Promise<WebPublication[]> {
    const queries = [
      `"${personName}" site:medium.com`,
      `"${personName}" site:dev.to`,
      `"${personName}" site:arxiv.org`,
      `"${personName}" published article`,
      `"${personName}" research paper`
    ];
    
    const publications: WebPublication[] = [];
    
    for (const query of queries) {
      try {
        const results = await this.performSearch(query, 3);
        
        for (const result of results) {
          const publication: WebPublication = {
            title: result.title,
            url: result.url,
            publisher: this.extractPublisher(result.url),
            date: result.publishedDate,
            type: this.classifyPublicationType(result.url, result.title)
          };
          publications.push(publication);
        }
      } catch (error) {
        logger.warn('[WEB-SEARCH-ADAPTER] Publication search failed', { query });
      }
    }
    
    return publications;
  }

  /**
   * Search for speaking engagements
   */
  private async searchSpeakingEngagements(personName: string): Promise<SpeakingEngagement[]> {
    const queries = [
      `"${personName}" conference speaker`,
      `"${personName}" keynote`,
      `"${personName}" tech talk`,
      `"${personName}" presentation`
    ];
    
    const engagements: SpeakingEngagement[] = [];
    
    for (const query of queries) {
      try {
        const results = await this.performSearch(query, 3);
        
        for (const result of results) {
          if (this.isSpeakingEngagement(result)) {
            const engagement: SpeakingEngagement = {
              event: this.extractEventName(result.title),
              title: result.title,
              date: result.publishedDate,
              url: result.url
            };
            engagements.push(engagement);
          }
        }
      } catch (error) {
        logger.warn('[WEB-SEARCH-ADAPTER] Speaking engagement search failed', { query });
      }
    }
    
    return engagements;
  }

  /**
   * Search for awards and recognition
   */
  private async searchAwards(personName: string): Promise<Award[]> {
    const queries = [
      `"${personName}" award winner`,
      `"${personName}" recognition`,
      `"${personName}" honored`,
      `"${personName}" achievement`
    ];
    
    const awards: Award[] = [];
    
    for (const query of queries) {
      try {
        const results = await this.performSearch(query, 3);
        
        for (const result of results) {
          if (this.isAward(result)) {
            const award: Award = {
              title: this.extractAwardTitle(result.title),
              organization: this.extractOrganization(result.snippet),
              date: result.publishedDate,
              description: result.snippet
            };
            awards.push(award);
          }
        }
      } catch (error) {
        logger.warn('[WEB-SEARCH-ADAPTER] Award search failed', { query });
      }
    }
    
    return awards;
  }

  /**
   * Perform actual search using Google Custom Search API
   */
  private async performSearch(query: string, limit: number = 10): Promise<WebSearchResult[]> {
    if (!this.searchApiKey || !this.searchEngineId) {
      logger.warn('[WEB-SEARCH-ADAPTER] Search API not configured, returning empty results');
      return [];
    }
    
    try {
      const response = await axios.get(this.googleSearchUrl, {
        params: {
          key: this.searchApiKey,
          cx: this.searchEngineId,
          q: query,
          num: limit
        }
      });
      
      const results: WebSearchResult[] = (response.data.items || []).map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: new URL(item.link).hostname,
        relevanceScore: this.calculateRelevance(item, query),
        publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time']
      }));
      
      return results;
      
    } catch (error) {
      logger.error('[WEB-SEARCH-ADAPTER] Search API error', error);
      return [];
    }
  }

  /**
   * Calculate relevance score for search result
   */
  private calculateRelevance(item: any, query: string): number {
    let score = 0;
    const queryTerms = query.toLowerCase().split(' ');
    
    // Check title relevance
    const titleLower = item.title?.toLowerCase() || '';
    queryTerms.forEach(term => {
      if (titleLower.includes(term)) score += 2;
    });
    
    // Check snippet relevance
    const snippetLower = item.snippet?.toLowerCase() || '';
    queryTerms.forEach(term => {
      if (snippetLower.includes(term)) score += 1;
    });
    
    // Boost for certain domains
    const trustedDomains = ['linkedin.com', 'github.com', 'medium.com', 'arxiv.org'];
    if (trustedDomains.some(domain => item.link?.includes(domain))) {
      score += 3;
    }
    
    return score;
  }

  /**
   * Deduplicate search results by URL
   */
  private deduplicateResults(results: WebSearchResult[]): WebSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  }

  /**
   * Extract publisher from URL
   */
  private extractPublisher(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Classify publication type
   */
  private classifyPublicationType(url: string, title: string): WebPublication['type'] {
    if (url.includes('arxiv.org')) return 'paper';
    if (url.includes('medium.com') || url.includes('dev.to')) return 'blog';
    if (title.toLowerCase().includes('book')) return 'book';
    if (title.toLowerCase().includes('research') || title.toLowerCase().includes('paper')) return 'paper';
    return 'article';
  }

  /**
   * Check if result is a speaking engagement
   */
  private isSpeakingEngagement(result: WebSearchResult): boolean {
    const keywords = ['conference', 'speaker', 'keynote', 'talk', 'presentation', 'summit'];
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if result is an award
   */
  private isAward(result: WebSearchResult): boolean {
    const keywords = ['award', 'winner', 'recognition', 'honored', 'prize', 'achievement'];
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extract event name from title
   */
  private extractEventName(title: string): string {
    // Simple extraction - could be enhanced with NLP
    return title.split('-')[0].trim();
  }

  /**
   * Extract award title
   */
  private extractAwardTitle(title: string): string {
    // Simple extraction - could be enhanced with NLP
    return title.replace(/\s*[-–]\s*.*$/, '').trim();
  }

  /**
   * Extract organization from snippet
   */
  private extractOrganization(snippet: string): string {
    // Simple extraction - could be enhanced with NLP
    const match = snippet.match(/(?:by|from|at)\s+([A-Z][^.]+)/);
    return match ? match[1].trim() : 'Unknown Organization';
  }
}