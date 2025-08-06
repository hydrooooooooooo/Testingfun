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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decodedToken = jwtDecode<DecodedToken>(storedToken);
          if (decodedToken.exp * 1000 > Date.now()) {
            setUser({ id: decodedToken.id, email: decodedToken.email, role: decodedToken.role });
            setToken(storedToken);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Failed to decode token:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    try {
      const decodedToken = jwtDecode<DecodedToken>(newToken);
      setUser({ id: decodedToken.id, email: decodedToken.email, role: decodedToken.role });
      setToken(newToken);
    } catch (error) {
      console.error('Failed to decode token on login:', error);
      // En cas d'erreur de décodage, on déconnecte l'utilisateur pour éviter un état incohérent
      logout();
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    // La redirection sera gérée par le composant ProtectedRoute
  };

  const isAuthenticated = () => {
    return !!token;
  };

  const value = { user, token, login, logout, isAuthenticated };

  if (loading) {
    return <div>Chargement de l'application...</div>; // Ou un composant de chargement plus sophistiqué
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
