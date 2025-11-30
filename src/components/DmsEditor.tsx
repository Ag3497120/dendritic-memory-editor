import { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { useAuth } from '../contexts/AuthContext';

interface KnowledgeTile {
    id: string;
    domain: string;
    content: string;
    author_id: string; // author_id added as per simplified schema
    author_mark: 'community' | 'expert';
    created_at: string; // created_at added as per simplified schema
    updated_at: string;
}

const PREDEFINED_DOMAINS = [
    'Medical',
    'Programming',
    'Mathematics',
    'Science',
    'History',
    'Art',
    'Other' // Special option for custom input
];

export default function DmsEditor() {
    const { user } = useAuth();
    const [tiles, setTiles] = useState<KnowledgeTile[]>([]);
    const [newTileContent, setNewTileContent] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('Medical'); // State for selected domain from dropdown
    const [customDomain, setCustomDomain] = useState(''); // State for custom domain input
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [dbStats, setDbStats] = useState<any>(null); // New state for DB stats

    // Determine the active domain based on selection
    const activeDomain = selectedDomain === 'Other' ? customDomain : selectedDomain;

    useEffect(() => {
        if (activeDomain) { // Only fetch if activeDomain is set
            fetchTiles();
        }
        fetchDbStats(); // Fetch stats on component mount or user change
    }, [activeDomain, user]); // Added user to dependency array

    const fetchTiles = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get(`/api/tiles?domain=${activeDomain}`);
            setTiles(response.data);
        } catch (err) {
            setError('Failed to fetch knowledge tiles.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDbStats = async () => {
        try {
            const response = await apiClient.get('/api/db/stats');
            setDbStats(response.data);
        } catch (err) {
            console.error('Failed to fetch DB stats:', err);
        }
    };

    const handleCreateTile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newTileContent.trim()) {
            setError('Content cannot be empty.');
            return;
        }
        if (!activeDomain.trim()) {
            setError('Domain cannot be empty.');
            return;
        }

        try {
            const response = await apiClient.post('/api/tiles', {
                content: newTileContent,
                domain: activeDomain, // Use activeDomain
            });
            setTiles([response.data, ...tiles]); // Add new tile to the top
            setNewTileContent(''); // Clear input
            if (selectedDomain === 'Other') {
                setCustomDomain(''); // Clear custom domain input as well
            }        } catch (err: any) {
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

    const handleDownloadDb = async () => {
        try {
            const response = await apiClient.get('/api/db/export', {
                responseType: 'blob', // Important for downloading files
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `db_export_${new Date().toISOString()}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (err) {
            console.error('Failed to download DB export:', err);
            setError('Failed to download DB export.');
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
        input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }, // Added style for input
    };
    
    return (
        <div style={styles.editorContainer}>
            <h2>Dendritic Memory Editor</h2>
            {user && <p>You are editing as an <b>{user.isExpert ? 'Expert' : 'Community'}</b> member.</p>}
            
            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="domain-select" style={{ marginRight: '10px' }}>Select Domain:</label>
                <select
                    id="domain-select"
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    {PREDEFINED_DOMAINS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                {selectedDomain === 'Other' && (
                    <input
                        type="text"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="Enter custom domain"
                        style={{ ...styles.input, marginLeft: '10px', width: '200px' }}
                    />
                )}
            </div>

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
            {loading && <p>Loading tiles for "{activeDomain}"...</p>} {/* Display activeDomain here */}

            {/* DB Stats and Export Section */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h3>Database Status</h3>
                <button onClick={handleDownloadDb} style={{ ...styles.button, backgroundColor: '#28a745', color: 'white', marginBottom: '15px' }}>
                    Download All Data (JSON)
                </button>
                {dbStats && (
                    <div>
                        <p>Total Knowledge Tiles: <b>{dbStats.total_knowledge_tiles}</b></p>
                        <p>Total Users: <b>{dbStats.total_users}</b></p>
                        <h4>Tiles by Domain:</h4>
                        <ul style={{ listStyle: 'disc', marginLeft: '20px' }}>
                            {dbStats.knowledge_tiles_by_domain.map((item: any) => (
                                <li key={item.domain}>{item.domain}: <b>{item.count}</b></li>
                            ))}
                        </ul>
                        <small>Generated at: {new Date(dbStats.generated_at).toLocaleString()}</small>
                    </div>
                )}
            </div>

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
                            <small>Domain: {tile.domain}</small> {/* Display domain here */}
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
