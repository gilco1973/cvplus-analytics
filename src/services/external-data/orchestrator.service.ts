/**
 * External Data Orchestrator Service
 * 
 * Coordinates fetching data from multiple external sources,
 * manages parallel processing, and aggregates results
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import { 
  EnrichedCVData, 
  OrchestrationRequest, 
  OrchestrationResult,
  DataSourceResult,
  ExternalDataSource,
  RateLimitStatus
} from './types';
import { GitHubAdapter } from './adapters/github.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { WebSearchAdapter } from './adapters/web-search.adapter';
import { WebsiteAdapter } from './adapters/website.adapter';
import { ValidationService } from './validation.service';
import { CacheService } from './cache.service';
import { resilienceService } from '../resilience.service';

export class ExternalDataOrchestrator {
  private githubAdapter: GitHubAdapter;
  private linkedinAdapter: LinkedInAdapter;
  private webSearchAdapter: WebSearchAdapter;
  private websiteAdapter: WebsiteAdapter;
  private validationService: ValidationService;
  private cacheService: CacheService;
  
  private dataSources: Map<string, ExternalDataSource> = new Map([
    ['github', { id: 'github', name: 'GitHub', type: 'github', priority: 1, enabled: true }],
    ['linkedin', { id: 'linkedin', name: 'LinkedIn', type: 'linkedin', priority: 2, enabled: true }],
    ['web', { id: 'web', name: 'Web Search', type: 'web', priority: 3, enabled: true }],
    ['website', { id: 'website', name: 'Personal Website', type: 'website', priority: 4, enabled: true }]
  ]);
  
  private rateLimitStatus: Map<string, RateLimitStatus> = new Map();

  constructor() {
    this.githubAdapter = new GitHubAdapter();
    this.linkedinAdapter = new LinkedInAdapter();
    this.webSearchAdapter = new WebSearchAdapter();
    this.websiteAdapter = new WebsiteAdapter();
    this.validationService = new ValidationService();
    this.cacheService = new CacheService();
    
    logger.info('[ORCHESTRATOR] External Data Orchestrator initialized');
  }

  /**
   * Orchestrate data fetching from multiple sources
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const errors: Error[] = [];
    let cacheHits = 0;
    
    logger.info('[ORCHESTRATOR] Starting orchestration', { 
      requestId, 
      userId: request.userId,
      sources: request.sources 
    });

    try {
      // Check cache first if not forcing refresh
      if (!request.options?.forceRefresh) {
        const cachedData = await this.cacheService.get(this.getCacheKey(request));
        if (cachedData) {
          logger.info('[ORCHESTRATOR] Cache hit, returning cached data');
          cacheHits++;
          return {
            requestId,
            status: 'success',
            enrichedData: cachedData,
            fetchDuration: Date.now() - startTime,
            sourcesQueried: 0,
            sourcesSuccessful: 0,
            cacheHits,
            errors: []
          };
        }
      }

      // Filter and sort sources by priority
      const activeSources = this.getActiveSources(request.sources);
      
      // Fetch data from all sources in parallel with timeout
      const fetchPromises = activeSources.map(source => 
        this.fetchFromSource(source, request)
      );
      
      const timeout = request.options?.timeout || 30000; // 30 seconds default
      const results = await this.fetchWithTimeout(fetchPromises, timeout);
      
      // Process results
      const sourceResults: DataSourceResult[] = [];
      const enrichedData: Partial<EnrichedCVData> = {
        originalCVId: request.cvId,
        userId: request.userId,
        fetchedAt: new Date().toISOString(),
        sources: [],
        aggregatedSkills: [],
        aggregatedProjects: []
      };

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { source, data } = result.value;
          sourceResults.push({
            source,
            success: true,
            fetchedAt: new Date().toISOString(),
            dataPoints: this.countDataPoints(data)
          });
          
          // Merge data based on source
          this.mergeSourceData(enrichedData, source, data);
        } else if (result.status === 'rejected') {
          const error = result.reason as Error;
          errors.push(error);
          logger.error('[ORCHESTRATOR] Source fetch failed', error);
        }
      }

      enrichedData.sources = sourceResults;
      
      // Validate and sanitize aggregated data
      const validatedData = await this.validationService.validate(enrichedData as EnrichedCVData);
      
      // Cache the validated data
      await this.cacheService.set(
        this.getCacheKey(request),
        validatedData,
        3600 // 1 hour TTL
      );
      
      // Determine overall status
      const status = this.determineStatus(sourceResults, errors);
      
      return {
        requestId,
        status,
        enrichedData: validatedData,
        fetchDuration: Date.now() - startTime,
        sourcesQueried: activeSources.length,
        sourcesSuccessful: sourceResults.filter(r => r.success).length,
        cacheHits,
        errors
      };
      
    } catch (error) {
      logger.error('[ORCHESTRATOR] Orchestration failed', error);
      throw error;
    }
  }

  /**
   * Fetch data from a specific source with resilience
   */
  private async fetchFromSource(
    source: ExternalDataSource,
    request: OrchestrationRequest
  ): Promise<{ source: string; data: any }> {
    return await resilienceService.withFullResilience(
      async () => {
        let data: any;
        
        switch (source.type) {
          case 'github':
            data = await this.githubAdapter.fetchData(request.userId);
            break;
          case 'linkedin':
            data = await this.linkedinAdapter.fetchData(request.userId);
            break;
          case 'web':
            data = await this.webSearchAdapter.fetchData(request.userId);
            break;
          case 'website':
            data = await this.websiteAdapter.fetchData(request.userId);
            break;
          default:
            throw new Error(`Unknown source type: ${source.type}`);
        }
        
        return { source: source.id, data };
      },
      {
        operationName: `fetch-${source.id}`,
        retryConfig: { maxAttempts: 3, initialDelayMs: 1000 },
        circuitConfig: { failureThreshold: 3, resetTimeoutMs: 60000 },
        rateLimitConfig: source.rateLimit
      }
    );
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    promises: Promise<any>[],
    timeoutMs: number
  ): Promise<PromiseSettledResult<any>[]> {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
    );
    
    return await Promise.allSettled(
      promises.map(p => Promise.race([p, timeoutPromise]))
    );
  }

  /**
   * Merge source data into enriched data
   */
  private mergeSourceData(
    enrichedData: Partial<EnrichedCVData>,
    source: string,
    data: any
  ): void {
    switch (source) {
      case 'github':
        enrichedData.github = data;
        if (data.repositories) {
          enrichedData.aggregatedProjects!.push(
            ...data.repositories.slice(0, 5).map((repo: any) => ({
              title: repo.name,
              description: repo.description,
              url: repo.url,
              technologies: [repo.language].filter(Boolean)
            }))
          );
        }
        break;
      case 'linkedin':
        enrichedData.linkedin = data;
        if (data.skills) {
          enrichedData.aggregatedSkills!.push(...data.skills);
        }
        break;
      case 'web':
        enrichedData.webPresence = data;
        break;
      case 'website':
        enrichedData.personalWebsite = data;
        if (data.portfolioProjects) {
          enrichedData.aggregatedProjects!.push(...data.portfolioProjects);
        }
        break;
    }
  }

  /**
   * Get active sources based on request
   */
  private getActiveSources(requestedSources: string[]): ExternalDataSource[] {
    return requestedSources
      .map(id => this.dataSources.get(id))
      .filter((source): source is ExternalDataSource => 
        source !== undefined && source.enabled
      )
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Count data points in fetched data
   */
  private countDataPoints(data: any): number {
    if (!data) return 0;
    
    let count = 0;
    const countRecursive = (obj: any) => {
      if (Array.isArray(obj)) {
        count += obj.length;
        obj.forEach(countRecursive);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(countRecursive);
      } else if (obj !== null && obj !== undefined) {
        count++;
      }
    };
    
    countRecursive(data);
    return count;
  }

  /**
   * Determine overall status
   */
  private determineStatus(
    results: DataSourceResult[],
    errors: Error[]
  ): 'success' | 'partial' | 'failed' {
    const successCount = results.filter(r => r.success).length;
    if (successCount === results.length && errors.length === 0) {
      return 'success';
    } else if (successCount > 0) {
      return 'partial';
    }
    return 'failed';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(request: OrchestrationRequest): string {
    return `external_data:${request.userId}:${request.cvId}:${request.sources.join('_')}`;
  }

  /**
   * Get rate limit status for all sources
   */
  getRateLimitStatus(): RateLimitStatus[] {
    return Array.from(this.rateLimitStatus.values());
  }
}