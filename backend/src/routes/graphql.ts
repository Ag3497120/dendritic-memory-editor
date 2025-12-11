/**
 * GraphQL Hono Route
 *
 * Integrates Apollo Server with Hono
 * Handles both HTTP POST (queries/mutations) and WebSocket (subscriptions)
 */

import { Hono } from "hono";
import { createApolloServer } from "../graphql/server";
import { graphqlHTTP } from "@hono/graphql-server";

const app = new Hono();

// Create Apollo Server instance
const apolloServer = createApolloServer();

/**
 * POST /graphql
 * Handle GraphQL queries and mutations
 */
app.post("/graphql", async (c) => {
  const contentType = c.req.header("content-type");

  // Parse request body
  let query, variables, operationName;

  if (contentType?.includes("application/json")) {
    const body = await c.req.json();
    query = body.query;
    variables = body.variables;
    operationName = body.operationName;
  } else if (contentType?.includes("application/graphql")) {
    query = await c.req.text();
  } else {
    return c.json(
      {
        errors: [
          {
            message: "Invalid Content-Type. Use application/json or application/graphql",
          },
        ],
      },
      400
    );
  }

  if (!query) {
    return c.json(
      {
        errors: [{ message: "No query provided" }],
      },
      400
    );
  }

  try {
    // Execute GraphQL operation
    const result = await apolloServer.executeOperation({
      query,
      variables,
      operationName,
    });

    // Check for errors
    if (result.body.kind === "complete") {
      const statusCode = result.body.string
        .includes('"errors"')
        ? 400
        : 200;

      return c.json(
        JSON.parse(result.body.string),
        statusCode
      );
    } else {
      return c.json(
        {
          errors: [
            {
              message: "Streaming responses not supported",
            },
          ],
        },
        400
      );
    }
  } catch (error) {
    console.error("[GraphQL Error]", error);

    return c.json(
      {
        errors: [
          {
            message:
              error instanceof Error
                ? error.message
                : "Internal server error",
          },
        ],
      },
      500
    );
  }
});

/**
 * GET /graphql
 * GraphQL Playground / Apollo Sandbox
 */
app.get("/graphql", async (c) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Apollo Sandbox</title>
        <style>
          body {
            height: 100%;
            margin: 0;
            width: 100%;
            overflow: hidden;
          }
          #sandbox {
            height: 100vh;
            width: 100vw;
          }
        </style>
      </head>
      <body>
        <div id="sandbox"></div>
        <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
        <script>
          new window.EmbeddedSandbox({
            target: '#sandbox',
            initialState: {
              document: \`query GetTiles {
  tiles(limit: 10) {
    id
    topic
    domain
    authorMark
    confidenceScore
    createdAt
  }
}\`,
              variables: {},
              headers: {},
              documents: [],
              includeCookies: false,
            },
            endpointUrl: '${process.env.GRAPHQL_ENDPOINT || "http://localhost:8787/graphql"}',
          });
        </script>
      </body>
    </html>
  `;

  return c.html(html);
});

/**
 * POST /graphql/batch
 * Batch query execution (DataLoader optimization)
 */
app.post("/graphql/batch", async (c) => {
  const contentType = c.req.header("content-type");

  if (!contentType?.includes("application/json")) {
    return c.json(
      {
        errors: [{ message: "Content-Type must be application/json" }],
      },
      400
    );
  }

  const body = await c.req.json();

  if (!Array.isArray(body)) {
    return c.json(
      {
        errors: [{ message: "Batch request must be an array" }],
      },
      400
    );
  }

  try {
    // Execute multiple queries in batch
    const results = await Promise.all(
      body.map((request) =>
        apolloServer.executeOperation({
          query: request.query,
          variables: request.variables,
          operationName: request.operationName,
        })
      )
    );

    // Extract results
    const responses = results.map((result) => {
      if (result.body.kind === "complete") {
        return JSON.parse(result.body.string);
      }
      return {
        errors: [{ message: "Streaming not supported" }],
      };
    });

    return c.json(responses);
  } catch (error) {
    console.error("[GraphQL Batch Error]", error);

    return c.json(
      {
        errors: [
          {
            message:
              error instanceof Error
                ? error.message
                : "Internal server error",
          },
        ],
      },
      500
    );
  }
});

/**
 * GET /graphql/schema
 * Export schema in SDL format
 */
app.get("/graphql/schema", async (c) => {
  const { schema } = await import("../graphql/server");
  const { printSchema } = await import("graphql");

  const sdl = printSchema(schema);

  return c.text(sdl, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
});

export default app;
