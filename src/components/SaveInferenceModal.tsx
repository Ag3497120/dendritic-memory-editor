/**
 * SaveInferenceModal Component
 *
 * Modal for saving inference results as knowledge tiles
 * Allows customization of tile metadata before saving
 */

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { SaveInferenceParams } from "../hooks/useMCP";

interface SaveInferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: SaveInferenceParams) => Promise<void>;
  inferenceData: {
    question: string;
    answer: string;
    reasoning_chain?: string;
    confidence: number;
    domains: string[];
  };
  isLoading?: boolean;
  error?: string;
}

const PREDEFINED_DOMAINS = [
  "Medical",
  "Programming",
  "Science",
  "History",
  "Art",
  "Law",
  "General",
];

export default function SaveInferenceModal({
  isOpen,
  onClose,
  onSubmit,
  inferenceData,
  isLoading = false,
  error = null,
}: SaveInferenceModalProps) {
  const [topic, setTopic] = useState(inferenceData.question.substring(0, 100));
  const [domain, setDomain] = useState("General");
  const [customDomain, setCustomDomain] = useState("");
  const [authorMark, setAuthorMark] = useState<"expert" | "community">(
    "community"
  );
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [submitError, setSubmitError] = useState("");

  const activeDomain = domain === "Other" ? customDomain.trim() : domain;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!topic.trim()) {
      setSubmitError("Topic is required");
      return;
    }

    if (!activeDomain.trim()) {
      setSubmitError("Domain is required");
      return;
    }

    try {
      await onSubmit({
        question: inferenceData.question,
        answer: inferenceData.answer,
        reasoning_chain: includeReasoning
          ? inferenceData.reasoning_chain
          : undefined,
        confidence: inferenceData.confidence,
        domains: inferenceData.domains,
        topic,
        domain: activeDomain,
        author_mark: authorMark,
      });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save inference"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Save as Knowledge Tile
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={150}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tile topic"
              />
              <p className="text-xs text-gray-500 mt-1">
                {topic.length}/150 characters
              </p>
            </div>

            {/* Domain Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain *
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PREDEFINED_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="Other">Other (Custom)</option>
              </select>
            </div>

            {/* Custom Domain */}
            {domain === "Other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Domain *
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter custom domain"
                />
              </div>
            )}

            {/* Author Mark */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contribution Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="authorMark"
                    value="community"
                    checked={authorMark === "community"}
                    onChange={(e) =>
                      setAuthorMark(e.target.value as "community" | "expert")
                    }
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Community Contribution
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="authorMark"
                    value="expert"
                    checked={authorMark === "expert"}
                    onChange={(e) =>
                      setAuthorMark(e.target.value as "community" | "expert")
                    }
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Expert Contribution
                  </span>
                </label>
              </div>
            </div>

            {/* Include Reasoning */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeReasoning}
                  onChange={(e) => setIncludeReasoning(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include reasoning chain in tile
                </span>
              </label>
            </div>

            {/* Confidence Display */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Confidence Score</p>
              <p className="text-lg font-semibold text-blue-600">
                {(inferenceData.confidence * 100).toFixed(0)}%
              </p>
            </div>

            {/* Error Messages */}
            {(submitError || error) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {submitError || error}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isLoading ? "Saving..." : "Save Tile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
