import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    // If not logged in, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
