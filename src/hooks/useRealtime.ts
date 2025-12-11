/**
 * useRealtime Hook
 *
 * Manages WebSocket connection and real-time events
 * Provides real-time synchronization for:
 * - Tile updates
 * - Inference saves
 * - User presence
 * - Activity broadcasts
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { io, Socket } from "socket.io-client";

export interface RealtimeEvent {
  type:
    | "tile:created"
    | "tile:updated"
    | "tile:deleted"
    | "inference:saved"
    | "user:joined"
    | "user:left"
    | "user:searching"
    | "user:inferring";
  data: Record<string, any>;
  userId: string;
  timestamp: number;
  channel?: string;
}

export interface ActiveUser {
  userId: string;
  username: string;
  status: "online" | "idle" | "offline";
  currentAction?: string;
  lastSeen: number;
  connectedDevices: number;
}

interface RealtimeState {
  isConnected: boolean;
  activeUsers: ActiveUser[];
  lastEvent: RealtimeEvent | null;
  error: string | null;
}

const WEBSOCKET_URL =
  process.env.REACT_APP_WEBSOCKET_URL || "http://localhost:8787";

export function useRealtime(enabled: boolean = true) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    activeUsers: [],
    lastEvent: null,
    error: null,
  });

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!enabled || !user) return;

    console.log("[Realtime] Connecting to WebSocket server...");

    const socket = io(WEBSOCKET_URL, {
      auth: {
        token: localStorage.getItem("token") || "",
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection established
    socket.on("connection:established", (data: any) => {
      console.log("[Realtime] Connected with socket ID:", data.socketId);
      setState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }));

      // Join as user
      socket.emit("user:join", {
        userId: user.id || "anonymous",
        username: user.email || "User",
      });
    });

    // Receive active users
    socket.on("users:active", (users: ActiveUser[]) => {
      console.log("[Realtime] Active users updated:", users.length);
      setState((prev) => ({
        ...prev,
        activeUsers: users,
      }));
    });

    // Real-time event
    socket.on("realtime:event", (event: RealtimeEvent) => {
      console.log("[Realtime] Event received:", event.type);
      setState((prev) => ({
        ...prev,
        lastEvent: event,
      }));

      // Trigger custom callback if needed
      window.dispatchEvent(
        new CustomEvent("realtime:event", { detail: event })
      );
    });

    // User status changed
    socket.on("user:status:changed", (data: any) => {
      console.log("[Realtime] User status changed:", data.userId, data.status);
      setState((prev) => ({
        ...prev,
        activeUsers: prev.activeUsers.map((u) =>
          u.userId === data.userId ? { ...u, status: data.status } : u
        ),
      }));
    });

    // Activity update (non-blocking awareness)
    socket.on("activity:update", (activity: any) => {
      window.dispatchEvent(
        new CustomEvent("realtime:activity", { detail: activity })
      );
    });

    // Connection errors
    socket.on("connect_error", (error: any) => {
      console.error("[Realtime] Connection error:", error.message);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: error.message,
      }));
    });

    socket.on("disconnect", () => {
      console.log("[Realtime] Disconnected from server");
      setState((prev) => ({
        ...prev,
        isConnected: false,
      }));
    });

    // Cleanup on unmount
    return () => {
      console.log("[Realtime] Cleaning up connection");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, user]);

  /**
   * Get list of active users
   */
  const getActiveUsers = useCallback(() => {
    return state.activeUsers;
  }, [state.activeUsers]);

  /**
   * Publish a tile event
   */
  const publishTileEvent = useCallback(
    (type: string, data: Record<string, any>, domain?: string) => {
      if (!socketRef.current?.connected) {
        console.warn("[Realtime] Not connected, cannot publish event");
        return;
      }

      socketRef.current.emit("event:publish", {
        type,
        data,
        channel: domain,
      });
    },
    []
  );

  /**
   * Publish inference event
   */
  const publishInferenceEvent = useCallback(
    (data: Record<string, any>, domain?: string) => {
      if (!socketRef.current?.connected) {
        console.warn("[Realtime] Not connected, cannot publish event");
        return;
      }

      socketRef.current.emit("event:publish", {
        type: "inference:saved",
        data,
        channel: domain,
      });
    },
    []
  );

  /**
   * Broadcast search activity
   */
  const broadcastSearchActivity = useCallback((query: string, domain?: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("user:action", {
      action: "searching",
      query,
      domain,
    });
  }, []);

  /**
   * Broadcast inference activity
   */
  const broadcastInferenceActivity = useCallback((question: string, domain?: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("user:action", {
      action: "inferring",
      question,
      domain,
    });
  }, []);

  /**
   * Join domain channel
   */
  const joinDomainChannel = useCallback((domain: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("channel:join", domain);
  }, []);

  /**
   * Leave domain channel
   */
  const leaveDomainChannel = useCallback((domain: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("channel:leave", domain);
  }, []);

  /**
   * Update user status
   */
  const updateUserStatus = useCallback((status: "online" | "idle" | "offline") => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("user:status", status);
  }, []);

  return {
    // Connection state
    isConnected: state.isConnected,
    error: state.error,

    // Active users
    activeUsers: state.activeUsers,
    getActiveUsers,

    // Event publishing
    publishTileEvent,
    publishInferenceEvent,
    broadcastSearchActivity,
    broadcastInferenceActivity,

    // Channel management
    joinDomainChannel,
    leaveDomainChannel,

    // User management
    updateUserStatus,

    // Last event (for reactive updates)
    lastEvent: state.lastEvent,
  };
}

export default useRealtime;
