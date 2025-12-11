/**
 * Collaborative Editing Engine
 *
 * Implements Operational Transformation (OT) for real-time collaborative editing
 * Handles concurrent edits, conflict resolution, and version management
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Operation - Represents a single edit operation
 */
export interface Operation {
  id: string;
  clientId: string;
  userId: string;
  type: "insert" | "delete" | "update";
  path: string; // JSON path (e.g., "content", "metadata.tags[0]")
  value?: any; // For insert/update
  oldValue?: any; // For tracking changes
  position?: number; // For string operations
  length?: number; // For delete operations
  timestamp: number;
  revision: number; // Document version when this operation was created
  parentId?: string; // For dependency tracking
}

/**
 * EditSession - Tracks an active editing session
 */
export interface EditSession {
  id: string;
  userId: string;
  clientId: string;
  documentId: string;
  startTime: number;
  lastActivity: number;
  cursorPosition: number;
  isActive: boolean;
}

/**
 * DocumentVersion - Complete document state at a point in time
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  revision: number;
  content: any;
  operations: Operation[];
  createdAt: number;
  createdBy: string;
  hash: string; // For conflict detection
}

/**
 * Collaborative Editor Class
 */
export class CollaborativeEditor {
  private documents: Map<string, DocumentVersion> = new Map();
  private operations: Map<string, Operation[]> = new Map(); // documentId -> operations
  private sessions: Map<string, EditSession> = new Map(); // clientId -> session
  private locks: Map<string, { userId: string; timestamp: number }> = new Map(); // path -> lock info

  /**
   * Create or get a document
   */
  createDocument(
    documentId: string,
    initialContent: any,
    userId: string
  ): DocumentVersion {
    const version: DocumentVersion = {
      id: uuidv4(),
      documentId,
      revision: 0,
      content: initialContent,
      operations: [],
      createdAt: Date.now(),
      createdBy: userId,
      hash: this.hashContent(initialContent),
    };

    this.documents.set(documentId, version);
    this.operations.set(documentId, []);

    return version;
  }

