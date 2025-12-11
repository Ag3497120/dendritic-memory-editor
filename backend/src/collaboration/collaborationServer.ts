/**
 * Collaboration Server
 *
 * Manages real-time collaborative editing via WebSocket
 * Broadcasts operations, manages locks, and handles conflict resolution
 */

import { Server as SocketIOServer } from "socket.io";
import { getCollaborativeEditor, Operation, EditSession } from "./collaborativeEditor";
import { getConflictResolver } from "./conflictResolution";
import { getEventTracker } from "../analytics/eventTracker";

export interface CollaborationMessage {
  type:
    | "operation"
    | "cursor"
    | "lock"
    | "unlock"
    | "sync"
    | "comment"
    | "mention";
  documentId: string;
  userId: string;
  clientId: string;
  data: any;
  timestamp: number;
}

export interface CursorUpdate {
  userId: string;
  clientId: string;
  cursorPosition: number;
  userName: string;
  color: string;
}

export interface PresenceInfo {
  userId: string;
  clientId: string;
  userName: string;
  status: "editing" | "viewing" | "idle";
  lastUpdate: number;
  cursorPosition: number;
}

/**
 * Collaboration Server Class
 */
export class CollaborationServer {
  private io: SocketIOServer;
  private editor = getCollaborativeEditor();
  private resolver = getConflictResolver();
  private tracker = getEventTracker();

