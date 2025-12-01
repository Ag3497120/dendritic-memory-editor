import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DmsEditor from '../components/DmsEditor';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        // The logout function in the new hook already handles navigation and reload.
    };

    const styles: { [key: string]: React.CSSProperties } = {
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6'
        },
        userInfo: {
            margin: 0
        },
        logoutButton: {
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
        }
    };

    return (
        <div>
            <header style={styles.header}>
                {user ? (
                    <p style={styles.userInfo}>
                        Logged in as: <strong>{user.email || user.id}</strong> 
                    </p>
                ) : (
                    <p style={styles.userInfo}>Loading user...</p>
                )}
                <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
            </header>
            <main>
                <DmsEditor />
            </main>
        </div>
    );
}
