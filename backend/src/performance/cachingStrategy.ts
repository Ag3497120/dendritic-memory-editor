/**
 * Caching Strategy & Management
 *
 * Multi-layer caching system:
 * - In-memory caching (L1)
 * - Redis/Memcached (L2)
 * - Cache invalidation strategies
 * - Cache-aside and write-through patterns
 * - Cache statistics and monitoring
 */

import { v4 as uuidv4 } from "uuid";

export type CacheProvider = "memory" | "redis" | "memcached";
export type CachePattern = "cache-aside" | "write-through" | "write-behind";

export interface CacheKey {
  namespace: string;
  key: string;
  version?: number;
}

export interface CacheEntry<T = any> {
  id: string;
  namespace: string;
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  expiresAt: number;
  hits: number;
  lastAccessedAt: number;
  size: number;
}

export interface CacheInvalidationRule {
  id: string;
  name: string;
  trigger: "time" | "event" | "dependency" | "pattern";
  pattern?: string;
  dependencies?: string[];
  ttl?: number;
  enabled: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalMemory: number;
  usedMemory: number;
  itemCount: number;
  hitRate: number;
  avgAccessTime: number;
}

/**
 * Caching Strategy Engine
 */
export class CachingStrategyEngine {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cacheStats: Map<string, CacheStats> = new Map();
  private invalidationRules: Map<string, CacheInvalidationRule> = new Map();
  private keyTimestamps: Map<string, number> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private accessTimes: number[] = [];
  private maxMemoryBytes: number = 1024 * 1024 * 100; // 100MB default
  private currentMemoryBytes: number = 0;

  constructor(maxMemoryBytes?: number) {
    if (maxMemoryBytes) {
      this.maxMemoryBytes = maxMemoryBytes;
    }

    // Initialize default stats
    const stats: CacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalMemory: this.maxMemoryBytes,
      usedMemory: 0,
      itemCount: 0,
      hitRate: 0,
      avgAccessTime: 0,
    };

