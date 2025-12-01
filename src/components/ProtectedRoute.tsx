import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    // While checking for authentication, render a loading state or null
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    // If not logged in after check, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
