import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';
import { useApi, ScrapeResult, ScrapeStats, PreviewItem } from './useApi';
import { Pack } from '@/lib/plans';
import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/context/AuthContext';

const POLLING_INTERVAL = 3000; // 3 secondes

interface PaymentInfo {
  pack: Pack;
  stripeUrl: string;
  mvolaUrl?: string;
}

export function useScrape(initialSessionId?: string) {
  const { getScrapeResults, startScraping: apiStartScraping, createPayment, createMvolaPayment, getExportUrl, getPacks } = useApi();
  const { fetchDashboardData } = useDashboard();
  const { user } = useAuth();
  
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
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [paymentInfo, setPaymentInfo] = useState<{ pack: Pack; stripeUrl: string; mvolaUrl: string; } | null>(null);
  const [searchParams] = useSearchParams();

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

  useEffect(() => {
    const initializePacks = async () => {
      try {
        const fetchedPacks = await getPacks();
        const formattedPacks = fetchedPacks.map(p => ({ ...p, id: p.id.toString() }));
        setPacks(formattedPacks);

        const packIdFromUrl = searchParams.get('packId');
        if (packIdFromUrl && formattedPacks.some(p => p.id === packIdFromUrl)) {
          setSelectedPackId(packIdFromUrl);
        } else {
          setSelectedPackId(formattedPacks[0]?.id || null);
        }
      } catch (error) {
        console.error("Failed to initialize packs in useScrape:", error);
      }
    };

    initializePacks();
  }, [getPacks, searchParams]);

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
    packId: string;
    singleItem?: boolean;
    deepScrape?: boolean;
    getProfileUrls?: boolean;
    maxItems?: number;
  };

  const startScrape = async (url: string, options: ScrapeOptions) => {
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
    if (!user) {
      toast({
        title: 'Authentification requise',
        description: 'Vous devez être connecté pour débloquer les résultats.',
        variant: 'destructive',
      });
      return;
    }

    const selectedPack = packs.find(p => p.id === packId);
    if (!selectedPack) {
      toast({ title: 'Erreur', description: 'Pack non trouvé.', variant: 'destructive' });
      return;
    }

    // Ouvre la modale SANS créer le paiement tout de suite
    setPaymentInfo({ 
        pack: selectedPack,
        // Les URL seront générées plus tard
        stripeUrl: '', 
        mvolaUrl: '' 
    });
    setPaymentModalOpen(true);
  };

  const onStripePay = async () => {
    if (!sessionId || !paymentInfo) return;
    setLoading(true);
    try {
      const paymentData = await createPayment(sessionId, paymentInfo.pack.id);
      if (paymentData.stripeUrl) {
        window.location.href = paymentData.stripeUrl;
      }
    } catch (err: any) {
      console.error('Stripe payment creation failed:', err);
      toast({
        title: 'Erreur de paiement Stripe',
        description: err.response?.data?.error || err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

    const onMvolaPay = async () => {
    if (!sessionId || !paymentInfo) return;
    setLoading(true);
    try {
      const paymentData = await createMvolaPayment(sessionId, paymentInfo.pack.id);
      // Deux cas possibles:
      // 1) API retourne une URL tierce pour valider le paiement -> on ouvre dans un nouvel onglet
      if (paymentData.transactionUrl) {
        window.open(paymentData.transactionUrl, '_blank');
      }
      // 2) API attend la complétion et renvoie directement une downloadUrl -> on redirige pour auto-download
      if (paymentData.downloadUrl) {
        console.log('[MVola] Redirection vers la page de téléchargement:', paymentData.downloadUrl);
        window.location.href = paymentData.downloadUrl;
        return;
      }
      toast({ title: 'Succès', description: 'Paiement Mvola initié.' });
      } catch (err: any) {
        console.error('Mvola payment creation failed:', err);
        toast({
          title: 'Erreur de paiement Mvola',
          description: err.message || 'Impossible d\'initier le paiement Mvola.',
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
    isPaymentModalOpen,
    setPaymentModalOpen,
    paymentInfo,
    onStripePay,
    onMvolaPay,
    packs,
    selectedPackId,
    setSelectedPackId
  };
}