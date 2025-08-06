import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useApi, ScrapeResult, ScrapeStats, PreviewItem } from './useApi';
import { PLANS } from '@/lib/plans';
import { useDashboard } from '@/context/DashboardContext';

const POLLING_INTERVAL = 3000; // 3 secondes

export function useScrape(initialSessionId?: string) {
  const { getScrapeResults, startScraping: apiStartScraping, createPayment, getExportUrl } = useApi();
  const { fetchDashboardData } = useDashboard();
  
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [stats, setStats] = useState<ScrapeStats | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [scrapeDone, setScrapeDone] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const resetScrape = useCallback(() => {
    setSessionId(null);
    setStatus('idle');
    setProgress(0);
    setStats(null);
    setPreviewItems([]);
    setScrapeDone(false);
    setIsPaid(false);
    setError(null);
    setLoading(false); // Ensure loading is reset
    setIsPolling(false);
    console.log('Scrape state reset.');
  }, []);

  const checkScrapeStatus = useCallback(async () => {
    if (!sessionId || isPolling) return;

    setIsPolling(true);
    console.log(`Polling for session: ${sessionId}`);

    try {
      const result: ScrapeResult = await getScrapeResults(sessionId);
      console.log('Poll result:', result);

      setStatus(result.status);
      setStats(result.stats || { nbItems: 0 });
      // Ne pas mettre à jour previewItems ici, car ils peuvent être incomplets
      if (result.isPaid) {
        setIsPaid(true);
      }
      setProgress(result.progress || 0);

      const isFinished = ['finished', 'COMPLETED', 'SUCCEEDED'].includes(result.status.toUpperCase());
      const isFailed = ['failed', 'FAILED', 'ABORTED'].includes(result.status.toUpperCase());

      if (isFinished) {
        console.log('Scraping finished. Refreshing dashboard and setting final state...');
        setPreviewItems(result.previewItems || []);
        setStats(result.stats || { nbItems: 0 });
        setLoading(false);
        setScrapeDone(true);
        fetchDashboardData(); // Met à jour les données du tableau de bord
        toast({
          title: 'Scraping terminé!',
          description: `Le scraping est terminé avec ${result.stats?.nbItems || 0} éléments trouvés.`,
        });
      } else if (isFailed) {
        console.error('Scraping failed or was aborted. Stopping poll.');
        setLoading(false);
        setError(result.error || 'Le scraping a échoué.');
        setScrapeDone(true);
        toast({
          title: 'Erreur de Scraping',
          description: result.error || 'Une erreur inattendue est survenue.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Error during polling:', err);
      setLoading(false);
      setError(err.message || 'Erreur de communication avec le serveur.');
      setScrapeDone(true); // Arrêter le polling en cas d'erreur réseau
      toast({
        title: 'Erreur Réseau',
        description: 'Impossible de vérifier le statut du scraping.',
        variant: 'destructive',
      });
    } finally {
      setIsPolling(false);
    }
  }, [sessionId, isPolling, getScrapeResults, toast, fetchDashboardData]);

  useEffect(() => {
    if (sessionId && !scrapeDone) {
      const intervalId = setInterval(checkScrapeStatus, POLLING_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [sessionId, scrapeDone, checkScrapeStatus]);

  type ScrapeOptions = {
    singleItem?: boolean;
    deepScrape?: boolean;
    getProfileUrls?: boolean;
    maxItems?: number;
  };

  const startScrape = async (url: string, options: ScrapeOptions = {}) => {
    resetScrape();
    setLoading(true);
    setStatus('starting');
    console.log(`Starting scrape for URL: ${url}`);

    try {
      const result = await apiStartScraping(url, options);
      console.log('Scrape started successfully:', result);
      setSessionId(result.sessionId);
      setStatus(result.status);
      // setLoading(false) a été retiré ici pour que le chargement continue
      toast({
        title: 'Scraping en cours...',
        description: 'Le processus de scraping a commencé.',
      });
    } catch (err: any) {
      console.error('Failed to start scrape:', err);
      setError(err.message || 'Impossible de démarrer le scraping.');
      setStatus('failed');
      setLoading(false); // On arrête le chargement si le démarrage échoue
      toast({
        title: 'Erreur au démarrage',
        description: err.message || 'Le scraping n\'a pas pu être lancé.',
        variant: 'destructive',
      });
    }
  };

  const handlePayment = async (packId: string) => {
    if (!sessionId) {
      toast({ title: 'Erreur', description: 'Aucune session de scraping active.', variant: 'destructive' });
      return;
    }

    const selectedPlan = PLANS.find(p => p.id === packId);

    if (!selectedPlan || !selectedPlan.stripeBuyLink) {
      toast({ title: 'Erreur de configuration', description: 'Lien de paiement introuvable pour ce pack.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Ajoute le sessionId comme client_reference_id pour le suivi dans Stripe
      const checkoutUrl = `${selectedPlan.stripeBuyLink}?client_reference_id=${sessionId}`;
      
      console.log(`Redirecting to Stripe checkout: ${checkoutUrl}`);
      window.location.href = checkoutUrl;

    } catch (err: any) {
      console.error('Payment redirection failed:', err);
      toast({
        title: 'Erreur de paiement',
        description: err.message || 'Impossible de vous rediriger vers la page de paiement.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = (format: 'excel' | 'csv') => {
    if (!sessionId || !scrapeDone) {
      toast({ title: 'Erreur', description: 'Le scraping doit être terminé pour exporter.', variant: 'destructive' });
      return;
    }
    console.log(`Exporting data in ${format} format for session ${sessionId}...`);
    const url = getExportUrl(sessionId, format);
    window.open(url, '_blank');
    // Met à jour les données du dashboard après un court délai pour laisser le temps au backend de traiter le téléchargement
    setTimeout(() => {
      console.log('Refreshing dashboard data after export...');
      fetchDashboardData();
    }, 2000);
  };

  return {
    sessionId,
    status,
    progress,
    stats,
    previewItems,
    scrapeDone,
    isPaid,
    error,
    loading,
    startScrape,
    resetScrape,
    handlePayment,
    exportData,
  };
}