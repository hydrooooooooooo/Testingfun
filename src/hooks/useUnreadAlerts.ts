import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export const useUnreadAlerts = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/mentions/alerts/unread');
      setCount(data.count ?? 0);
    } catch {
      // silently ignore — user may not have the table yet
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await api.post('/mentions/alerts/read-all');
      setCount(0);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  return { unreadCount: count, refresh: fetchCount, markAllAsRead };
};
