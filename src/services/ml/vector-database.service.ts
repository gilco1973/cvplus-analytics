/**
 * Vector Database Service
 * Handles vector embeddings and similarity search functionality
  */

export interface VectorInput {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  includeMetadata?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export class VectorDatabaseService {
  private vectors: Map<string, VectorInput> = new Map();

  async upsert(vectors: VectorInput[]): Promise<void> {
    vectors.forEach(vector => {
      this.vectors.set(vector.id, vector);
    });
  }

  async search(queryVector: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const { topK = 10, threshold = 0.0, includeMetadata = false } = options;
    
    const results: SearchResult[] = [];

    for (const [id, vector] of this.vectors.entries()) {
      const similarity = this.cosineSimilarity(queryVector, vector.vector);
      
      if (similarity >= threshold) {
        results.push({
          id,
          score: similarity,
          ...(includeMetadata && vector.metadata ? { metadata: vector.metadata } : {})
        });
      }
    }

    // Sort by similarity score (descending) and take top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    ids.forEach(id => this.vectors.delete(id));
  }

  async getById(id: string): Promise<VectorInput | null> {
    return this.vectors.get(id) || null;
  }
  
  async addVectors(vectors: VectorInput[]): Promise<string[]> {
    await this.upsert(vectors);
    return vectors.map(v => v.id);
  }
  
  async deleteVector(id: string): Promise<void> {
    return this.delete([id]);
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Export singleton instance
export const vectorDatabase = new VectorDatabaseService();