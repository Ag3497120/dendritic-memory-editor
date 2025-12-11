/**
 * MCP Proxy Routes
 *
 * Exposes MCP server functionality through REST endpoints
 * Acts as a bridge between frontend and MCP server
 */

import { Hono } from "hono";
import { getMCPClient } from "../mcp/client";

const app = new Hono();

/**
 * POST /api/mcp/search
 * Search knowledge tiles via MCP
 */
app.post("/search", async (c) => {
  try {
    const mcpClient = getMCPClient();

    const { query, domain, limit, verification_type } = await c.req.json();

    if (!query) {
      return c.json(
        {
          status: "error",
          error: "query parameter is required",
        },
        400
      );
    }

    const result = await mcpClient.searchTiles({
      query,
      domain,
      limit: limit || 10,
      verification_type,
    });

    return c.json(result);
  } catch (error) {
    console.error("MCP search error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/mcp/infer
 * Run inference via MCP
 */
app.post("/infer", async (c) => {
  try {
    const mcpClient = getMCPClient();

    const { question, domains, include_reasoning_chain, temperature, model_id } =
      await c.req.json();

    if (!question) {
      return c.json(
        {
          status: "error",
          error: "question parameter is required",
        },
        400
      );
    }

    const result = await mcpClient.runInference({
      question,
      domains,
      include_reasoning_chain: include_reasoning_chain ?? true,
      temperature,
      model_id,
    });

    return c.json(result);
  } catch (error) {
    console.error("MCP inference error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/mcp/export
 * Export tiles to .iath format
 */
app.post("/export", async (c) => {
  try {
    const mcpClient = getMCPClient();

    const { tile_ids, include_version_history, output_format } =
      await c.req.json();

    if (!tile_ids || !Array.isArray(tile_ids) || tile_ids.length === 0) {
      return c.json(
        {
          status: "error",
          error: "tile_ids array is required and must not be empty",
        },
        400
      );
    }

    const result = await mcpClient.exportToIath({
      tile_ids,
      include_version_history: include_version_history ?? false,
      output_format: output_format || "v3",
    });

    return c.json(result);
  } catch (error) {
    console.error("MCP export error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/mcp/import
 * Import tiles from .iath file
 */
app.post("/import", async (c) => {
  try {
    const mcpClient = getMCPClient();

    const { file_path, merge_strategy, author_id } = await c.req.json();

    if (!file_path) {
      return c.json(
        {
          status: "error",
          error: "file_path parameter is required",
        },
        400
      );
    }

    const result = await mcpClient.importFromIath({
      file_path,
      merge_strategy: merge_strategy || "create_new_version",
      author_id,
    });

    return c.json(result);
  } catch (error) {
    console.error("MCP import error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/mcp/history/:tile_id
 * Get tile version history
 */
app.get("/history/:tile_id", async (c) => {
  try {
    const mcpClient = getMCPClient();
    const tile_id = c.req.param("tile_id");
    const include_content = c.req.query("include_content") === "true";

    const result = await mcpClient.getTileHistory(tile_id, include_content);

    return c.json(result);
  } catch (error) {
    console.error("MCP history error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/mcp/statistics
 * Get domain statistics
 */
app.get("/statistics", async (c) => {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.getDomainStatistics();

    return c.json(result);
  } catch (error) {
    console.error("MCP statistics error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /api/mcp/save-inference
 * Save inference result as a knowledge tile
 */
app.post("/save-inference", async (c) => {
  try {
    const mcpClient = getMCPClient();

    const {
      question,
      answer,
      reasoning_chain,
      confidence,
      domains,
      topic,
      domain,
      author_mark,
    } = await c.req.json();

    if (!topic || !domain) {
      return c.json(
        {
          status: "error",
          error: "topic and domain parameters are required",
        },
        400
      );
    }

    if (!answer || typeof confidence !== "number") {
      return c.json(
        {
          status: "error",
          error: "answer and confidence parameters are required",
        },
        400
      );
    }

    // Create tile content from inference result
    const content = `Question: ${question}\n\nAnswer: ${answer}${
      reasoning_chain ? `\n\nReasoning: ${reasoning_chain}` : ""
    }\n\nConfidence Score: ${(confidence * 100).toFixed(0)}%`;

    // Call create tile via MCP
    const result = await mcpClient.createTile({
      topic,
      domain,
      content,
      author_mark: author_mark || "community",
      metadata: {
        inference_source: true,
        question,
        confidence_score: confidence,
        inference_domains: domains || [],
        reasoning_chain,
      },
    });

    return c.json(result);
  } catch (error) {
    console.error("MCP save inference error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/mcp/saved-inferences
 * Get list of saved inference tiles
 */
app.get("/saved-inferences", async (c) => {
  try {
    const mcpClient = getMCPClient();

    // Search for tiles with inference_source metadata
    const result = await mcpClient.searchTiles({
      query: "",
      limit: 100,
      filters: { inference_source: true },
    });

    // Format response
    return c.json({
      status: "success",
      inferences:
        result.tiles?.map((tile: any) => ({
          id: tile.id,
          topic: tile.topic,
          domain: tile.domain,
          question: tile.metadata?.question || tile.content.split("\n")[0],
          answer: tile.content,
          reasoning_chain: tile.metadata?.reasoning_chain,
          confidence_score: tile.metadata?.confidence_score || tile.confidence_score,
          author_mark: tile.author_mark,
          created_at: tile.created_at,
          updated_at: tile.updated_at,
        })) || [],
    });
  } catch (error) {
    console.error("MCP saved inferences error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        inferences: [],
      },
      500
    );
  }
});

/**
 * DELETE /api/mcp/saved-inferences/:id
 * Delete a saved inference tile
 */
app.delete("/saved-inferences/:id", async (c) => {
  try {
    const mcpClient = getMCPClient();
    const id = c.req.param("id");

    const result = await mcpClient.deleteTile(id);

    return c.json(result);
  } catch (error) {
    console.error("MCP delete inference error:", error);
    return c.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /api/mcp/health
 * Health check for MCP server
 */
app.get("/health", async (c) => {
  try {
    const mcpClient = getMCPClient();
    const isHealthy = await mcpClient.healthCheck();

    return c.json({
      status: isHealthy ? "healthy" : "unhealthy",
      mcp_server_available: isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MCP health check error:", error);
    return c.json(
      {
        status: "unhealthy",
        mcp_server_available: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

/**
 * GET /api/mcp/info
 * Get MCP server information
 */
app.get("/info", (c) => {
  return c.json({
    name: "dendritic-memory-editor",
    version: "2.0.0",
    mcp_enabled: true,
    phase_2b_enabled: true,
    mcp_endpoints: [
      "POST /api/mcp/search",
      "POST /api/mcp/infer",
      "POST /api/mcp/save-inference",
      "GET /api/mcp/saved-inferences",
      "DELETE /api/mcp/saved-inferences/:id",
      "POST /api/mcp/export",
      "POST /api/mcp/import",
      "GET /api/mcp/history/:tile_id",
      "GET /api/mcp/statistics",
      "GET /api/mcp/health",
      "GET /api/mcp/info",
    ],
    documentation:
      "https://github.com/Ag3497120/dendritic-memory-editor/docs/MCP_INTEGRATION.md",
  });
});

export default app;
