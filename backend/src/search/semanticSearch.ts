/**
 * Semantic Search Engine
 *
 * Implements semantic search using embeddings:
 * - Text embedding generation
 * - Similarity calculation (cosine, euclidean)
 * - Vector indexing for fast retrieval
 * - Semantic concept matching
 */

export interface Embedding {
  documentId: string;
  vector: number[];
  field: string;
  metadata: Record<string, any>;
}

export interface SemanticSearchResult {
  documentId: string;
  similarity: number;
  relatedConcepts: string[];
  semanticScore: number;
}

/**
 * Semantic Search Engine
 */
export class SemanticSearchEngine {
  private embeddings: Map<string, Embedding[]> = new Map(); // documentId -> embeddings
  private documentTexts: Map<string, string> = new Map(); // documentId -> original text
  private conceptVectors: Map<string, number[]> = new Map(); // concept -> vector
  private embeddingDimension: number = 384; // Default dimension

  /**
   * Generate simple embedding (word frequency based)
   * Note: In production, use proper embedding models like BERT, GPT embeddings
   */
  private generateEmbedding(text: string): number[] {
    // Simplified embedding: word frequency vector
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const vector = new Array(this.embeddingDimension).fill(0);

    // Create a hash-based distribution of word frequencies
    for (const word of words) {
      const hash = this.hashWord(word);
      const index = Math.abs(hash) % this.embeddingDimension;
      vector[index] += 1 / words.length;
    }

    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      return vector.map((v) => v / norm);
    }

