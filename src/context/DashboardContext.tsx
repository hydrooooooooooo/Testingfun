import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserData } from '@/types';
import { useAuth } from './AuthContext';
import api from '../services/api';

interface DashboardContextType {
  userData: UserData | null;
  error: string | null;
  isLoading: boolean;
  fetchDashboardData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setError('Vous n\'êtes pas authentifié.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<UserData>('/user/dashboard');
      const data = response.data;
      setUserData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
