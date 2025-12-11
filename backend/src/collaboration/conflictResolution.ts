/**
 * Conflict Resolution System
 *
 * Implements multiple strategies for resolving concurrent edit conflicts:
 * - Last-Write-Wins (LWW)
 * - Three-Way Merge
 * - Custom merge functions
 */

import { Operation, DocumentVersion } from "./collaborativeEditor";

export type ConflictStrategy = "lww" | "merge" | "custom";

export interface Conflict {
  id: string;
  documentId: string;
  version1: DocumentVersion;
  version2: DocumentVersion;
  conflictingPaths: string[];
  timestamp: number;
  resolved: boolean;
  resolution?: DocumentVersion;
}

export interface MergeResult {
  success: boolean;
  mergedVersion?: DocumentVersion;
  conflicts?: string[];
  error?: string;
}

/**
 * Conflict Resolution Engine
 */
export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map();

  /**
   * Detect conflicts between two versions
   */
  detectConflicts(
    version1: DocumentVersion,
    version2: DocumentVersion
  ): Conflict | null {
    const conflictingPaths = this.findConflictingPaths(
      version1.content,
      version2.content
    );

    if (conflictingPaths.length === 0) {
      return null;
    }

    const conflict: Conflict = {
      id: `conflict-${Date.now()}`,
      documentId: version1.documentId,
      version1,
      version2,
      conflictingPaths,
      timestamp: Date.now(),
      resolved: false,
    };

    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  /**
   * Find paths that differ between two objects
   */
  private findConflictingPaths(
    obj1: any,
    obj2: any,
    prefix: string = ""
  ): string[] {
    const paths: string[] = [];

    const allKeys = new Set([
      ...Object.keys(obj1 || {}),
      ...Object.keys(obj2 || {}),
    ]);

    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      // Deep comparison
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        if (
          typeof val1 === "object" &&
          typeof val2 === "object" &&
          val1 !== null &&
          val2 !== null
        ) {
          // Recurse for nested objects
          paths.push(
            ...this.findConflictingPaths(val1, val2, path)
          );
        } else {
          paths.push(path);
        }
      }
    }

    return paths;
  }

  /**
   * Resolve conflict using Last-Write-Wins strategy
   */
  resolveWithLWW(conflict: Conflict): MergeResult {
    try {
      const winner =
        conflict.version1.createdAt > conflict.version2.createdAt
          ? conflict.version1
          : conflict.version2;

      const loser =
        conflict.version1.createdAt > conflict.version2.createdAt
          ? conflict.version2
          : conflict.version1;

      const mergedVersion: DocumentVersion = {
        ...winner,
        id: `merged-${Date.now()}`,
        revision: Math.max(winner.revision, loser.revision) + 1,
        createdAt: Date.now(),
      };

      conflict.resolved = true;
      conflict.resolution = mergedVersion;

      return {
        success: true,
        mergedVersion,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "LWW resolution failed",
      };
    }
  }

  /**
   * Resolve conflict using Three-Way Merge
   */
  resolveWithThreeWayMerge(
    conflict: Conflict,
    baseVersion: DocumentVersion
  ): MergeResult {
    try {
      const merged = this.threeWayMerge(
        baseVersion.content,
        conflict.version1.content,
        conflict.version2.content
      );

      if (merged.conflicts.length > 0) {
        return {
          success: false,
          conflicts: merged.conflicts,
          error: "Unresolvable conflicts detected",
        };
      }

      const mergedVersion: DocumentVersion = {
        documentId: conflict.documentId,
        id: `merged-${Date.now()}`,
        revision: Math.max(
          conflict.version1.revision,
          conflict.version2.revision
        ) + 1,
        content: merged.content,
        operations: [
          ...conflict.version1.operations,
          ...conflict.version2.operations,
        ],
        createdAt: Date.now(),
        createdBy: "system",
        hash: this.hashContent(merged.content),
      };

      conflict.resolved = true;
      conflict.resolution = mergedVersion;

      return {
        success: true,
        mergedVersion,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Three-way merge failed",
      };
    }
  }

  /**
   * Implement three-way merge algorithm
   */
  private threeWayMerge(
    base: any,
    version1: any,
    version2: any
  ): { content: any; conflicts: string[] } {
    const merged = JSON.parse(JSON.stringify(base));
    const conflicts: string[] = [];

    const allKeys = new Set([
      ...Object.keys(base || {}),
      ...Object.keys(version1 || {}),
      ...Object.keys(version2 || {}),
    ]);

    for (const key of allKeys) {
      const baseVal = base?.[key];
      const val1 = version1?.[key];
      const val2 = version2?.[key];

      // If both made the same change, use it
      if (JSON.stringify(val1) === JSON.stringify(val2)) {
        merged[key] = val1;
      }
      // If only one changed, use the changed version
      else if (JSON.stringify(val1) !== JSON.stringify(baseVal)) {
        merged[key] = val1;
      } else if (JSON.stringify(val2) !== JSON.stringify(baseVal)) {
        merged[key] = val2;
      }
      // If both changed differently, it's a conflict
      else {
        conflicts.push(key);
        // Default: use version1 (can be overridden)
        merged[key] = val1;
      }
    }

    return { content: merged, conflicts };
  }

  /**
   * Resolve conflict with custom merge function
   */
  resolveWithCustomFunction(
    conflict: Conflict,
    mergeFn: (
      version1: DocumentVersion,
      version2: DocumentVersion
    ) => DocumentVersion
  ): MergeResult {
    try {
      const mergedVersion = mergeFn(conflict.version1, conflict.version2);

      conflict.resolved = true;
      conflict.resolution = mergedVersion;

      return {
        success: true,
        mergedVersion,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Custom merge failed",
      };
    }
  }

  /**
   * Resolve based on path priority
   */
  resolveByPathPriority(
    conflict: Conflict,
    priorityMap: Record<string, "version1" | "version2">
  ): MergeResult {
    try {
      const base = JSON.parse(JSON.stringify(conflict.version1.content));

      for (const [path, priority] of Object.entries(priorityMap)) {
        const value = this.getValueByPath(
          priority === "version1"
            ? conflict.version1.content
            : conflict.version2.content,
          path
        );

        this.setValueByPath(base, path, value);
      }

      const mergedVersion: DocumentVersion = {
        ...conflict.version1,
        id: `merged-${Date.now()}`,
        revision: Math.max(
          conflict.version1.revision,
          conflict.version2.revision
        ) + 1,
        content: base,
        createdAt: Date.now(),
        hash: this.hashContent(base),
      };

      conflict.resolved = true;
      conflict.resolution = mergedVersion;

      return {
        success: true,
        mergedVersion,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Priority merge failed",
      };
    }
  }

  /**
   * Get value from object by dot-notation path
   */
  private getValueByPath(obj: any, path: string): any {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      current = current?.[key];
    }

    return current;
  }

  /**
   * Set value in object by dot-notation path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get all unresolved conflicts for a document
   */
  getUnresolvedConflicts(documentId: string): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => c.documentId === documentId && !c.resolved
    );
  }

  /**
   * Mark conflict as resolved
   */
  markAsResolved(conflictId: string, resolution: DocumentVersion): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution;
      return true;
    }
    return false;
  }

  /**
   * Revert to a previous version
   */
  revertToVersion(targetVersion: DocumentVersion): DocumentVersion {
    return {
      ...targetVersion,
      id: `reverted-${Date.now()}`,
      revision: targetVersion.revision + 1,
      createdAt: Date.now(),
    };
  }

  /**
   * Calculate merge diff for UI display
   */
  calculateMergeDiff(
    version1: DocumentVersion,
    version2: DocumentVersion
  ): Record<string, { original: any; version1: any; version2: any }> {
    const diff: Record<string, { original: any; version1: any; version2: any }> =
      {};

    const allKeys = new Set([
      ...this.getDeepKeys(version1.content),
      ...this.getDeepKeys(version2.content),
    ]);

    for (const key of allKeys) {
      const val1 = this.getValueByPath(version1.content, key);
      const val2 = this.getValueByPath(version2.content, key);

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diff[key] = {
          version1: val1,
          version2: val2,
          original: null, // Would need base version
        };
      }
    }

    return diff;
  }

  /**
   * Get all keys from nested object
   */
  private getDeepKeys(obj: any, prefix: string = ""): string[] {
    const keys: string[] = [];

    if (typeof obj !== "object" || obj === null) {
      return keys;
    }

    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      keys.push(path);

      if (typeof obj[key] === "object" && obj[key] !== null) {
        keys.push(...this.getDeepKeys(obj[key], path));
      }
    }

    return keys;
  }

  /**
   * Hash content for conflict detection
   */
  private hashContent(content: any): string {
    const str = JSON.stringify(content);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): number {
    let cleared = 0;

    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) {
        this.conflicts.delete(id);
        cleared++;
      }
    }

    return cleared;
  }
}

/**
 * Singleton instance
 */
let resolverInstance: ConflictResolver | null = null;

export function getConflictResolver(): ConflictResolver {
  if (!resolverInstance) {
    resolverInstance = new ConflictResolver();
  }
  return resolverInstance;
}

export function resetConflictResolver(): void {
  resolverInstance = null;
}
