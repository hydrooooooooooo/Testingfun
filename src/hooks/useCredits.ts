import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

export interface CreditBalance {
  total: number;
  trial: number;
  purchased: number;
  trial_expires_at?: string | null;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  transaction_type: 'trial_grant' | 'purchase' | 'usage' | 'refund' | 'admin_adjustment' | 'expiration';
  service_type?: 'facebook_posts' | 'facebook_pages' | 'marketplace';
  reference_id?: string;
  status: 'completed' | 'reserved' | 'refunded';
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CreditHistory {
  transactions: CreditTransaction[];
  total: number;
}

export interface CreditEstimate {
  serviceType: string;
  itemCount: number;
  estimatedCost: number;
  currentBalance: number;
  hasEnoughCredits: boolean;
  shortfall: number;
}

export interface CostBreakdownItem {
  label: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface DetailedCostEstimate {
  serviceType: string;
  totalCost: number;
  breakdown: CostBreakdownItem[];
  userBalance: number;
  hasEnough: boolean;
  shortfall: number;
  balanceAfter: number;
}

export interface FacebookPagesEstimateParams {
  pageCount: number;
  postsPerPage: number;
  includeComments?: boolean;
  commentsPerPost?: number;
}

export interface BenchmarkEstimateParams {
  myPageUrl?: string;
  competitorCount: number;
  postsLimit: number;
  includeAiAnalysis?: boolean;
  modelId?: string;
}

export interface AiAnalysisEstimateParams {
  pageCount: number;
  postsPerPage: number;
  modelId?: string;
}

export const useCredits = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/user/credits/balance');
      setBalance(response.data);
    } catch (err: any) {
      console.error('Error fetching credit balance:', err);
      setError(err.response?.data?.message || 'Erreur lors de la récupération du solde');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (page = 1, limit = 50): Promise<CreditHistory | null> => {
    try {
      const offset = (page - 1) * limit;
      const response = await api.get('/user/credits/history', {
        params: { offset, limit },
      });
      return response.data;
    } catch (err: any) {
      console.error('Error fetching credit history:', err);
      throw new Error(err.response?.data?.message || 'Erreur lors de la récupération de l\'historique');
    }
  }, []);

  const estimateCost = useCallback(async (
    serviceType: 'facebook_posts' | 'facebook_pages' | 'marketplace',
    itemCount: number
  ): Promise<CreditEstimate | null> => {
    try {
      const response = await api.post('/estimate/simple', {
        serviceType,
        itemCount,
      });
      const data = response.data;
      // Map from CostEstimation shape to CreditEstimate shape
      return {
        serviceType: data.serviceType,
        itemCount,
        estimatedCost: data.totalCost,
        currentBalance: data.userBalance,
        hasEnoughCredits: data.hasEnough,
        shortfall: data.shortfall,
      };
    } catch (err: any) {
      console.error('Error estimating cost:', err);
      throw new Error(err.response?.data?.message || 'Erreur lors de l\'estimation du coût');
    }
  }, []);

  const estimateMarketplaceCost = useCallback(async (
    itemCount: number
  ): Promise<DetailedCostEstimate | null> => {
    try {
      const response = await api.post('/estimate/marketplace', { itemCount });
      return response.data;
    } catch (err: any) {
      console.error('Error estimating marketplace cost:', err);
      return null;
    }
  }, []);

  const estimateFacebookPagesCost = useCallback(async (
    params: FacebookPagesEstimateParams
  ): Promise<DetailedCostEstimate | null> => {
    try {
      const response = await api.post('/estimate/facebook-pages', params);
      return response.data;
    } catch (err: any) {
      console.error('Error estimating facebook pages cost:', err);
      return null;
    }
  }, []);

  const estimateBenchmarkCost = useCallback(async (
    params: BenchmarkEstimateParams
  ): Promise<DetailedCostEstimate | null> => {
    try {
      const response = await api.post('/estimate/benchmark', params);
      return response.data;
    } catch (err: any) {
      console.error('Error estimating benchmark cost:', err);
      return null;
    }
  }, []);

  const estimateAiAnalysisCost = useCallback(async (
    params: AiAnalysisEstimateParams
  ): Promise<DetailedCostEstimate | null> => {
    try {
      const response = await api.post('/estimate/ai-analysis', params);
      return response.data;
    } catch (err: any) {
      console.error('Error estimating AI analysis cost:', err);
      return null;
    }
  }, []);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    fetchHistory,
    estimateCost,
    estimateMarketplaceCost,
    estimateFacebookPagesCost,
    estimateBenchmarkCost,
    estimateAiAnalysisCost,
    refreshBalance,
  };
};

export default useCredits;
