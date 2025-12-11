/**
 * Search Result Ranking Engine
 *
 * Optimizes search result ranking with:
 * - BM25 algorithm
 * - Personalization
 * - Freshness scoring
 * - Popularity/engagement metrics
 * - Click-through analysis
 */

export interface RankingFactors {
  relevance: number; // 0-1
  freshness: number; // 0-1
  popularity: number; // 0-1
  personalizedScore: number; // 0-1
  qualityScore: number; // 0-1
}

export interface RankedResult {
  documentId: string;
  finalScore: number;
  factors: RankingFactors;
  explainability: string[];
}

/**
 * Search Result Ranking Engine
 */
export class RankingEngine {
  private documentMetrics: Map<
    string,
    {
      views: number;
      clicks: number;
      shares: number;
      comments: number;
      createdAt: number;
      updatedAt: number;
    }
  > = new Map();

  private userPreferences: Map<
    string,
    {
      likedDomains: string[];
      viewedDocuments: string[];
      searchHistory: string[];
    }
  > = new Map();

  private weights: Record<string, number> = {
    relevance: 0.4,
    freshness: 0.15,
    popularity: 0.25,
    personalized: 0.1,
    quality: 0.1,
  };

  /**
   * Update document metrics
   */
  updateDocumentMetrics(
    documentId: string,
    metrics: {
      views?: number;
      clicks?: number;
      shares?: number;
      comments?: number;
      createdAt?: number;
      updatedAt?: number;
    }
  ): void {
    if (!this.documentMetrics.has(documentId)) {
      this.documentMetrics.set(documentId, {
        views: 0,
        clicks: 0,
        shares: 0,
        comments: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const existing = this.documentMetrics.get(documentId)!;

    this.documentMetrics.set(documentId, {
      views: metrics.views ?? existing.views,
      clicks: metrics.clicks ?? existing.clicks,
      shares: metrics.shares ?? existing.shares,
      comments: metrics.comments ?? existing.comments,
      createdAt: metrics.createdAt ?? existing.createdAt,
      updatedAt: metrics.updatedAt ?? existing.updatedAt,
    });
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(
    userId: string,
    preferences: {
      likedDomains?: string[];
      viewedDocument?: string;
      searchQuery?: string;
    }
  ): void {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        likedDomains: [],
        viewedDocuments: [],
        searchHistory: [],
      });
    }

    const existing = this.userPreferences.get(userId)!;

    if (preferences.likedDomains) {
      existing.likedDomains = preferences.likedDomains;
    }

    if (preferences.viewedDocument) {
      existing.viewedDocuments.push(preferences.viewedDocument);
    }

    if (preferences.searchQuery) {
      existing.searchHistory.push(preferences.searchQuery);
    }
  }

  /**
   * Rank results with BM25
   */
  rankResults(
    results: Array<{ documentId: string; relevanceScore: number }>,
    options: {
      userId?: string;
      query?: string;
      totalDocuments?: number;
    } = {}
  ): RankedResult[] {
    const ranked: RankedResult[] = [];

    for (const result of results) {
      const factors = this.calculateRankingFactors(
        result.documentId,
        result.relevanceScore,
        options.userId,
        options.query
      );

      const finalScore = this.calculateFinalScore(factors);

      ranked.push({
        documentId: result.documentId,
        finalScore,
        factors,
        explainability: this.generateExplanation(result.documentId, factors),
      });
    }

    // Sort by final score
    ranked.sort((a, b) => b.finalScore - a.finalScore);

    return ranked;
  }

  /**
   * Calculate individual ranking factors
   */
  private calculateRankingFactors(
    documentId: string,
    relevanceScore: number,
    userId?: string,
    query?: string
  ): RankingFactors {
    // Relevance factor (already calculated)
    const relevance = Math.min(1, relevanceScore / 100);

    // Freshness factor
    const freshness = this.calculateFreshness(documentId);

    // Popularity factor
    const popularity = this.calculatePopularity(documentId);

    // Personalized factor
    const personalizedScore = this.calculatePersonalizedScore(documentId, userId);

    // Quality factor
    const qualityScore = this.calculateQualityScore(documentId);

    return {
      relevance,
      freshness,
      popularity,
      personalizedScore,
      qualityScore,
    };
  }

  /**
   * Calculate freshness score based on update time
   */
  private calculateFreshness(documentId: string): number {
    const metrics = this.documentMetrics.get(documentId);
    if (!metrics) return 0.5;

    const now = Date.now();
    const daysSinceUpdate = (now - metrics.updatedAt) / (1000 * 60 * 60 * 24);

    // Decay function: older documents score lower
    if (daysSinceUpdate > 365) return 0.1;
    if (daysSinceUpdate > 180) return 0.3;
    if (daysSinceUpdate > 30) return 0.6;
    if (daysSinceUpdate > 7) return 0.8;
    return 1.0;
  }

  /**
   * Calculate popularity score
   */
  private calculatePopularity(documentId: string): number {
    const metrics = this.documentMetrics.get(documentId);
    if (!metrics) return 0.5;

    // Weighted combination of engagement metrics
    const viewScore = Math.min(1, metrics.views / 1000);
    const clickScore = Math.min(1, metrics.clicks / 100);
    const shareScore = Math.min(1, metrics.shares / 50);
    const commentScore = Math.min(1, metrics.comments / 20);

    return (viewScore * 0.4 + clickScore * 0.3 + shareScore * 0.2 + commentScore * 0.1) / 1.0;
  }

  /**
   * Calculate personalized score
   */
  private calculatePersonalizedScore(documentId: string, userId?: string): number {
    if (!userId) return 0.5;

    const preferences = this.userPreferences.get(userId);
    if (!preferences) return 0.5;

    let score = 0.5;

    // Boost score if user has viewed similar documents
    if (preferences.viewedDocuments.includes(documentId)) {
      score += 0.3; // Avoid re-ranking documents already seen
    }

    return Math.min(1, score);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(documentId: string): number {
    const metrics = this.documentMetrics.get(documentId);
    if (!metrics) return 0.5;

    // Quality metrics
    const engagementRatio =
      metrics.clicks > 0 ? metrics.shares / metrics.clicks : 0;
    const commentRatio =
      metrics.views > 0 ? metrics.comments / metrics.views : 0;

    // Higher engagement and comment ratios indicate quality
    const score =
      Math.min(1, engagementRatio * 2) * 0.5 +
      Math.min(1, commentRatio * 5) * 0.5;

    return score;
  }

  /**
   * Calculate final score
   */
  private calculateFinalScore(factors: RankingFactors): number {
    let score = 0;

    score +=
      factors.relevance * this.weights.relevance;
    score +=
      factors.freshness * this.weights.freshness;
    score +=
      factors.popularity * this.weights.popularity;
    score +=
      factors.personalizedScore * this.weights.personalized;
    score +=
      factors.qualityScore * this.weights.quality;

    return score;
  }

  /**
   * Generate explainability text
   */
  private generateExplanation(
    documentId: string,
    factors: RankingFactors
  ): string[] {
    const explanations: string[] = [];

    // Relevance
    if (factors.relevance > 0.8) {
      explanations.push("Highly relevant to your search");
    } else if (factors.relevance > 0.5) {
      explanations.push("Moderately relevant to your search");
    }

    // Freshness
    if (factors.freshness > 0.8) {
      explanations.push("Recently updated");
    } else if (factors.freshness < 0.3) {
      explanations.push("Not recently updated");
    }

    // Popularity
    if (factors.popularity > 0.8) {
      explanations.push("Very popular among users");
    } else if (factors.popularity > 0.5) {
      explanations.push("Popular among users");
    }

    // Quality
    if (factors.qualityScore > 0.8) {
      explanations.push("High quality content");
    }

    if (explanations.length === 0) {
      explanations.push("Matches your search criteria");
    }

    return explanations;
  }

  /**
   * Set custom weights
   */
  setWeights(weights: Partial<Record<string, number>>): void {
    this.weights = {
      ...this.weights,
      ...weights,
    };

    // Normalize weights to sum to 1
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    for (const key in this.weights) {
      this.weights[key] /= sum;
    }
  }

  /**
   * BM25 scoring algorithm
   */
  bm25Score(
    termFrequency: number,
    documentLength: number,
    averageDocumentLength: number,
    inverseDocumentFrequency: number,
    k1: number = 1.5,
    b: number = 0.75
  ): number {
    const idf = Math.log((1 + inverseDocumentFrequency) / (0.5 + inverseDocumentFrequency));

    const numerator =
      termFrequency * (k1 + 1);

    const denominator =
      termFrequency +
      k1 *
        (1 -
          b +
          b * (documentLength / averageDocumentLength));

    return idf * (numerator / denominator);
  }

  /**
   * Get ranking statistics
   */
  getStats() {
    return {
      totalDocuments: this.documentMetrics.size,
      totalUsers: this.userPreferences.size,
      averageViews:
        Array.from(this.documentMetrics.values()).reduce(
          (sum, m) => sum + m.views,
          0
        ) / Math.max(1, this.documentMetrics.size),
      currentWeights: this.weights,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.documentMetrics.clear();
    this.userPreferences.clear();
  }
}

/**
 * Singleton instance
 */
let rankingEngine: RankingEngine | null = null;

export function getRankingEngine(): RankingEngine {
  if (!rankingEngine) {
    rankingEngine = new RankingEngine();
  }
  return rankingEngine;
}

export function resetRankingEngine(): void {
  rankingEngine = null;
}
