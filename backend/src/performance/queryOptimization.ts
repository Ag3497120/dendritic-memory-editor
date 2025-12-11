/**
 * Query Optimization & N+1 Problem Resolution
 *
 * Optimizes database queries:
 * - N+1 problem detection and prevention
 * - Query batching
 * - Lazy loading vs eager loading strategies
 * - Query plan analysis
 * - Automatic index recommendations
 */

import { v4 as uuidv4 } from "uuid";

export type FetchStrategy = "lazy" | "eager" | "batch";

export interface QueryPlan {
  id: string;
  query: string;
  estimatedCost: number;
  rowsToScan: number;
  indexes: string[];
  joins: string[];
  filters: string[];
  optimization: string;
  timestamp: number;
}

export interface NPlusOnePattern {
  id: string;
  mainQuery: string;
  relatedQueries: string[];
  occurrences: number;
  totalExecutions: number;
  estimatedWaste: number; // milliseconds saved if optimized
  severity: "low" | "medium" | "high" | "critical";
  suggestedOptimization: string;
}

export interface BatchQuery {
  id: string;
  queries: string[];
  batchSize: number;
  expectedExecution: number;
  actualExecution?: number;
}

export interface JoinStrategy {
  left: string;
  right: string;
  on: string;
  type: "inner" | "left" | "right" | "full";
  estimatedRows: number;
}

export interface QueryCache {
  query: string;
  result: any[];
  executionTime: number;
  timestamp: number;
  ttl: number;
}

/**
 * Query Optimization Engine
 */
export class QueryOptimizationEngine {
  private queryHistory: Map<string, QueryPlan[]> = new Map();
  private nplusonPatterns: Map<string, NPlusOnePattern> = new Map();
  private batchQueries: Map<string, BatchQuery> = new Map();
  private queryCache: Map<string, QueryCache> = new Map();
  private relationshipCache: Map<string, any[]> = new Map();
  private detectedIssues: string[] = [];
  private optimizationStats = {
    queriesOptimized: 0,
    timesSaved: 0,
    batched: 0,
  };

  /**
   * Analyze query for N+1 patterns
   */
  analyzeQuery(query: string, executionTime: number): QueryPlan {
    const planId = `plan-${uuidv4()}`;

    // Extract query components
    const indexes = this.extractIndexUsage(query);
    const joins = this.extractJoins(query);
    const filters = this.extractFilters(query);

    // Estimate cost
    const estimatedCost = this.estimateQueryCost(query);
    const rowsToScan = this.estimateRowsToScan(query);

    const plan: QueryPlan = {
      id: planId,
      query,
      estimatedCost,
      rowsToScan,
      indexes,
      joins,
      filters,
      optimization: this.suggestOptimization(query),
      timestamp: Date.now(),
    };

    // Store in history
    const key = this.normalizeQuery(query);
    if (!this.queryHistory.has(key)) {
      this.queryHistory.set(key, []);
    }
    this.queryHistory.get(key)!.push(plan);

    // Detect patterns
    this.detectNPlusOne(query);

    return plan;
  }

  /**
   * Detect N+1 query patterns
   */
  private detectNPlusOne(query: string): void {
    const normalized = this.normalizeQuery(query);
    const history = this.queryHistory.get(normalized) || [];

    // Check if same query executed many times recently
    if (history.length > 5) {
      const recent = history.slice(-10);
      const recentTime = recent.reduce((sum, p) => sum + p.estimatedCost, 0);

      const pattern: NPlusOnePattern = {
        id: `nplus1-${uuidv4()}`,
        mainQuery: query,
        relatedQueries: [query],
        occurrences: recent.length,
        totalExecutions: history.length,
        estimatedWaste: recentTime * (history.length - 1),
        severity: this.calculateSeverity(history.length, recentTime),
        suggestedOptimization: this.suggestNPlusOneOptimization(query),
      };

      this.nplusonPatterns.set(normalized, pattern);
      this.detectedIssues.push(
        `N+1 Pattern: ${normalized} executed ${history.length} times`
      );
    }
  }

  /**
   * Calculate severity of N+1 pattern
   */
  private calculateSeverity(
    occurrences: number,
    estimatedCost: number
  ): "low" | "medium" | "high" | "critical" {
    if (occurrences > 100 && estimatedCost > 5000) return "critical";
    if (occurrences > 50 && estimatedCost > 2000) return "high";
    if (occurrences > 20 && estimatedCost > 500) return "medium";
    return "low";
  }

