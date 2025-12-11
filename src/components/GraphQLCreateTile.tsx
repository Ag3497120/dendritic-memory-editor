/**
 * GraphQL Create Tile Component
 *
 * Demonstrates GraphQL mutation for creating new tiles
 * Shows form handling and error management with GraphQL
 */

import { useState } from "react";
import { useGraphQL } from "../hooks/useGraphQL";
import { XMarkIcon } from "@heroicons/react/24/outline";

const CREATE_TILE_MUTATION = `
  mutation CreateTile(
    $topic: String!
    $domain: String!
    $content: String!
    $authorMark: String!
  ) {
    createTile(
      topic: $topic
      domain: $domain
      content: $content
      authorMark: $authorMark
    ) {
      id
      topic
      domain
      content
      authorMark
      confidenceScore
      createdAt
    }
  }
`;

interface GraphQLCreateTileProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  predefinedDomains?: string[];
  activeDomain?: string;
}

export default function GraphQLCreateTile({
  isOpen,
  onClose,
  onSuccess,
  predefinedDomains = ["Medical", "Programming", "Science"],
  activeDomain = "Medical",
}: GraphQLCreateTileProps) {
  const [formData, setFormData] = useState({
    topic: "",
    domain: activeDomain,
    customDomain: "",
    content: "",
    authorMark: "COMMUNITY",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate } = useGraphQL();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate inputs
      if (!formData.topic.trim()) {
        throw new Error("Topic is required");
      }

      if (!formData.content.trim()) {
        throw new Error("Content is required");
      }

      const domain =
        formData.domain === "Other" ? formData.customDomain : formData.domain;

      if (!domain.trim()) {
        throw new Error("Domain is required");
      }

      // Execute GraphQL mutation
      const result = await mutate(CREATE_TILE_MUTATION, {
        topic: formData.topic,
        domain,
        content: formData.content,
        authorMark: formData.authorMark,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Success
      console.log("[GraphQL] Tile created:", result.data.createTile);

      // Reset form
      setFormData({
        topic: "",
        domain: activeDomain,
        customDomain: "",
        content: "",
        authorMark: "COMMUNITY",
      });

      // Callback
      onSuccess?.();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create tile";
      setError(message);
      console.error("[GraphQL Error]", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Create Knowledge Tile
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
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                maxLength={150}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tile topic"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.topic.length}/150
              </p>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain *
              </label>
              <select
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {predefinedDomains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="Other">Other (Custom)</option>
              </select>
            </div>

            {/* Custom Domain */}
            {formData.domain === "Other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Domain *
                </label>
                <input
                  type="text"
                  name="customDomain"
                  value={formData.customDomain}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter custom domain"
                />
              </div>
            )}

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tile content"
              />
            </div>

            {/* Author Mark */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contribution Type
              </label>
              <div className="space-y-2">
                {["COMMUNITY", "EXPERT"].map((mark) => (
                  <label key={mark} className="flex items-center">
                    <input
                      type="radio"
                      name="authorMark"
                      value={mark}
                      checked={formData.authorMark === mark}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {mark.toLowerCase()} Contribution
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
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
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {submitting ? "Creating..." : "Create Tile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
