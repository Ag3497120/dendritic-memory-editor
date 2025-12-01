// frontend/src/components/AuthHandler.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // URLパラメータをチェック
    // In HashRouter, search is in the hash. But the new backend redirects to the root with query params.
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userId = params.get('user_id');
    const email = params.get('email');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error from backend:', error);
      alert(`Login failed: ${error}`);
      // エラーパラメータを削除
      navigate('/', { replace: true });
      return;
    }

    if (token && !isProcessing) {
      setIsProcessing(true);
      
      // トークンをlocalStorageに保存
      localStorage.setItem('authToken', token);
      
      if (userId) {
        localStorage.setItem('user_id', userId);
      }
      
      if (email) {
        localStorage.setItem('user_email', email);
      }

      console.log('Auth token saved:', token.substring(0, 20) + '...');

      // URLからクエリパラメータを削除してリダイレクト
      // We are using HashRouter, so we navigate to the root hash.
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);

      // ページをリロードして認証状態を反映
      setTimeout(() => {
        window.location.reload();
      }, 50);
    }
  }, [location.search, navigate, isProcessing]);

  return null; // このコンポーネントは何も表示しない
}
