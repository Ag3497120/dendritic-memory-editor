import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthHandler } from './components/AuthHandler';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllTiles from './pages/AllTiles'; // Import the new page
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      {/* This component will handle the auth token from the URL on any route */}
      <AuthHandler />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/all-tiles" 
          element={
            <ProtectedRoute>
              <AllTiles />
            </ProtectedRoute>
          } 
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

export default App
