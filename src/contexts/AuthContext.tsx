import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Helper to decode JWT

interface AuthContextType {
    token: string | null;
    user: DecodedUser | null;
    isLoggedIn: boolean;
    login: (token: string) => void;
    logout: () => void;
}

interface DecodedUser {
    userId: string;
    isExpert: boolean;
    exp: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [user, setUser] = useState<DecodedUser | null>(null);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode<DecodedUser>(token);
                // Check if token is expired
                if (decoded.exp * 1000 > Date.now()) {
                    setUser(decoded);
                } else {
                    // Token is expired
                    logout();
                }
            } catch (error) {
                console.error("Failed to decode token", error);
                logout();
            }
        } else {
            setUser(null);
        }
    }, [token]);

    const login = (newToken: string) => {
        try {
            const decoded = jwtDecode<DecodedUser>(newToken);
            // Check if token is expired before setting it
            if (decoded.exp * 1000 > Date.now()) {
                localStorage.setItem('authToken', newToken);
                setToken(newToken);
                setUser(decoded); // Set user state immediately
            } else {
                console.error("Attempted to login with an expired token.");
                logout(); // Clear expired token
            }
        } catch (error) {
            console.error("Failed to decode token on login", error);
            logout(); // Clear invalid token
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null); // Also clear user state
    };

    const value = {
        token,
        user,
        isLoggedIn: !!user,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
