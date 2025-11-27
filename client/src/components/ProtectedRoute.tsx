import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  if (!auth.isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && auth.role !== 'ADMIN') {
    // Redirect to home or unauthorized page if not admin
    return <Navigate to="/" replace />; // Or a dedicated unauthorized page
  }

  return <>{children}</>;
};

export default ProtectedRoute;
