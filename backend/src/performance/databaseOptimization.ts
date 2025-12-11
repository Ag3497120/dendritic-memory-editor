/**
 * Database Optimization & Indexing Strategy
 *
 * Optimizes database performance through:
 * - Strategic indexing
 * - Query optimization
 * - Table partitioning
 * - Statistics collection
 * - Connection pooling
 */

export interface IndexStrategy {
  table: string;
  columns: string[];
  indexName: string;
  type: "btree" | "hash" | "fulltext";
  unique: boolean;
  sparse: boolean;
  indexSize: number;
}

export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  indexUsed: string[];
  fullScan: boolean;
  recommendations: string[];
}

export interface DatabaseStatistics {
  table: string;
  rowCount: number;
  indexCount: number;
  totalSize: number;
  lastAnalyzed: number;
  fragmentationPercent: number;
}

export interface PartitionStrategy {
  table: string;
  partitionKey: string;
  partitionType: "range" | "list" | "hash";
  partitions: Array<{
    name: string;
    values: any[];
    size: number;
  }>;
}

export interface ConnectionPool {
  name: string;
  minSize: number;
  maxSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  averageWaitTime: number;
}

/**
 * Database Optimization Engine
 */
export class DatabaseOptimizationEngine {
  private indexes: Map<string, IndexStrategy[]> = new Map();
  private queryAnalyses: Map<string, QueryAnalysis> = new Map();
  private statistics: Map<string, DatabaseStatistics> = new Map();
  private partitionStrategies: Map<string, PartitionStrategy> = new Map();
  private connectionPools: Map<string, ConnectionPool> = new Map();

  /**
   * Create index strategy
   */
  createIndexStrategy(
    table: string,
    columns: string[],
    options?: {
      indexName?: string;
      type?: "btree" | "hash" | "fulltext";
      unique?: boolean;
      sparse?: boolean;
    }
  ): IndexStrategy {
    const indexName = options?.indexName || `idx_${table}_${columns.join("_")}`;

    const strategy: IndexStrategy = {
      table,
      columns,
      indexName,
      type: options?.type || "btree",
      unique: options?.unique || false,
      sparse: options?.sparse || false,
      indexSize: 0,
    };

    if (!this.indexes.has(table)) {
      this.indexes.set(table, []);
    }

    this.indexes.get(table)!.push(strategy);
    return strategy;
  }

  /**
   * Get recommended indexes for table
   */
  getRecommendedIndexes(table: string): IndexStrategy[] {
    const recommendations: IndexStrategy[] = [];

    // Standard indexes for common use cases
    switch (table) {
      case "tiles":
        recommendations.push(
          this.createIndexStrategy("tiles", ["id"], {
            unique: true,
            indexName: "pk_tiles_id",
          }),
          this.createIndexStrategy("tiles", ["domain"], {
            indexName: "idx_tiles_domain",
          }),
          this.createIndexStrategy("tiles", ["createdBy"], {
            indexName: "idx_tiles_createdBy",
          }),
          this.createIndexStrategy("tiles", ["createdAt"], {
            indexName: "idx_tiles_createdAt",
          }),
          this.createIndexStrategy("tiles", ["domain", "createdAt"], {
            indexName: "idx_tiles_domain_createdAt",
          }),
          this.createIndexStrategy("tiles", ["title", "content"], {
            type: "fulltext",
            indexName: "idx_tiles_fulltext",
          })
        );
        break;

      case "inferences":
        recommendations.push(
          this.createIndexStrategy("inferences", ["id"], {
            unique: true,
            indexName: "pk_inferences_id",
          }),
          this.createIndexStrategy("inferences", ["createdBy"], {
            indexName: "idx_inferences_createdBy",
          }),
          this.createIndexStrategy("inferences", ["domains"], {
            indexName: "idx_inferences_domains",
          }),
          this.createIndexStrategy("inferences", ["createdAt"], {
            indexName: "idx_inferences_createdAt",
          })
        );
        break;

      case "users":
        recommendations.push(
          this.createIndexStrategy("users", ["id"], {
            unique: true,
            indexName: "pk_users_id",
          }),
          this.createIndexStrategy("users", ["email"], {
            unique: true,
            indexName: "idx_users_email",
          }),
          this.createIndexStrategy("users", ["organizationId"], {
            indexName: "idx_users_organizationId",
          })
        );
        break;

      case "audit_logs":
        recommendations.push(
          this.createIndexStrategy("audit_logs", ["id"], {
            unique: true,
            indexName: "pk_audit_logs_id",
          }),
          this.createIndexStrategy("audit_logs", ["userId"], {
            indexName: "idx_audit_logs_userId",
          }),
          this.createIndexStrategy("audit_logs", ["timestamp"], {
            indexName: "idx_audit_logs_timestamp",
          }),
          this.createIndexStrategy("audit_logs", ["organizationId", "timestamp"], {
            indexName: "idx_audit_logs_org_timestamp",
          })
        );
        break;
    }

    return recommendations;
  }

