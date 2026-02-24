import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const AdminRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const ownerEmail = (import.meta as any).env?.VITE_ADMIN_EMAIL;

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // If VITE_ADMIN_EMAIL is set, also check the email matches
  if (ownerEmail && (!user?.email || user.email.toLowerCase() !== String(ownerEmail).toLowerCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
