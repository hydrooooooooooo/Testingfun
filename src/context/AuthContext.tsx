import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';

// Interface pour les informations de l'utilisateur
interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  phone_number?: string;
  business_sector?: string;
  company_size?: string;
}

// Interface pour la valeur du contexte
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if the httpOnly cookie is valid by calling /auth/me
        const response = await api.get('/auth/me');
        if (response.data?.user) {
          const u = response.data.user;
          setUser({
            id: u.id ?? u.userId,
            email: u.email,
            name: u.name,
            role: u.role,
            phone_number: u.phone_number,
            business_sector: u.business_sector,
            company_size: u.company_size,
          });
        }
      } catch {
        // No valid cookie — user is not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — cookie will be cleared server-side
    }
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = { user, login, logout, isAuthenticated };

  if (loading) {
    return <div>Chargement de l'application...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
