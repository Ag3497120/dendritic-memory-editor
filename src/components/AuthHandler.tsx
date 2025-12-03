// frontend/src/components/AuthHandler.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    console.log('AuthHandler: Current location:', location);
    console.log('AuthHandler: window.location.href:', window.location.href);
    console.log('AuthHandler: window.location.hash:', window.location.hash);

    let params: URLSearchParams | null = null;

    // For HashRouter, check the hash part
    const hash = window.location.hash;

    // Case 1: /#/auth/callback?token=... (HashRouter with query in hash)
    if (hash.includes('/auth/callback?')) {
      const queryStart = hash.indexOf('?');
      params = new URLSearchParams(hash.substring(queryStart + 1));
      console.log('AuthHandler: Found params in hash (case 1)');
    }
    // Case 2: /auth/callback?token=... (Direct URL access)
    else if (location.search) {
      params = new URLSearchParams(location.search);
      console.log('AuthHandler: Found params in location.search (case 2)');
    }
    // Case 3: /#/?token=... (HashRouter with query at root)
    else if (hash.includes('?')) {
      const queryStart = hash.indexOf('?');
      params = new URLSearchParams(hash.substring(queryStart + 1));
      console.log('AuthHandler: Found params in hash (case 3)');
    }

    if (!params) {
      console.log('AuthHandler: No params found, returning');
      return;
    }

    const token = params.get('token');
    const userId = params.get('user_id');
    const email = params.get('email');
    const error = params.get('error');

    console.log('AuthHandler: token:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('AuthHandler: error:', error);

    if (error) {
      console.error('OAuth error from backend:', error);
      alert(`Login failed: ${error}`);
      navigate('/login');
      return;
    }

    if (token && !isProcessing) {
      console.log('AuthHandler: Processing token...');
      setIsProcessing(true);

      // Save token and user info to localStorage
      localStorage.setItem('authToken', token);
      if (userId) localStorage.setItem('user_id', userId);
      if (email) localStorage.setItem('user_email', email);

      console.log('Auth token saved:', token.substring(0, 20) + '...');

      // Redirect to home page
      navigate('/');

      setTimeout(() => {
        window.location.reload();
      }, 50);
    } else {
      console.log('AuthHandler: No token or already processing');
    }
  }, [location, navigate, isProcessing]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
