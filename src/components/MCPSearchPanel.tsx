/**
 * MCPSearchPanel Component
 *
 * Provides advanced knowledge tile search via MCP server
 * Integrates with project_locate inference engine
 */

import { useState } from "react";
import { useMCP } from "../hooks/useMCP";
import { MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface SearchResult {
  id: string;
  domain: string;
  topic: string;
  content: string;
  confidence_score: number;
  verification_type: string;
}

export default function MCPSearchPanel() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { searchTiles, searchState } = useMCP();

  const domains = ["Medical", "Law", "Programming", "Science", "General"];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    const result = await searchTiles({
      query,
      domain: domain || undefined,
      limit: 20,
    });

    if (result && result.status === "success" && result.tiles) {
      setSearchResults(result.tiles);
      setShowResults(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6" />
          MCP Knowledge Search
        </h2>
        <p className="text-blue-100">
          Search across all knowledge domains using AI-powered retrieval
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col gap-4">
          {/* Query Input */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search knowledge tiles..."
              className="w-full px-4 py-3 pl-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          </div>

          {/* Domain Filter */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDomain("")}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                domain === ""
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Domains
            </button>
            {domains.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDomain(d)}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  domain === d
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={searchState.loading}
            className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition"
          >
            {searchState.loading ? "Searching..." : "Search Knowledge Base"}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {searchState.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-red-700 font-semibold">Search Error</p>
          <p className="text-red-600 text-sm">{searchState.error}</p>
        </div>
      )}

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Found {searchResults.length} results
          </h3>

          {searchResults.map((tile) => (
            <div
              key={tile.id}
              className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{tile.topic}</h4>
                  <p className="text-sm text-gray-600">{tile.domain}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${
                    tile.verification_type === "expert"
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }`}>
                    {tile.verification_type}
                  </span>
                  <span className="px-3 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-800">
                    {(tile.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <p className="text-gray-700 text-sm line-clamp-3">
                {tile.content}
              </p>

              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">
                  View Details
                </button>
                <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition">
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && searchResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No results found for "{query}"</p>
          <p className="text-sm">Try adjusting your search query or domain filter</p>
        </div>
      )}

      {/* Initial State */}
      {!showResults && (
        <div className="text-center py-12 text-gray-400">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Enter a search query to begin</p>
          <p className="text-sm">Search across medical, legal, programming, and scientific domains</p>
        </div>
      )}
    </div>
  );
}
