/**
 * useGraphQL Hook
 *
 * Provides GraphQL query, mutation, and subscription capabilities
 * Integrates with Apollo Client for caching and state management
 */

import { useCallback, useState } from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
  Observable,
  gql,
  useQuery as apolloUseQuery,
  useMutation as apolloUseMutation,
  useSubscription as apolloUseSubscription,
} from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { useAuth } from "./useAuth";

/**
 * Initialize Apollo Client
 */
export function initializeApolloClient() {
  const httpLink = new HttpLink({
    uri:
      process.env.REACT_APP_GRAPHQL_ENDPOINT ||
      "http://localhost:8787/graphql",
    credentials: "include",
  });

  const wsLink = new WebSocketLink({
    uri:
      process.env.REACT_APP_GRAPHQL_WS ||
      "ws://localhost:8787/graphql/subscriptions",
    options: {
      reconnect: true,
      connectionParams: {
        authorization: localStorage.getItem("token") || "",
      },
    },
  });

  const splitLink = ApolloLink.split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    httpLink
  );

  // Auth middleware
  const authLink = new ApolloLink((operation, forward) => {
    const token = localStorage.getItem("token");

    operation.setContext({
      headers: {
        authorization: token ? `Bearer ${token}` : "",
      },
    });

    return forward(operation);
  });

  return new ApolloClient({
    link: authLink.concat(splitLink),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            tiles: {
              keyArgs: ["domain"],
              merge(existing = [], incoming, { args }) {
                if (args?.offset) {
                  return [...existing, ...incoming];
                }
                return incoming;
              },
            },
            inferences: {
              keyArgs: ["domain"],
              merge(existing = [], incoming, { args }) {
                if (args?.offset) {
                  return [...existing, ...incoming];
                }
                return incoming;
              },
            },
          },
        },
      },
    }),
  });
}

/**
 * useGraphQL Hook
 */
export function useGraphQL() {
  const { user } = useAuth();
  const [client] = useState(() => initializeApolloClient());

  /**
   * Execute GraphQL query
   */
  const query = useCallback(
    async (queryString: string, variables?: Record<string, any>) => {
      try {
        const result = await client.query({
          query: gql(queryString),
          variables,
          fetchPolicy: "network-first",
        });

        return {
          data: result.data,
          error: null,
          loading: false,
        };
      } catch (error) {
        return {
          data: null,
          error:
            error instanceof Error ? error.message : "Query failed",
          loading: false,
        };
      }
    },
    [client]
  );

  /**
   * Execute GraphQL mutation
   */
  const mutate = useCallback(
    async (mutationString: string, variables?: Record<string, any>) => {
      try {
        const result = await client.mutate({
          mutation: gql(mutationString),
          variables,
        });

        return {
          data: result.data,
          error: null,
        };
      } catch (error) {
        return {
          data: null,
          error:
            error instanceof Error ? error.message : "Mutation failed",
        };
      }
    },
    [client]
  );

  /**
   * Get Apollo client for direct usage
   */
  const getClient = useCallback(() => client, [client]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    client.cache.reset();
  }, [client]);

  return {
    query,
    mutate,
    getClient,
    clearCache,
  };
}

/**
 * Batch query execution
 */
export async function batchGraphQL(
  queries: Array<{
    query: string;
    variables?: Record<string, any>;
  }>
): Promise<any[]> {
  try {
    const response = await fetch(
      process.env.REACT_APP_GRAPHQL_ENDPOINT ||
        "http://localhost:8787/graphql/batch",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(queries),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[Batch GraphQL Error]", error);
    throw error;
  }
}

/**
 * useQuery Hook wrapper
 */
export function useGraphQLQuery(
  query: string,
  variables?: Record<string, any>
) {
  const client = initializeApolloClient();

  return apolloUseQuery(gql(query), {
    variables,
    client,
    fetchPolicy: "cache-first",
  });
}

/**
 * useMutation Hook wrapper
 */
export function useGraphQLMutation(mutation: string) {
  const client = initializeApolloClient();

  return apolloUseMutation(gql(mutation), { client });
}

/**
 * useSubscription Hook wrapper
 */
export function useGraphQLSubscription(
  subscription: string,
  variables?: Record<string, any>
) {
  const client = initializeApolloClient();

  return apolloUseSubscription(gql(subscription), {
    variables,
    client,
  });
}
