/**
 * Apollo Server Setup
 *
 * Configures Apollo Server with:
 * - GraphQL schema from schema.graphql
 * - Resolvers for all operations
 * - WebSocket support for subscriptions
 * - Error handling and logging
 * - Authentication middleware
 */

import { ApolloServer, BaseContext } from "@apollo/server";
import { readFileSync } from "fs";
import { join } from "path";
import { resolvers } from "./resolvers";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use-ws";
import { makeExecutableSchema } from "@graphql-tools/schema";

/**
 * Read GraphQL schema file
 */
const schemaPath = join(__dirname, "schema.graphql");
const typeDefs = readFileSync(schemaPath, "utf-8");

/**
 * Create executable schema
 */
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

/**
 * Apollo Server instance
 */
export function createApolloServer() {
  return new ApolloServer<BaseContext>({
    schema,

    // Error handling
    formatError: (error) => {
      console.error("[GraphQL Error]", error);

      // Sanitize error for client
      return {
        message: error.message,
        extensions: {
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
        },
      };
    },

    // Logging
    includeStacktraceInErrorResponses: process.env.NODE_ENV === "development",

    // Context initialization
    context: async ({ req }) => {
      // Extract user from JWT token
      const token = req?.headers?.authorization?.replace("Bearer ", "");

      let user = null;
      if (token) {
        try {
          // Verify and decode JWT (implement based on your auth strategy)
          user = {
            id: "user_123", // Decode from token
            email: "user@example.com",
            isExpert: false,
          };
        } catch (error) {
          console.error("Token verification failed:", error);
        }
      }

      return {
        user,
        token,
      };
    },

    // Introspection enabled for development
    introspection: process.env.NODE_ENV !== "production",
  });
}

/**
 * Setup WebSocket for subscriptions
 */
export function setupWebSocketServer(
  httpServer: any,
  apolloServer: ApolloServer
) {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql/subscriptions",
  });

  useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        return {
          user: null, // Implement user extraction from connection context
          token: null,
        };
      },
      onConnect: (ctx) => {
        console.log("[GraphQL WS] Client connected");
      },
      onDisconnect: (ctx, code, reason) => {
        console.log("[GraphQL WS] Client disconnected", code, reason);
      },
      onError: (ctx, msg, error) => {
        console.error("[GraphQL WS Error]", error);
      },
    },
    wsServer
  );

  return wsServer;
}

export { schema };