  private presences: Map<string, PresenceInfo> = new Map(); // clientId -> presence
  private userColors: Map<string, string> = new Map(); // userId -> color
  private documentSubscriptions: Map<string, Set<string>> = new Map(); // documentId -> clientIds

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`[Collaboration] Client connected: ${socket.id}`);

      // Join document room
      socket.on("join-document", (data) => {
        this.handleJoinDocument(socket, data);
      });

      // Handle operations
      socket.on("operation", (data) => {
        this.handleOperation(socket, data);
      });

      // Handle cursor movements
      socket.on("cursor-move", (data) => {
        this.handleCursorMove(socket, data);
      });

      // Handle lock requests
      socket.on("request-lock", (data) => {
        this.handleLockRequest(socket, data);
      });

      // Handle unlock requests
      socket.on("release-lock", (data) => {
        this.handleUnlock(socket, data);
      });

      // Handle comments
      socket.on("add-comment", (data) => {
        this.handleComment(socket, data);
      });

      // Handle mentions
      socket.on("mention", (data) => {
        this.handleMention(socket, data);
      });

      // Request sync
      socket.on("request-sync", (data) => {
        this.handleSyncRequest(socket, data);
      });

      // Disconnect handler
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle client joining a document
   */
  private handleJoinDocument(socket: any, data: any) {
    const { documentId, userId, userName } = data;

    // Create or get session
    const session = this.editor.createSession(userId, socket.id, documentId);

    // Join socket room
    socket.join(`doc-${documentId}`);

    // Track subscription
    if (!this.documentSubscriptions.has(documentId)) {
      this.documentSubscriptions.set(documentId, new Set());
    }
    this.documentSubscriptions.get(documentId)!.add(socket.id);

    // Assign color to user
    if (!this.userColors.has(userId)) {
      this.userColors.set(userId, this.generateColor());
    }

    // Add presence
    const presence: PresenceInfo = {
      userId,
      clientId: socket.id,
      userName,
      status: "editing",
      lastUpdate: Date.now(),
      cursorPosition: 0,
    };

    this.presences.set(socket.id, presence);

    // Get document
    let doc = this.editor.getDocument(documentId);
    if (!doc) {
      doc = this.editor.createDocument(documentId, {}, userId);
    }

    // Send document state to client
    socket.emit("document-loaded", {
      documentId,
      content: doc.content,
      revision: doc.revision,
      operations: this.editor.getOperationHistory(documentId),
    });

    // Broadcast presence update
    this.io.to(`doc-${documentId}`).emit("presence-updated", {
      documentId,
      presences: this.getDocumentPresences(documentId),
    });

    // Track event
    this.tracker.trackEvent(userId, "api_call", "join_document", {
      documentId,
      domain: "collaboration",
    });
  }

  /**
   * Handle operation from client
   */
  private handleOperation(socket: any, data: any) {
    const { documentId, operation } = data;
    const presence = this.presences.get(socket.id);

    if (!presence) {
      socket.emit("error", "Not in a document");
      return;
    }

    try {
      // Transform operation against concurrent operations
      const existingOps = this.editor.getOperationHistory(documentId);
      const clientOps = existingOps.filter((op) => op.clientId === socket.id);
      const otherOps = existingOps.filter((op) => op.clientId !== socket.id);

      let transformedOp = operation;
      if (otherOps.length > 0) {
        transformedOp = this.editor.transformOperation(operation, otherOps);
      }

      // Apply operation
      const result = this.editor.applyOperation(documentId, transformedOp);

      if (!result.success) {
        socket.emit("operation-rejected", {
          reason: result.error,
        });
        return;
      }

      // Broadcast operation to all clients in document
      this.io.to(`doc-${documentId}`).emit("operation-applied", {
        documentId,
        operation: transformedOp,
        version: result.version,
      });

      // Track operation
      this.tracker.trackEvent(presence.userId, "api_call", "apply_operation", {
        documentId,
        operationType: operation.type,
        domain: "collaboration",
      });
    } catch (error) {
      console.error("[Collaboration] Operation failed:", error);
      socket.emit("error", "Operation failed");
    }
  }

  /**
   * Handle cursor movement
   */
  private handleCursorMove(socket: any, data: any) {
    const { documentId, cursorPosition } = data;
    const presence = this.presences.get(socket.id);

    if (!presence) return;

    // Update presence
    presence.cursorPosition = cursorPosition;
    presence.lastUpdate = Date.now();

    // Update session
    this.editor.updateSessionCursor(socket.id, cursorPosition);

    // Broadcast cursor update
    const update: CursorUpdate = {
      userId: presence.userId,
      clientId: socket.id,
      cursorPosition,
      userName: presence.userName,
      color: this.userColors.get(presence.userId) || "#000000",
    };

    this.io.to(`doc-${documentId}`).emit("cursor-updated", {
      documentId,
      cursor: update,
    });
  }

  /**
   * Handle lock request
   */
  private handleLockRequest(socket: any, data: any) {
    const { documentId, path } = data;
    const presence = this.presences.get(socket.id);

    if (!presence) {
      socket.emit("error", "Not in a document");
      return;
    }

    const lockResult = this.editor.acquireLock(path, presence.userId);

    if (!lockResult.success) {
      socket.emit("lock-denied", {
        path,
        reason: lockResult.error,
      });
      return;
    }

    socket.emit("lock-acquired", {
      path,
    });

    // Broadcast lock to other clients
    this.io.to(`doc-${documentId}`).emit("lock-changed", {
      documentId,
      path,
      locked: true,
      lockedBy: presence.userId,
    });
  }

  /**
   * Handle unlock request
   */
  private handleUnlock(socket: any, data: any) {
    const { documentId, path } = data;
    const presence = this.presences.get(socket.id);

    if (!presence) return;

    this.editor.releaseLock(path, presence.userId);

    // Broadcast unlock
    this.io.to(`doc-${documentId}`).emit("lock-changed", {
      documentId,
      path,
      locked: false,
    });
  }

  /**
   * Handle comment
   */
  private handleComment(socket: any, data: any) {
    const { documentId, commentId, path, content, range } = data;
    const presence = this.presences.get(socket.id);

    if (!presence) return;

    // Broadcast comment to all clients
    this.io.to(`doc-${documentId}`).emit("comment-added", {
      documentId,
      comment: {
        id: commentId,
        path,
        content,
        range,
        author: presence.userName,
        authorId: presence.userId,
        timestamp: Date.now(),
        resolved: false,
      },
    });

    // Track event
    this.tracker.trackEvent(presence.userId, "api_call", "add_comment", {
      documentId,
      domain: "collaboration",
    });
  }

  /**
   * Handle mention
   */
  private handleMention(socket: any, data: any) {
    const { documentId, mentionedUserId, commentId, message } = data;
    const presence = this.presences.get(socket.id);

    if (!presence) return;

    // Find mentioned user's sockets
    const mentionedSockets = Array.from(this.presences.values())
      .filter((p) => p.userId === mentionedUserId)
      .map((p) => p.clientId);

    // Send notification to mentioned user
    mentionedSockets.forEach((socketId) => {
      this.io.to(socketId).emit("mentioned", {
        documentId,
        mentionedBy: presence.userName,
        message,
        commentId,
        timestamp: Date.now(),
      });
    });

    // Track event
    this.tracker.trackEvent(presence.userId, "api_call", "mention_user", {
      documentId,
      mentionedUserId,
      domain: "collaboration",
    });
  }

  /**
   * Handle sync request
   */
  private handleSyncRequest(socket: any, data: any) {
    const { documentId, revision } = data;

    const doc = this.editor.getDocument(documentId);
    if (!doc) {
      socket.emit("error", "Document not found");
      return;
    }

    // Get operations since client's revision
    const operations = this.editor.getOperationHistory(
      documentId,
      revision
    );

    socket.emit("sync-response", {
      documentId,
      content: doc.content,
      revision: doc.revision,
      operations,
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: any) {
    const presence = this.presences.get(socket.id);

    if (presence) {
      const documentId = presence.clientId; // Would need to track document per session
      this.editor.endSession(socket.id);
      this.presences.delete(socket.id);

      // Remove from subscriptions
      for (const [docId, clientIds] of this.documentSubscriptions.entries()) {
        clientIds.delete(socket.id);
      }

      // Broadcast presence update
      // this.io.to(`doc-${documentId}`).emit("presence-updated", ...);

      console.log(`[Collaboration] Client disconnected: ${socket.id}`);
    }
  }

  /**
   * Get active presences for a document
   */
  private getDocumentPresences(documentId: string): PresenceInfo[] {
    return Array.from(this.presences.values()).filter(
      (p) => p.status !== "idle"
    );
  }

  /**
   * Generate color for user cursor
   */
  private generateColor(): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get collaboration statistics
   */
  getStats() {
    return {
      activeConnections: this.io.engine.clientsCount,
      documentsActive: this.documentSubscriptions.size,
      presences: this.presences.size,
      documentsBeingEdited: Array.from(this.documentSubscriptions.entries())
        .filter(([, clients]) => clients.size > 0)
        .map(([docId, clients]) => ({
          documentId: docId,
          activeUsers: new Set(
            Array.from(clients)
              .map((id) => this.presences.get(id)?.userId)
              .filter(Boolean)
          ).size,
        })),
    };
  }
}

/**
 * Initialize collaboration server
 */
export function initializeCollaborationServer(io: SocketIOServer): CollaborationServer {
  return new CollaborationServer(io);
}
