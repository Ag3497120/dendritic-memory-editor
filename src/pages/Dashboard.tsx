import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../apiClient';

import { Layout } from '../components/Layout';
import { TileCard } from '../components/TileCard';
import { CreateTileModal } from '../components/CreateTileModal';
import { IathExportButton } from '../components/IathExport';
import { IathImportButton } from '../components/IathImport';
import { ArrowPathIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
        <Layout>
            {/* Dashboard Content */}
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tiles</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {dbStats?.total_knowledge_tiles || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {dbStats?.total_users || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Your Role</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {user?.isExpert ? 'Expert' : 'Community'}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">{user?.isExpert ? '⭐' : '👤'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Domain Selector */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select Domain
                            </label>
                            <select
                                value={selectedDomain}
                                onChange={(e) => setSelectedDomain(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                {PREDEFINED_DOMAINS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {selectedDomain === 'Other' && (
                                <input
                                    type="text"
                                    value={customDomain}
                                    onChange={(e) => setCustomDomain(e.target.value)}
                                    placeholder="Enter custom domain"
                                    className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-2">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Tile
                            </button>
                            <IathExportButton domain={activeDomain} />
                            <IathImportButton />
                            <Link
                                to="/all-tiles"
                                className="w-full block text-center px-4 py-2 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                View All Tiles
                            </Link>
                        </div>
                    </div>

                    {/* Tiles Grid */}
                    <div className="lg:col-span-3">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Knowledge Tiles
                            </h2>
                            <button
                                onClick={fetchData}
                                disabled={isLoading}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                                title="Refresh"
                            >
                                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Loading tiles...</p>
                                </div>
                            </div>
                        ) : tiles.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tiles.map(tile => (
                                    <TileCard key={tile.id} tile={tile} onDelete={handleDeleteTile} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                <SparklesIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                    No tiles found
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Create a new tile to get started in the "{activeDomain}" domain.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CreateTileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateTile}
                predefinedDomains={PREDEFINED_DOMAINS}
                activeDomain={activeDomain}
            />
        </Layout>
    );
}
