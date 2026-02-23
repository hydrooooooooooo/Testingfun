import { useState, useEffect } from 'react';
import api from '@/services/api';
import { ScrapedItem, ItemsFilter, ItemsSort, SessionStats } from '@/types/scrapedItems';

export const useScrapedItems = (sessionId: string) => {
  const [items, setItems] = useState<ScrapedItem[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const fetchItems = async (
    page: number = 1,
    filters?: ItemsFilter,
    sort?: ItemsSort
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params: any = { page, limit: 20 };

      if (filters) {
        if (filters.search) params.search = filters.search;
        if (filters.minPrice) params.minPrice = filters.minPrice;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.location) params.location = filters.location;
        if (filters.itemType) params.itemType = filters.itemType;
        if (filters.isFavorite !== undefined) params.isFavorite = filters.isFavorite;
      }

      if (sort) {
        params.sortBy = sort.field;
        params.sortOrder = sort.order;
      }

      const response = await api.get(
        `/scraped-items/session/${sessionId}`,
        { params }
      );

      setItems(response.data.data.items);
      setPagination({
        page: response.data.data.page,
        totalPages: response.data.data.totalPages,
        total: response.data.data.total,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des items');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(
        `/scraped-items/session/${sessionId}/stats`
      );
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const toggleFavorite = async (itemId: number) => {
    try {
      await api.post(`/scraped-items/${itemId}/favorite`);

      // Mettre à jour localement
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, is_favorite: !item.is_favorite } : item
        )
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const updateNotes = async (itemId: number, notes: string) => {
    try {
      await api.put(`/scraped-items/${itemId}/notes`, { notes });

      // Mettre à jour localement
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, user_notes: notes } : item
        )
      );
    } catch (err) {
      console.error('Error updating notes:', err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchItems();
      fetchStats();
    }
  }, [sessionId]);

  return {
    items,
    stats,
    loading,
    error,
    pagination,
    fetchItems,
    toggleFavorite,
    updateNotes,
  };
};
