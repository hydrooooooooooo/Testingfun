import { useState, useCallback } from 'react';
import { Pack } from '@/lib/plans';
import api from '@/services/api';

// API base URL (for building absolute URLs when needed)
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

      const response = await api.post(`/scrape`, {
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
      const response = await api.get(`/scrape/result`, { params: { sessionId } });
      
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
    const createMvolaPayment = async (sessionId: string, packId: string) => {
    try {
      const response = await api.post(`/mvola/initiate-payment`, { sessionId, packId });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la création du paiement Mvola';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getApifyRunStatus = async (runId: string) => {
    try {
      const response = await api.get(`/apify/run/${runId}/status`);
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
      const response = await api.post(`/apify/run/${runId}/abort`);
      return response.data;
    } catch (err: any) {
      console.error("Erreur lors de l'annulation du run APIFY:", err);
      throw err;
    }
  };

  /**
   * Create a payment session
   */
  const createPayment = async (sessionId: string, packId: string, currency: 'eur' | 'mga' = 'eur') => {
    setLoading(true);
    setError(null);

    console.log(`[Payment] Creating payment: session=${sessionId}, pack=${packId}, currency=${currency}`);

    try {
      const response = await api.post(`/payment/create-payment`, {
        sessionId,
        packId,
        currency,
      });
      console.log('%c[Payment] Succès de la création du paiement !', 'color: green; font-weight: bold;', response.data);
      return response.data;
    } catch (err: any) {
      // --- Débogage d'Erreur Amélioré ---
      console.error('%c[Payment] ERREUR lors de la création du paiement.', 'color: red; font-weight: bold;');
      console.error('[Payment] Erreur brute:', err);
      if (err.response) {
        console.error('[Payment] Réponse du serveur (erreur):', err.response);
        console.error(`[Payment] Statut: ${err.response.status}, Données:`, err.response.data);
      }
      // --- Fin Débogage d'Erreur ---
      
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la création du paiement';
      setError(errorMessage);
      throw new Error(errorMessage);
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
        const response = await api.get(`/payment/verify-payment`, {
          params: { sessionId },
          timeout: 10000,
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
        
        const fallbackResponse = await api.get(`/verify-payment`, {
          params: { sessionId },
          timeout: 10000,
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
  const getExportUrl = (sessionId: string, format: 'excel' | 'csv') => {
    const fmt = format || 'excel';
    // Backend route: GET /api/export?sessionId=...&format=excel
    const url = new URL(`${API_BASE_URL}/export`);
    url.searchParams.set('sessionId', sessionId);
    url.searchParams.set('format', fmt);
    return url.toString();
  };

  const getPacks = useCallback(async (): Promise<Pack[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/packs');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la récupération des packs';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAdminUsers = useCallback(async (q: string, limit = 20): Promise<Array<{ id: number; email: string }>> => {
    try {
      const response = await api.get('/admin/users', { params: { q, limit } });
      return response.data?.data || response.data || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la recherche utilisateurs';
      setError(errorMessage);
      return [];
    }
  }, []);

  const getAdminReport = useCallback(async () => {
    try {
      const response = await api.get('/admin/report');
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement du reporting admin';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAdminSearches = useCallback(async (
    page = 1,
    limit = 50,
    params?: { from?: string; to?: string; userId?: number }
  ) => {
    try {
      const response = await api.get('/admin/searches', { params: { page, limit, ...(params || {}) } });
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des recherches';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAdminAdvancedMetrics = useCallback(async () => {
    try {
      const response = await api.get('/admin/metrics-advanced');
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des métriques avancées';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const exportAdminSearchesCsv = useCallback(async (params?: { from?: string; to?: string; userId?: number }) => {
    try {
      const response = await api.get('/admin/searches/export', { params: params || {}, responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'searches.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'export CSV';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAdminAIUsage = useCallback(async (filters?: { from?: string; to?: string; userId?: number }) => {
    try {
      const params: Record<string, string> = {};
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;
      if (filters?.userId) params.userId = String(filters.userId);
      const response = await api.get('/admin/ai-usage', { params });
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des données IA';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Start a one-time free trial scrape (max 10 items)
  const startTrialScrape = async (
    url: string
  ): Promise<{ sessionId: string; datasetId?: string; actorRunId?: string; isTrial: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/trial/scrape`, { url }, { timeout: 30000 });
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Erreur lors du lancement de l'essai gratuit";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAdminUserById = useCallback(async (userId: number) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement utilisateur';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const adjustAdminUserCredits = useCallback(async (userId: number, amount: number, reason: string) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/credits`, { amount, reason });
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'ajustement crédits';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const toggleAdminUserStatus = useCallback(async (userId: number, suspended: boolean, reason?: string) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/status`, { suspended, reason });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du changement de statut';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refundAdminSession = useCallback(async (sessionId: string) => {
    try {
      const response = await api.get(`/admin/sessions/${sessionId}/refund`);
      return response.data?.data || response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du remboursement';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const archiveAdminSession = useCallback(async (sessionId: string) => {
    try {
      const response = await api.delete(`/admin/sessions/${sessionId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'archivage';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAdminSessions = useCallback(async () => {
    try {
      const response = await api.get('/admin/sessions');
      return response.data || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement sessions';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAdminSessionById = useCallback(async (sessionId: string) => {
    try {
      const response = await api.get(`/admin/sessions/${sessionId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur chargement session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    loading,
    error,
    startScraping,
    getScrapeResults,
    getApifyRunStatus,
    createMvolaPayment,
    cancelApifyRun,
    createPayment,
    getPacks,
    getExportUrl,
    getAdminReport,
    getAdminSearches,
    getAdminAdvancedMetrics,
    getAdminAIUsage,
    exportAdminSearchesCsv,
    searchAdminUsers,
    startTrialScrape,
    getAdminUserById,
    adjustAdminUserCredits,
    toggleAdminUserStatus,
    refundAdminSession,
    archiveAdminSession,
    getAdminSessions,
    getAdminSessionById,
  };
}