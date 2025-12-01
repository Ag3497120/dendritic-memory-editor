// frontend/src/components/IathImport.tsx
import React, { useState, useRef } from 'react';

// This should be in a central config file, but defined here for simplicity
const API_BASE_URL = 'https://dendritic-memory-backend.nullai-db-app-face.workers.dev';

export function IathImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    try {
      // Assuming a token is stored in localStorage for auth
      const token = localStorage.getItem('auth_token');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/api/db/iath/import`, {
        method: 'POST',
        headers: {
          // 'Authorization': `Bearer ${token}` // Assuming backend requires auth
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Import failed');
      }

      alert(`Successfully imported ${result.imported} tiles to ${result.domain}`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload the page to show the new tiles
      window.location.reload();
      
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".iath,.json" 
        onChange={handleImport}
        disabled={isImporting}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          disabled:opacity-50"
      />
      {isImporting && <span className="text-sm text-gray-600">Importing...</span>}
    </div>
  );
}