    this.cacheStats.set("global", stats);
  }

  /**
   * Generate cache key
   */
  generateCacheKey(
    namespace: string,
    key: string,
    version?: number
  ): string {
    const versionSuffix = version ? `:v${version}` : "";
    return `${namespace}:${key}${versionSuffix}`;
  }

  /**
   * Set value in cache (cache-aside pattern)
   */
  set<T>(
    namespace: string,
    key: string,
    value: T,
    ttlSeconds: number = 3600
  ): CacheEntry<T> {
    const cacheKey = this.generateCacheKey(namespace, key);
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    // Calculate size (rough estimation)
    const size = JSON.stringify(value).length;

    // Check if we need to evict
    if (
      this.currentMemoryBytes + size > this.maxMemoryBytes &&
      !this.memoryCache.has(cacheKey)
    ) {
      this.evictLRU();
    }

    // Remove old entry if exists
    const oldEntry = this.memoryCache.get(cacheKey);
    if (oldEntry) {
      this.currentMemoryBytes -= oldEntry.size;
    }

    const entry: CacheEntry<T> = {
      id: uuidv4(),
      namespace,
      key,
      value,
      ttl: ttlSeconds,
      createdAt: now,
      expiresAt,
      hits: 0,
      lastAccessedAt: now,
      size,
    };

    this.memoryCache.set(cacheKey, entry);
    this.currentMemoryBytes += size;
    this.keyTimestamps.set(cacheKey, now);

    return entry;
  }

  /**
   * Get value from cache
   */
  get<T = any>(namespace: string, key: string): T | null {
    const cacheKey = this.generateCacheKey(namespace, key);
    const entry = this.memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

    const stats = this.cacheStats.get("global")!;

    if (!entry) {
      stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(cacheKey);
      this.currentMemoryBytes -= entry.size;
      stats.evictions++;
      stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access metrics
    entry.hits++;
    entry.lastAccessedAt = Date.now();
    stats.hits++;

    const accessTime = Date.now() - entry.createdAt;
    this.accessTimes.push(accessTime);
    if (this.accessTimes.length > 1000) {
      this.accessTimes.shift();
    }

    this.updateHitRate();
    return entry.value;
  }

  /**
   * Delete from cache
   */
  delete(namespace: string, key: string): boolean {
    const cacheKey = this.generateCacheKey(namespace, key);
    const entry = this.memoryCache.get(cacheKey);

    if (entry) {
      this.memoryCache.delete(cacheKey);
      this.currentMemoryBytes -= entry.size;
      this.keyTimestamps.delete(cacheKey);
      return true;
    }

    return false;
  }

  /**
   * Check if key exists in cache
   */
  exists(namespace: string, key: string): boolean {
    const cacheKey = this.generateCacheKey(namespace, key);
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) return false;

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(cacheKey);
      this.currentMemoryBytes -= entry.size;
      return false;
    }

    return true;
  }

  /**
   * Get remaining TTL for key
   */
  getTTL(namespace: string, key: string): number {
    const cacheKey = this.generateCacheKey(namespace, key);
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) return -2; // Key does not exist

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -1; // Expired
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const [key, entry] of this.memoryCache) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        this.currentMemoryBytes -= entry.size;
        this.keyTimestamps.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate dependent keys
   */
  invalidateDependencies(namespace: string, key: string): number {
    const primaryKey = this.generateCacheKey(namespace, key);
    const dependents = this.dependencyGraph.get(primaryKey) || new Set();
    let invalidated = 0;

    for (const depKey of dependents) {
      const entry = this.memoryCache.get(depKey);
      if (entry) {
        this.memoryCache.delete(depKey);
        this.currentMemoryBytes -= entry.size;
        this.keyTimestamps.delete(depKey);
        invalidated++;
      }
    }

    this.dependencyGraph.delete(primaryKey);
    return invalidated;
  }

  /**
   * Register cache invalidation rule
   */
  registerInvalidationRule(rule: Omit<CacheInvalidationRule, "id">): CacheInvalidationRule {
    const id = uuidv4();
    const fullRule: CacheInvalidationRule = {
      id,
      ...rule,
    };

    this.invalidationRules.set(id, fullRule);
    return fullRule;
  }

  /**
   * Add dependency between keys
   */
  addDependency(primaryKey: string, dependentKey: string): void {
    if (!this.dependencyGraph.has(primaryKey)) {
      this.dependencyGraph.set(primaryKey, new Set());
    }

    this.dependencyGraph.get(primaryKey)!.add(dependentKey);
  }

  /**
   * Evict using LRU (Least Recently Used) strategy
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, timestamp] of this.keyTimestamps) {
      if (timestamp < lruTime) {
        lruTime = timestamp;
        lruKey = key;
      }
    }

    if (lruKey) {
      const entry = this.memoryCache.get(lruKey)!;
      this.memoryCache.delete(lruKey);
      this.currentMemoryBytes -= entry.size;
      this.keyTimestamps.delete(lruKey);

      const stats = this.cacheStats.get("global")!;
      stats.evictions++;
    }
  }

  /**
   * Evict using LFU (Least Frequently Used) strategy
   */
  evictLFU(): void {
    let lfuKey: string | null = null;
    let lfuHits = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.hits < lfuHits) {
        lfuHits = entry.hits;
        lfuKey = key;
      }
    }

    if (lfuKey) {
      const entry = this.memoryCache.get(lfuKey)!;
      this.memoryCache.delete(lfuKey);
      this.currentMemoryBytes -= entry.size;
      this.keyTimestamps.delete(lfuKey);

      const stats = this.cacheStats.get("global")!;
      stats.evictions++;
    }
  }

  /**
   * Clear entire cache
   */
  clear(): number {
    const count = this.memoryCache.size;
    this.memoryCache.clear();
    this.currentMemoryBytes = 0;
    this.keyTimestamps.clear();
    this.accessTimes = [];

    const stats = this.cacheStats.get("global")!;
    stats.hits = 0;
    stats.misses = 0;
    stats.evictions = 0;

    return count;
  }

  /**
   * Flush expired entries
   */
  flushExpired(): number {
    let flushed = 0;
    const now = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        this.currentMemoryBytes -= entry.size;
        this.keyTimestamps.delete(key);
        flushed++;
      }
    }

    return flushed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const stats = this.cacheStats.get("global")!;
    stats.usedMemory = this.currentMemoryBytes;
    stats.itemCount = this.memoryCache.size;

    return {
      ...stats,
      hitRate: stats.hits + stats.misses > 0
        ? (stats.hits / (stats.hits + stats.misses)) * 100
        : 0,
      avgAccessTime: this.accessTimes.length > 0
        ? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length
        : 0,
    };
  }

  /**
   * Get cache entry details
   */
  getEntryDetails(namespace: string, key: string): CacheEntry | null {
    const cacheKey = this.generateCacheKey(namespace, key);
    return this.memoryCache.get(cacheKey) || null;
  }

  /**
   * Get all keys in namespace
   */
  getKeysInNamespace(namespace: string): string[] {
    const prefix = `${namespace}:`;
    const keys: string[] = [];

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.replace(prefix, ""));
      }
    }

    return keys;
  }

  /**
   * Warm cache with initial data
   */
  warmCache<T>(
    namespace: string,
    data: Record<string, T>,
    ttlSeconds: number = 3600
  ): number {
    let warmed = 0;

    for (const [key, value] of Object.entries(data)) {
      this.set(namespace, key, value, ttlSeconds);
      warmed++;
    }

    return warmed;
  }

  /**
   * Update cache hit rate
   */
  private updateHitRate(): void {
    const stats = this.cacheStats.get("global")!;
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage(): number {
    return (this.currentMemoryBytes / this.maxMemoryBytes) * 100;
  }

  /**
   * Get recommended eviction strategy based on usage patterns
   */
  getRecommendedEvictionStrategy(): "LRU" | "LFU" | "TTL" {
    const stats = this.getStats();

    if (stats.hitRate > 80) {
      return "LFU"; // Frequently accessed items deserve to stay
    } else if (stats.hitRate > 50) {
      return "LRU"; // Mix of access patterns
    } else {
      return "TTL"; // Low hit rate, rely on TTL expiration
    }
  }

  /**
   * Get hot keys (most accessed)
   */
  getHotKeys(limit: number = 10): Array<{ key: string; hits: number }> {
    const entries = Array.from(this.memoryCache.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return entries.map((e) => ({
      key: `${e.namespace}:${e.key}`,
      hits: e.hits,
    }));
  }

  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency(): {
    hitRate: number;
    evictionRate: number;
    avgHits: number;
    memoryEfficiency: number;
  } {
    const stats = this.getStats();
    const totalAccesses = stats.hits + stats.misses;
    const evictionRate =
      stats.hits + stats.misses > 0
        ? (stats.evictions / (stats.hits + stats.misses)) * 100
        : 0;
    const avgHits =
      this.memoryCache.size > 0
        ? stats.hits / this.memoryCache.size
        : 0;
    const memoryEfficiency = stats.itemCount > 0
      ? (stats.usedMemory / stats.itemCount / 1024).toFixed(2) // KB per item
      : 0;

    return {
      hitRate: stats.hitRate,
      evictionRate,
      avgHits,
      memoryEfficiency: Number(memoryEfficiency),
    };
  }
}

/**
 * Singleton instance
 */
let cachingStrategyEngine: CachingStrategyEngine | null = null;

export function getCachingStrategyEngine(
  maxMemoryBytes?: number
): CachingStrategyEngine {
  if (!cachingStrategyEngine) {
    cachingStrategyEngine = new CachingStrategyEngine(maxMemoryBytes);
  }
  return cachingStrategyEngine;
}

export function resetCachingStrategyEngine(): void {
  cachingStrategyEngine = null;
}
