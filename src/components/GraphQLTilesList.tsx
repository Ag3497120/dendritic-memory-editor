/**
 * GraphQL Tiles List Component
 *
 * Demonstrates GraphQL integration for fetching and managing tiles
 * Uses Apollo Client for caching and real-time updates
 */

import { useState, useEffect } from "react";
import { useGraphQLQuery } from "../hooks/useGraphQL";
import { DocumentTextIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

const TILES_QUERY = `
  query GetTiles($domain: String, $limit: Int, $offset: Int) {
    tiles(domain: $domain, limit: $limit, offset: $offset) {
      id
      topic
      domain
      content
      authorMark
      confidenceScore
      version
      createdAt
      updatedAt
      createdBy {
        email
        username
      }
    }
  }
`;

interface Tile {
  id: string;
  topic: string;
  domain: string;
  content: string;
  authorMark: string;
  confidenceScore: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    email: string;
    username: string;
  };
}

interface GraphQLTilesListProps {
  domain?: string;
  limit?: number;
}

export default function GraphQLTilesList({
  domain = "Medical",
  limit = 20,
}: GraphQLTilesListProps) {
  const [offset, setOffset] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);

  // GraphQL query
  const { data, loading, error, refetch } = useGraphQLQuery(TILES_QUERY, {
    domain: domain || undefined,
    limit,
    offset,
  });

  // Update tiles when data changes
  useEffect(() => {
    if (data?.tiles) {
      setTiles(data.tiles);
    }
  }, [data]);

  const handleNextPage = () => {
    setOffset(offset + limit);
  };

  const handlePreviousPage = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 mt-4">Loading tiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          Knowledge Tiles ({domain})
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-700 font-semibold">Error loading tiles</p>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {/* Tiles Grid */}
      {tiles.length > 0 ? (
        <div className="space-y-4 mb-6">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {tile.topic}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {tile.domain}
                    </span>

                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        tile.authorMark === "EXPERT"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {tile.authorMark}
                    </span>

                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {(tile.confidenceScore * 100).toFixed(0)}% confidence
                    </span>

                    <span className="text-xs text-gray-500">
                      v{tile.version}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mt-3 line-clamp-2">
                    {tile.content}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>By {tile.createdBy.username}</span>
                    <span>
                      Created{" "}
                      {new Date(tile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition">
                    <PlusIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded transition">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-600 text-lg">No tiles found</p>
          <p className="text-gray-500 text-sm mt-1">
            Try adjusting your filters
          </p>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousPage}
          disabled={offset === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Showing {offset + 1} - {offset + tiles.length}
        </span>

        <button
          onClick={handleNextPage}
          disabled={tiles.length < limit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
