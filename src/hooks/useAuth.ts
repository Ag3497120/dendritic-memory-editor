// frontend/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email');

    // Here you could add token validation (e.g., decoding and checking expiry)
    if (token && userId) {
      setIsAuthenticated(true);
      setUser({ id: userId, email: email || '' });
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false); // Finished checking
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    setIsAuthenticated(false);
    setUser(null);
    // Use navigate for consistency with React Router
    navigate('/');
    window.location.reload(); // Force a refresh to clear all state
  }, [navigate]);

  return { isAuthenticated, user, logout, isLoading };
}
