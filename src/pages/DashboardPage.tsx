import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewTab from '@/components/dashboard/OverviewTab';
import PaymentsTab from '@/components/dashboard/PaymentsTab';
import FilesTab from '@/components/dashboard/FilesTab';
import SettingsTab from '@/components/dashboard/SettingsTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { User, CreditCard, Download } from 'lucide-react';
import { UserData } from '@/types';

const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      if (!token) {
        setError('Vous n\'êtes pas authentifié.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/dashboard`, {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card className="mb-8 bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <AlertCircle className="mr-2" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-600">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return <div className="container mx-auto p-4">Aucune donnée utilisateur disponible.</div>;
  }

  return (
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Gérez vos paiements, fichiers et consultez vos statistiques.
          </p>
        </div>
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="files">Fichiers</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab userData={userData} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab payments={userData?.payments || []} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab downloads={userData.downloads} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;