  /**
   * Get current document state
   */
  getDocument(documentId: string): DocumentVersion | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Apply an operation to a document
   */
  applyOperation(
    documentId: string,
    operation: Omit<Operation, "id" | "timestamp" | "revision">
  ): { success: boolean; error?: string; version?: DocumentVersion } {
    const doc = this.documents.get(documentId);
    if (!doc) {
      return { success: false, error: "Document not found" };
    }

    // Check lock on the path
    const lock = this.locks.get(operation.path);
    if (lock && lock.userId !== operation.userId) {
      return { success: false, error: "Path is locked by another user" };
    }

    try {
      const newOperation: Operation = {
        ...operation,
        id: uuidv4(),
        timestamp: Date.now(),
        revision: doc.revision,
      };

      // Apply the operation to the document
      const newContent = this.applyOperationToContent(
        doc.content,
        newOperation
      );

      // Update document version
      doc.content = newContent;
      doc.revision++;
      doc.hash = this.hashContent(newContent);

      // Store operation
      const ops = this.operations.get(documentId) || [];
      ops.push(newOperation);
      this.operations.set(documentId, ops);

      return { success: true, version: doc };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Operation failed",
      };
    }
  }

  /**
   * Apply operation to content using JSON path
   */
  private applyOperationToContent(content: any, operation: Operation): any {
    const keys = operation.path.split(".");
    let current = content;

    // Navigate to the target
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];

    switch (operation.type) {
      case "insert":
        if (Array.isArray(current[lastKey])) {
          current[lastKey].splice(
            operation.position || 0,
            0,
            operation.value
          );
        } else if (typeof current[lastKey] === "string") {
          current[lastKey] =
            current[lastKey].slice(0, operation.position) +
            operation.value +
            current[lastKey].slice(operation.position);
        } else {
          current[lastKey] = operation.value;
        }
        break;

      case "delete":
        if (Array.isArray(current[lastKey])) {
          current[lastKey].splice(
            operation.position || 0,
            operation.length || 1
          );
        } else if (typeof current[lastKey] === "string") {
          current[lastKey] =
            current[lastKey].slice(0, operation.position) +
            current[lastKey].slice(
              (operation.position || 0) + (operation.length || 1)
            );
        } else {
          delete current[lastKey];
        }
        break;

      case "update":
        current[lastKey] = operation.value;
        break;
    }

    return content;
  }

  /**
   * Operational Transformation - Transform operation against other operations
   */
  transformOperation(
    op: Operation,
    against: Operation[]
  ): Operation {
    let transformed = { ...op };

    for (const otherOp of against) {
      if (otherOp.timestamp < transformed.timestamp) {
        // Transform based on operation type
        if (
          transformed.type === "insert" &&
          otherOp.type === "insert" &&
          transformed.path === otherOp.path
        ) {
          // String position adjustment
          if (
            typeof transformed.position === "number" &&
            typeof otherOp.position === "number"
          ) {
            if (otherOp.position < transformed.position) {
              transformed.position += (otherOp.value?.length || 1);
            } else if (
              otherOp.position === transformed.position &&
              transformed.clientId > otherOp.clientId
            ) {
              // Tiebreaker: use clientId to determine order
              transformed.position += (otherOp.value?.length || 1);
            }
          }
        }
      }
    }

    return transformed;
  }

  /**
   * Create an edit session
   */
  createSession(
    userId: string,
    clientId: string,
    documentId: string
  ): EditSession {
    const session: EditSession = {
      id: uuidv4(),
      userId,
      clientId,
      documentId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      cursorPosition: 0,
      isActive: true,
    };

    this.sessions.set(clientId, session);
    return session;
  }

  /**
   * Update session cursor position
   */
  updateSessionCursor(
    clientId: string,
    cursorPosition: number
  ): EditSession | undefined {
    const session = this.sessions.get(clientId);
    if (session) {
      session.cursorPosition = cursorPosition;
      session.lastActivity = Date.now();
    }
    return session;
  }

  /**
   * End an edit session
   */
  endSession(clientId: string): boolean {
    const session = this.sessions.get(clientId);
    if (session) {
      session.isActive = false;
      session.lastActivity = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get active sessions for a document
   */
  getActiveSessions(documentId: string): EditSession[] {
    return Array.from(this.sessions.values())
      .filter(
        (s) =>
          s.documentId === documentId &&
          s.isActive &&
          Date.now() - s.lastActivity < 30000 // 30 second timeout
      );
  }

  /**
   * Acquire a lock on a path
   */
  acquireLock(
    path: string,
    userId: string,
    duration: number = 60000
  ): { success: boolean; error?: string } {
    const existingLock = this.locks.get(path);

    if (existingLock && Date.now() - existingLock.timestamp < duration) {
      if (existingLock.userId !== userId) {
        return {
          success: false,
          error: `Path is locked by ${existingLock.userId}`,
        };
      }
    }

    this.locks.set(path, { userId, timestamp: Date.now() });
    return { success: true };
  }

  /**
   * Release a lock
   */
  releaseLock(path: string, userId: string): boolean {
    const lock = this.locks.get(path);
    if (lock && lock.userId === userId) {
      this.locks.delete(path);
      return true;
    }
    return false;
  }

  /**
   * Get operation history for a document
   */
  getOperationHistory(
    documentId: string,
    from: number = 0,
    to?: number
  ): Operation[] {
    const ops = this.operations.get(documentId) || [];
    const endIndex = to !== undefined ? to : ops.length;
    return ops.slice(from, endIndex);
  }

  /**
   * Create a snapshot at current state
   */
  createSnapshot(
    documentId: string,
    userId: string
  ): DocumentVersion | undefined {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;

    const snapshot: DocumentVersion = {
      id: uuidv4(),
      documentId,
      revision: doc.revision,
      content: JSON.parse(JSON.stringify(doc.content)), // Deep copy
      operations: [...doc.operations],
      createdAt: Date.now(),
      createdBy: userId,
      hash: doc.hash,
    };

    return snapshot;
  }

  /**
   * Detect conflicts between versions
   */
  detectConflicts(version1: DocumentVersion, version2: DocumentVersion): boolean {
    return version1.hash !== version2.hash && version1.revision !== version2.revision;
  }

  /**
   * Merge two conflicting versions using Last-Write-Wins strategy
   */
  mergeVersions(
    version1: DocumentVersion,
    version2: DocumentVersion
  ): DocumentVersion {
    // Last-Write-Wins: use the version with later timestamp
    const winner =
      version1.createdAt > version2.createdAt ? version1 : version2;

    return {
      ...winner,
      id: uuidv4(),
      revision: Math.max(version1.revision, version2.revision) + 1,
    };
  }

  /**
   * Get document statistics
   */
  getDocumentStats(documentId: string) {
    const doc = this.documents.get(documentId);
    const ops = this.operations.get(documentId) || [];
    const sessions = this.getActiveSessions(documentId);

    return {
      documentId,
      revision: doc?.revision || 0,
      operationCount: ops.length,
      activeSessions: sessions.length,
      lastModified: doc?.createdAt || Date.now(),
      contentSize: JSON.stringify(doc?.content).length || 0,
      activeUsers: new Set(sessions.map((s) => s.userId)).size,
    };
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
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(timeoutMs: number = 30000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [clientId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > timeoutMs) {
        this.sessions.delete(clientId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Singleton instance
 */
let editorInstance: CollaborativeEditor | null = null;

export function getCollaborativeEditor(): CollaborativeEditor {
  if (!editorInstance) {
    editorInstance = new CollaborativeEditor();
  }
  return editorInstance;
}

export function resetCollaborativeEditor(): void {
  editorInstance = null;
}
