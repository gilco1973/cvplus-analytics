/**
 * External Data Integration Module
 * 
 * Exports all external data integration services and types
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

// Export all types
export * from './types';

// Export services
export { ExternalDataOrchestrator } from './orchestrator.service';
export { ValidationService } from './validation.service';
export { CacheService } from './cache.service';

// Export adapters
export { GitHubAdapter } from './adapters/github.adapter';
export { LinkedInAdapter } from './adapters/linkedin.adapter';
export { WebSearchAdapter } from './adapters/web-search.adapter';
export { WebsiteAdapter } from './adapters/website.adapter';

// Create singleton instances
import { ExternalDataOrchestrator } from './orchestrator.service';
export const externalDataOrchestrator = new ExternalDataOrchestrator();