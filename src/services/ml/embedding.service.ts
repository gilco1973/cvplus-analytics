/**
 * Production-Ready Embedding Service for CVPlus RAG System
 * 
 * Core embedding service leveraging OpenAI text-embedding-ada-002
 * 
 * @version 2.0.0
 * @author Gil Klainert
  */

import OpenAI from 'openai';
import { admin, db } from '@cvplus/core';
import { config } from '../config/environment';
import { ParsedCV } from '../types/enhanced-models';
import { RAGEmbedding, EmbeddingMetadata, ContentType } from '../types/rag-search.types';
import { CVSection } from '../types';
import { logger } from '@cvplus/core';
import { ChunkingUtils, ChunkResult } from '@cvplus/processing/cv-generator/chunking/ChunkingUtils';
import { EmbeddingHelpers } from '@cvplus/processing/cv-generator/embedding/EmbeddingHelpers';
import { vectorDatabase, VectorInput, SearchOptions } from './vector-database.service';

/**
 * Embedding generation configuration
  */
export interface EmbeddingConfig {
  model: 'text-embedding-ada-002';
  maxTokens: number;
  batchSize: number;
  retryAttempts: number;
  rateLimitDelay: number;
  enableCaching: boolean;
  huggingFaceMode: boolean;
}

/**
 * Chunking strategy options
  */
export interface ChunkingOptions {
  strategy: 'semantic' | 'fixed-size' | 'sliding-window';
  maxTokens: number;
  overlap: number;
  preserveContext: boolean;
  cvSectionAware: boolean;
}

/**
 * Similarity search result
  */
export interface SimilarityResult {
  embedding: RAGEmbedding;
  similarity: number;
  relevanceScore: number;
  rank: number;
}

/**
 * CV embedding processing result
  */
export interface CVEmbeddingResult {
  embeddings: RAGEmbedding[];
  totalChunks: number;
  totalTokens: number;
  processingTime: number;
  sectionsProcessed: string[];
}

/**
 * HuggingFace export configuration
  */
export interface HuggingFaceExport {
  embeddings: RAGEmbedding[];
  model: string;
  version: string;
  exportFormat: 'json' | 'parquet';
  optimizedForOffline: boolean;
}

/**
 * Production embedding service for CVPlus RAG system
  */
export class EmbeddingService {
  private openai: OpenAI | null = null;
  private db = db;
  private config: EmbeddingConfig;

  constructor(customConfig?: Partial<EmbeddingConfig>) {
    this.config = {
      model: 'text-embedding-ada-002',
      maxTokens: 8191,
      batchSize: 20,
      retryAttempts: 3,
      rateLimitDelay: 1000,
      enableCaching: true,
      huggingFaceMode: false,
      ...customConfig
    };
  }

