/**
 * MCP Client Wrapper for dendritic-memory-editor
 *
 * Communicates with project_locate MCP server to:
 * - Search knowledge tiles
 * - Run inferences
 * - Export/import .iath files
 * - Manage tile versions
 */

export interface MCPSearchRequest {
  query: string;
  domain?: string;
  limit?: number;
  verification_type?: string;
}

export interface MCPSearchResult {
  status: "success" | "error";
  query: string;
  result_count: number;
  total_count: number;
  tiles?: Array<{
    id: string;
    domain: string;
    topic: string;
    content: string;
    coordinates: { x: number; y: number; z: number };
    confidence_score: number;
    verification_type: string;
    version: number;
    created_at: string;
    updated_at: string;
  }>;
  error?: string;
}

export interface MCPInferenceRequest {
  question: string;
  domains?: string[];
  include_reasoning_chain?: boolean;
  temperature?: number;
  model_id?: string;
}

export interface MCPInferenceResult {
  status: "success" | "error";
  question: string;
  answer: string;
  confidence: number;
  reasoning_chain?: string;
  model_used?: string;
  domains?: string[];
  error?: string;
}

export interface MCPExportRequest {
  tile_ids: string[];
  include_version_history?: boolean;
  output_format?: "v2" | "v3";
}

export interface MCPExportResult {
  status: "success" | "error";
  exported_count?: number;
  output_path?: string;
  file_size?: number;
  format?: string;
  data?: Record<string, any>;
  error?: string;
}

export interface MCPImportRequest {
  file_path: string;
  merge_strategy?: "overwrite" | "merge" | "create_new_version";
  author_id?: string;
}

export interface MCPImportResult {
  status: "success" | "error";
  imported_count?: number;
  merged_count?: number;
  total_processed?: number;
  errors?: Array<{ tile_id: string; error: string }>;
  error?: string;
}

/**
 * MCP Server Configuration
 * Compatible with Cloudflare Workers (no process.env)
 */
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

export const MCP_SERVER_CONFIG = {
  host: getEnvVar("MCP_SERVER_HOST", "localhost"),
  port: parseInt(getEnvVar("MCP_SERVER_PORT", "8000"), 10),
  protocol: getEnvVar("MCP_SERVER_PROTOCOL", "http"),
  base_url: getEnvVar("MCP_SERVER_URL", "http://localhost:8000"),
  timeout: parseInt(getEnvVar("MCP_SERVER_TIMEOUT", "30000"), 10),
  retry_attempts: parseInt(getEnvVar("MCP_SERVER_RETRY_ATTEMPTS", "3"), 10),
  retry_delay: parseInt(getEnvVar("MCP_SERVER_RETRY_DELAY", "1000"), 10),
};

/**
 * MCP Client Class
 * Handles communication with project_locate MCP server
 */
export class MCPClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<typeof MCP_SERVER_CONFIG>) {
    const finalConfig = { ...MCP_SERVER_CONFIG, ...config };
    this.baseUrl = finalConfig.base_url;
    this.timeout = finalConfig.timeout;
    this.retryAttempts = finalConfig.retry_attempts;
    this.retryDelay = finalConfig.retry_delay;
  }

  /**
   * Search knowledge tiles via MCP
   */
  async searchTiles(request: MCPSearchRequest): Promise<MCPSearchResult> {
    const cacheKey = `search:${JSON.stringify(request)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.callMCPTool("search_knowledge_tiles", request);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Run inference via MCP
   */
  async runInference(request: MCPInferenceRequest): Promise<MCPInferenceResult> {
    // Don't cache inference results (they're context-dependent)
    return await this.callMCPTool("run_inference", request);
  }

  /**
   * Export tiles to .iath format
   */
  async exportToIath(request: MCPExportRequest): Promise<MCPExportResult> {
    return await this.callMCPTool("export_to_iath", request);
  }

  /**
   * Import tiles from .iath file
   */
  async importFromIath(request: MCPImportRequest): Promise<MCPImportResult> {
    return await this.callMCPTool("import_from_iath", request);
  }

  /**
   * Get tile version history
   */
  async getTileHistory(
    tile_id: string,
    include_content: boolean = false
  ): Promise<any> {
    const cacheKey = `history:${tile_id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.callMCPTool("get_tile_history", {
      tile_id,
      include_content,
    });
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get domain statistics
   */
  async getDomainStatistics(): Promise<any> {
    const cacheKey = "stats:domains";
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.callMCPTool("get_domain_statistics", {});
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Call MCP tool with retry logic
   */
  private async callMCPTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(
          `${this.baseUrl}/api/mcp/call/${toolName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-MCP-Client": "dendritic-memory-editor",
            },
            body: JSON.stringify(args),
            signal: AbortSignal.timeout(this.timeout),
          }
        );

        if (!response.ok) {
          throw new Error(`MCP Server error: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
          if (attempt < this.retryAttempts - 1) {
            await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }
        }

        throw lastError;
      }
    }

    throw lastError || new Error("MCP call failed");
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Create a new knowledge tile
   */
  async createTile(request: {
    topic: string;
    domain: string;
    content: string;
    author_mark: "expert" | "community";
    metadata?: Record<string, any>;
  }): Promise<any> {
    return await this.callMCPTool("create_knowledge_tile", request);
  }

  /**
   * Delete a knowledge tile
   */
  async deleteTile(tile_id: string): Promise<any> {
    return await this.callMCPTool("delete_tile", { tile_id });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}

export function resetMCPClient(): void {
  mcpClientInstance = null;
}
