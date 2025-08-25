import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Download, CreditCard, Activity as ActivityIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserData, Activity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/useApi';
import { useDashboard } from '@/context/DashboardContext';

interface OverviewTabProps {
  userData: UserData | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ userData }) => {
  if (!userData) {
    return <div>Chargement des données...</div>;
  }

  const { stats, payments } = userData;
  const { startTrialScrape, getScrapeResults, getExportUrl } = useApi();
  const { fetchDashboardData } = useDashboard();
  const [trialUrl, setTrialUrl] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialMsg, setTrialMsg] = useState<string | null>(null);
  const [trialSessionId, setTrialSessionId] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const onStartTrial = async () => {
    setTrialMsg(null);
    if (!trialUrl || trialUrl.length < 8) {
      setTrialMsg('Veuillez entrer une URL valide.');
      return;
    }
    setTrialLoading(true);
    try {
      const res = await startTrialScrape(trialUrl);
      setTrialSessionId(res.sessionId);
      setTrialMsg(`Essai lancé ! ID de session: ${res.sessionId}`);
    } catch (e: any) {
      setTrialMsg(e.message || "Impossible de lancer l'essai gratuit");
    } finally {
      setTrialLoading(false);
    }
  };

  // Poll trial session and auto-download excel when completed
  useEffect(() => {
    if (!trialSessionId) return;
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await getScrapeResults(trialSessionId);
        if (res?.status && ['finished', 'COMPLETED', 'SUCCEEDED'].includes(String(res.status).toUpperCase())) {
          // Stop polling
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          // Refresh dashboard so Files tab shows the trial file
          fetchDashboardData();
          setTrialMsg('Essai terminé. Préparation du téléchargement...');
          // Auto-download Excel
          const url = getExportUrl(trialSessionId, 'excel');
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error('Erreur de polling trial:', err);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [trialSessionId, getScrapeResults, getExportUrl, fetchDashboardData]);
  // Pour éviter les soucis de typage avec les sessions (downloads), on affiche ici
  // l'activité récente basée sur les paiements uniquement.
  const recentActivity = payments
    .map((p) => ({ ...p, type: 'payment' as const, date: p.created_at }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatAmountFR = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

  return (
    <div className="space-y-6 pt-6">
      {userData.user && userData.user.trial_used !== true && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Essai gratuit – Scrape 10 annonces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Collez l'URL du marketplace (ex: https://www.facebook.com/marketplace/...)"
                value={trialUrl}
                onChange={(e) => setTrialUrl(e.target.value)}
                className="md:flex-1"
              />
              <Button onClick={onStartTrial} disabled={trialLoading}>
                {trialLoading ? 'Démarrage…' : 'Lancer l\'essai'}
              </Button>
            </div>
            {trialMsg && (
              <p className="text-sm mt-2 text-muted-foreground">{trialMsg}</p>
            )}
          </CardContent>
        </Card>
      )}
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
