/**
 * WebSocket Server for Real-time Synchronization
 *
 * Manages real-time events for:
 * - Tile updates (create, delete, modify)
 * - Inference saves
 * - User presence
 * - Search broadcasts
 */

import { Server } from "socket.io";
import { createServer } from "http";

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
  channel?: string; // Optional: for domain-specific updates
}

export interface ActiveUser {
  userId: string;
  username: string;
  status: "online" | "idle" | "offline";
  currentAction?: string;
  lastSeen: number;
  connectedDevices: number;
}

export class RealtimeServer {
  private io: Server;
  private activeUsers: Map<string, ActiveUser> = new Map();
  private eventLog: RealtimeEvent[] = [];
  private maxEventLog: number = 1000;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`[WS] User connected: ${socket.id}`);

      // User joined
      socket.on("user:join", (userData: { userId: string; username: string }) => {
        this.handleUserJoin(socket, userData);
      });

      // User left
      socket.on("disconnect", () => {
        this.handleUserDisconnect(socket);
      });

      // Real-time events
      socket.on("event:publish", (event: RealtimeEvent) => {
        this.handleEventPublish(socket, event);
      });

      // User status update
      socket.on("user:status", (status: string) => {
        this.handleUserStatus(socket, status);
      });

      // Request active users
      socket.on("users:list", (callback) => {
        this.handleUsersList(callback);
      });

      // Join domain-specific channel
      socket.on("channel:join", (domain: string) => {
        socket.join(`domain:${domain}`);
        console.log(`[WS] User ${socket.id} joined domain: ${domain}`);
      });

      // Leave domain-specific channel
      socket.on("channel:leave", (domain: string) => {
        socket.leave(`domain:${domain}`);
        console.log(`[WS] User ${socket.id} left domain: ${domain}`);
      });

      // Acknowledgement
      socket.emit("connection:established", { socketId: socket.id });
    });
  }

  /**
   * Handle user join event
   */
  private handleUserJoin(socket: any, userData: { userId: string; username: string }) {
    const activeUser: ActiveUser = {
      userId: userData.userId,
      username: userData.username,
      status: "online",
      lastSeen: Date.now(),
      connectedDevices: 1,
    };

    // Check if user already has active sessions
    const existingUser = this.activeUsers.get(userData.userId);
    if (existingUser) {
      activeUser.connectedDevices = existingUser.connectedDevices + 1;
    }

    this.activeUsers.set(userData.userId, activeUser);

    // Map socket to user for later reference
    socket.data.userId = userData.userId;
    socket.data.username = userData.username;

    // Broadcast user joined
    const event: RealtimeEvent = {
      type: "user:joined",
      data: activeUser,
      userId: userData.userId,
      timestamp: Date.now(),
    };

    this.io.emit("realtime:event", event);
    this.logEvent(event);

    // Send current active users to new user
    this.io.to(socket.id).emit("users:active", Array.from(this.activeUsers.values()));

    console.log(`[WS] User ${userData.username} joined. Active users: ${this.activeUsers.size}`);
  }

  /**
   * Handle user disconnect
   */
  private handleUserDisconnect(socket: any) {
    if (!socket.data.userId) return;

    const userId = socket.data.userId;
    const user = this.activeUsers.get(userId);

    if (user) {
      user.connectedDevices = Math.max(0, user.connectedDevices - 1);

      if (user.connectedDevices === 0) {
        this.activeUsers.delete(userId);

        // Broadcast user left
        const event: RealtimeEvent = {
          type: "user:left",
          data: { userId, username: user.username },
          userId,
          timestamp: Date.now(),
        };

        this.io.emit("realtime:event", event);
        this.logEvent(event);

        console.log(`[WS] User ${user.username} disconnected. Active users: ${this.activeUsers.size}`);
      }
    }
  }

  /**
   * Publish a real-time event
   */
  private handleEventPublish(socket: any, event: RealtimeEvent) {
    event.userId = socket.data.userId;
    event.timestamp = Date.now();

    // Route based on channel
    if (event.channel) {
      this.io.to(`domain:${event.channel}`).emit("realtime:event", event);
    } else {
      this.io.emit("realtime:event", event);
    }

    this.logEvent(event);
    console.log(`[WS] Event published: ${event.type} by ${socket.data.username}`);
  }

  /**
   * Handle user status update
   */
  private handleUserStatus(socket: any, status: string) {
    const user = this.activeUsers.get(socket.data.userId);
    if (user) {
      user.status = status as "online" | "idle" | "offline";
      user.lastSeen = Date.now();

      this.io.emit("user:status:changed", {
        userId: user.userId,
        status: user.status,
      });
    }
  }

  /**
   * Return list of active users
   */
  private handleUsersList(callback: Function) {
    callback(Array.from(this.activeUsers.values()));
  }

  /**
   * Log event for audit trail
   */
  private logEvent(event: RealtimeEvent) {
    this.eventLog.push(event);

    // Keep only last 1000 events
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.maxEventLog);
    }
  }

  /**
   * Get recent events for offline sync
   */
  public getEventsSince(timestamp: number): RealtimeEvent[] {
    return this.eventLog.filter((e) => e.timestamp > timestamp);
  }

  /**
   * Get all active users
   */
  public getActiveUsers(): ActiveUser[] {
    return Array.from(this.activeUsers.values());
  }

  /**
   * Broadcast tile update
   */
  public broadcastTileUpdate(
    tileId: string,
    action: "created" | "updated" | "deleted",
    data: Record<string, any>,
    userId: string,
    domain?: string
  ) {
    const event: RealtimeEvent = {
      type: `tile:${action}`,
      data: { tileId, ...data },
      userId,
      timestamp: Date.now(),
      channel: domain,
    };

    if (domain) {
      this.io.to(`domain:${domain}`).emit("realtime:event", event);
    } else {
      this.io.emit("realtime:event", event);
    }

    this.logEvent(event);
  }

  /**
   * Broadcast inference save
   */
  public broadcastInferenceSave(
    tileId: string,
    data: Record<string, any>,
    userId: string,
    domain?: string
  ) {
    const event: RealtimeEvent = {
      type: "inference:saved",
      data: { tileId, ...data },
      userId,
      timestamp: Date.now(),
      channel: domain,
    };

    if (domain) {
      this.io.to(`domain:${domain}`).emit("realtime:event", event);
    } else {
      this.io.emit("realtime:event", event);
    }

    this.logEvent(event);
  }

  /**
   * Get Socket.io instance for direct access
   */
  public getIO(): Server {
    return this.io;
  }
}

/**
 * Singleton instance
 */
let realtimeServerInstance: RealtimeServer | null = null;

export function getRealtimeServer(server?: any): RealtimeServer {
  if (!realtimeServerInstance && server) {
    realtimeServerInstance = new RealtimeServer(server);
  }
  return realtimeServerInstance!;
}

export function resetRealtimeServer(): void {
  realtimeServerInstance = null;
}
