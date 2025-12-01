// frontend/src/pages/AllTiles.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { TileCard } from '../components/TileCard';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

// Re-using the same tile structure
interface KnowledgeTile {
    id: string;
    topic: string;
    domain: string;
    content: string;
    author_mark: 'community' | 'expert';
    updated_at: string;
}

export default function AllTiles() {
    const [tiles, setTiles] = useState<KnowledgeTile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/api/all-tiles');
            setTiles(response.data);
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
                <div className="flex justify-end items-center mb-4">
                    <button onClick={fetchData} disabled={isLoading} className="p-2 text-gray-500 hover:text-gray-800 disabled:opacity-50">
                        <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
                
                {isLoading ? (
                    <p>Loading all tiles...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {tiles.map(tile => (
                            <TileCard key={tile.id} tile={tile} onDelete={() => {}} />
                        ))}
                    </div>
                )}
                {!isLoading && tiles.length === 0 && !error && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900">No tiles found in the database.</h3>
                    </div>
                )}
            </main>
        </div>
    );
}
