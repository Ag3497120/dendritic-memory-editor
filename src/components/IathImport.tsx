// frontend/src/components/IathImport.tsx
import React, { useState, useRef } from 'react';

// Use the same API URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function IathImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      // Get token from localStorage (key is 'authToken')
      const token = localStorage.getItem('authToken');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/tiles/iath/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // Backend requires auth
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Import failed');
      }

      let message = `Successfully imported ${result.imported} of ${result.total} tiles to ${result.domain}`;

      if (result.errors && result.errors.length > 0) {
        message += `\n\nErrors encountered:\n${result.errors.join('\n')}`;
      }

      alert(message);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload the page to show the new tiles
      if (result.imported > 0) {
        window.location.reload();
      }
      
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
