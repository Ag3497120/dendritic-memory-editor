/**
 * useCollaborativeEditor Hook
 *
 * React hook for managing collaborative editing state and operations
 * Handles real-time synchronization with backend
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface CollaborativeEditorState {
  documentId: string;
  content: any;
  revision: number;
  operations: any[];
  localChanges: any[];
  isLoading: boolean;
  error: string | null;
  cursors: Record<string, CursorInfo>;
  locks: Set<string>;
  comments: Comment[];
  presences: PresenceInfo[];
}

export interface CursorInfo {
  userId: string;
  clientId: string;
  position: number;
  userName: string;
  color: string;
}

export interface PresenceInfo {
  userId: string;
  clientId: string;
  userName: string;
  status: "editing" | "viewing" | "idle";
  cursorPosition: number;
}

export interface Comment {
  id: string;
  path: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: number;
  resolved: boolean;
  range?: { start: number; end: number };
}

export interface Lock {
  path: string;
  lockedBy: string;
}

/**
 * Hook for collaborative editing
 */
export function useCollaborativeEditor(
  documentId: string,
  userId: string,
  userName: string
) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<CollaborativeEditorState>({
    documentId,
    content: null,
    revision: 0,
    operations: [],
    localChanges: [],
    isLoading: true,
    error: null,
    cursors: {},
    locks: new Set(),
    comments: [],
    presences: [],
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = io(
      process.env.REACT_APP_COLLABORATION_SERVER ||
        "http://localhost:8787/collaboration",
      {
        transports: ["websocket"],
        query: {
          documentId,
          userId,
          userName,
        },
      }
    );

    socketRef.current = socket;

    // Join document
    socket.emit("join-document", {
      documentId,
      userId,
      userName,
    });

    // Handle document loaded
    socket.on("document-loaded", (data) => {
      setState((prev) => ({
        ...prev,
        content: data.content,
        revision: data.revision,
        operations: data.operations,
        isLoading: false,
      }));
    });

    // Handle operation applied
    socket.on("operation-applied", (data) => {
      setState((prev) => ({
        ...prev,
        content: data.version.content,
        revision: data.version.revision,
        operations: [...prev.operations, data.operation],
      }));
    });

    // Handle cursor updates
    socket.on("cursor-updated", (data) => {
      setState((prev) => ({
        ...prev,
        cursors: {
          ...prev.cursors,
          [data.cursor.clientId]: {
            userId: data.cursor.userId,
            clientId: data.cursor.clientId,
            position: data.cursor.cursorPosition,
            userName: data.cursor.userName,
            color: data.cursor.color,
          },
        },
      }));
    });

    // Handle presence updates
    socket.on("presence-updated", (data) => {
      setState((prev) => ({
        ...prev,
        presences: data.presences,
      }));
    });

    // Handle lock changes
    socket.on("lock-changed", (data) => {
      setState((prev) => {
        const newLocks = new Set(prev.locks);
        if (data.locked) {
          newLocks.add(data.path);
        } else {
          newLocks.delete(data.path);
        }
        return {
          ...prev,
          locks: newLocks,
        };
      });
    });

    // Handle comments
    socket.on("comment-added", (data) => {
      setState((prev) => ({
        ...prev,
        comments: [...prev.comments, data.comment],
      }));
    });

    // Handle mentions
    socket.on("mentioned", (data) => {
      console.log(`[Mention] ${data.mentionedBy} mentioned you: ${data.message}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      setState((prev) => ({
        ...prev,
        error,
      }));
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [documentId, userId, userName]);

  /**
   * Apply a local operation
   */
  const applyOperation = useCallback(
    (operation: any) => {
      if (!socketRef.current) return;

      socketRef.current.emit("operation", {
        documentId,
        operation: {
          ...operation,
          clientId: socketRef.current.id,
          userId,
        },
      });

      // Track locally
      setState((prev) => ({
        ...prev,
        localChanges: [...prev.localChanges, operation],
      }));
    },
    [documentId, userId]
  );

  /**
   * Update content at a path
   */
  const updateContent = useCallback(
    (path: string, value: any) => {
      applyOperation({
        type: "update",
        path,
        value,
      });
    },
    [applyOperation]
  );

  /**
   * Insert value at path
   */
  const insertValue = useCallback(
    (path: string, value: any, position?: number) => {
      applyOperation({
        type: "insert",
        path,
        value,
        position,
      });
    },
    [applyOperation]
  );

  /**
   * Delete value at path
   */
  const deleteValue = useCallback(
    (path: string, position?: number, length?: number) => {
      applyOperation({
        type: "delete",
        path,
        position,
        length,
      });
    },
    [applyOperation]
  );

  /**
   * Update cursor position
   */
  const updateCursor = useCallback(
    (position: number) => {
      if (!socketRef.current) return;

      socketRef.current.emit("cursor-move", {
        documentId,
        cursorPosition: position,
      });
    },
    [documentId]
  );

  /**
   * Request lock on a path
   */
  const requestLock = useCallback(
    (path: string) => {
      if (!socketRef.current) return;

      socketRef.current.emit("request-lock", {
        documentId,
        path,
      });
    },
    [documentId]
  );

  /**
   * Release lock on a path
   */
  const releaseLock = useCallback(
    (path: string) => {
      if (!socketRef.current) return;

      socketRef.current.emit("release-lock", {
        documentId,
        path,
      });
    },
    [documentId]
  );

  /**
   * Add a comment
   */
  const addComment = useCallback(
    (
      path: string,
      content: string,
      range?: { start: number; end: number }
    ) => {
      if (!socketRef.current) return;

      socketRef.current.emit("add-comment", {
        documentId,
        commentId: `comment-${Date.now()}`,
        path,
        content,
        range,
      });
    },
    [documentId]
  );

  /**
   * Mention a user
   */
  const mentionUser = useCallback(
    (mentionedUserId: string, message: string, commentId?: string) => {
      if (!socketRef.current) return;

      socketRef.current.emit("mention", {
        documentId,
        mentionedUserId,
        message,
        commentId: commentId || `comment-${Date.now()}`,
      });
    },
    [documentId]
  );

  /**
   * Request synchronization
   */
  const requestSync = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit("request-sync", {
      documentId,
      revision: state.revision,
    });
  }, [documentId, state.revision]);

  /**
   * Get other users in document
   */
  const getOtherUsers = useCallback(() => {
    return state.presences
      .filter((p) => p.userId !== userId)
      .map((p) => ({
        userId: p.userId,
        userName: p.userName,
        status: p.status,
        cursorPosition: p.cursorPosition,
      }));
  }, [state.presences, userId]);

  /**
   * Check if path is locked
   */
  const isPathLocked = useCallback(
    (path: string) => {
      return state.locks.has(path);
    },
    [state.locks]
  );

  /**
   * Get comments for a path
   */
  const getCommentsForPath = useCallback(
    (path: string) => {
      return state.comments.filter((c) => c.path === path && !c.resolved);
    },
    [state.comments]
  );

  return {
    // State
    state,
    content: state.content,
    revision: state.revision,
    isLoading: state.isLoading,
    error: state.error,
    cursors: state.cursors,
    comments: state.comments,
    presences: state.presences,

    // Operations
    applyOperation,
    updateContent,
    insertValue,
    deleteValue,

    // Cursor & Presence
    updateCursor,
    getOtherUsers,

    // Locks
    requestLock,
    releaseLock,
    isPathLocked,

    // Comments & Mentions
    addComment,
    mentionUser,
    getCommentsForPath,

    // Synchronization
    requestSync,
  };
}

/**
 * Hook for collaborative document list
 */
export function useCollaborativeDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch documents with collaboration info
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch from API
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/collaborative-documents`
      );
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    refetch: fetchDocuments,
  };
}
