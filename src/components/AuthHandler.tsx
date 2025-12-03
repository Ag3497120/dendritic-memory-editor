// frontend/src/components/AuthHandler.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let params: URLSearchParams;

    // Check for query params in the regular URL (for /auth/callback route)
    if (location.search) {
      params = new URLSearchParams(location.search);
    }
    // For HashRouter, params might be in the hash. e.g., /#/?token=...
    else {
      const hash = window.location.hash;
      if (!hash.includes('?')) {
        return; // No params to process
      }
      params = new URLSearchParams(hash.substring(hash.indexOf('?')));
    }

    const token = params.get('token');
    const userId = params.get('user_id');
    const email = params.get('email');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error from backend:', error);
      alert(`Login failed: ${error}`);
      navigate('/login');
      return;
    }

    if (token && !isProcessing) {
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
