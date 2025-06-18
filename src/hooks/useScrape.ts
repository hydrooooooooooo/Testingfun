import React from "react";
import { PLANS, Pack } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";

type ScrapeStats = {
  nbItems: number,
  startedAt: string,
  finishedAt?: string,
  previewItems?: any[],
  totalItems?: number,
  apifyRunId?: string,
  deepScrapeEnabled?: boolean,
  profileUrlsEnabled?: boolean
};

type ScrapeOptions = {
  singleItem?: boolean;
  deepScrape?: boolean;
  getProfileUrls?: boolean;
  maxItems?: number;
};

export function useScrape() {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  const [scrapePercent, setScrapePercent] = React.useState(0);
  const [scrapeDone, setScrapeDone] = React.useState(false);
  const [sessionId, setSessionId] = React.useState("");
  const [datasetId, setDatasetId] = React.useState("");
  const [stats, setStats] = React.useState<ScrapeStats | null>(null);

  // État de paiement
  const [hasPaid, setHasPaid] = React.useState(false);

  const [selectedPackId, setSelectedPackId] = React.useState(PLANS[0].id);
  const [previewItems, setPreviewItems] = React.useState<any[]>([]);

  // Utiliser notre hook API
  const api = useApi();

  const selectedPack = React.useMemo(
    () => PLANS.find(p => p.id === selectedPackId) ?? PLANS[0],
    [selectedPackId]
  );

  function validateUrl(u: string) {
    return /^https:\/\/(www\.)?(facebook|linkedin)\.com\/marketplace\/[\w-]+/.test(u.trim());
  }

  // Vérifier le statut du scraping avec support APIFY
  const checkScrapeStatus = React.useCallback(async (sid: string) => {
    try {
      console.log(`Vérification du statut pour la session ${sid}...`);
      const result = await api.getScrapeResults(sid);
      console.log('Résultat de la vérification:', result);
      
      // Mettre à jour les états
      if (result.datasetId) {
        setDatasetId(result.datasetId);
        console.log(`Dataset ID mis à jour: ${result.datasetId}`);
      }
      
      // Gérer les run APIFY
      if (result.apifyRunId) {
        console.log(`APIFY Run ID: ${result.apifyRunId}`);
      }
      
      // Traiter les previewItems
      if (result.previewItems && Array.isArray(result.previewItems) && result.previewItems.length > 0) {
        console.log(`${result.previewItems.length} éléments de prévisualisation trouvés`);
        setPreviewItems(result.previewItems);
        setShowPreview(true);
      }
      
      // Mettre à jour les stats avec les nouvelles propriétés APIFY
      if (result.stats) {
        const updatedStats = {
          ...result.stats,
          previewItems: result.previewItems || result.stats.previewItems || [],
          apifyRunId: result.apifyRunId,
          deepScrapeEnabled: result.deepScrapeEnabled,
          profileUrlsEnabled: result.profileUrlsEnabled
        };
        
        setStats(updatedStats);
        console.log('Stats mises à jour:', updatedStats);
        
        if (!result.previewItems && updatedStats.previewItems && updatedStats.previewItems.length > 0) {
          setPreviewItems(updatedStats.previewItems);
          setShowPreview(true);
        }
      }
      
      // Vérifier le statut de paiement
      if (result.isPaid !== undefined) {
        console.log(`Statut de paiement reçu: isPaid=${result.isPaid}`);
        setHasPaid(result.isPaid);
      }
      
      // Gérer les différents statuts avec support APIFY
      if (result.status === 'running' || result.status === 'RUNNING') {
        console.log('Statut: running - Mise à jour de la progression');
        
        // Pour APIFY, on peut avoir des informations plus précises sur la progression
        if (result.progress && typeof result.progress === 'number') {
          setScrapePercent(Math.min(result.progress, 95));
        } else {
          setScrapePercent(prev => {
            const newPercent = prev + Math.floor(Math.random() * 5) + 1;
            return Math.min(newPercent, 90);
          });
        }
      } else if (result.status === 'finished' || result.status === 'FINISHED' || result.status === 'SUCCESS' || result.status === 'completed') {
        console.log('Statut: finished/completed - Scraping terminé');
        
        setScrapePercent(100);
        setScrapeDone(true);
        setShowPreview(true);
        setLoading(false);
        
        if (result.previewItems && Array.isArray(result.previewItems)) {
          console.log(`Mise à jour des previewItems avec ${result.previewItems.length} éléments`);
          setPreviewItems([...result.previewItems]);
        }
        
        // Message de succès personnalisé selon les options utilisées
        let successMessage = `${result.stats?.nbItems || 0} éléments extraits avec succès.`;
        if (result.deepScrapeEnabled) {
          successMessage += " Mode deep scrape activé.";
        }
        if (result.profileUrlsEnabled) {
          successMessage += " URLs de profils incluses.";
        }
        
        toast({
          title: "Scraping terminé",
          description: successMessage,
          variant: "default",
        });
        
      } else if (result.status === 'failed' || result.status === 'FAILED') {
        console.log('Statut: failed - Scraping échoué');
        setScrapePercent(0);
        setLoading(false);
        
        // Message d'erreur plus spécifique selon le contexte APIFY
        let errorMessage = "Le scraping a échoué. Veuillez réessayer.";
        if (result.error) {
          if (result.error.includes('rate limit')) {
            errorMessage = "Limite de taux atteinte. Veuillez attendre quelques minutes avant de réessayer.";
          } else if (result.error.includes('timeout')) {
            errorMessage = "Timeout dépassé. Essayez avec moins d'éléments ou désactivez le mode deep scrape.";
          }
        }
        
        toast({
          title: "Erreur de scraping",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Vérifier à nouveau le statut de paiement si terminé
      if (result.status === 'finished' || result.status === 'completed') {
        try {
          const paymentStatus = await api.verifyPayment(sid);
          if (paymentStatus.isPaid) {
            setHasPaid(true);
          }
        } catch (paymentError) {
          console.error('Erreur lors de la vérification du paiement:', paymentError);
        }
      }
      
      const isDone = ['finished', 'FINISHED', 'SUCCESS', 'completed', 'failed', 'FAILED'].includes(result.status);
      if (isDone) {
        setLoading(false);
      }
      return isDone;
    } catch (error) {
      console.error('Error checking scrape status:', error);
      setLoading(false);
      return false;
    }
  }, [api, toast]);

  // Fonction pour démarrer le polling (inchangée)
  const startPolling = React.useCallback((sid: string) => {
    console.log(`Démarrage du polling pour la session ${sid}`);
    
    const pollInterval = setInterval(async () => {
      try {
        const isDone = await checkScrapeStatus(sid);
        
        if (isDone) {
          console.log('Polling terminé, nettoyage de l\'intervalle');
          clearInterval(pollInterval);
          setLoading(false);
          
          setTimeout(() => {
            setShowPreview(true);
          }, 500);
        }
      } catch (error) {
        console.error('Erreur pendant le polling:', error);
        clearInterval(pollInterval);
        setLoading(false);
        toast({
          title: "Erreur de communication",
          description: "Impossible de vérifier l'état du scraping. Veuillez rafraîchir la page.",
          variant: "destructive",
        });
      }
    }, 3000); // Augmenté à 3 secondes pour APIFY
    
    const safetyTimeout = setTimeout(() => {
      clearInterval(pollInterval);
      setLoading(false);
      setScrapePercent(0);
      toast({
        title: "Timeout",
        description: "Le scraping prend plus de temps que prévu. Les données peuvent être disponibles dans votre compte APIFY.",
        variant: "default",
      });
    }, 10 * 60 * 1000); // Augmenté à 10 minutes pour APIFY
    
    return () => {
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
      setLoading(false);
    };
  }, [checkScrapeStatus, toast]);

  // Gérer le scraping avec les nouvelles options APIFY
  async function handleScrape(e: React.FormEvent, options: ScrapeOptions = {}) {
    e.preventDefault();
    if (!validateUrl(url)) {
      toast({
        title: "URL invalide",
        description: "Merci de saisir un lien Marketplace (Facebook ou LinkedIn) valide.",
        variant: "destructive",
      });
      return;
    }
    
    // Réinitialiser tous les états
    setLoading(true);
    setShowPreview(false);
    setScrapePercent(5);
    setScrapeDone(false);
    setHasPaid(false);
    setPreviewItems([]);
    setStats(null);
    
    console.log('Démarrage du scraping avec options:', options);
    
    try {
      // Préparer les options pour l'API APIFY
      const apifyOptions = {
        resultsLimit: options.singleItem ? 1 : options.maxItems,
        deepScrape: options.deepScrape || false,
        getProfileUrls: options.getProfileUrls || false,
        maxItems: options.maxItems || selectedPack.nbDownloads
      };
      
      // Validation des options
      if (apifyOptions.deepScrape && apifyOptions.maxItems && apifyOptions.maxItems > 200) {
        toast({
          title: "Attention",
          description: "Le mode deep scrape est limité à 200 éléments maximum pour éviter les timeouts.",
          variant: "default",
        });
        apifyOptions.maxItems = 200;
      }
      
      // Appeler l'API pour démarrer le scraping avec les bonnes options
      const result = await api.startScraping(url, apifyOptions);
      console.log('Résultat du démarrage du scraping:', result);
      
      setSessionId(result.sessionId);
      setDatasetId(result.datasetId);
      
      // Message de début personnalisé
      let startMessage = "Scraping démarré";
      if (apifyOptions.deepScrape) startMessage += " (mode avancé)";
      if (apifyOptions.getProfileUrls) startMessage += " avec extraction des profils";
      
      toast({
        title: startMessage,
        description: `Extraction de ${apifyOptions.maxItems || 'tous les'} éléments en cours...`,
        variant: "default",
      });
      
      startPolling(result.sessionId);
      
      // Vérifier le statut de paiement initial
      try {
        const paymentStatus = await api.verifyPayment(result.sessionId);
        if (paymentStatus.isPaid) {
          setHasPaid(true);
        }
      } catch (error) {
        console.warn('Erreur lors de la vérification initiale du paiement:', error);
      }
    } catch (error) {
      console.error('Error starting scrape:', error);
      setLoading(false);
      setScrapePercent(0);
      
      // Message d'erreur spécifique selon le type d'erreur
      let errorMessage = "Une erreur est survenue lors du démarrage du scraping.";
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = "Limite de taux atteinte. Veuillez attendre avant de relancer.";
        } else if (error.message.includes('quota')) {
          errorMessage = "Quota APIFY dépassé. Veuillez vérifier votre compte APIFY.";
        }
      }
      
      toast({
        title: "Erreur de scraping",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  // Fonctions de paiement et d'export inchangées
  const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "";
  
  const buildStripeUrl = React.useCallback((packId: string, sid: string) => {
    if (!STRIPE_PAYMENT_LINK) {
      console.error("VITE_STRIPE_PAYMENT_LINK n'est pas configuré");
      return "";
    }
    
    try {
      const url = new URL(STRIPE_PAYMENT_LINK);
      url.searchParams.append("session_id", sid);
      url.searchParams.append("pack_id", packId);
      return url.toString();
    } catch (error) {
      console.error('Erreur lors de la construction de l\'URL Stripe:', error);
      return "";
    }
  }, []);
  
  const handlePayment = React.useCallback(async () => {
    if (!sessionId) {
      toast({
        title: "Erreur",
        description: "Aucune session de scraping active.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      try {
        const checkoutUrl = await api.createPayment(selectedPackId, sessionId);
        console.log('URL de paiement créée via API:', checkoutUrl);
        window.open(checkoutUrl, '_blank');
        return;
      } catch (apiError) {
        console.warn('Erreur avec l\'API de paiement, utilisation du lien direct:', apiError);
      }
      
      const directUrl = buildStripeUrl(selectedPackId, sessionId);
      if (!directUrl) {
        throw new Error("Impossible de créer l'URL de paiement");
      }
      
      console.log('Ouverture de l\'URL de paiement direct:', directUrl);
      window.open(directUrl, '_blank');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur est survenue lors de la création du paiement.",
        variant: "destructive",
      });
    }
  }, [api, sessionId, selectedPackId]);

  const getExportUrl = React.useCallback((format: 'excel' | 'csv' = 'excel') => {
    return api.getExportUrl(sessionId, format);
  }, [api, sessionId]);

  return {
    url, setUrl,
    loading,
    showPreview,
    setShowPreview,
    scrapePercent, setScrapePercent,
    scrapeDone, setScrapeDone,
    sessionId, setSessionId,
    datasetId, setDatasetId,
    stats, setStats,
    hasPaid, setHasPaid,
    selectedPackId, setSelectedPackId,
    selectedPack,
    previewItems,
    handleScrape,
    handlePayment,
    getExportUrl
  };
}