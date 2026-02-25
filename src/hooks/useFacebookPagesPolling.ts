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
  commentsRunId?: string;
  commentsStatus?: string;
}

interface FacebookPagesStatus {
  sessionId: string;
  overallStatus: string;
  progress: number;
  subSessions: SubSession[];
}

function getAdaptiveInterval(elapsedMs: number): number {
  if (elapsedMs < 30000) return 5000;   // 0-30s → 5s
  if (elapsedMs < 120000) return 10000;  // 30s-2min → 10s
  return 15000;                           // 2min+ → 15s
}

export function useFacebookPagesPolling(sessionId: string | null) {
  const [status, setStatus] = useState<FacebookPagesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return true;

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
    startTimeRef.current = Date.now();

    const scheduleNext = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const interval = getAdaptiveInterval(elapsed);
      timeoutRef.current = setTimeout(async () => {
        const shouldStop = await fetchStatus();
        if (!shouldStop) {
          scheduleNext();
        }
      }, interval);
    };

    const startPolling = async () => {
      const shouldStop = await fetchStatus();
      setLoading(false);
      if (!shouldStop) {
        scheduleNext();
      }
    };

    startPolling();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionId, fetchStatus]);

  const reset = useCallback(() => {
    setStatus(null);
    setLoading(false);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    status,
    loading,
    error,
    reset,
    refetch: fetchStatus,
  };
}
