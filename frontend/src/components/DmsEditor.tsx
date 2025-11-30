import { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { useAuth } from '../contexts/AuthContext';

interface KnowledgeTile {
    id: string;
    domain: string;
    content: string;
    author_mark: 'community' | 'expert';
    updated_at: string;
}

export default function DmsEditor() {
    const { user } = useAuth();
    const [tiles, setTiles] = useState<KnowledgeTile[]>([]);
    const [newTileContent, setNewTileContent] = useState('');
    const [domain, setDomain] = useState('medical'); // Default domain
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTiles();
    }, [domain]);

    const fetchTiles = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get(`/api/tiles?domain=${domain}`);
            setTiles(response.data);
        } catch (err) {
            setError('Failed to fetch knowledge tiles.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newTileContent.trim()) {
            setError('Content cannot be empty.');
            return;
        }

        try {
            const response = await apiClient.post('/api/tiles', {
                content: newTileContent,
                domain: domain,
            });
            setTiles([response.data, ...tiles]); // Add new tile to the top
            setNewTileContent(''); // Clear input
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create tile.');
            console.error(err);
        }
    };

    const handleDeleteTile = async (tileId: string) => {
        setError('');
        if (!window.confirm('Are you sure you want to delete this tile?')) {
            return;
        }

        try {
            await apiClient.delete(`/api/tiles/${tileId}`);
            setTiles(tiles.filter(tile => tile.id !== tileId));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete tile.');
            console.error(err);
        }
    };

    // Basic responsive styles
    const styles: { [key: string]: React.CSSProperties } = {
        editorContainer: { maxWidth: '800px', margin: '20px auto', padding: '0 15px' },
        form: { marginBottom: '20px' },
        textarea: { width: '100%', minHeight: '80px', marginBottom: '10px', padding: '10px', boxSizing: 'border-box' },
        button: { padding: '10px 15px', cursor: 'pointer' },
        tileList: { listStyle: 'none', padding: 0 },
        tileItem: { border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px' },
        tileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' },
        authorMark: { padding: '3px 8px', borderRadius: '12px', fontSize: '0.8em', color: 'white' },
        expertMark: { backgroundColor: '#007bff' },
        communityMark: { backgroundColor: '#6c757d' },
    };
    
    return (
        <div style={styles.editorContainer}>
            <h2>Dendritic Memory Editor - "{domain}" Domain</h2>
            {user && <p>You are editing as an <b>{user.isExpert ? 'Expert' : 'Community'}</b> member.</p>}
            
            <form onSubmit={handleCreateTile} style={styles.form}>
                <textarea
                    style={styles.textarea}
                    value={newTileContent}
                    onChange={(e) => setNewTileContent(e.target.value)}
                    placeholder="Enter new knowledge tile content..."
                />
                <button type="submit" style={styles.button}>Create Tile</button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p>Loading tiles...</p>}

            <ul style={styles.tileList}>
                {tiles.map(tile => (
                    <li key={tile.id} style={styles.tileItem}>
                        <div style={styles.tileHeader}>
                            <span 
                                style={{
                                    ...styles.authorMark, 
                                    ...(tile.author_mark === 'expert' ? styles.expertMark : styles.communityMark)
                                }}
                            >
                                {tile.author_mark}
                            </span>
                            <small>Last updated: {new Date(tile.updated_at).toLocaleString()}</small>
                        </div>
                        <p>{tile.content}</p>
                        <button onClick={() => handleDeleteTile(tile.id)} style={{...styles.button, backgroundColor: '#dc3545', color: 'white', border: 'none'}}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
