import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Download, CreditCard, Activity as ActivityIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserData, Activity } from '@/types';

interface OverviewTabProps {
  userData: UserData | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ userData }) => {
  if (!userData) {
    return <div>Chargement des données...</div>;
  }

  const { stats, payments } = userData;
  // Pour éviter les soucis de typage avec les sessions (downloads), on affiche ici
  // l'activité récente basée sur les paiements uniquement.
  const recentActivity = payments
    .map((p) => ({ ...p, type: 'payment' as const, date: p.created_at }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatAmountFR = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

  return (
    <div className="space-y-6 pt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paiements</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Fichiers</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Scrapes</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScrapes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ActivityIcon className="mr-2 h-5 w-5" />
            Activité Récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <li key={index} className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    {activity.type === 'payment' && (
                      <>
                        <p className="text-sm font-medium">
                          Paiement de {formatAmountFR(activity.amount)}{' '}
                          {(activity as any).currency ? (activity as any).currency.toUpperCase() : 'MGA'}
                        </p>
                        <p className="text-xs text-muted-foreground">ID de transaction: {activity.stripe_payment_id}</p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </li>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Aucune activité récente à afficher.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
