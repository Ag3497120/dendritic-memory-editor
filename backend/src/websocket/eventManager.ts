/**
 * Real-time Event Manager
 *
 * Central hub for managing and coordinating real-time events
 * Provides methods for syncing tiles, inferences, and user actions
 */

import { getRealtimeServer } from "./server";

export interface TileUpdateEvent {
  tileId: string;
  topic?: string;
  domain?: string;
  content?: string;
  author_mark?: "expert" | "community";
  confidence_score?: number;
  version?: number;
  updated_at?: string;
}

export interface InferenceEvent {
  tileId: string;
  topic: string;
  domain: string;
  question: string;
  answer: string;
  confidence_score: number;
  author_mark: "expert" | "community";
}

export interface UserAction {
  userId: string;
  action: string;
  domain?: string;
  details?: Record<string, any>;
}

export class RealtimeEventManager {
  /**
   * Notify tile creation
   */
  static notifyTileCreated(
    tileId: string,
    data: TileUpdateEvent,
    userId: string
  ) {
    const server = getRealtimeServer();
    server.broadcastTileUpdate(tileId, "created", data, userId, data.domain);

    console.log(
      `[EventManager] Tile created: ${tileId} by ${userId} in domain ${data.domain}`
    );
  }

  /**
   * Notify tile update
   */
  static notifyTileUpdated(
    tileId: string,
    data: TileUpdateEvent,
    userId: string
  ) {
    const server = getRealtimeServer();
    server.broadcastTileUpdate(tileId, "updated", data, userId, data.domain);

    console.log(
      `[EventManager] Tile updated: ${tileId} by ${userId} in domain ${data.domain}`
    );
  }

  /**
   * Notify tile deletion
   */
  static notifyTileDeleted(
    tileId: string,
    domain: string,
    userId: string
  ) {
    const server = getRealtimeServer();
    server.broadcastTileUpdate(tileId, "deleted", { tileId }, userId, domain);

    console.log(`[EventManager] Tile deleted: ${tileId} by ${userId}`);
  }

  /**
   * Notify inference saved
   */
  static notifyInferenceSaved(
    tileId: string,
    data: InferenceEvent,
    userId: string
  ) {
    const server = getRealtimeServer();
    server.broadcastInferenceSave(tileId, data, userId, data.domain);

    console.log(
      `[EventManager] Inference saved: ${tileId} by ${userId} in domain ${data.domain}`
    );
  }

  /**
   * Publish user action for awareness
   */
  static publishUserAction(action: UserAction) {
    const server = getRealtimeServer();
    const io = server.getIO();

    if (action.domain) {
      io.to(`domain:${action.domain}`).emit("user:action", action);
    } else {
      io.emit("user:action", action);
    }

    console.log(
      `[EventManager] User action: ${action.userId} - ${action.action}`
    );
  }

  /**
   * Broadcast search activity (for awareness without blocking)
   */
  static broadcastSearchActivity(
    userId: string,
    query: string,
    domain?: string
  ) {
    const server = getRealtimeServer();
    const io = server.getIO();

    const activity = {
      userId,
      type: "user:searching",
      query,
      timestamp: Date.now(),
    };

    if (domain) {
      io.to(`domain:${domain}`).emit("activity:update", activity);
    } else {
      io.emit("activity:update", activity);
    }
  }

  /**
   * Broadcast inference activity (for awareness without blocking)
   */
  static broadcastInferenceActivity(
    userId: string,
    question: string,
    domain?: string
  ) {
    const server = getRealtimeServer();
    const io = server.getIO();

    const activity = {
      userId,
      type: "user:inferring",
      question,
      timestamp: Date.now(),
    };

    if (domain) {
      io.to(`domain:${domain}`).emit("activity:update", activity);
    } else {
      io.emit("activity:update", activity);
    }
  }

  /**
   * Get recent events for offline sync
   */
  static getEventsSince(timestamp: number) {
    const server = getRealtimeServer();
    return server.getEventsSince(timestamp);
  }

  /**
   * Get all active users
   */
  static getActiveUsers() {
    const server = getRealtimeServer();
    return server.getActiveUsers();
  }
}
