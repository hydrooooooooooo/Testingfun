import { useState } from 'react';
import axios from 'axios';

// API base URL - should be set in environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

export interface PreviewItem {
  title: string;
  price: string;
  image: string;
  location: string;
  url: string;
  desc: string;
  profileUrl?: string | null;
  date?: string;
  [key: string]: any; // Pour les autres champs potentiels
}

export type ScrapeStats = {
  nbItems: number; // Nombre total d'items scrapés
  totalItems?: number;
  startedAt?: string; // Timestamp de début
  finishedAt?: string; // Timestamp de fin
  previewItems?: PreviewItem[];
  [key: string]: any; // Pour les autres champs potentiels
}

export interface ScrapeResult {
  sessionId: string;
  datasetId?: string; // Rendu optionnel car pas toujours présent
  status: string;
  progress?: number;
  stats?: ScrapeStats;
  previewItems?: PreviewItem[];
  isPaid?: boolean;
  apifyRunId?: string;
  deepScrapeEnabled?: boolean;
  profileUrlsEnabled?: boolean;
  error?: string;
  message?: string; // Pour les messages d'erreur du backend
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

      const response = await axios.post(`${API_BASE_URL}/scrape`, {
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
      console.log(`API: Fetching results for session ${sessionId}`);
      const response = await axios.get(`${API_BASE_URL}/scrape/result`, { params: { sessionId } });
      
      const session = response.data;

      return {
        sessionId: sessionId,
        status: session.status || 'unknown',
        stats: session.stats || (session.totalItems ? { nbItems: session.totalItems } : null),
        previewItems: session.previewItems || [],
        isPaid: session.isPaid || false,
        progress: session.progress || 0,
        error: session.error || null,
        datasetId: session.datasetId,
        apifyRunId: session.actorRunId
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la récupération des résultats';
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
      const response = await axios.get(`${API_BASE_URL}/apify/run/${runId}/status`);
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
      const response = await axios.post(`${API_BASE_URL}/apify/run/${runId}/abort`);
      return response.data;
    } catch (err: any) {
      console.error("Erreur lors de l'annulation du run APIFY:", err);
      throw err;
    }
  };

  /**
   * Create a payment session - CORRIGÉ
   */
  const createPayment = async (packId: string, sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/payment/create-payment`, {
        packId,
        sessionId
      });
      
      return response.data.url;
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
      
      try {
        const response = await axios.get(`${API_BASE_URL}/payment/verify-payment`, {
          params: { sessionId },
          timeout: 10000
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
        
        const fallbackResponse = await axios.get(`${API_BASE_URL}/verify-payment`, {
          params: { sessionId },
          timeout: 10000
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
    return `${API_BASE_URL}/export?sessionId=${sessionId}&format=${format}`;
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
    getExportUrl 
  };
}