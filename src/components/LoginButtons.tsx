// frontend/src/components/LoginButtons.tsx
import React from 'react';

const API_BASE_URL = 'https://dendritic-memory-backend.nullai-db-app-face.workers.dev';

export function LoginButtons() {
  const handleGoogleLogin = () => {
    // Google OAuth ページにリダイレクト
    window.location.href = `${API_BASE_URL}/api/oauth/google/login`;
  };

  const handleOrcidLogin = () => {
    window.location.href = `${API_BASE_URL}/api/oauth/orcid/login`;
  };

  return (
    <div className="flex flex-col gap-4">
      <button 
        onClick={handleGoogleLogin}
        className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        {/* You should have this icon in your public folder */}
        <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
        Sign in with Google
      </button>
      
      <button 
        onClick={handleOrcidLogin}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
      >
        {/* You should have this icon in your public folder */}
        <img src="/orcid-icon.svg" alt="ORCID" className="w-5 h-5" />
        Sign in with ORCID
      </button>
    </div>
  );
}
