import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserData } from '@/types';
import { useAuth } from './AuthContext';

interface DashboardContextType {
  userData: UserData | null;
  error: string | null;
  isLoading: boolean;
  fetchDashboardData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!token) {
      setError('Vous n\'êtes pas authentifié.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const cacheBuster = `_=${new Date().getTime()}`;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/dashboard?${cacheBuster}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la récupération des données.');
      }

      const data: UserData = await response.json();
      setUserData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const value = { userData, error, isLoading, fetchDashboardData };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
