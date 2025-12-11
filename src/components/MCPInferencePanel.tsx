/**
 * MCPInferencePanel Component
 *
 * Provides inference/reasoning capabilities via MCP server
 * Integrates with NullAI and Ilm-Athens engines
 */

import { useState, useEffect } from "react";
import { useMCP } from "../hooks/useMCP";
import { useRealtime } from "../hooks/useRealtime";
import { SparklesIcon, CheckCircleIcon, DocumentPlusIcon } from "@heroicons/react/24/outline";
import SaveInferenceModal from "./SaveInferenceModal";

export default function MCPInferencePanel() {
  const [question, setQuestion] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>(["medical"]);
  const [temperature, setTemperature] = useState(0.7);
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const { runInference, inferenceState, saveInferenceAsTile, saveInferenceState } = useMCP();
  const { broadcastInferenceActivity, publishInferenceEvent } = useRealtime();

  const domains = ["medical", "law", "programming", "science", "general"];

  // Broadcast inference start
  useEffect(() => {
    if (inferenceState.loading && question) {
      broadcastInferenceActivity(question, selectedDomains[0]);
    }
  }, [inferenceState.loading, question, selectedDomains, broadcastInferenceActivity]);

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const handleInference = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      return;
    }

    const result = await runInference({
      question,
      domains: selectedDomains,
      include_reasoning_chain: includeReasoning,
      temperature,
    });

    if (result && result.status === "success") {
      setResult(result);
      setShowResult(true);
    }
  };

  const handleSaveInference = async (params: any) => {
    const result = await saveInferenceAsTile(params);

    // Broadcast inference saved event in real-time
    if (result && result.status === "success") {
      publishInferenceEvent(
        {
          tileId: result.tile_id,
          topic: params.topic,
          domain: params.domain,
          question: params.question,
          answer: params.answer,
          confidence_score: params.confidence,
          author_mark: params.author_mark,
        },
        params.domain
      );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6" />
          AI Reasoning Engine
        </h2>
        <p className="text-purple-100">
          Ask questions and get AI-powered reasoning with confidence scores
        </p>
      </div>

      {/* Inference Form */}
      <form onSubmit={handleInference} className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {/* Question Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question across knowledge domains..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        {/* Domain Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Domains
          </label>
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomain(domain)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedDomains.includes(domain)
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {domain.charAt(0).toUpperCase() + domain.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Temperature */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Creativity Level
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-purple-600 min-w-12">
                {temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0 = Deterministic, 2 = Creative
            </p>
          </div>

          {/* Include Reasoning */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Options
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReasoning}
                onChange={(e) => setIncludeReasoning(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                Show reasoning chain
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={inferenceState.loading || selectedDomains.length === 0}
          className="w-full px-4 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 disabled:bg-gray-400 transition"
        >
          {inferenceState.loading
            ? "Reasoning in Progress..."
            : "Run Inference"}
        </button>
      </form>

      {/* Error Message */}
      {inferenceState.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-red-700 font-semibold">Inference Error</p>
          <p className="text-red-600 text-sm">{inferenceState.error}</p>
        </div>
      )}

      {/* Results */}
      {showResult && result && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
            >
              <DocumentPlusIcon className="w-5 h-5" />
              Save as Knowledge Tile
            </button>
          </div>

          {/* Confidence Score */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
            <div>
              <p className="text-sm text-gray-600">Confidence Score</p>
              <p className="text-3xl font-bold text-purple-600">
                {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
          </div>

          {/* Answer */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Answer</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {result.answer}
              </p>
            </div>
          </div>

          {/* Reasoning Chain */}
          {includeReasoning && result.reasoning_chain && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Reasoning Process
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-gray-800 text-sm whitespace-pre-wrap">
                  {result.reasoning_chain}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Model Used</p>
              <p className="font-semibold text-gray-900">
                {result.model_used || "N/A"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Domains Searched</p>
              <p className="font-semibold text-gray-900">
                {result.domains?.length || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Question</p>
              <p className="font-semibold text-gray-900 truncate">
                {question}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!showResult && (
        <div className="text-center py-12 text-gray-400">
          <SparklesIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Ask a question to begin</p>
          <p className="text-sm">
            Get AI-powered reasoning across multiple knowledge domains
          </p>
        </div>
      )}

      {/* Save Inference Modal */}
      {result && (
        <SaveInferenceModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSubmit={handleSaveInference}
          inferenceData={{
            question: result.question,
            answer: result.answer,
            reasoning_chain: result.reasoning_chain,
            confidence: result.confidence,
            domains: result.domains || selectedDomains,
          }}
          isLoading={saveInferenceState.loading}
          error={saveInferenceState.error}
        />
      )}
    </div>
  );
}
