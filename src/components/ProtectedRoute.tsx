import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Use the new hook

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading session...</div>; // Or a spinner
  }

  if (!isAuthenticated) {
    // If not logged in after check, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
