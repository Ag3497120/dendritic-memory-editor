/**
 * Advanced Search Panel Component
 *
 * Comprehensive search interface with:
 * - Full-text search
 * - Faceted filtering
 * - Semantic search
 * - Search history
 * - Saved searches
 */

import { useState, useCallback, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  ClockIcon,
  BookmarkIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useGraphQL } from "../hooks/useGraphQL";

interface SearchFilters {
  domain?: string;
  authorMark?: "EXPERT" | "COMMUNITY";
  confidenceMin?: number;
  confidenceMax?: number;
  dateRange?: { start: number; end: number };
  tags?: string[];
}

interface SearchResult {
  id: string;
  title: string;
  domain: string;
  snippet: string;
  relevanceScore: number;
  authorMark: string;
  confidence: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: number;
}

const SEARCH_QUERY = `
  query Search($query: String!, $filters: SearchFilters, $limit: Int, $offset: Int) {
    search(query: $query, filters: $filters, limit: $limit, offset: $offset) {
      results {
        id
        title
        domain
        snippet
        relevanceScore
        authorMark
        confidence
      }
      totalCount
      facets {
        domain {
          name
          values {
            value
            label
            count
          }
        }
        authorMark {
          name
          values {
            value
            label
            count
          }
        }
      }
    }
  }
`;

export default function AdvancedSearchPanel() {
  const { query } = useGraphQL();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"full-text" | "semantic">(
    "full-text"
  );
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  const limit = 20;

  // Load search history and saved searches from localStorage
  useEffect(() => {
    const history = localStorage.getItem("searchHistory");
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 10));
    }

    const saved = localStorage.getItem("savedSearches");
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setOffset(0);

    try {
      const result = await query(SEARCH_QUERY, {
        query: searchQuery,
        filters: searchQuery ? filters : undefined,
        limit,
        offset: 0,
      });

      if (result.data?.search) {
        setResults(result.data.search.results);
        setTotalCount(result.data.search.totalCount);
        setFacets(result.data.search.facets);

        // Add to search history
        const newHistory = [
          searchQuery,
          ...searchHistory.filter((q) => q !== searchQuery),
        ].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, query, searchHistory]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filters]);

  // Load more results
  const handleLoadMore = useCallback(async () => {
    const newOffset = offset + limit;
    setOffset(newOffset);

    try {
      const result = await query(SEARCH_QUERY, {
        query: searchQuery,
        filters,
        limit,
        offset: newOffset,
      });

      if (result.data?.search) {
        setResults((prev) => [...prev, ...result.data.search.results]);
      }
    } catch (error) {
      console.error("Load more failed:", error);
    }
  }, [query, searchQuery, filters, offset]);

  // Save current search
  const handleSaveSearch = useCallback(() => {
    if (!saveSearchName.trim()) return;

    const newSavedSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: saveSearchName,
      query: searchQuery,
      filters,
      createdAt: Date.now(),
    };

    const updated = [...savedSearches, newSavedSearch];
    setSavedSearches(updated);
    localStorage.setItem("savedSearches", JSON.stringify(updated));

    setSaveSearchName("");
    setShowSaveDialog(false);
  }, [saveSearchName, searchQuery, filters, savedSearches]);

  // Load saved search
  const handleLoadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
    setFilters(savedSearch.filters);
  }, []);

  // Delete saved search
  const handleDeleteSavedSearch = useCallback((id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem("savedSearches", JSON.stringify(updated));
  }, [savedSearches]);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Search Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Search Input */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      performSearch();
                    }
                  }}
                  placeholder="Search knowledge tiles..."
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                  showFilters
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
                Filters
              </button>
            </div>

            {/* Search Type Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSearchType("full-text")}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  searchType === "full-text"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Full-Text Search
              </button>
              <button
                onClick={() => setSearchType("semantic")}
                className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                  searchType === "semantic"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                Semantic
              </button>
            </div>
          </div>
        </div>

        {/* Search History / Suggestions */}
        {!searchQuery && (
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="max-w-4xl mx-auto">
              {searchHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((h) => (
                      <button
                        key={h}
                        onClick={() => setSearchQuery(h)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6">
              {/* Domain Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Domain
                </label>
                <select
                  value={filters.domain || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, domain: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Domains</option>
                  <option value="Medical">Medical</option>
                  <option value="Programming">Programming</option>
                  <option value="Science">Science</option>
                </select>
              </div>

              {/* Author Mark Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Type
                </label>
                <select
                  value={filters.authorMark || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      authorMark: (e.target.value as any) || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="EXPERT">Expert</option>
                  <option value="COMMUNITY">Community</option>
                </select>
              </div>

              {/* Confidence Range */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Min Confidence
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.confidenceMin || 0}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      confidenceMin: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <span className="text-sm text-gray-600">
                  {filters.confidenceMin || 0}%
                </span>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Last Updated
                </label>
                <select
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    if (days > 0) {
                      setFilters({
                        ...filters,
                        dateRange: {
                          start: Date.now() - days * 24 * 60 * 60 * 1000,
                          end: Date.now(),
                        },
                      });
                    } else {
                      setFilters({
                        ...filters,
                        dateRange: undefined,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Any time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto">
            {loading && !results.length ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <p className="text-gray-600 mt-4">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Found <span className="font-semibold">{totalCount}</span> results
                  </p>
                </div>

                <div className="space-y-4">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {result.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {result.domain}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                result.authorMark === "EXPERT"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {result.authorMark}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {(result.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-blue-600">
                            {(result.relevanceScore * 100).toFixed(0)}% match
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm">{result.snippet}</p>
                    </div>
                  ))}
                </div>

                {offset + limit < totalCount && (
                  <div className="text-center mt-6">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No results found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Saved Searches & Facets */}
      <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        {/* Save Search */}
        {searchQuery && (
          <div className="mb-6">
            {showSaveDialog ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="Search name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSearch}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveSearchName("");
                    }}
                    className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 flex items-center gap-2 justify-center"
              >
                <BookmarkIcon className="w-4 h-4" />
                Save Search
              </button>
            )}
          </div>
        )}

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Saved Searches
            </h3>
            <div className="space-y-2">
              {savedSearches.map((saved) => (
                <div
                  key={saved.id}
                  className="p-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <button
                    onClick={() => handleLoadSavedSearch(saved)}
                    className="block w-full text-left mb-1"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {saved.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {saved.query}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeleteSavedSearch(saved.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facets */}
        {facets.domain && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Domains
            </h3>
            <div className="space-y-2">
              {facets.domain.values?.map((facet: any) => (
                <label
                  key={facet.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.domain === facet.value}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({ ...filters, domain: facet.value });
                      } else {
                        setFilters({ ...filters, domain: undefined });
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-700">
                    {facet.label} ({facet.count})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