    return vector;
  }

  /**
   * Hash word to consistent value
   */
  private hashWord(word: string): number {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Index document with semantic embeddings
   */
  indexDocument(
    documentId: string,
    content: string,
    fields: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): void {
    this.documentTexts.set(documentId, content);

    const docEmbeddings: Embedding[] = [];

    // Create embedding for main content
    const mainEmbedding: Embedding = {
      documentId,
      vector: this.generateEmbedding(content),
      field: "content",
      metadata,
    };
    docEmbeddings.push(mainEmbedding);

    // Create embeddings for additional fields
    for (const [field, text] of Object.entries(fields)) {
      const embedding: Embedding = {
        documentId,
        vector: this.generateEmbedding(text),
        field,
        metadata: { ...metadata, sourceField: field },
      };
      docEmbeddings.push(embedding);
    }

    this.embeddings.set(documentId, docEmbeddings);

    // Extract and store key concepts
    this.extractConcepts(documentId, content);
  }

  /**
   * Extract key concepts from text
   */
  private extractConcepts(documentId: string, text: string): void {
    // Simple concept extraction: noun phrases (simplified)
    const phrases = text
      .split(/[.,!?;]\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    for (const phrase of phrases) {
      const words = phrase.split(/\s+/);

      // Extract bigrams and trigrams
      for (let i = 0; i < words.length - 1; i++) {
        const concept = words.slice(i, Math.min(i + 3, words.length)).join(" ");

        if (!this.conceptVectors.has(concept)) {
          this.conceptVectors.set(
            concept,
            this.generateEmbedding(concept)
          );
        }
      }
    }
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Calculate euclidean distance
   */
  private euclideanDistance(vec1: number[], vec2: number[]): number {
    let sum = 0;

    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Semantic search
   */
  search(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      similarityMetric?: "cosine" | "euclidean";
      fields?: string[];
    } = {}
  ): SemanticSearchResult[] {
    const limit = options.limit || 20;
    const threshold = options.threshold || 0.3;
    const metric = options.similarityMetric || "cosine";
    const fields = options.fields;

    // Generate query embedding
    const queryEmbedding = this.generateEmbedding(query);

    // Calculate similarities
    const results: SemanticSearchResult[] = [];

    for (const [documentId, docEmbeddings] of this.embeddings) {
      let maxSimilarity = 0;
      const fieldSimilarities: Record<string, number> = {};

      for (const embedding of docEmbeddings) {
        // Skip if field filtering is specified
        if (fields && !fields.includes(embedding.field)) {
          continue;
        }

        const similarity =
          metric === "cosine"
            ? this.cosineSimilarity(queryEmbedding, embedding.vector)
            : 1 / (1 + this.euclideanDistance(queryEmbedding, embedding.vector));

        fieldSimilarities[embedding.field] = similarity;
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      if (maxSimilarity >= threshold) {
        // Find related concepts
        const relatedConcepts = this.findRelatedConcepts(
          queryEmbedding,
          documentId
        );

        results.push({
          documentId,
          similarity: maxSimilarity,
          relatedConcepts,
          semanticScore: maxSimilarity,
        });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * Find related concepts for a document
   */
  private findRelatedConcepts(
    queryVector: number[],
    documentId: string
  ): string[] {
    const docText = this.documentTexts.get(documentId) || "";
    const phrases = docText
      .split(/[.,!?;]\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const conceptScores: Array<[string, number]> = [];

    for (const phrase of phrases) {
      if (this.conceptVectors.has(phrase)) {
        const vector = this.conceptVectors.get(phrase)!;
        const similarity = this.cosineSimilarity(queryVector, vector);

        if (similarity > 0.5) {
          conceptScores.push([phrase, similarity]);
        }
      }
    }

    return conceptScores
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((c) => c[0]);
  }

  /**
   * Find similar documents
   */
  findSimilar(
    documentId: string,
    limit: number = 10
  ): SemanticSearchResult[] {
    const embeddings = this.embeddings.get(documentId);
    if (!embeddings || embeddings.length === 0) {
      return [];
    }

    const queryEmbedding = embeddings[0].vector; // Use main content embedding
    const results: SemanticSearchResult[] = [];

    for (const [otherId, otherEmbeddings] of this.embeddings) {
      if (otherId === documentId) continue;

      if (otherEmbeddings.length > 0) {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          otherEmbeddings[0].vector
        );

        results.push({
          documentId: otherId,
          similarity,
          relatedConcepts: this.findRelatedConcepts(
            queryEmbedding,
            otherId
          ),
          semanticScore: similarity,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Semantic clustering
   */
  cluster(options: { numClusters?: number } = {}): Map<number, string[]> {
    const numClusters = options.numClusters || 5;
    const clusters = new Map<number, string[]>();

    // Initialize clusters
    for (let i = 0; i < numClusters; i++) {
      clusters.set(i, []);
    }

    // Simple k-means like clustering
    const embeddings = Array.from(this.embeddings.entries());

    for (const [documentId, docEmbeddings] of embeddings) {
      if (docEmbeddings.length === 0) continue;

      const vector = docEmbeddings[0].vector;
      let bestCluster = 0;
      let bestSimilarity = -Infinity;

      // Find closest cluster centroid (simplified)
      for (let i = 0; i < numClusters; i++) {
        // Use cluster ID as pseudo-centroid
        const clusterVector = new Array(vector.length).fill(i / numClusters);
        const similarity = this.cosineSimilarity(vector, clusterVector);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = i;
        }
      }

      clusters.get(bestCluster)!.push(documentId);
    }

    return clusters;
  }

  /**
   * Remove document
   */
  removeDocument(documentId: string): void {
    this.embeddings.delete(documentId);
    this.documentTexts.delete(documentId);
  }

  /**
   * Get embedding statistics
   */
  getStats() {
    return {
      totalDocuments: this.embeddings.size,
      totalEmbeddings: Array.from(this.embeddings.values()).reduce(
        (sum, embs) => sum + embs.length,
        0
      ),
      embeddingDimension: this.embeddingDimension,
      totalConcepts: this.conceptVectors.size,
      averageConceptsPerDocument:
        this.conceptVectors.size / Math.max(1, this.embeddings.size),
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.embeddings.clear();
    this.documentTexts.clear();
    this.conceptVectors.clear();
  }
}

/**
 * Singleton instance
 */
let semanticEngine: SemanticSearchEngine | null = null;

export function getSemanticSearchEngine(): SemanticSearchEngine {
  if (!semanticEngine) {
    semanticEngine = new SemanticSearchEngine();
  }
  return semanticEngine;
}

export function resetSemanticSearchEngine(): void {
  semanticEngine = null;
}
