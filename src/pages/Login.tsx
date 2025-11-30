import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../apiClient';

const API_BASE_URL = 'https://dendritic-memory-backend.nullai-db-app-face.workers.dev';

export default function Login() {
    const [npiNumber, setNpiNumber] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleNpiLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await apiClient.post('/api/auth/npi/verify', { npiNumber });
            if (response.data.token) {
                login(response.data.token);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'NPI login failed.');
        }
    };
    
    const handleGuestLogin = async () => {
        setError('');
        try {
            const response = await apiClient.post('/api/auth/guest/login');
            if (response.data.token) {
                login(response.data.token);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Guest login failed.');
        }
    };

    const styles: { [key: string]: React.CSSProperties } = {
        container: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' },
        button: { display: 'block', width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: 'none', cursor: 'pointer', textDecoration: 'none', color: 'white' },
        googleButton: { backgroundColor: '#4285F4' },
        githubButton: { backgroundColor: '#333' },
        orcidButton: { backgroundColor: '#A6CE39' },
        guestButton: { backgroundColor: '#6c757d'},
        npiForm: { marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' },
        input: { width: 'calc(100% - 22px)', padding: '10px', marginBottom: '10px' },
        npiButton: { backgroundColor: '#007bff' },
        error: { color: 'red', marginTop: '10px' }
    };

    return (
        <div style={styles.container}>
            <h2>Login to Dendritic Memory Editor</h2>
            
            <a href={`${API_BASE_URL}/api/oauth/google/login`} style={{...styles.button, ...styles.googleButton}}>Login with Google</a>
            <a href={`${API_BASE_URL}/api/oauth/github/login`} style={{...styles.button, ...styles.githubButton}}>Login with GitHub</a>
            <a href={`${API_BASE_URL}/api/oauth/orcid/login`} style={{...styles.button, ...styles.orcidButton}}>Login with ORCID</a>
            
            <button onClick={handleGuestLogin} style={{...styles.button, ...styles.guestButton}}>Continue as Guest</button>

            <div style={styles.npiForm}>
                <h3>NPI Login (for US Medical Experts)</h3>
                <form onSubmit={handleNpiLogin}>
                    <input 
                        type="text" 
                        value={npiNumber}
                        onChange={(e) => setNpiNumber(e.target.value)}
                        placeholder="Enter your 10-digit NPI number"
                        style={styles.input}
                    />
                    <button type="submit" style={{...styles.button, ...styles.npiButton}}>Login with NPI</button>
                </form>
            </div>
            {error && <p style={styles.error}>{error}</p>}
        </div>
    );
}