  /**
   * Suggest optimization for N+1 patterns
   */
  private suggestNPlusOneOptimization(query: string): string {
    if (query.includes("SELECT")) {
      return "Use JOIN or batch loading with IN clause instead of separate queries";
    }
    if (query.includes("WHERE id")) {
      return "Batch multiple IDs: WHERE id IN (?, ?, ?) instead of multiple queries";
    }
    return "Consider eager loading or cached relationships";
  }

  /**
   * Create batch query to replace N+1
   */
  createBatchQuery(
    queries: string[],
    expectedExecutionMs: number = 0
  ): BatchQuery {
    const batchId = `batch-${uuidv4()}`;

    const batch: BatchQuery = {
      id: batchId,
      queries,
      batchSize: queries.length,
      expectedExecution: expectedExecutionMs,
    };

    this.batchQueries.set(batchId, batch);
    this.optimizationStats.batched++;

    return batch;
  }

  /**
   * Recommend join strategy
   */
  recommendJoinStrategy(
    leftTable: string,
    rightTable: string,
    joinCondition: string
  ): JoinStrategy {
    const estimatedRows = this.estimateJoinSize(leftTable, rightTable);

    const strategy: JoinStrategy = {
      left: leftTable,
      right: rightTable,
      on: joinCondition,
      type: this.determineJoinType(leftTable, rightTable, estimatedRows),
      estimatedRows,
    };

    return strategy;
  }

  /**
   * Determine optimal join type
   */
  private determineJoinType(
    left: string,
    right: string,
    rows: number
  ): "inner" | "left" | "right" | "full" {
    // Simple heuristic: if fewer rows expected, use inner join
    if (rows < 1000) return "inner";
    if (left.includes("user") && right.includes("profile"))
      return "left"; // Users may not have profiles
    return "inner";
  }

  /**
   * Estimate join result size
   */
  private estimateJoinSize(left: string, right: string): number {
    // Simplified estimation based on table names
    const estimates: Record<string, number> = {
      users: 10000,
      tiles: 100000,
      inferences: 50000,
      comments: 500000,
      audit_logs: 1000000,
    };

    const leftSize = estimates[left] || 10000;
    const rightSize = estimates[right] || 10000;

    // Assume join reduces to min(left, right) * 0.8
    return Math.min(leftSize, rightSize) * 0.8;
  }

  /**
   * Extract index usage from query
   */
  private extractIndexUsage(query: string): string[] {
    const indexes: string[] = [];

    // Simple pattern matching for common indexes
    if (query.includes("WHERE id")) indexes.push("idx_id");
    if (query.includes("WHERE user_id")) indexes.push("idx_user_id");
    if (query.includes("WHERE created_at")) indexes.push("idx_created_at");
    if (query.includes("WHERE domain")) indexes.push("idx_domain");
    if (query.includes("FULLTEXT")) indexes.push("idx_fulltext");

    return indexes;
  }

  /**
   * Extract joins from query
   */
  private extractJoins(query: string): string[] {
    const joins: string[] = [];
    const joinRegex = /(?:INNER|LEFT|RIGHT|FULL)?\s*JOIN\s+(\w+)/gi;
    let match;

    while ((match = joinRegex.exec(query)) !== null) {
      joins.push(match[1]);
    }

    return joins;
  }

  /**
   * Extract filter conditions
   */
  private extractFilters(query: string): string[] {
    const filters: string[] = [];
    const whereRegex = /WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i;
    const match = query.match(whereRegex);

    if (match) {
      const conditions = match[1].split(/\s+AND\s+/i);
      filters.push(...conditions);
    }

    return filters;
  }

  /**
   * Estimate query cost
   */
  private estimateQueryCost(query: string): number {
    let cost = 10; // Base cost

    // Add costs based on operations
    if (query.includes("JOIN")) cost += 50;
    if (query.includes("GROUP BY")) cost += 30;
    if (query.includes("ORDER BY")) cost += 20;
    if (query.includes("DISTINCT")) cost += 25;
    if (query.includes("HAVING")) cost += 20;
    if (query.includes("UNION")) cost += 40;

    // Scan type cost
    if (!this.extractIndexUsage(query).length) cost += 100; // Full table scan

    return cost;
  }

  /**
   * Estimate rows to scan
   */
  private estimateRowsToScan(query: string): number {
    const tables = this.extractTables(query);
    const indexUsed = this.extractIndexUsage(query).length > 0;

    const estimates: Record<string, number> = {
      users: 10000,
      tiles: 100000,
      inferences: 50000,
      comments: 500000,
      audit_logs: 1000000,
    };

    let totalRows = 0;
    for (const table of tables) {
      totalRows += estimates[table] || 10000;
    }

    // Reduce if index is used
    return indexUsed ? totalRows * 0.01 : totalRows;
  }

