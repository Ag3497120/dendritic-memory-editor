// frontend/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // Correctly import jwt-decode

// Define the structure of the JWT payload
interface JwtPayload {
  userId: string;
  username: string;
  isExpert: boolean;
  provider: string;
  iat: number;
  exp: number;
}

// Define the structure for the user object in our app state
export interface AuthUser {
  id: string;
email: any;
  username: string;
  isExpert: boolean;
  provider: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);

        // Check if the token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          setUser({
            id: decoded.userId,
            username: decoded.username,
            isExpert: decoded.isExpert,
            provider: decoded.provider,
            email: ''
          });
        } else {
          // Token is expired
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to decode JWT:", error);
        // Invalid token
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    // Also clear the old keys if they exist
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
    window.location.reload();
  }, [navigate]);

  return { isAuthenticated, user, logout, isLoading };
}

