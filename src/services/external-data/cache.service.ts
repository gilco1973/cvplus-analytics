/**
 * Cache Service
 * 
 * Implements multi-level caching with Firestore and memory cache
 * for external data integration
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CacheEntry, CacheConfig } from './types';

export class CacheService {
  private readonly db = getFirestore();
  private readonly collectionName = 'external_data_cache';
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly maxMemoryCacheSize = 100; // Max items in memory
  private readonly defaultTTL = 3600; // 1 hour in seconds
  
  private readonly config: CacheConfig = {
    ttl: 3600,
    maxSize: 10, // 10MB
    strategy: 'lru'
  };
  
  constructor() {
    logger.info('[CACHE-SERVICE] Cache service initialized');
    
    // Cleanup expired entries periodically
    this.scheduleCleanup();
  }

  /**
   * Get cached data
   */
  async get(key: string): Promise<any | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        logger.info('[CACHE-SERVICE] Memory cache hit', { key });
        memoryEntry.hits++;
        return memoryEntry.data;
      }
      
      // Check Firestore cache
      const doc = await this.db
        .collection(this.collectionName)
        .doc(this.sanitizeKey(key))
        .get();
      
      if (!doc.exists) {
        logger.info('[CACHE-SERVICE] Cache miss', { key });
        return null;
      }
      
      const entry = doc.data() as CacheEntry;
      
      if (this.isExpired(entry)) {
        logger.info('[CACHE-SERVICE] Cache expired', { key });
        await this.delete(key);
        return null;
      }
      
      logger.info('[CACHE-SERVICE] Firestore cache hit', { key });
      
      // Update hit count
      await doc.ref.update({
        hits: (entry.hits || 0) + 1
      });
      
      // Store in memory cache for faster access
      this.setMemoryCache(key, entry);
      
      return entry.data;
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Cache get error', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds || this.defaultTTL;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);
      
      const entry: CacheEntry = {
        key,
        data,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        source: 'external_data',
        hits: 0
      };
      
      // Check size constraints
      const dataSize = this.getObjectSize(data);
      if (dataSize > this.config.maxSize * 1024 * 1024) {
        logger.warn('[CACHE-SERVICE] Data too large to cache', { 
          key, 
          sizeMB: dataSize / (1024 * 1024) 
        });
        return;
      }
      
      // Store in Firestore
      await this.db
        .collection(this.collectionName)
        .doc(this.sanitizeKey(key))
        .set({
          ...entry,
          createdAt: Timestamp.fromDate(now),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
      
      // Store in memory cache
      this.setMemoryCache(key, entry);
      
      logger.info('[CACHE-SERVICE] Data cached', { key, ttl });
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Cache set error', error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from Firestore
      await this.db
        .collection(this.collectionName)
        .doc(this.sanitizeKey(key))
        .delete();
      
      logger.info('[CACHE-SERVICE] Cache entry deleted', { key });
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Cache delete error', error);
    }
  }

  /**
   * Clear all cached data for a user
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('key', '>=', `external_data:${userId}:`)
        .where('key', '<', `external_data:${userId}:\uf8ff`)
        .get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        this.memoryCache.delete(doc.data().key);
      });
      
      await batch.commit();
      
      logger.info('[CACHE-SERVICE] User cache cleared', { 
        userId, 
        entriesDeleted: snapshot.size 
      });
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Clear user cache error', error);
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      // Clear memory cache entries matching pattern
      this.memoryCache.forEach((value, key) => {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      });
      
      // Clear Firestore entries
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('key', '>=', pattern)
        .where('key', '<', pattern + '\uf8ff')
        .get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      logger.info('[CACHE-SERVICE] Cache invalidated', { 
        pattern, 
        entriesDeleted: snapshot.size 
      });
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Cache invalidate error', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    firestoreEntries: number;
    totalSize: number;
    hitRate: number;
  }> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .select('hits')
        .get();
      
      let totalHits = 0;
      let totalRequests = 0;
      
      snapshot.docs.forEach(doc => {
        const hits = doc.data().hits || 0;
        totalHits += hits;
        totalRequests += hits + 1; // +1 for the initial miss
      });
      
      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      
      return {
        memoryEntries: this.memoryCache.size,
        firestoreEntries: snapshot.size,
        totalSize: this.getMemoryCacheSize(),
        hitRate
      };
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Get stats error', error);
      return {
        memoryEntries: 0,
        firestoreEntries: 0,
        totalSize: 0,
        hitRate: 0
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Set memory cache with LRU eviction
   */
  private setMemoryCache(key: string, entry: CacheEntry): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, entry);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const expiresAt = new Date(entry.expiresAt);
    return expiresAt < new Date();
  }

  /**
   * Sanitize key for Firestore document ID
   */
  private sanitizeKey(key: string): string {
    // Replace invalid characters for Firestore document IDs
    return key.replace(/[\/\s]/g, '_').substring(0, 500);
  }

  /**
   * Get approximate object size in bytes
   */
  private getObjectSize(obj: any): number {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  /**
   * Get total memory cache size
   */
  private getMemoryCacheSize(): number {
    let totalSize = 0;
    Array.from(this.memoryCache.values()).forEach(entry => {
      totalSize += this.getObjectSize(entry.data);
    });
    return totalSize;
  }

  /**
   * Schedule periodic cleanup of expired entries
   */
  private scheduleCleanup(): void {
    // Run cleanup every hour
    setInterval(async () => {
      await this.cleanupExpired();
    }, 3600000); // 1 hour
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpired(): Promise<void> {
    try {
      const now = Timestamp.now();
      
      // Clean memory cache
      this.memoryCache.forEach((entry, key) => {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
        }
      });
      
      // Clean Firestore cache
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('expiresAt', '<', now)
        .get();
      
      if (snapshot.empty) return;
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      logger.info('[CACHE-SERVICE] Cleanup completed', { 
        entriesDeleted: snapshot.size 
      });
      
    } catch (error) {
      logger.error('[CACHE-SERVICE] Cleanup error', error);
    }
  }
}