// src/components/TileCard.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../apiClient';
import { PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';

// Define the shape of a tile object
interface KnowledgeTile {
    id: string;
    topic: string;
    domain: string;
    content: string;
    author_mark: 'community' | 'expert';
    author_id: string;
    updated_at: string;
    coordinates_x?: number;
    coordinates_y?: number;
    coordinates_z?: number;
}

interface TileCardProps {
    tile: KnowledgeTile;
    onDelete?: (tileId: string) => void;
    onUpdate?: (updatedTile: KnowledgeTile) => void;
}

export function TileCard({ tile, onDelete, onUpdate }: TileCardProps) {
    const { isAuthenticated } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(tile.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (editedContent.trim() === tile.content) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            const response = await apiClient.put(`/api/tiles/${tile.id}`, {
                content: editedContent.trim(),
                domain: tile.domain
            });

            if (onUpdate) {
                onUpdate(response.data);
            }
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update tile:', err);
            alert('Failed to update tile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedContent(tile.content);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{tile.topic || 'No Topic'}</h3>
                        <p className="text-sm text-gray-500">Domain: {tile.domain}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Author: {tile.author_id ? tile.author_id.substring(0, 8) + '...' : 'Unknown'}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                tile.author_mark === 'expert'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                            {tile.author_mark}
                        </span>
                        {tile.coordinates_x !== undefined && (
                            <span className="px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded">
                                3D: ({tile.coordinates_x?.toFixed(1)}, {tile.coordinates_y?.toFixed(1)}, {tile.coordinates_z?.toFixed(1)})
                            </span>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="mb-4">
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={6}
                            disabled={isSaving}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                                <XMarkIcon className="h-4 w-4" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                                <CheckIcon className="h-4 w-4" />
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{tile.content}</p>
                )}

                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400">
                        Last updated: {new Date(tile.updated_at).toLocaleString()}
                    </p>
                    {isAuthenticated && !isEditing && (
                        <div className="flex gap-2">
                            {onUpdate && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Edit
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(tile.id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
