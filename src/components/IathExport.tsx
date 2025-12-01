// frontend/src/components/IathExport.tsx
import React, { useState } from 'react';

// This should be in a central config file, but defined here for simplicity
const API_BASE_URL = 'https://dendritic-memory-backend.nullai-db-app-face.workers.dev';

export function IathExportButton({ domain }: { domain: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Assuming a token is stored in localStorage for auth
      const token = localStorage.getItem('auth_token'); 
      
      const response = await fetch(
        `${API_BASE_URL}/api/db/iath/export?domain=${domain}`,
        {
          headers: {
            // 'Authorization': `Bearer ${token}` // Assuming backend requires auth
          }
        }
      );

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(errorData.error || 'Export failed');
      }

      // JSONレスポンスをBlobに変換
      const blob = await response.blob();
      
      // ダウンロード
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domain}_tiles_${Date.now()}.iath`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert('Export successful!');
      
    } catch (error: any) {
      console.error('Error exporting IATH:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {isExporting ? 'Exporting...' : `Export ${domain} (.iath)`}
    </button>
  );
}
