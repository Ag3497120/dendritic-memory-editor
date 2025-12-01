import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../apiClient';

import { TileCard } from '../components/TileCard';
import { CreateTileModal } from '../components/CreateTileModal';
import { IathExportButton } from '../components/IathExport';
import { IathImportButton } from '../components/IathImport';
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/solid';

// Define types locally for clarity
interface KnowledgeTile {
    id: string;
    topic: string;
    domain: string;
    content: string;
    author_mark: 'community' | 'expert';
    updated_at: string;
}

const PREDEFINED_DOMAINS = ['Medical', 'Programming', 'Science', 'History', 'Art', 'Other'];

export default function Dashboard() {
    const { user, logout } = useAuth();
    
    // State management
    const [tiles, setTiles] = useState<KnowledgeTile[]>([]);
    const [dbStats, setDbStats] = useState<any>(null);
    const [selectedDomain, setSelectedDomain] = useState('Medical');
    const [customDomain, setCustomDomain] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const activeDomain = selectedDomain === 'Other' ? customDomain.trim() : selectedDomain;

    const fetchData = async () => {
        if (!activeDomain) return;
        setIsLoading(true);
        setError('');
        try {
            // Fetch tiles and stats in parallel
            const [tilesResponse, statsResponse] = await Promise.all([
                apiClient.get(`/api/tiles?domain=${activeDomain}`),
                apiClient.get('/api/db/stats')
            ]);
            setTiles(tilesResponse.data);
            setDbStats(statsResponse.data);
        } catch (err) {
            setError('Failed to fetch data. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeDomain]);

    const handleCreateTile = async (topic: string, content: string): Promise<void> => {
        if (!topic.trim() || !content.trim() || !activeDomain.trim()) {
            throw new Error('Topic, content, and domain cannot be empty.');
        }

        try {
            // The backend should ideally determine the author_mark from the JWT
            const response = await apiClient.post('/api/tiles', {
                topic,
                content,
                domain: activeDomain,
            });
            // Add new tile to the top of the list for immediate feedback
            setTiles(prevTiles => [response.data, ...prevTiles]);
            // Refresh stats after creating a tile
            const statsResponse = await apiClient.get('/api/db/stats');
            setDbStats(statsResponse.data);
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.error || 'Failed to create tile.';
            throw new Error(errorMessage);
        }
    };

    const handleDeleteTile = async (tileId: string) => {
        if (!window.confirm('Are you sure you want to delete this tile? This action cannot be undone.')) {
            return;
        }
        try {
            await apiClient.delete(`/api/tiles/${tileId}`);
            setTiles(tiles.filter(tile => tile.id !== tileId));
            // Optional: You might want to show a success toast here
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete tile.');
            console.error(err);
        }
    };
    
    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-3">
                        <h1 className="text-xl font-bold text-gray-900">Dendritic Memory</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600 hidden sm:block">
                                Logged in as: <strong>{user?.email || '...'}</strong>
                            </span>
                            <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-800">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="space-y-6 sticky top-24">
                            {/* Domain Selector */}
                            <div>
                                <label htmlFor="domain-select" className="block text-sm font-medium text-gray-700 mb-1">
                                    Domain
                                </label>
                                <select
                                    id="domain-select"
                                    value={selectedDomain}
                                    onChange={(e) => setSelectedDomain(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {PREDEFINED_DOMAINS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                {selectedDomain === 'Other' && (
                                    <input
                                        type="text"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value)}
                                        placeholder="Enter custom domain"
                                        className="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                )}
                            </div>

                            {/* DB Stats */}
                            {dbStats && (
                                <div className="border-t pt-6">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database Stats</h3>
                                    <div className="mt-2 space-y-1 text-sm text-gray-800">
                                        <p><strong>{dbStats.total_knowledge_tiles}</strong> Total Tiles</p>
                                        <p><strong>{dbStats.total_users}</strong> Total Users</p>
                                    </div>
                                </div>
                            )}

                            {/* Management Actions */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</h3>
                                <IathExportButton domain={activeDomain} />
                                <IathImportButton />
                            </div>
                        </div>
                    </aside>

                    {/* Main Tile Area */}
                    <div className="lg:col-span-3">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Knowledge Tiles</h2>
                            <div className="flex items-center space-x-2">
                                <button onClick={fetchData} disabled={isLoading} className="p-2 text-gray-500 hover:text-gray-800 disabled:opacity-50">
                                    <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                                    <PlusIcon className="h-5 w-5" />
                                    Create Tile
                                </button>
                            </div>
                        </div>

                        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
                        
                        {isLoading ? (
                            <p>Loading tiles for "{activeDomain}"...</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {tiles.map(tile => (
                                    <TileCard key={tile.id} tile={tile} onDelete={handleDeleteTile} />
                                ))}
                            </div>
                        )}
                        {!isLoading && tiles.length === 0 && !error && (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900">No tiles found</h3>
                                <p className="mt-1 text-sm text-gray-500">Create a new tile to get started in the "{activeDomain}" domain.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <CreateTileModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateTile}
                predefinedDomains={PREDEFINED_DOMAINS}
                activeDomain={activeDomain}
            />
        </div>
    );
}