  /**
   * Extract tables from query
   */
  private extractTables(query: string): string[] {
    const tables: string[] = [];
    const fromRegex = /FROM\s+(\w+)/gi;
    const joinRegex = /JOIN\s+(\w+)/gi;
    let match;

    while ((match = fromRegex.exec(query)) !== null) {
      tables.push(match[1]);
    }

    while ((match = joinRegex.exec(query)) !== null) {
      tables.push(match[1]);
    }

    return [...new Set(tables)]; // Deduplicate
  }

  /**
   * Suggest optimization
   */
  private suggestOptimization(query: string): string {
    const indexes = this.extractIndexUsage(query);
    const joins = this.extractJoins(query);

    if (indexes.length === 0) {
      return "Add index for WHERE clause";
    }

    if (joins.length > 2) {
      return "Consider denormalization or caching for multiple joins";
    }

    if (query.includes("DISTINCT")) {
      return "Verify DISTINCT is necessary; consider GROUP BY alternative";
    }

    return "Query appears optimized";
  }

  /**
   * Normalize query for comparison
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\d+/g, "?") // Replace numbers with ?
      .replace(/'[^']*'/g, "'?'") // Replace strings with '?'
      .toUpperCase()
      .trim();
  }

  /**
   * Cache query result
   */
  cacheResult(query: string, result: any[], ttlSeconds: number = 300): void {
    const normalized = this.normalizeQuery(query);

    this.queryCache.set(normalized, {
      query,
      result,
      executionTime: 0,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    });
  }

  /**
   * Get cached result
   */
  getCachedResult(query: string): any[] | null {
    const normalized = this.normalizeQuery(query);
    const cached = this.queryCache.get(normalized);

    if (!cached) return null;

    // Check expiration
    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > cached.ttl) {
      this.queryCache.delete(normalized);
      return null;
    }

    return cached.result;
  }

  /**
   * Pre-load relationships to prevent N+1
   */
  eagerLoadRelationships(
    table: string,
    ids: string[],
    relationshipField: string
  ): Map<string, any[]> {
    const relationshipKey = `${table}:${relationshipField}:${ids.join(",")}`;

    // Check cache first
    const cached = this.relationshipCache.get(relationshipKey);
    if (cached) return new Map([[relationshipField, cached]]);

    // In production, this would execute a batch query like:
    // SELECT * FROM relationship WHERE table_id IN (ids)
    const relationships = new Map<string, any[]>();
    for (const id of ids) {
      relationships.set(id, []);
    }

    this.relationshipCache.set(relationshipKey, Array.from(relationships.values()).flat());

    return relationships;
  }

  /**
   * Get detected issues
   */
  getDetectedIssues(): string[] {
    return [...this.detectedIssues].slice(-20); // Last 20 issues
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    return {
      ...this.optimizationStats,
      nplusonePatterns: this.nplusonPatterns.size,
      cachedQueries: this.queryCache.size,
      patternsDetected: Array.from(this.nplusonPatterns.values()),
    };
  }

  /**
   * Get query recommendations
   */
  getQueryRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze patterns
    for (const pattern of this.nplusonPatterns.values()) {
      if (pattern.severity === "critical" || pattern.severity === "high") {
        recommendations.push(
          `URGENT: ${pattern.suggestedOptimization} - Save ${pattern.estimatedWaste}ms`
        );
      }
    }

    // Analyze cache efficiency
    if (this.queryCache.size > 100) {
      recommendations.push("Consider increasing cache TTL or using persistent cache");
    }

    // Analyze join complexity
    const complexJoins = Array.from(this.queryHistory.values())
      .flat()
      .filter((p) => p.joins.length > 2);

    if (complexJoins.length > 5) {
      recommendations.push("Multiple queries with 3+ joins detected - consider denormalization");
    }

    return recommendations;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.relationshipCache.clear();
  }
}

/**
 * Singleton instance
 */
let queryOptimizationEngine: QueryOptimizationEngine | null = null;

export function getQueryOptimizationEngine(): QueryOptimizationEngine {
  if (!queryOptimizationEngine) {
    queryOptimizationEngine = new QueryOptimizationEngine();
  }
  return queryOptimizationEngine;
}

export function resetQueryOptimizationEngine(): void {
  queryOptimizationEngine = null;
}
