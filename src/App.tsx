import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthHandler } from './components/AuthHandler';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      {/* This component will handle the auth token from the URL on any route */}
      <AuthHandler />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  )
}

export default App
