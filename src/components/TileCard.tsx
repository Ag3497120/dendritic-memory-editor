// src/components/TileCard.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth'; // Import the useAuth hook

// Define the shape of a tile object
interface KnowledgeTile {
    id: string;
    topic: string;
    domain: string;
    content: string;
    author_mark: 'community' | 'expert';
    updated_at: string;
}

interface TileCardProps {
    tile: KnowledgeTile;
    onDelete?: (tileId: string) => void;
}

export function TileCard({ tile, onDelete }: TileCardProps) {
    const { isAuthenticated } = useAuth(); // Get authentication status

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{tile.topic || 'No Topic'}</h3>
                        <p className="text-sm text-gray-500">Domain: {tile.domain}</p>
                    </div>
                    <span 
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            tile.author_mark === 'expert' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {tile.author_mark}
                    </span>
                </div>
                
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{tile.content}</p>

                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400">
                        Last updated: {new Date(tile.updated_at).toLocaleString()}
                    </p>
                    {isAuthenticated && onDelete && ( // Also check if onDelete is provided
                        <button 
                            onClick={() => onDelete(tile.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
