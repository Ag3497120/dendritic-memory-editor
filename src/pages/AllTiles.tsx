// frontend/src/pages/AllTiles.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { TileCard } from '../components/TileCard';
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// Re-using the same tile structure
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

export default function AllTiles() {
    const [tiles, setTiles] = useState<KnowledgeTile[]>([]);
    const [filteredTiles, setFilteredTiles] = useState<KnowledgeTile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [domainFilter, setDomainFilter] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/api/tiles');
            const tilesData = Array.isArray(response.data) ? response.data : [];
            setTiles(tilesData);
            setFilteredTiles(tilesData);
        } catch (err) {
            setError('Failed to fetch data. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter tiles based on search query and domain
    useEffect(() => {
        let filtered = tiles;

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(tile =>
                tile.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tile.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tile.domain?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by domain
        if (domainFilter) {
            filtered = filtered.filter(tile => tile.domain === domainFilter);
        }

        setFilteredTiles(filtered);
    }, [searchQuery, domainFilter, tiles]);

    // Get unique domains
    const domains = Array.from(new Set(tiles.map(tile => tile.domain))).sort();

    const handleTileUpdate = (updatedTile: KnowledgeTile) => {
        setTiles(prev => prev.map(tile => tile.id === updatedTile.id ? updatedTile : tile));
    };

    const handleTileDelete = async (tileId: string) => {
        if (!confirm('Are you sure you want to delete this tile?')) return;

        try {
            await apiClient.delete(`/api/tiles/${tileId}`);
            setTiles(prev => prev.filter(tile => tile.id !== tileId));
        } catch (err) {
            console.error('Failed to delete tile:', err);
            alert('Failed to delete tile');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-3">
                        <h1 className="text-xl font-bold text-gray-900">All Knowledge Tiles</h1>
                        <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            Back to My Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Filter */}
                <div className="mb-6 space-y-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tiles by topic, content, or domain..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Domains</option>
                            {domains.map(domain => (
                                <option key={domain} value={domain}>{domain}</option>
                            ))}
                        </select>
                        <button onClick={fetchData} disabled={isLoading} className="p-2 text-gray-500 hover:text-gray-800 disabled:opacity-50">
                            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600">
                        Showing {filteredTiles.length} of {tiles.length} tiles
                    </p>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

                {isLoading ? (
                    <p>Loading all tiles...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTiles.map(tile => (
                            <TileCard
                                key={tile.id}
                                tile={tile}
                                onDelete={handleTileDelete}
                                onUpdate={handleTileUpdate}
                            />
                        ))}
                    </div>
                )}
                {!isLoading && filteredTiles.length === 0 && !error && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900">
                            {searchQuery || domainFilter ? 'No tiles match your search criteria.' : 'No tiles found in the database.'}
                        </h3>
                    </div>
                )}
            </main>
        </div>
    );
}
