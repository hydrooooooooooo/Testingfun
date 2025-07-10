import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated()) {
    // Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
    return <Navigate to="/login" replace />;
  }

  // Affiche le contenu de la route si l'utilisateur est authentifié
  return <Outlet />;
};

export default ProtectedRoute;
