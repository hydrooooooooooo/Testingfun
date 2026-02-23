import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface SubSession {
  pageName: string;
  url: string;
  infoRunId?: string;
  infoStatus?: string;
  infoDatasetId?: string;
  postsRunId?: string;
  postsStatus?: string;
  postsDatasetId?: string;
}

interface FacebookPagesStatus {
  sessionId: string;
  overallStatus: string;
  progress: number;
  subSessions: SubSession[];
}

const POLLING_INTERVAL = 5000; // 5 secondes

export function useFacebookPagesPolling(sessionId: string | null) {
  const [status, setStatus] = useState<FacebookPagesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await api.get(`/scrape/facebook-pages/${sessionId}/status`);
      const data = response.data;

      const statusData = data.data || data;
      const overallStatus = statusData.overallStatus;

      setStatus(data);
      setError(null);

      if (overallStatus === 'SUCCEEDED' || overallStatus === 'FAILED') {
        if (overallStatus === 'SUCCEEDED') {
          toastRef.current({
            title: "Extraction terminée !",
            description: "Les données sont prêtes à être téléchargées.",
          });
        } else {
          toastRef.current({
            title: "Extraction échouée",
            description: "Une erreur s'est produite lors de l'extraction.",
            variant: "destructive"
          });
        }
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[Polling] Error fetching Facebook Pages status:', err.message);
      setError(err.response?.data?.message || 'Erreur lors de la récupération du statut');
      return true;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    let intervalId: NodeJS.Timeout;

    const startPolling = async () => {
      // Première requête immédiate
      const shouldStop = await fetchStatus();
      setLoading(false);

      if (shouldStop) return;

      // Continuer le polling
      intervalId = setInterval(async () => {
        const shouldStop = await fetchStatus();
        if (shouldStop) {
          clearInterval(intervalId);
        }
      }, POLLING_INTERVAL);
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sessionId, fetchStatus]);

  const reset = useCallback(() => {
    setStatus(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    status,
    loading,
    error,
    reset,
    refetch: fetchStatus,
  };
}
