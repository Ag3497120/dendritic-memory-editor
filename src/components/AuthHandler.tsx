// frontend/src/components/AuthHandler.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // For HashRouter, params are in the hash. e.g., /#/?token=...
    const hash = window.location.hash;
    if (!hash.includes('?')) {
        return; // No params to process
    }

    const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
    const token = params.get('token');
    const userId = params.get('user_id');
    const email = params.get('email');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error from backend:', error);
      alert(`Login failed: ${error}`);
      window.location.hash = '/'; // Clear hash
      return;
    }

    if (token && !isProcessing) {
      setIsProcessing(true);
      
      // Save token and user info to localStorage
      localStorage.setItem('authToken', token);
      if (userId) localStorage.setItem('user_id', userId);
      if (email) localStorage.setItem('user_email', email);

      console.log('Auth token saved:', token.substring(0, 20) + '...');

      // Clean the hash and reload the page to apply the auth state
      window.location.hash = '/';
      
      setTimeout(() => {
        window.location.reload();
      }, 50);
    }
  }, [location, navigate, isProcessing]);

  return null; // このコンポーネントは何も表示しない
}
