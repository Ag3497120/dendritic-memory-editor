/**
 * useMCP Hook
 *
 * Provides access to MCP server functionality
 * Manages loading states, errors, and caching
 */

import { useState, useCallback } from "react";
import apiClient from "../apiClient";

export interface SearchParams {
  query: string;
  domain?: string;
  limit?: number;
  verification_type?: string;
}

export interface SearchResult {
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

export interface InferenceParams {
  question: string;
  domains?: string[];
  include_reasoning_chain?: boolean;
  temperature?: number;
  model_id?: string;
}

export interface InferenceResult {
  status: "success" | "error";
  question: string;
  answer: string;
  confidence: number;
  reasoning_chain?: string;
  model_used?: string;
  domains?: string[];
  error?: string;
}

export interface ExportParams {
  tile_ids: string[];
  include_version_history?: boolean;
  output_format?: "v2" | "v3";
}

export interface ExportResult {
  status: "success" | "error";
  exported_count?: number;
  output_path?: string;
  file_size?: number;
  format?: string;
  error?: string;
}

export interface HistoryResult {
  status: "success" | "error";
  tile_id: string;
  total_versions: number;
  domain?: string;
  current_version?: number;
  history?: Array<{
    version: number;
    created_at: string;
    contributor: string;
    confidence_score: number;
  }>;
  error?: string;
}

export interface StatisticsResult {
  status: "success" | "error";
  domains?: Array<{
    domain: string;
    tile_count: number;
    avg_confidence: number;
    max_version: number;
  }>;
  total_tiles?: number;
  error?: string;
}

export interface SaveInferenceParams {
  question: string;
  answer: string;
  reasoning_chain?: string;
  confidence: number;
  domains: string[];
  topic: string;
  domain: string;
  author_mark?: "expert" | "community";
}

export interface SaveInferenceResult {
  status: "success" | "error";
  tile_id?: string;
  topic?: string;
  domain?: string;
  confidence_score?: number;
  error?: string;
}

interface MCPState {
  data: any;
  loading: boolean;
  error: string | null;
}

export function useMCP() {
  const [searchState, setSearchState] = useState<MCPState>({
    data: null,
    loading: false,
    error: null,
  });

  const [inferenceState, setInferenceState] = useState<MCPState>({
    data: null,
    loading: false,
    error: null,
  });

  const [exportState, setExportState] = useState<MCPState>({
    data: null,
    loading: false,
    error: null,
  });

  const [historyState, setHistoryState] = useState<MCPState>({
    data: null,
    loading: false,
    error: null,
  });

  const [statsState, setStatsState] = useState<MCPState>({
    data: null,
    loading: false,
    error: null,
  });

  const [saveInferenceState, setSaveInferenceState] = useState<MCPState>({
    data: null,
    loading: false,
    error: null,
  });

  /**
   * Search knowledge tiles
   */
  const searchTiles = useCallback(
    async (params: SearchParams): Promise<SearchResult | null> => {
      setSearchState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.post<SearchResult>(
          "/api/mcp/search",
          params
        );
        setSearchState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Search failed";
        setSearchState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Run inference
   */
  const runInference = useCallback(
    async (params: InferenceParams): Promise<InferenceResult | null> => {
      setInferenceState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.post<InferenceResult>(
          "/api/mcp/infer",
          params
        );
        setInferenceState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Inference failed";
        setInferenceState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Export tiles to .iath
   */
  const exportToIath = useCallback(
    async (params: ExportParams): Promise<ExportResult | null> => {
      setExportState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.post<ExportResult>(
          "/api/mcp/export",
          params
        );
        setExportState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Export failed";
        setExportState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Get tile version history
   */
  const getTileHistory = useCallback(
    async (tile_id: string, include_content: boolean = false): Promise<HistoryResult | null> => {
      setHistoryState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.get<HistoryResult>(
          `/api/mcp/history/${tile_id}`,
          { params: { include_content } }
        );
        setHistoryState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get history";
        setHistoryState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Get domain statistics
   */
  const getDomainStatistics = useCallback(
    async (): Promise<StatisticsResult | null> => {
      setStatsState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.get<StatisticsResult>(
          "/api/mcp/statistics"
        );
        setStatsState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get statistics";
        setStatsState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Check MCP server health
   */
  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get("/api/mcp/health");
      return response.data.mcp_server_available === true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Get MCP server info
   */
  const getInfo = useCallback(async () => {
    try {
      const response = await apiClient.get("/api/mcp/info");
      return response.data;
    } catch (error) {
      console.error("Failed to get MCP info:", error);
      return null;
    }
  }, []);

  /**
   * Save inference result as a knowledge tile
   */
  const saveInferenceAsTile = useCallback(
    async (params: SaveInferenceParams): Promise<SaveInferenceResult | null> => {
      setSaveInferenceState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.post<SaveInferenceResult>(
          "/api/mcp/save-inference",
          params
        );
        setSaveInferenceState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save inference";
        setSaveInferenceState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    []
  );

  return {
    // Search
    searchTiles,
    searchState,

    // Inference
    runInference,
    inferenceState,

    // Save Inference
    saveInferenceAsTile,
    saveInferenceState,

    // Export
    exportToIath,
    exportState,

    // History
    getTileHistory,
    historyState,

    // Statistics
    getDomainStatistics,
    statsState,

    // Health
    checkHealth,
    getInfo,
  };
}

export default useMCP;
