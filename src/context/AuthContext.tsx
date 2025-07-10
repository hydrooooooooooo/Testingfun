import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

// Interface pour le payload du token JWT
interface DecodedToken {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Interface pour les informations de l'utilisateur
interface User {
  id: number;
  email: string;
  role: string;
}

// Interface pour la valeur du contexte
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        // Vérifier si le token est expiré
        if (decodedToken.exp * 1000 > Date.now()) {
          setUser({ id: decodedToken.id, email: decodedToken.email, role: decodedToken.role });
          localStorage.setItem('token', token);
        } else {
          // Le token est expiré
          logout();
        }
      } catch (error) {
        console.error('Failed to decode token:', error);
        logout();
      }
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    window.location.href = '/login'; // Rediriger vers la page de connexion
  };

  const isAuthenticated = () => {
    return !!token;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
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
