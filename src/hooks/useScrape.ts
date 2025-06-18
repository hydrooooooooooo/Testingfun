import React from "react";
import { PLANS, Pack } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";

type ScrapeStats = {
  nbItems: number,
  startedAt: string,
  finishedAt?: string,
  previewItems?: any[],
  totalItems?: number
};

export function useScrape() {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  // Prépare potentiellement pour plus tard
  const [downloadCount, setDownloadCount] = React.useState(3);

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

  // Vérifier le statut du scraping
  const checkScrapeStatus = React.useCallback(async (sid: string) => {
    try {
      console.log(`Vérification du statut pour la session ${sid}...`);
      const result = await api.getScrapeResults(sid);
      console.log('Résultat de la vérification:', result);
      console.log('Structure complète de la réponse:', JSON.stringify(result, null, 2));
      
      // Mettre à jour les états
      if (result.datasetId) {
        setDatasetId(result.datasetId);
        console.log(`Dataset ID mis à jour: ${result.datasetId}`);
      }
      
      // Traiter directement les previewItems s'ils sont disponibles dans la réponse
      if (result.previewItems && Array.isArray(result.previewItems) && result.previewItems.length > 0) {
        console.log(`${result.previewItems.length} éléments de prévisualisation trouvés directement dans la réponse`);
        console.log('Premier élément de prévisualisation:', result.previewItems[0]);
        
        // Mettre à jour les previewItems directement
        setPreviewItems(result.previewItems);
        
        // Activer l'affichage de la prévisualisation dès que nous avons des éléments
        setShowPreview(true);
      }
      
      // Mettre à jour les stats
      if (result.stats) {
        console.log('Stats reçues:', result.stats);
        
        // S'assurer que les previewItems sont correctement extraits des stats ou du résultat
        const updatedStats = {
          ...result.stats,
          previewItems: result.previewItems || result.stats.previewItems || []
        };
        
        setStats(updatedStats);
        console.log('Stats mises à jour:', updatedStats);
        
        // Si les previewItems n'ont pas été mis à jour directement, les extraire des stats
        if (!result.previewItems && updatedStats.previewItems && updatedStats.previewItems.length > 0) {
          console.log('PreviewItems extraits des stats:', updatedStats.previewItems);
          setPreviewItems(updatedStats.previewItems);
          
          // Activer l'affichage de la prévisualisation dès que nous avons des éléments
          setShowPreview(true);
        }
      } else if (result.previewItems && result.previewItems.length > 0) {
        // Si nous avons des previewItems mais pas de stats, créer des stats avec les previewItems
        const newStats = {
          nbItems: result.previewItems.length,
          startedAt: new Date().toISOString(),
          previewItems: result.previewItems
        };
        setStats(newStats);
        console.log('Stats créées avec previewItems:', newStats);
      }
      
      // Vérifier si l'utilisateur a payé
      if (result.isPaid !== undefined) {
        console.log(`Statut de paiement reçu: isPaid=${result.isPaid}`);
        setHasPaid(result.isPaid);
      }
      
      // Mettre à jour le statut de progression avec une progression plus réaliste
      if (result.status === 'running' || result.status === 'RUNNING') {
        console.log('Statut: running - Mise à jour de la progression');
        // Incrémenter progressivement le pourcentage pour donner une meilleure expérience utilisateur
        setScrapePercent(prev => {
          // Augmenter progressivement jusqu'à 90% maximum pendant l'exécution
          const newPercent = prev + Math.floor(Math.random() * 5) + 1;
          const finalPercent = Math.min(newPercent, 90);
          console.log(`Progression mise à jour: ${finalPercent}%`);
          return finalPercent;
        });
      } else if (result.status === 'finished' || result.status === 'FINISHED' || result.status === 'SUCCESS' || result.status === 'completed') {
        console.log('Statut: finished/completed - Scraping terminé');
        console.log('Réponse complète du serveur:', JSON.stringify(result, null, 2));
        
        // Mettre à jour les états immédiatement
        setScrapePercent(100);
        setScrapeDone(true);
        setShowPreview(true); // Activer l'affichage de la prévisualisation
        setLoading(false); // S'assurer que loading est mis à false
        
        // Si les previewItems sont disponibles dans la réponse, les mettre à jour
        if (result.previewItems && Array.isArray(result.previewItems)) {
          console.log(`Mise à jour des previewItems avec ${result.previewItems.length} éléments`);
          setPreviewItems(result.previewItems);
          
          // Force un re-rendu en créant un nouvel objet
          setPreviewItems([...result.previewItems]);
        } else {
          console.warn('Aucun previewItems trouvé dans la réponse finished');
        }
        
        // Afficher une notification de succès
        toast({
          title: "Scraping terminé",
          description: `${result.stats?.nbItems || 0} éléments ont été extraits avec succès.`,
          variant: "default",
        });
        
        // Vérifier que les previewItems sont bien définis
        if (result.previewItems && result.previewItems.length > 0) {
          console.log(`${result.previewItems.length} éléments de prévisualisation disponibles après scraping terminé`);
          setPreviewItems(result.previewItems);
        } else if (result.stats?.previewItems && result.stats.previewItems.length > 0) {
          console.log(`${result.stats.previewItems.length} éléments de prévisualisation disponibles dans les stats`);
          setPreviewItems(result.stats.previewItems);
        }
      } else if (result.status === 'failed') {
        console.log('Statut: failed - Scraping échoué');
        setScrapePercent(0);
        setLoading(false);
        toast({
          title: "Erreur de scraping",
          description: "Le scraping a échoué. Veuillez réessayer.",
          variant: "destructive",
        });
      } else {
        console.log(`Statut inattendu: ${result.status}`);
      }
      
      // Si le scraping est terminé, vérifier à nouveau le statut de paiement
      if (result.status === 'finished' || result.status === 'completed') {
        try {
          console.log('Vérification du statut de paiement après scraping terminé');
          const paymentStatus = await api.verifyPayment(sid);
          if (paymentStatus.isPaid) {
            setHasPaid(true);
            console.log('Paiement vérifié: isPaid=true');
          }
        } catch (paymentError) {
          console.error('Erreur lors de la vérification du paiement:', paymentError);
        }
      }
      
      // Si le scraping est terminé ou a échoué, arrêter le polling
      const isDone = result.status === 'finished' || result.status === 'FINISHED' || result.status === 'SUCCESS' || result.status === 'completed' || result.status === 'failed';
      if (isDone) {
        console.log('Scraping terminé ou échoué, arrêt du polling');
        setLoading(false); // S'assurer que loading est mis à false
      }
      return isDone;
    } catch (error) {
      console.error('Error checking scrape status:', error);
      setLoading(false); // S'assurer que loading est mis à false en cas d'erreur
      return false;
    }
  }, [api, toast]);

  // Fonction pour démarrer le polling
  const startPolling = React.useCallback((sid: string) => {
    console.log(`Démarrage du polling pour la session ${sid}`);
    
    // Créer une référence à l'intervalle pour pouvoir l'effacer plus tard
    const pollInterval = setInterval(async () => {
      try {
        console.log('Exécution du polling...');
        const isDone = await checkScrapeStatus(sid);
        console.log(`Résultat du polling: isDone=${isDone}`);
        
        if (isDone) {
          console.log('Polling terminé, nettoyage de l\'intervalle');
          clearInterval(pollInterval);
          setLoading(false); // S'assurer que loading est mis à false
          
          // Force l'affichage de la prévisualisation sans faire d'appel API supplémentaire
          setTimeout(() => {
            console.log('Forçage de l\'affichage de la prévisualisation après la fin du polling');
            setShowPreview(true);
            console.log('showPreview forcé à true après la fin du polling');
          }, 500); // Attendre 500ms pour laisser le temps aux états de se mettre à jour
        }
      } catch (error) {
        console.error('Erreur pendant le polling:', error);
        // En cas d'erreur, arrêter le polling et afficher un message
        clearInterval(pollInterval);
        setLoading(false); // S'assurer que loading est mis à false
        toast({
          title: "Erreur de communication",
          description: "Impossible de vérifier l'état du scraping. Veuillez rafraîchir la page.",
          variant: "destructive",
        });
      }
    }, 2000); // Vérifier toutes les 2 secondes
    
    // Ajouter un timeout de sécurité pour arrêter le polling après 5 minutes
    const safetyTimeout = setTimeout(() => {
      console.log('Timeout de sécurité atteint, arrêt du polling');
      clearInterval(pollInterval);
      setLoading(false); // S'assurer que loading est mis à false
      setScrapePercent(0);
      toast({
        title: "Timeout",
        description: "Le scraping prend plus de temps que prévu. Veuillez vérifier les résultats plus tard.",
        variant: "default",
      });
    }, 5 * 60 * 1000); // 5 minutes
    
    // Nettoyer l'intervalle et le timeout si le composant est démonté
    return () => {
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
      setLoading(false); // S'assurer que loading est mis à false lors du nettoyage
    };
  }, [checkScrapeStatus, toast]);

  // Gérer le scraping
  async function handleScrape(e: React.FormEvent, options?: { singleItem?: boolean }) {
    e.preventDefault();
    if (!validateUrl(url)) {
      toast({
        title: "URL invalide",
        description: "Merci de saisir un lien Marketplace (Facebook ou LinkedIn) valide.",
        variant: "destructive",
      });
      return;
    }
    
    // Réinitialiser tous les états pour éviter les problèmes de données résiduelles
    setLoading(true);
    setShowPreview(false);
    setScrapePercent(5); // Démarrer à 5% pour montrer que le processus a commencé
    setScrapeDone(false);
    setHasPaid(false);
    setPreviewItems([]);
    setStats(null);
    
    console.log('Démarrage du scraping pour URL:', url);
    
    try {
      // Déterminer si nous scrapons une seule annonce
      const resultsLimit = options?.singleItem ? 1 : undefined;
      
      // Appeler l'API pour démarrer le scraping avec le paramètre resultsLimit
      const result = await api.startScraping(url, resultsLimit);
      console.log('Résultat du démarrage du scraping:', result);
      
      // Mettre à jour les états avec les résultats de l'API
      setSessionId(result.sessionId);
      setDatasetId(result.datasetId);
      
      // Démarrer le polling pour vérifier le statut
      console.log('Démarrage du polling pour la session:', result.sessionId);
      startPolling(result.sessionId);
      
      // Vérifier si l'utilisateur a déjà payé pour cette session
      try {
        console.log('Vérification initiale du statut de paiement');
        const paymentStatus = await api.verifyPayment(result.sessionId);
        if (paymentStatus.isPaid) {
          setHasPaid(true);
          console.log('Session déjà payée: isPaid=true');
        } else {
          console.log('Session non payée: isPaid=false');
        }
      } catch (error) {
        console.warn('Erreur lors de la vérification initiale du paiement:', error);
        // Ignorer les erreurs de vérification de paiement
      }
    } catch (error) {
      console.error('Error starting scrape:', error);
      setLoading(false); // S'assurer que loading est mis à false en cas d'erreur
      setScrapePercent(0);
      toast({
        title: "Erreur de scraping",
        description: "Une erreur est survenue lors du démarrage du scraping.",
        variant: "destructive",
      });
    }
  }

  // Récupérer l'URL de base Stripe depuis les variables d'environnement
  const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "";
  
  // Fonction pour construire l'URL de paiement Stripe
  const buildStripeUrl = React.useCallback((packId: string, sid: string) => {
    if (!STRIPE_PAYMENT_LINK) {
      console.error("VITE_STRIPE_PAYMENT_LINK n'est pas configuré");
      return "";
    }
    
    try {
      // Construire l'URL avec les paramètres nécessaires
      const url = new URL(STRIPE_PAYMENT_LINK);
      url.searchParams.append("session_id", sid);
      url.searchParams.append("pack_id", packId);
      return url.toString();
    } catch (error) {
      console.error('Erreur lors de la construction de l\'URL Stripe:', error);
      return "";
    }
  }, []);
  
  // Fonction pour gérer le paiement
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
      // Utiliser d'abord l'API si disponible
      try {
        const checkoutUrl = await api.createPayment(selectedPackId, sessionId);
        console.log('URL de paiement créée via API:', checkoutUrl);
        window.open(checkoutUrl, '_blank');
        return;
      } catch (apiError) {
        console.warn('Erreur avec l\'API de paiement, utilisation du lien direct:', apiError);
      }
      
      // Fallback: utiliser le lien direct
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

  // Fonction pour obtenir l'URL d'export
  const getExportUrl = React.useCallback((format: 'excel' | 'csv' = 'excel') => {
    return api.getExportUrl(sessionId, format);
  }, [api, sessionId]);

  return {
    url, setUrl,
    loading,
    showPreview,
    setShowPreview,
    downloadCount, setDownloadCount,
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
