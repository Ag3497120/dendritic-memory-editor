/**
 * InferenceHistory Component
 *
 * Displays history of saved inference results as knowledge tiles
 * Shows saved inferences with their metadata and confidence scores
 */

import { useState, useEffect } from "react";
import { useMCP } from "../hooks/useMCP";
import { useRealtime, RealtimeEvent } from "../hooks/useRealtime";
import { DocumentTextIcon, TrashIcon, StarIcon } from "@heroicons/react/24/outline";
import apiClient from "../apiClient";

interface SavedInference {
  id: string;
  topic: string;
  domain: string;
  question: string;
  answer: string;
  reasoning_chain?: string;
  confidence_score: number;
  author_mark: "expert" | "community";
  created_at: string;
  updated_at: string;
}

export default function InferenceHistory() {
  const [savedInferences, setSavedInferences] = useState<SavedInference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newInferenceAlert, setNewInferenceAlert] = useState<string | null>(null);

  const { getDomainStatistics } = useMCP();
  const { lastEvent, isConnected } = useRealtime();

  const domains = [
    "All",
    "Medical",
    "Programming",
    "Science",
    "History",
    "Art",
    "Law",
    "General",
  ];

  useEffect(() => {
    loadInferenceHistory();
  }, []);

  // Listen for real-time inference events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "inference:saved") {
      const newInference = lastEvent.data;
      console.log("[InferenceHistory] New inference received:", newInference);

      // Add new inference to top of list
      setSavedInferences((prev) => {
        const inference: SavedInference = {
          id: newInference.tileId,
          topic: newInference.topic,
          domain: newInference.domain,
          question: newInference.question,
          answer: newInference.answer,
          reasoning_chain: newInference.reasoning_chain,
          confidence_score: newInference.confidence_score,
          author_mark: newInference.author_mark,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [inference, ...prev];
      });

      // Show alert
      setNewInferenceAlert(newInference.topic);
      setTimeout(() => setNewInferenceAlert(null), 3000);
    }

    if (lastEvent.type === "tile:deleted") {
      const deletedTileId = lastEvent.data.tileId;
      setSavedInferences((prev) =>
        prev.filter((inf) => inf.id !== deletedTileId)
      );
    }
  }, [lastEvent]);

  const loadInferenceHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/mcp/saved-inferences");
      setSavedInferences(response.data.inferences || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load inference history"
      );
      setSavedInferences([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInference = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this saved inference? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/api/mcp/saved-inferences/${id}`);
      setSavedInferences(
        savedInferences.filter((inference) => inference.id !== id)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete inference"
      );
    }
  };

  const filteredInferences =
    selectedDomain === "All"
      ? savedInferences
      : savedInferences.filter((inf) => inf.domain === selectedDomain);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading inference history...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* New Inference Alert */}
      {newInferenceAlert && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in">
          <div className="flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-800">
              New inference saved: <span className="font-semibold">{newInferenceAlert}</span>
            </p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Offline mode - changes will sync when connection is restored
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          Saved Inferences
        </h2>
        <p className="text-gray-600">
          View and manage inference results saved as knowledge tiles
          {isConnected && (
            <span className="text-xs text-green-600 ml-2">● Real-time sync enabled</span>
          )}
        </p>
      </div>

      {/* Domain Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Filter by Domain
        </label>
        <div className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDomain === domain
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-700 font-semibold">Error</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Inferences List */}
      {filteredInferences.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Found {filteredInferences.length} saved inference
            {filteredInferences.length !== 1 ? "s" : ""}
          </p>

          {filteredInferences.map((inference) => (
            <div
              key={inference.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div
                onClick={() =>
                  setExpandedId(
                    expandedId === inference.id ? null : inference.id
                  )
                }
                className="p-4 cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {inference.topic}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {inference.domain}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          inference.author_mark === "expert"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {inference.author_mark === "expert"
                          ? "Expert"
                          : "Community"}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {(inference.confidence_score * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteInference(inference.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Created {new Date(inference.created_at).toLocaleDateString()} at{" "}
                  {new Date(inference.created_at).toLocaleTimeString()}
                </p>
              </div>

              {/* Expanded Content */}
              {expandedId === inference.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                  {/* Question */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Question
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded">
                      {inference.question}
                    </p>
                  </div>

                  {/* Answer */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Answer
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded whitespace-pre-wrap">
                      {inference.answer}
                    </p>
                  </div>

                  {/* Reasoning Chain */}
                  {inference.reasoning_chain && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                        Reasoning Process
                      </h4>
                      <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 p-3 rounded whitespace-pre-wrap">
                        {inference.reasoning_chain}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs text-gray-600">Confidence</p>
                      <p className="font-semibold text-gray-900">
                        {(inference.confidence_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs text-gray-600">Created</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {new Date(inference.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs text-gray-600">Type</p>
                      <p className="font-semibold text-gray-900">
                        {inference.author_mark === "expert"
                          ? "Expert"
                          : "Community"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No saved inferences yet
          </h3>
          <p className="text-sm text-gray-500">
            Run inference and save the results to see them here
          </p>
        </div>
      )}
    </div>
  );
}
