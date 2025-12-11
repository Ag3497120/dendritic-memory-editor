/**
 * GraphQL Resolvers
 *
 * Implements all Query, Mutation, and Subscription resolvers
 * Bridges GraphQL operations to backend services
 */

import { GraphQLResolveInfo } from "graphql";
import { getMCPClient } from "../mcp/client";
import { RealtimeEventManager } from "../websocket/eventManager";
import { getRealtimeServer } from "../websocket/server";
import apiClient from "../apiClient";

export const resolvers = {
  Query: {
    /**
     * Fetch single tile by ID
     */
    tile: async (_: any, { id }: { id: string }, context: any) => {
      const response = await apiClient.get(`/api/tiles/${id}`);
      return response.data;
    },

    /**
     * Fetch tiles with filters
     */
    tiles: async (
      _: any,
      {
        domain,
        authorMark,
        limit = 20,
        offset = 0,
      }: {
        domain?: string;
        authorMark?: string;
        limit?: number;
        offset?: number;
      },
      context: any
    ) => {
      const params: Record<string, any> = { limit, offset };
      if (domain) params.domain = domain;
      if (authorMark) params.author_mark = authorMark;

      const response = await apiClient.get("/api/tiles", { params });
      return response.data;
    },

    /**
     * Advanced search across tiles and inferences
     */
    search: async (
      _: any,
      { query: searchQuery }: { query: any },
      context: any
    ) => {
      const mcpClient = getMCPClient();

      const searchResult = await mcpClient.searchTiles({
        query: searchQuery.query,
        domain: searchQuery.domain,
        limit: searchQuery.limit || 20,
      });

      return {
        id: `search_${Date.now()}`,
        tiles: searchResult.tiles || [],
        inferences: [],
        totalCount: searchResult.total_count || 0,
        resultCount: searchResult.result_count || 0,
      };
    },

    /**
     * Fetch single inference by ID
     */
    inference: async (_: any, { id }: { id: string }, context: any) => {
      const response = await apiClient.get(`/api/mcp/saved-inferences`);
      const inferences = response.data.inferences || [];
      return inferences.find((inf: any) => inf.id === id);
    },

    /**
     * Fetch inferences with filters
     */
    inferences: async (
      _: any,
      {
        domain,
        limit = 20,
        offset = 0,
      }: {
        domain?: string;
        limit?: number;
        offset?: number;
      },
      context: any
    ) => {
      const response = await apiClient.get("/api/mcp/saved-inferences");
      let inferences = response.data.inferences || [];

      if (domain) {
        inferences = inferences.filter((inf: any) => inf.domain === domain);
      }

      return inferences.slice(offset, offset + limit);
    },

    /**
     * Get current authenticated user
     */
    me: async (_: any, __: any, context: any) => {
      return context.user || null;
    },

    /**
     * Get user by ID
     */
    user: async (_: any, { id }: { id: string }, context: any) => {
      const response = await apiClient.get(`/api/users/${id}`);
      return response.data;
    },

    /**
     * Get all users
     */
    users: async (
      _: any,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: any
    ) => {
      const response = await apiClient.get("/api/users", {
        params: { limit, offset },
      });
      return response.data;
    },

    /**
     * Get domain statistics
     */
    domainStatistics: async (
      _: any,
      { domain }: { domain?: string },
      context: any
    ) => {
      const mcpClient = getMCPClient();
      const stats = await mcpClient.getDomainStatistics();

      if (domain) {
        return stats.domains?.filter((d: any) => d.domain === domain) || [];
      }

      return stats.domains || [];
    },

    /**
     * Get overall database statistics
     */
    databaseStatistics: async (_: any, __: any, context: any) => {
      const response = await apiClient.get("/api/db/stats");
      return {
        totalTiles: response.data.total_knowledge_tiles || 0,
        totalUsers: response.data.total_users || 0,
        totalInferences: response.data.total_inferences || 0,
        domains: [],
        averageConfidence: 0.85,
        mostActiveDomains: [],
      };
    },

    /**
     * Get user's saved searches
     */
    savedSearches: async (_: any, __: any, context: any) => {
      if (!context.user) return [];

      const response = await apiClient.get("/api/saved-searches");
      return response.data.searches || [];
    },
  },

  Mutation: {
    /**
     * Create new tile
     */
    createTile: async (
      _: any,
      {
        topic,
        domain,
        content,
        authorMark,
        metadata,
      }: {
        topic: string;
        domain: string;
        content: string;
        authorMark: string;
        metadata?: any;
      },
      context: any
    ) => {
      const response = await apiClient.post("/api/tiles", {
        topic,
        domain,
        content,
        author_mark: authorMark?.toLowerCase() || "community",
        metadata,
      });

      const tile = response.data;

      // Broadcast tile creation event
      RealtimeEventManager.notifyTileCreated(
        tile.id,
        { domain, ...tile },
        context.user?.id
      );

      return tile;
    },

    /**
     * Update existing tile
     */
    updateTile: async (
      _: any,
      {
        id,
        topic,
        content,
        confidenceScore,
        changeReason,
      }: {
        id: string;
        topic?: string;
        content?: string;
        confidenceScore?: number;
        changeReason?: string;
      },
      context: any
    ) => {
      const response = await apiClient.patch(`/api/tiles/${id}`, {
        topic,
        content,
        confidence_score: confidenceScore,
        change_reason: changeReason,
      });

      const tile = response.data;

      // Broadcast tile update event
      RealtimeEventManager.notifyTileUpdated(
        tile.id,
        { domain: tile.domain, ...tile },
        context.user?.id
      );

      return tile;
    },

    /**
     * Delete tile
     */
    deleteTile: async (
      _: any,
      { id }: { id: string },
      context: any
    ) => {
      await apiClient.delete(`/api/tiles/${id}`);

      // Broadcast tile deletion event
      RealtimeEventManager.notifyTileDeleted(id, "general", context.user?.id);

      return true;
    },

    /**
     * Create inference (non-persisted)
     */
    createInference: async (
      _: any,
      {
        question,
        answer,
        confidenceScore,
        reasoningChain,
        domains,
        authorMark,
      }: {
        question: string;
        answer: string;
        confidenceScore: number;
        reasoningChain?: string;
        domains: string[];
        authorMark?: string;
      },
      context: any
    ) => {
      return {
        id: `inf_${Date.now()}`,
        question,
        answer,
        confidenceScore,
        reasoningChain,
        domains,
        modelUsed: "nullai",
        authorMark: authorMark?.toLowerCase() || "community",
        createdBy: context.user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },

    /**
     * Save inference as tile
     */
    saveInferenceAsTile: async (
      _: any,
      {
        question,
        answer,
        confidenceScore,
        reasoningChain,
        topic,
        domain,
        authorMark,
        domains,
      }: {
        question: string;
        answer: string;
        confidenceScore: number;
        reasoningChain?: string;
        topic: string;
        domain: string;
        authorMark: string;
        domains?: string[];
      },
      context: any
    ) => {
      const response = await apiClient.post("/api/mcp/save-inference", {
        question,
        answer,
        reasoning_chain: reasoningChain,
        confidence: confidenceScore,
        topic,
        domain,
        author_mark: authorMark.toLowerCase(),
        domains: domains || [],
      });

      const tile = response.data;

      // Broadcast inference saved event
      RealtimeEventManager.notifyInferenceSaved(
        tile.tile_id,
        {
          topic,
          domain,
          question,
          answer,
          confidence_score: confidenceScore,
          author_mark: authorMark.toLowerCase() as "expert" | "community",
        },
        context.user?.id
      );

      return tile;
    },

    /**
     * Delete inference
     */
    deleteInference: async (
      _: any,
      { id }: { id: string },
      context: any
    ) => {
      await apiClient.delete(`/api/mcp/saved-inferences/${id}`);
      return true;
    },

    /**
     * Save search query for later use
     */
    saveSearch: async (
      _: any,
      { name, query }: { name: string; query: any },
      context: any
    ) => {
      const response = await apiClient.post("/api/saved-searches", {
        name,
        query,
      });

      return response.data;
    },

    /**
     * Delete saved search
     */
    deleteSavedSearch: async (
      _: any,
      { id }: { id: string },
      context: any
    ) => {
      await apiClient.delete(`/api/saved-searches/${id}`);
      return true;
    },
  },

  Subscription: {
    /**
     * Subscribe to tile creation
     */
    tileCreated: {
      subscribe: (_: any, { domain }: { domain?: string }, context: any) => {
        const server = getRealtimeServer();
        const io = server.getIO();

        return new Promise((resolve) => {
          const handleTileCreated = (event: any) => {
            if (!domain || event.data.domain === domain) {
              resolve({
                tileCreated: event.data,
              });
            }
          };

          // Register listener
          io.on("realtime:event", handleTileCreated);
        });
      },
    },

    /**
     * Subscribe to inference saves
     */
    inferenceSaved: {
      subscribe: (_: any, { domain }: { domain?: string }, context: any) => {
        const server = getRealtimeServer();
        const io = server.getIO();

        return new Promise((resolve) => {
          const handleInferenceSaved = (event: any) => {
            if (!domain || event.data.domain === domain) {
              resolve({
                inferenceSaved: event.data,
              });
            }
          };

          io.on("realtime:event", handleInferenceSaved);
        });
      },
    },

    /**
     * Subscribe to user presence changes
     */
    userPresenceChanged: {
      subscribe: (_: any, __: any, context: any) => {
        const server = getRealtimeServer();
        const io = server.getIO();

        return new Promise((resolve) => {
          const handlePresenceChange = (user: any) => {
            resolve({
              userPresenceChanged: user,
            });
          };

          io.on("user:status:changed", handlePresenceChange);
        });
      },
    },

    /**
     * Subscribe to activity updates
     */
    activityUpdate: {
      subscribe: (_: any, __: any, context: any) => {
        const server = getRealtimeServer();
        const io = server.getIO();

        return new Promise((resolve) => {
          const handleActivityUpdate = (activity: any) => {
            resolve({
              activityUpdate: {
                userId: activity.userId,
                type: activity.type,
                timestamp: new Date().toISOString(),
                domain: activity.domain,
                metadata: activity.details,
              },
            });
          };

          io.on("activity:update", handleActivityUpdate);
        });
      },
    },
  },

  // Field Resolvers
  Tile: {
    /**
     * Resolve related tiles
     */
    relatedTiles: async (
      tile: any,
      { limit = 5 }: { limit?: number },
      context: any
    ) => {
      const mcpClient = getMCPClient();
      const results = await mcpClient.searchTiles({
        query: tile.topic,
        domain: tile.domain,
        limit,
      });

      return results.tiles?.filter((t: any) => t.id !== tile.id) || [];
    },

    /**
     * Resolve tile version history
     */
    history: async (
      tile: any,
      { limit = 10 }: { limit?: number },
      context: any
    ) => {
      const mcpClient = getMCPClient();
      const history = await mcpClient.getTileHistory(tile.id, true);
      return history.history?.slice(0, limit) || [];
    },
  },

  User: {
    /**
     * Resolve user's tiles
     */
    tiles: async (
      user: any,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: any
    ) => {
      const response = await apiClient.get("/api/tiles", {
        params: {
          author_id: user.id,
          limit,
          offset,
        },
      });

      return response.data;
    },

    /**
     * Resolve user's inferences
     */
    inferences: async (
      user: any,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: any
    ) => {
      const response = await apiClient.get("/api/mcp/saved-inferences", {
        params: {
          author_id: user.id,
          limit,
          offset,
        },
      });

      return response.data.inferences || [];
    },
  },

  DomainStatistics: {
    /**
     * Resolve recent tiles for domain
     */
    recentTiles: async (
      stats: any,
      { limit = 5 }: { limit?: number },
      context: any
    ) => {
      const response = await apiClient.get("/api/tiles", {
        params: {
          domain: stats.domain,
          limit,
          sort: "recent",
        },
      });

      return response.data;
    },
  },
};