  /**
   * Analyze query performance
   */
  analyzeQuery(
    query: string,
    executionTime: number,
    rowsScanned: number,
    rowsReturned: number,
    indexUsed: string[] = []
  ): QueryAnalysis {
    const fullScan = indexUsed.length === 0;
    const recommendations: string[] = [];

    // Generate recommendations
    if (fullScan) {
      recommendations.push("Consider adding an index for WHERE clause");
      recommendations.push("Full table scan detected - query may be slow on large datasets");
    }

    if (rowsScanned > rowsReturned * 100) {
      recommendations.push(`${rowsScanned / rowsReturned}:1 scan-to-return ratio - optimize WHERE clause or add index`);
    }

    if (executionTime > 1000) {
      recommendations.push("Query execution > 1 second - consider query optimization");
    }

    const analysis: QueryAnalysis = {
      query,
      executionTime,
      rowsScanned,
      rowsReturned,
      indexUsed,
      fullScan,
      recommendations,
    };

    this.queryAnalyses.set(query, analysis);
    return analysis;
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 1000): QueryAnalysis[] {
    return Array.from(this.queryAnalyses.values())
      .filter((a) => a.executionTime > threshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 20);
  }

  /**
   * Collect table statistics
   */
  collectTableStatistics(
    table: string,
    rowCount: number,
    totalSize: number,
    fragmentationPercent: number = 0
  ): DatabaseStatistics {
    const stats: DatabaseStatistics = {
      table,
      rowCount,
      indexCount: this.indexes.get(table)?.length || 0,
      totalSize,
      lastAnalyzed: Date.now(),
      fragmentationPercent,
    };

    this.statistics.set(table, stats);
    return stats;
  }

  /**
   * Get fragmentation status
   */
  getFragmentationStatus(): Array<{
    table: string;
    fragmentationPercent: number;
    recommendation: string;
  }> {
    const results: Array<{
      table: string;
      fragmentationPercent: number;
      recommendation: string;
    }> = [];

    for (const [table, stats] of this.statistics) {
      results.push({
        table,
        fragmentationPercent: stats.fragmentationPercent,
        recommendation:
          stats.fragmentationPercent > 20
            ? "Consider OPTIMIZE/REBUILD table"
            : "Fragmentation within acceptable range",
      });
    }

    return results;
  }

  /**
   * Create partition strategy
   */
  createPartitionStrategy(
    table: string,
    partitionKey: string,
    partitionType: "range" | "list" | "hash",
    partitions: Array<{ name: string; values: any[] }>
  ): PartitionStrategy {
    const strategy: PartitionStrategy = {
      table,
      partitionKey,
      partitionType,
      partitions: partitions.map((p) => ({
        ...p,
        size: 0,
      })),
    };

    this.partitionStrategies.set(table, strategy);
    return strategy;
  }

  /**
   * Get partition recommendation
   */
  getPartitionRecommendation(
    table: string,
    rowCount: number
  ): PartitionStrategy | null {
    // Recommend partitioning for large tables
    if (rowCount < 1000000) {
      return null; // No partitioning needed
    }

    switch (table) {
      case "tiles":
        return this.createPartitionStrategy(
          table,
          "createdAt",
          "range",
          [
            { name: "tiles_2024_q1", values: ["2024-01-01", "2024-03-31"] },
            { name: "tiles_2024_q2", values: ["2024-04-01", "2024-06-30"] },
            { name: "tiles_2024_q3", values: ["2024-07-01", "2024-09-30"] },
            { name: "tiles_2024_q4", values: ["2024-10-01", "2024-12-31"] },
          ]
        );

      case "audit_logs":
        return this.createPartitionStrategy(
          table,
          "timestamp",
          "range",
          [
            { name: "audit_logs_recent", values: [Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now()] },
            { name: "audit_logs_archive", values: [0, Date.now() - 30 * 24 * 60 * 60 * 1000] },
          ]
        );

      default:
        return null;
    }
  }

