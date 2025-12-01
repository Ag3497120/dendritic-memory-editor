import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { LoginButtons } from '../components/LoginButtons';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
    const [npiNumber, setNpiNumber] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLoginSuccess = (token: string) => {
        localStorage.setItem('authToken', token);
        try {
            // Decode token to get user info for localStorage, similar to AuthHandler
            const decoded: any = jwtDecode(token);
            if (decoded.sub) localStorage.setItem('user_id', decoded.sub);
            if (decoded.email) localStorage.setItem('user_email', decoded.email);
        } catch (e) {
            console.error("Could not decode token from NPI/Guest login", e);
        }
        // Reload the page for the useAuth hook to pick up the new state
        window.location.reload();
    };

    const handleNpiLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // This API endpoint might need to be adjusted
            const response = await apiClient.post('/api/oauth/npi/verify', { npiNumber });
            if (response.data.token) {
                handleLoginSuccess(response.data.token);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'NPI login failed.');
        }
    };
    
    const handleGuestLogin = async () => {
        setError('');
        try {
            // This API endpoint might need to be adjusted
            const response = await apiClient.post('/api/oauth/guest', {});
            if (response.data.token) {
                handleLoginSuccess(response.data.token);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Guest login failed.');
        }
    };

    const styles: { [key: string]: React.CSSProperties } = {
        container: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' },
        button: { display: 'block', width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: 'none', cursor: 'pointer', textDecoration: 'none', color: 'white' },
        guestButton: { backgroundColor: '#6c757d'},
        npiForm: { marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' },
        input: { width: 'calc(100% - 22px)', padding: '10px', marginBottom: '10px' },
        npiButton: { backgroundColor: '#007bff' },
        error: { color: 'red', marginTop: '10px' }
    };

    return (
        <div style={styles.container}>
            <h2>Login to Dendritic Memory Editor (v2)</h2>
            
            <LoginButtons />
            
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
