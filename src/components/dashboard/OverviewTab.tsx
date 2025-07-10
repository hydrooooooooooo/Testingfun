import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Download, CreditCard, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserData } from '@/types';

interface OverviewTabProps {
  userData: UserData | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ userData }) => {
  if (!userData) {
    return <div>Chargement des données...</div>;
  }

  const { stats, payments, downloads } = userData;

  const combinedActivity = [
    ...payments.map(p => ({ ...p, type: 'payment' })),
    ...downloads.map(d => ({ ...d, type: 'download' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const recentActivity = combinedActivity.slice(0, 5);

  return (
    <div className="space-y-6 pt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paiements</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPayments?.count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Fichiers</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDownloads?.count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Scrapes</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalScrapingJobs?.count || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Activité Récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <li key={index} className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-full">
                    {activity.type === 'payment' ? <CreditCard className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.type === 'payment' ? `Paiement de ${activity.amount}€` : `Téléchargement de fichier`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'download' ? activity.scraped_url : `ID de transaction: ${activity.stripe_payment_id}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
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