  /**
   * Configure connection pool
   */
  configureConnectionPool(
    name: string,
    minSize: number,
    maxSize: number
  ): ConnectionPool {
    const pool: ConnectionPool = {
      name,
      minSize,
      maxSize,
      activeConnections: minSize,
      idleConnections: 0,
      waitingRequests: 0,
      averageWaitTime: 0,
    };

    this.connectionPools.set(name, pool);
    return pool;
  }

  /**
   * Get connection pool status
   */
  getConnectionPoolStatus(): ConnectionPool[] {
    return Array.from(this.connectionPools.values());
  }

  /**
   * Update connection pool metrics
   */
  updateConnectionPoolMetrics(
    poolName: string,
    active: number,
    idle: number,
    waiting: number,
    avgWaitTime: number
  ): void {
    const pool = this.connectionPools.get(poolName);
    if (pool) {
      pool.activeConnections = active;
      pool.idleConnections = idle;
      pool.waitingRequests = waiting;
      pool.averageWaitTime = avgWaitTime;
    }
  }

  /**
   * Get connection pool recommendations
   */
  getConnectionPoolRecommendations(): string[] {
    const recommendations: string[] = [];

    for (const pool of this.connectionPools.values()) {
      const utilization = pool.activeConnections / pool.maxSize;

      if (utilization > 0.9) {
        recommendations.push(
          `Pool "${pool.name}": ${(utilization * 100).toFixed(1)}% utilized - consider increasing max size`
        );
      }

      if (pool.waitingRequests > 0) {
        recommendations.push(
          `Pool "${pool.name}": ${pool.waitingRequests} waiting requests - increase pool size`
        );
      }
    }

    return recommendations;
  }

  /**
   * N+1 Problem Detection
   */
  detectNPlusOneProblems(
    queries: Array<{ query: string; count: number }>
  ): string[] {
    const problems: string[] = [];
    const groupedQueries: Record<string, number> = {};

    for (const q of queries) {
      // Normalize query to detect similar patterns
      const normalized = q.query
        .replace(/\d+/g, "?")
        .replace(/'.+?'/g, "'?'");

      groupedQueries[normalized] =
        (groupedQueries[normalized] || 0) + q.count;
    }

    // Detect N+1 patterns (same query repeated many times)
    for (const [query, count] of Object.entries(groupedQueries)) {
      if (count > 10) {
        problems.push(
          `Potential N+1 problem: Query executed ${count} times: ${query}`
        );
      }
    }

    return problems;
  }

  /**
   * Get optimization summary
   */
  getOptimizationSummary() {
    const slowQueries = this.getSlowQueries();
    const fragmentation = this.getFragmentationStatus();
    const poolRecommendations = this.getConnectionPoolRecommendations();

    return {
      slowQueryCount: slowQueries.length,
      slowestQuery:
        slowQueries.length > 0
          ? {
              query: slowQueries[0].query,
              executionTime: slowQueries[0].executionTime,
            }
          : null,
      fragmentedTables: fragmentation.filter(
        (f) => f.fragmentationPercent > 20
      ),
      connectionPoolStatus: Array.from(this.connectionPools.values()).map(
        (p) => ({
          name: p.name,
          utilization: (
            (p.activeConnections / p.maxSize) *
            100
          ).toFixed(1),
        })
      ),
      recommendations: poolRecommendations,
    };
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport() {
    const report = {
      timestamp: Date.now(),
      totalIndexes: Array.from(this.indexes.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
      totalTables: this.statistics.size,
      averageFragmentation:
        Array.from(this.statistics.values()).reduce(
          (sum, s) => sum + s.fragmentationPercent,
          0
        ) / Math.max(1, this.statistics.size),
      slowQueries: this.getSlowQueries().length,
      summary: this.getOptimizationSummary(),
    };

    return report;
  }
}

/**
 * Singleton instance
 */
let databaseOptimizationEngine: DatabaseOptimizationEngine | null = null;

export function getDatabaseOptimizationEngine(): DatabaseOptimizationEngine {
  if (!databaseOptimizationEngine) {
    databaseOptimizationEngine = new DatabaseOptimizationEngine();
  }
  return databaseOptimizationEngine;
}

export function resetDatabaseOptimizationEngine(): void {
  databaseOptimizationEngine = null;
}