  /**
   * Initialize OpenAI client with error handling
    */
  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = config.rag?.openaiApiKey || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('OpenAI API key not configured for embedding service');
      }
      
      this.openai = new OpenAI({
        apiKey,
        timeout: 30000,
        maxRetries: this.config.retryAttempts
      });
    }
    return this.openai;
  }

  /**
   * Generate embeddings for batch of texts
    */
  async generateEmbeddings(texts: string[], options?: Partial<EmbeddingConfig>): Promise<RAGEmbedding[]> {
    const startTime = Date.now();
    const effectiveConfig = { ...this.config, ...options };
    
    logger.info('[EMBEDDING-SERVICE] Starting batch embedding generation', {
      textCount: texts.length,
      batchSize: effectiveConfig.batchSize
    });

    try {
      const embeddings: RAGEmbedding[] = [];
      
      for (let i = 0; i < texts.length; i += effectiveConfig.batchSize) {
        const batch = texts.slice(i, i + effectiveConfig.batchSize);
        const batchResults = await this.processBatch(batch, i);
        embeddings.push(...batchResults);
        
        if (i + effectiveConfig.batchSize < texts.length) {
          await EmbeddingHelpers.delay(effectiveConfig.rateLimitDelay);
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('[EMBEDDING-SERVICE] Batch embedding completed', {
        totalEmbeddings: embeddings.length,
        processingTime: `${processingTime}ms`
      });

      return embeddings;
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Batch embedding failed', { error });
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate single embedding with metadata
    */
  async generateSingleEmbedding(text: string, metadata?: EmbeddingMetadata): Promise<RAGEmbedding> {
    try {
      const response = await this.getOpenAI().embeddings.create({
        model: this.config.model,
        input: text.trim()
      });

      return {
        id: `embed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: text,
        metadata: metadata || {
          sourceDocument: 'cv-content',
          documentType: ContentType.CV_SECTION,
          section: CVSection.PROFESSIONAL_SUMMARY,
          chunkIndex: 0,
          wordCount: text.length,
          confidence: 1.0,
          importance: 1.0,
          tags: [],
          source: 'summary'
        },
        embedding: response.data[0].embedding,
        vector: response.data[0].embedding,
        tokens: EmbeddingHelpers.estimateTokenCount(text),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Single embedding failed', { error });
      throw error;
    }
  }

  /**
   * Intelligent text chunking
    */
  chunkText(text: string, options?: Partial<ChunkingOptions>): ChunkResult {
    const config = {
      strategy: 'semantic' as const,
      maxTokens: 500,
      overlap: 50,
      preserveContext: true,
      cvSectionAware: true,
      ...options
    };

    switch (config.strategy) {
      case 'semantic':
        return ChunkingUtils.semanticChunking(text, config.maxTokens);
      case 'fixed-size':
        return ChunkingUtils.fixedSizeChunking(text, config.maxTokens);
      case 'sliding-window':
        return ChunkingUtils.slidingWindowChunking(text, config.maxTokens, config.overlap);
      default:
        return ChunkingUtils.semanticChunking(text, config.maxTokens);
    }
  }

  /**
   * Preprocess text for embedding generation
    */
  preprocessText(text: string, options?: { removeExtra?: boolean; normalizeSpacing?: boolean }): string {
    const config = { removeExtra: true, normalizeSpacing: true, ...options };
    let processed = text.trim();
    
    if (config.normalizeSpacing) {
      processed = processed.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
    }
    
    if (config.removeExtra) {
      processed = processed
        .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/\s+([,.!?;:])/g, '$1');
    }
    
    return processed;
  }

  /**
   * Calculate cosine similarity between vectors
    */
  cosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have same length for cosine similarity');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    return (magnitude1 === 0 || magnitude2 === 0) ? 0 : dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Search for similar embeddings
    */
  async searchSimilar(query: string, embeddings: RAGEmbedding[], topK = 5): Promise<SimilarityResult[]> {
    try {
      const queryEmbedding = await this.generateSingleEmbedding(query);
      
      // Use vector database for improved performance if available
      if (embeddings.length > 100 && queryEmbedding.vector) {
        return await this.searchWithVectorDatabase(queryEmbedding.vector, embeddings, topK);
      }
      
      // Fallback to in-memory search for smaller datasets
      const similarities = embeddings
        .filter(embedding => embedding.vector && queryEmbedding.vector)
        .map((embedding, index) => {
          const similarity = this.cosineSimilarity(queryEmbedding.vector!, embedding.vector!);
          const relevanceScore = EmbeddingHelpers.calculateRelevanceScore(similarity, embedding.metadata);
          
          return { embedding, similarity, relevanceScore, rank: index };
        });
      
      return similarities
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK)
        .map((result, index) => ({ ...result, rank: index + 1 }));
        
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Semantic search failed', { error });
      throw error;
    }
  }

  /**
   * Enhanced search using vector database for better performance
    */
  private async searchWithVectorDatabase(
    queryVector: number[], 
    embeddings: RAGEmbedding[], 
    topK: number
  ): Promise<SimilarityResult[]> {
    try {
      // Convert RAGEmbeddings to VectorInputs for the database
      const vectorInputs: VectorInput[] = embeddings
        .filter(embedding => embedding.vector)
        .map(embedding => ({
          id: embedding.id,
          content: embedding.content,
          vector: embedding.vector!,
          metadata: {
            ...embedding.metadata,
            createdAt: embedding.createdAt,
            keywords: this.extractKeywords(embedding.content)
          }
        }));

      // Add vectors to database (temporary for search)
      const tempVectorIds = await vectorDatabase.addVectors(vectorInputs);

      // Perform search with enhanced options
      const searchOptions: Partial<SearchOptions> = {
        topK,
        threshold: 0.1,
        includeMetadata: true
      };

      const results = await vectorDatabase.search(queryVector, searchOptions);

      // Clean up temporary vectors
      for (const id of tempVectorIds) {
        await vectorDatabase.deleteVector(id);
      }

      // Convert back to SimilarityResult format
      return results.map((result: any) => {
        const originalEmbedding = embeddings.find((e: any) => e.id === result.id);
        return {
          embedding: {
            id: result.id,
            content: result.content,
            embedding: originalEmbedding?.embedding || originalEmbedding?.vector || [],
            vector: originalEmbedding?.vector,
            metadata: result.metadata,
            tokens: result.content.split(' ').length,
            createdAt: result.metadata.createdAt,
            updatedAt: originalEmbedding?.updatedAt || new Date()
          },
          similarity: result.similarity,
          relevanceScore: EmbeddingHelpers.calculateRelevanceScore(result.similarity, result.metadata),
          rank: result.rank
        };
      });

    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Vector database search failed', { error });
      // Fallback to regular search
      throw error;
    }
  }

  /**
   * Store embeddings in vector database for persistent search
    */
  async storeInVectorDatabase(embeddings: RAGEmbedding[], namespace: string): Promise<string[]> {
    try {
      logger.info('[EMBEDDING-SERVICE] Storing embeddings in vector database', {
        count: embeddings.length,
        namespace
      });

      const vectorInputs: VectorInput[] = embeddings
        .filter(embedding => embedding.vector)
        .map(embedding => ({
          id: `${namespace}_${embedding.id}`,
          content: embedding.content,
          vector: embedding.vector!,
          metadata: {
            ...embedding.metadata,
            createdAt: embedding.createdAt,
            keywords: this.extractKeywords(embedding.content)
          }
      }));

      const vectorIds = await vectorDatabase.addVectors(vectorInputs);
      
      logger.info('[EMBEDDING-SERVICE] Embeddings stored successfully', {
        vectorIds: vectorIds.length,
        namespace
      });

      return vectorIds;
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Failed to store embeddings in vector database', { 
        error, 
        namespace,
        count: embeddings.length 
      });
      throw error;
    }
  }

  /**
   * Search embeddings directly from vector database
    */
  async searchVectorDatabase(
    query: string, 
    namespace?: string,
    options: Partial<SearchOptions> = {}
  ): Promise<SimilarityResult[]> {
    try {
      logger.info('[EMBEDDING-SERVICE] Searching vector database', { query, namespace });

      const queryEmbedding = await this.generateSingleEmbedding(query);
      
      const searchOptions: Partial<SearchOptions> = {
        topK: 10,
        threshold: 0.3,
        includeMetadata: true,
        ...options
      };

      if (!queryEmbedding.vector) {
        throw new Error('Failed to generate query embedding vector');
      }
      
      const results = await vectorDatabase.search(queryEmbedding.vector, searchOptions);

      // Filter by namespace if specified
      const filteredResults = namespace 
        ? results.filter((result: any) => result.id.startsWith(`${namespace}_`))
        : results;

      // Convert to SimilarityResult format
      return filteredResults.map((result: any) => ({
        embedding: {
          id: result.id.replace(`${namespace}_`, ''),
          content: result.content,
          embedding: [], // Vector not needed in response
          vector: [], // Vector not needed in response
          metadata: result.metadata,
          tokens: result.content.split(' ').length,
          createdAt: result.metadata.createdAt,
          updatedAt: result.metadata.updatedAt || new Date()
        },
        similarity: result.similarity,
        relevanceScore: EmbeddingHelpers.calculateRelevanceScore(result.similarity, result.metadata),
        rank: result.rank
      }));

    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Vector database search failed', { error, query });
      throw error;
    }
  }

  /**
   * Extract keywords from content for enhanced search
    */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'have', 'been'].includes(word));
    
    // Return top 5 most relevant words
    const wordFreq = words.reduce((freq: { [key: string]: number }, word) => {
      freq[word] = (freq[word] || 0) + 1;
      return freq;
    }, {});

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Optimize for HuggingFace deployment
    */
  optimizeForHuggingFace(): HuggingFaceExport {
    return {
      embeddings: [],
      model: this.config.model,
      version: '2.0.0',
      exportFormat: 'json',
      optimizedForOffline: true
    };
  }

  /**
   * Process CV data into embeddings
    */
  async processCV(cvData: ParsedCV): Promise<CVEmbeddingResult> {
    const startTime = Date.now();
    const sectionsProcessed: string[] = [];
    const allChunks: ChunkResult[] = [];

    // Process CV sections
    if (cvData.experience) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.experience, CVSection.EXPERIENCE, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('experience');
    }

    if (cvData.education) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.education, CVSection.EDUCATION, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('education');
    }

    if (cvData.skills) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.skills, CVSection.SKILLS, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('skills');
    }

    if (cvData.achievements) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.achievements, CVSection.ACHIEVEMENTS, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('achievements');
    }

    // Generate embeddings
    const texts = allChunks
      .filter(chunk => chunk.content)
      .map(chunk => chunk.content!);
    const embeddings = await this.generateEmbeddings(texts);
    
    // Enhance with chunk metadata
    const enhancedEmbeddings = embeddings.map((embedding, index) => ({
      ...embedding,
      metadata: { ...embedding.metadata, ...allChunks[index].metadata }
    }));

    return {
      embeddings: enhancedEmbeddings,
      totalChunks: allChunks.length,
      totalTokens: allChunks.reduce((sum, chunk) => sum + (chunk.tokenCount || 0), 0),
      processingTime: Date.now() - startTime,
      sectionsProcessed
    };
  }

  /**
   * Create CV chunks (wrapper for processCV)
    */
  async createCVChunks(parsedCV: ParsedCV, jobId: string): Promise<any[]> {
    try {
      const result = await this.processCV(parsedCV);
      // Convert RAGEmbedding[] to CVChunk[] format for compatibility
      return result.embeddings.map(embedding => ({
        id: embedding.id,
        content: embedding.content,
        metadata: {
          section: embedding.metadata.section,
          subsection: embedding.metadata.subsection,
          importance: embedding.metadata.importance,
          dateRange: embedding.metadata.dateRange,
          tags: embedding.metadata.tags || [],
          source: embedding.metadata.source || 'unknown'
        },
        embedding: embedding.vector,
        tokens: embedding.tokens
      }));
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] createCVChunks failed', { error, jobId });
      throw error;
    }
  }

  /**
   * Store embeddings in vector database
    */
  async storeEmbeddings(chunks: any[], vectorNamespace: string, jobId: string): Promise<void> {
    try {
      logger.info('[EMBEDDING-SERVICE] Storing embeddings in vector database', {
        count: chunks.length,
        vectorNamespace,
        jobId
      });

      // Convert chunks to RAGEmbeddings if they aren't already
      const embeddings: RAGEmbedding[] = chunks.map((chunk, index) => {
        if (chunk.embedding && chunk.content) {
          // Already in RAGEmbedding format
          return {
            id: chunk.id || `${jobId}_chunk_${index}`,
            content: chunk.content,
            embedding: chunk.embedding,
            vector: chunk.embedding,
            metadata: chunk.metadata || {
              section: 'experience' as CVSection,
              subsection: 'auto-generated',
              contentType: 'text' as ContentType,
              importance: 0.5,
              position: index
            },
            tokens: chunk.content.split(' ').length,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        } else {
          // Convert from chunk format
          return {
            id: `${jobId}_chunk_${index}`,
            content: chunk.content || chunk.text || '',
            embedding: chunk.vector || chunk.embedding || [],
            vector: chunk.vector || chunk.embedding || [],
            metadata: {
              section: chunk.section || 'experience' as CVSection,
              subsection: chunk.subsection || 'auto-generated',
              contentType: 'text' as ContentType,
              importance: chunk.importance || 0.5,
              position: index
            },
            tokens: (chunk.content || chunk.text || '').split(' ').length,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      });

      // Store in vector database
      await this.storeInVectorDatabase(embeddings, vectorNamespace);

      logger.info('[EMBEDDING-SERVICE] Embeddings stored successfully', {
        count: embeddings.length,
        vectorNamespace,
        jobId
      });
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] storeEmbeddings failed', { error, jobId });
      throw error;
    }
  }

  /**
   * Query similar chunks using vector database
    */
  async querySimilarChunks(query: string, vectorNamespace: string, topK = 5): Promise<any[]> {
    try {
      logger.info('[EMBEDDING-SERVICE] Querying similar chunks from vector database', {
        query,
        vectorNamespace,
        topK
      });

      const results = await this.searchVectorDatabase(query, vectorNamespace, {
        topK,
        threshold: 0.2,
        includeMetadata: true
      });

      // Convert to expected format for backward compatibility
      return results.map(result => ({
        content: result.embedding.content,
        metadata: result.embedding.metadata,
        similarity: result.similarity,
        relevanceScore: result.relevanceScore
      }));

    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] querySimilarChunks failed', { error });
      // Fallback to empty array for backward compatibility
      return [];
    }
  }

  /**
   * Delete embeddings from vector database
    */
  async deleteEmbeddings(vectorNamespace: string, jobId: string): Promise<void> {
    try {
      logger.info('[EMBEDDING-SERVICE] Deleting embeddings from vector database', {
        vectorNamespace,
        jobId
      });

      // Search for vectors that match the namespace and jobId
      const searchResults = await vectorDatabase.search([], {
        topK: 10000, // Large number to get all matching vectors
        threshold: 0
        // Note: This is a simplified approach. In production, you'd want
        // more sophisticated namespace/jobId tracking
      });

      // Filter results by namespace prefix
      const namespacePrefix = `${vectorNamespace}_${jobId}`;
      const vectorsToDelete = searchResults
        .filter((result: any) => result.id.startsWith(namespacePrefix))
        .map((result: any) => result.id);

      // Delete vectors in batches to avoid overwhelming the system
      const batchSize = 100;
      for (let i = 0; i < vectorsToDelete.length; i += batchSize) {
        const batch = vectorsToDelete.slice(i, i + batchSize);
        await Promise.all(batch.map((id: any) => vectorDatabase.deleteVector(id)));
      }

      logger.info('[EMBEDDING-SERVICE] Embeddings deleted successfully', {
        vectorNamespace,
        jobId,
        deletedCount: vectorsToDelete.length
      });

    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] deleteEmbeddings failed', { error, jobId });
      // Don't throw error to maintain backward compatibility
      logger.warn('[EMBEDDING-SERVICE] Continuing despite deletion error for backward compatibility');
    }
  }

  // Private helper methods
  private async processBatch(texts: string[], startIndex: number): Promise<RAGEmbedding[]> {
    const response = await this.getOpenAI().embeddings.create({
      model: this.config.model,
      input: texts
    });

    return response.data.map((embedding, index) => ({
      id: `embed-${Date.now()}-${startIndex + index}`,
      content: texts[index],
      embedding: embedding.embedding,
      vector: embedding.embedding,
      metadata: { 
        sourceDocument: 'batch-process',
        documentType: ContentType.CV_SECTION,
        section: CVSection.PROFESSIONAL_SUMMARY, 
        chunkIndex: startIndex + index,
        wordCount: texts[index].length,
        confidence: 1.0,
        importance: 1.0, 
        tags: [], 
        source: 'summary' 
      },
      tokens: EmbeddingHelpers.estimateTokenCount(texts[index]),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();