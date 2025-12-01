import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Helper to decode JWT

interface AuthContextType {
    token: string | null;
    user: DecodedUser | null;
    isLoggedIn: boolean;
    isLoading: boolean; // New loading state
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
    const [isLoading, setIsLoading] = useState(true); // Start as true on initial load

    useEffect(() => {
        const initialToken = localStorage.getItem('authToken');
        if (initialToken) {
            try {
                const decoded = jwtDecode<DecodedUser>(initialToken);
                if (decoded.exp * 1000 > Date.now()) {
                    setUser(decoded);
                    setToken(initialToken);
                } else {
                    localStorage.removeItem('authToken');
                }
            } catch (error) {
                console.error("Failed to decode initial token", error);
                localStorage.removeItem('authToken');
            }
        }
        setIsLoading(false); // Finished initial check
    }, []);

    const login = (newToken: string) => {
        try {
            const decoded = jwtDecode<DecodedUser>(newToken);
            if (decoded.exp * 1000 > Date.now()) {
                localStorage.setItem('authToken', newToken);
                setUser(decoded);
                setToken(newToken);
            } else {
                console.error("Attempted to login with an expired token.");
                logout();
            }
        } catch (error) {
            console.error("Failed to decode token on login", error);
            logout();
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
    };

    const value = {
        token,
        user,
        isLoggedIn: !!user,
        isLoading, // Expose loading state
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
