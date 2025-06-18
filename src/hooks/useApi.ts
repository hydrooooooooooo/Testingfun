import { useState } from 'react';
import axios from 'axios';

// API base URL - should be set in environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types pour les options de scraping APIFY
interface ApifyScrapeOptions {
  resultsLimit?: number;
  deepScrape?: boolean;
  getProfileUrls?: boolean;
  maxItems?: number;
  proxyConfiguration?: {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
  };
  extendOutputFunction?: string;
}

interface ScrapeResult {
  sessionId: string;
  datasetId: string;
  status: string;
  progress?: number;
  stats?: {
    nbItems: number;
    startedAt: string;
    finishedAt?: string;
    previewItems?: any[];
    totalItems?: number;
  };
  previewItems?: any[];
  isPaid?: boolean;
  apifyRunId?: string;
  deepScrapeEnabled?: boolean;
  profileUrlsEnabled?: boolean;
  error?: string;
}

/**
 * Custom hook for API interactions with APIFY support
 */
export function useApi() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start a scraping job with APIFY options
   * @param url URL to scrape
   * @param options APIFY scraping options
   * @param sessionId Optional session ID
   */
  const startScraping = async (
    url: string, 
    options: ApifyScrapeOptions = {}, 
    sessionId?: string
  ): Promise<ScrapeResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validation des options
      if (options.deepScrape && options.maxItems && options.maxItems > 200) {
        console.warn('Deep scrape limité à 200 éléments pour éviter les timeouts');
        options.maxItems = 200;
      }

      // Configuration par défaut pour APIFY
      const apifyOptions: ApifyScrapeOptions = {
        resultsLimit: options.resultsLimit || options.maxItems || 50,
        deepScrape: options.deepScrape || false,
        getProfileUrls: options.getProfileUrls || false,
        maxItems: options.maxItems,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL']
        },
        ...options
      };

      console.log('Démarrage du scraping APIFY avec options:', apifyOptions);

      const response = await axios.post(`${API_BASE_URL}/api/scrape`, {
        url,
        sessionId,
        apifyOptions,
        // Compatibilité avec l'ancien format
        resultsLimit: apifyOptions.resultsLimit?.toString()
      }, {
        timeout: 60000 // 60 secondes pour le démarrage
      });
      
      console.log('Réponse API de démarrage:', response.data);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Une erreur est survenue lors du scraping';
      setError(errorMessage);
      
      // Gestion spécifique des erreurs APIFY
      if (errorMessage.includes('APIFY_TOKEN')) {
        throw new Error('Token APIFY invalide ou manquant. Veuillez vérifier la configuration.');
      } else if (errorMessage.includes('quota')) {
        throw new Error('Quota APIFY dépassé. Veuillez vérifier votre compte APIFY.');
      } else if (errorMessage.includes('rate limit')) {
        throw new Error('Limite de taux atteinte. Veuillez attendre avant de relancer.');
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get scraping results with APIFY support
   */
  const getScrapeResults = async (sessionId: string): Promise<ScrapeResult> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Récupération des résultats APIFY pour la session: ${sessionId}`);
      
      const response = await axios.get(`${API_BASE_URL}/api/scrape/result`, {
        params: { sessionId },
        timeout: 15000 // 15 secondes
      });
      
      const result = response.data.data;
      console.log('Résultats APIFY reçus:', result);
      
      // Normalisation des données APIFY
      if (result.apifyRunId) {
        console.log(`Run APIFY actif: ${result.apifyRunId}`);
      }
      
      // Gestion des statuts APIFY spécifiques
      if (result.status === 'READY') {
        result.status = 'finished';
      } else if (result.status === 'RUNNING') {
        result.status = 'running';
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Une erreur est survenue lors de la récupération des résultats';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get APIFY run status directly
   */
  const getApifyRunStatus = async (runId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/apify/run/${runId}/status`);
      return response.data;
    } catch (err: any) {
      console.error('Erreur lors de la récupération du statut APIFY:', err);
      throw err;
    }
  };

  /**
   * Cancel APIFY run
   */
  const cancelApifyRun = async (runId: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/apify/run/${runId}/abort`);
      return response.data;
    } catch (err: any) {
      console.error('Erreur lors de l\'annulation du run APIFY:', err);
      throw err;
    }
  };

  /**
   * Create a payment session
   */
  const createPayment = async (packId: string, sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/create-payment`, {
        packId,
        sessionId
      });
      
      return response.data.data.checkoutUrl;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la création du paiement');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify payment status
   */
  const verifyPayment = async (sessionId: string) => {
    try {
      console.log(`Vérification du paiement pour la session ${sessionId}`);
      
      // Essayer d'abord avec la route spécifique
      try {
        const response = await axios.get(`${API_BASE_URL}/api/payment/verify-payment`, {
          params: { sessionId },
          timeout: 10000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Réponse de vérification (route spécifique):', response.data);
        
        if (response.data && response.data.isPaid) {
          if (response.data.packId) {
            localStorage.setItem('lastPackId', response.data.packId);
          }
          localStorage.setItem('lastSessionId', sessionId);
        }
        
        return response.data;
      } catch (error) {
        console.warn('Erreur avec la route spécifique, essai avec la route générique:', error);
        
        // Fallback sur l'ancienne route
        const fallbackResponse = await axios.get(`${API_BASE_URL}/api/verify-payment`, {
          params: { sessionId },
          timeout: 10000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Réponse de vérification (route fallback):', fallbackResponse.data);
        
        if (fallbackResponse.data && fallbackResponse.data.isPaid) {
          if (fallbackResponse.data.packId) {
            localStorage.setItem('lastPackId', fallbackResponse.data.packId);
          }
          localStorage.setItem('lastSessionId', sessionId);
        }
        
        return fallbackResponse.data;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du paiement:', error);
      throw error;
    }
  };

  /**
   * Get export URL
   */
  const getExportUrl = (sessionId: string, format: 'excel' | 'csv' = 'excel') => {
    return `${API_BASE_URL}/api/export?sessionId=${sessionId}&format=${format}`;
  };

  /**
   * Get preview items for a session with APIFY support
   */
  const getPreviewItems = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Récupération des éléments de prévisualisation pour la session: ${sessionId}`);
      
      const response = await axios.get(`${API_BASE_URL}/api/preview-items`, {
        params: { sessionId },
        timeout: 8000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      let previewData = response.data;
      console.log('Données reçues de l\'API:', previewData);
      
      // Normaliser les éléments de prévisualisation
      if (previewData.previewItems && Array.isArray(previewData.previewItems)) {
        console.log(`Normalisation de ${previewData.previewItems.length} éléments`);
        previewData.previewItems = previewData.previewItems.map(normalizePreviewItem);
      } else {
        console.warn('Format de réponse API invalide');
        previewData = { previewItems: [] };
      }
      
      return previewData;
    } catch (err: any) {
      console.error('Erreur lors de la récupération des éléments de prévisualisation:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la récupération des éléments de prévisualisation');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Normalise un élément de prévisualisation pour assurer la cohérence des propriétés
   */
  const normalizePreviewItem = (item: any) => {
    if (!item || typeof item !== 'object') {
      console.warn('normalizePreviewItem: Item invalide reçu', item);
      return {
        title: 'Annonce sans détails',
        price: 'Prix non disponible',
        desc: 'Pas de description disponible',
        image: '',
        location: 'Lieu non spécifié',
        url: '#',
        date: new Date().toISOString(),
        profileUrl: null
      };
    }
    
    const normalized = { ...item };
    
    // Normaliser le titre
    const rawTitle = item.title || item.name || item.titre || item.marketplace_listing_title;
    normalized.title = typeof rawTitle === 'string' ? rawTitle : 'Sans titre';
    
    // Normaliser le prix avec support des formats APIFY
    const rawPrice = item.price || item.prix || item.listing_price || item.priceAmount;
    normalized.price = formatPrice(rawPrice);
    
    // Normaliser l'image avec support des formats APIFY
    const rawImage = item.image || item.img || item.imageUrl || item.photo || item.primaryPhoto;
    normalized.image = typeof rawImage === 'string' ? rawImage : '';
    
    // Normaliser la localisation avec support APIFY
    const rawLocation = item.location || item.lieu || item.address || item.adresse || 
                        (item.locationText ? item.locationText : null);
    normalized.location = typeof rawLocation === 'string' ? rawLocation : 'Lieu non spécifié';
    
    // Normaliser l'URL
    const rawUrl = item.url || item.link || item.lien || item.listingUrl;
    normalized.url = typeof rawUrl === 'string' ? rawUrl : '#';
    
    // Normaliser la description avec support APIFY
    const rawDesc = item.desc || item.description || item.content || item.contenu || 
                   item.descriptionText || item.marketplace_listing_description;
    normalized.desc = typeof rawDesc === 'string' ? rawDesc : 'Pas de description';
    
    // Ajouter l'URL du profil si disponible (spécifique APIFY)
    const rawProfileUrl = item.profileUrl || item.sellerUrl || item.merchantUrl;
    normalized.profileUrl = typeof rawProfileUrl === 'string' ? rawProfileUrl : null;
    
    // Ajouter une date si elle n'existe pas
    if (!normalized.date) {
      normalized.date = new Date().toISOString();
    }
    
    return normalized;
  };
  
  /**
   * Formater un prix pour l'affichage avec support universel des devises
   */
  const formatPrice = (price: any): string => {
    if (!price) return 'Prix non disponible';
    
    // Support des objets de prix APIFY
    if (typeof price === 'object' && price !== null) {
      if (price.amount && price.currency) {
        const amount = typeof price.amount === 'number' ? price.amount : parseFloat(price.amount);
        if (!isNaN(amount)) {
          // Mappage des devises principales
          const currencySymbols: { [key: string]: string } = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'MGA': 'Ar',
            'JPY': '¥',
            'CNY': '¥',
            'CHF': 'CHF',
            'CAD': 'C$',
            'AUD': 'A$'
          };
          
          const symbol = currencySymbols[price.currency] || price.currency;
          return `${amount.toLocaleString('fr-FR')} ${symbol}`;
        }
      }
      if (price.formatted) {
        return price.formatted;
      }
    }
    
    // Si c'est déjà une chaîne formatée
    if (typeof price === 'string') {
      // Si elle contient déjà un symbole ou indication de devise
      if (/[€$£¥₹₦₵₡₪₽₩₨₴₸₦Ar]|\b(USD|EUR|GBP|MGA|JPY|CNY|CHF|CAD|AUD|XOF|XAF|CFA|FCFA)\b/i.test(price)) {
        return price;
      }
      
      // Essayer d'extraire un nombre
      const numericPrice = parseFloat(price.replace(/[^0-9,.]/g, '').replace(',', '.'));
      if (!isNaN(numericPrice)) {
        return `${numericPrice.toLocaleString('fr-FR')} €`;
      }
      
      return price;
    }
    
    // Si c'est un nombre simple
    if (typeof price === 'number') {
      return `${price.toLocaleString('fr-FR')} €`;
    }
    
    return 'Prix non disponible';
  };

  return {
    loading,
    error,
    startScraping,
    getScrapeResults,
    getApifyRunStatus,
    cancelApifyRun,
    createPayment,
    verifyPayment,
    getExportUrl,
    getPreviewItems
  };
}