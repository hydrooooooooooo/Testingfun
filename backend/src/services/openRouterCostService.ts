import axios from 'axios';
import db from '../database';
import { logger } from '../utils/logger';
import config from '../config/config';

export interface OpenRouterUsageStats {
  id: string;
  model: string;
  tokens_prompt: number;
  tokens_completion: number;
  total_cost: number; // en USD
  created_at?: string;
  generation_time?: number;
}

export interface AIUsageLog {
  id?: number;
  user_id: number;
  session_id?: string;
  generation_id: string;
  model: string;
  agent_type: 'audit' | 'benchmark' | 'calendar' | 'copywriting' | 'other';
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  cost_usd: number;
  cost_eur: number;
  credits_charged: number;
  page_name?: string;
  metadata?: any;
  created_at?: Date;
}

export interface AICostSummary {
  total_requests: number;
  total_tokens_prompt: number;
  total_tokens_completion: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_eur: number;
  total_credits_charged: number;
  by_model: Record<string, {
    requests: number;
    tokens: number;
    cost_usd: number;
  }>;
  by_agent_type: Record<string, {
    requests: number;
    tokens: number;
    cost_usd: number;
    credits_charged: number;
  }>;
  by_day: Array<{
    date: string;
    requests: number;
    cost_usd: number;
    credits_charged: number;
  }>;
}

// Taux de conversion USD -> EUR (à mettre à jour périodiquement)
const USD_TO_EUR = 0.92;

class OpenRouterCostService {
  /**
   * Récupère les statistiques de coût d'une génération OpenRouter
   */
  async getGenerationStats(generationId: string): Promise<OpenRouterUsageStats | null> {
    try {
      if (!config.ai.openRouterApiKey) {
        logger.warn('[OPENROUTER_COST] API key not configured');
        return null;
      }

      const response = await axios.get(
        `https://openrouter.ai/api/v1/generation?id=${generationId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.ai.openRouterApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data?.data;
      if (!data) {
        logger.warn('[OPENROUTER_COST] No data in generation response', { generationId });
        return null;
      }

      return {
        id: data.id || generationId,
        model: data.model || 'unknown',
        tokens_prompt: data.tokens_prompt || data.native_tokens_prompt || 0,
        tokens_completion: data.tokens_completion || data.native_tokens_completion || 0,
        total_cost: data.total_cost || 0,
        created_at: data.created_at,
        generation_time: data.generation_time,
      };
    } catch (error: any) {
      logger.error('[AI] OpenRouter.getGenerationStats', {
        error: error.message,
        generationId,
        operation: 'get_generation_stats'
      });
      return null;
    }
  }

  /**
   * Log l'utilisation d'une requête IA avec son coût
   */
  async logAIUsage(params: {
    userId: number;
    sessionId?: string;
    generationId: string;
    model: string;
    agentType: 'audit' | 'benchmark' | 'calendar' | 'copywriting' | 'other';
    creditsCharged: number;
    pageName?: string;
    metadata?: any;
  }): Promise<AIUsageLog | null> {
    try {
      // Vérifier si la table existe avant d'insérer
      const tableExists = await this.checkTableExists('ai_usage_logs');
      if (!tableExists) {
        logger.warn('[OPENROUTER_COST] Table ai_usage_logs does not exist - skipping log. Run migration 20251210_add_ai_usage_logs.sql');
        return null;
      }

      // Récupérer les stats de coût depuis OpenRouter (avec retry)
      let stats: OpenRouterUsageStats | null = null;
      
      // Attendre un peu car OpenRouter peut mettre du temps à avoir les stats
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      stats = await this.getGenerationStats(params.generationId);
      
      // Si pas de stats, réessayer une fois après 3 secondes
      if (!stats && params.generationId) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        stats = await this.getGenerationStats(params.generationId);
      }
      
      const tokensPrompt = stats?.tokens_prompt || 0;
      const tokensCompletion = stats?.tokens_completion || 0;
      const tokensTotal = tokensPrompt + tokensCompletion;
      const costUsd = stats?.total_cost || 0;
      const costEur = costUsd * USD_TO_EUR;

      const logEntry: Omit<AIUsageLog, 'id' | 'created_at'> = {
        user_id: params.userId,
        session_id: params.sessionId,
        generation_id: params.generationId,
        model: stats?.model || params.model,
        agent_type: params.agentType,
        tokens_prompt: tokensPrompt,
        tokens_completion: tokensCompletion,
        tokens_total: tokensTotal,
        cost_usd: costUsd,
        cost_eur: costEur,
        credits_charged: params.creditsCharged,
        page_name: params.pageName,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      };

      // Insérer dans la base de données
      const [inserted] = await db('ai_usage_logs')
        .insert(logEntry)
        .returning('*');

      logger.info('[OPENROUTER_COST] AI usage logged', {
        generationId: params.generationId,
        userId: params.userId,
        model: logEntry.model,
        agentType: params.agentType,
        tokensTotal,
        costUsd: costUsd.toFixed(6),
        costEur: costEur.toFixed(6),
        creditsCharged: params.creditsCharged,
        statsRetrieved: !!stats,
      });

      return inserted;
    } catch (error: any) {
      // Log détaillé de l'erreur pour debug
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || 'Unknown error';
      
      // Si c'est une erreur de table inexistante, log warning au lieu d'error
      if (errorCode === '42P01' || errorMessage.includes('does not exist')) {
        logger.warn('[OPENROUTER_COST] Table ai_usage_logs does not exist - run migration', {
          userId: params.userId,
          agentType: params.agentType
        });
      } else {
        logger.error('[AI] OpenRouter.logAIUsage', {
          error: (error as Error).message,
          operation: 'log_ai_usage',
          userId: params.userId,
          generationId: params.generationId,
          agentType: params.agentType,
          errorCode
        });
      }
      return null;
    }
  }

  /**
   * Vérifie si une table existe dans la base de données
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await db.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ?
        )
      `, [tableName]);
      return result.rows?.[0]?.exists || false;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir le résumé des coûts IA pour l'admin dashboard
   */
  async getCostSummary(options?: {
    startDate?: Date;
    endDate?: Date;
    userId?: number;
  }): Promise<AICostSummary> {
    try {
      let query = db('ai_usage_logs');

      if (options?.startDate) {
        query = query.where('created_at', '>=', options.startDate);
      }
      if (options?.endDate) {
        query = query.where('created_at', '<=', options.endDate);
      }
      if (options?.userId) {
        query = query.where('user_id', options.userId);
      }

      const logs = await query.select('*');

      // Calculer les totaux
      const summary: AICostSummary = {
        total_requests: logs.length,
        total_tokens_prompt: 0,
        total_tokens_completion: 0,
        total_tokens: 0,
        total_cost_usd: 0,
        total_cost_eur: 0,
        total_credits_charged: 0,
        by_model: {},
        by_agent_type: {},
        by_day: [],
      };

      const byDay: Record<string, { requests: number; cost_usd: number; credits_charged: number }> = {};

      for (const log of logs) {
        summary.total_tokens_prompt += log.tokens_prompt || 0;
        summary.total_tokens_completion += log.tokens_completion || 0;
        summary.total_tokens += log.tokens_total || 0;
        summary.total_cost_usd += parseFloat(log.cost_usd) || 0;
        summary.total_cost_eur += parseFloat(log.cost_eur) || 0;
        summary.total_credits_charged += parseFloat(log.credits_charged) || 0;

        // Par modèle
        const model = log.model || 'unknown';
        if (!summary.by_model[model]) {
          summary.by_model[model] = { requests: 0, tokens: 0, cost_usd: 0 };
        }
        summary.by_model[model].requests++;
        summary.by_model[model].tokens += log.tokens_total || 0;
        summary.by_model[model].cost_usd += parseFloat(log.cost_usd) || 0;

        // Par type d'agent
        const agentType = log.agent_type || 'other';
        if (!summary.by_agent_type[agentType]) {
          summary.by_agent_type[agentType] = { requests: 0, tokens: 0, cost_usd: 0, credits_charged: 0 };
        }
        summary.by_agent_type[agentType].requests++;
        summary.by_agent_type[agentType].tokens += log.tokens_total || 0;
        summary.by_agent_type[agentType].cost_usd += parseFloat(log.cost_usd) || 0;
        summary.by_agent_type[agentType].credits_charged += parseFloat(log.credits_charged) || 0;

        // Par jour
        const day = new Date(log.created_at).toISOString().split('T')[0];
        if (!byDay[day]) {
          byDay[day] = { requests: 0, cost_usd: 0, credits_charged: 0 };
        }
        byDay[day].requests++;
        byDay[day].cost_usd += parseFloat(log.cost_usd) || 0;
        byDay[day].credits_charged += parseFloat(log.credits_charged) || 0;
      }

      // Convertir byDay en tableau trié
      summary.by_day = Object.entries(byDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return summary;
    } catch (error: any) {
      logger.error('[OPENROUTER_COST] Failed to get cost summary', { error: error.message });
      return {
        total_requests: 0,
        total_tokens_prompt: 0,
        total_tokens_completion: 0,
        total_tokens: 0,
        total_cost_usd: 0,
        total_cost_eur: 0,
        total_credits_charged: 0,
        by_model: {},
        by_agent_type: {},
        by_day: [],
      };
    }
  }

  /**
   * Obtenir les logs récents pour l'admin dashboard
   */
  async getRecentLogs(limit: number = 50): Promise<AIUsageLog[]> {
    try {
      const logs = await db('ai_usage_logs')
        .select('ai_usage_logs.*', 'users.email as user_email')
        .leftJoin('users', 'ai_usage_logs.user_id', 'users.id')
        .orderBy('ai_usage_logs.created_at', 'desc')
        .limit(limit);

      return logs;
    } catch (error: any) {
      logger.error('[OPENROUTER_COST] Failed to get recent logs', { error: error.message });
      return [];
    }
  }

  /**
   * Calculer la rentabilité (revenus crédits vs coûts API)
   */
  async getProfitabilityReport(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total_credits_revenue_eur: number;
    total_api_cost_eur: number;
    gross_margin_eur: number;
    margin_percentage: number;
    details: {
      agent_type: string;
      credits_revenue_eur: number;
      api_cost_eur: number;
      margin_eur: number;
      margin_pct: number;
    }[];
  }> {
    const summary = await this.getCostSummary(options);
    
    // 1 crédit = 0.10€
    const CREDIT_VALUE_EUR = 0.10;
    
    const totalCreditsRevenueEur = summary.total_credits_charged * CREDIT_VALUE_EUR;
    const totalApiCostEur = summary.total_cost_eur;
    const grossMarginEur = totalCreditsRevenueEur - totalApiCostEur;
    const marginPercentage = totalCreditsRevenueEur > 0 
      ? (grossMarginEur / totalCreditsRevenueEur) * 100 
      : 0;

    const details = Object.entries(summary.by_agent_type).map(([agentType, data]) => {
      const creditsRevenueEur = data.credits_charged * CREDIT_VALUE_EUR;
      const apiCostEur = data.cost_usd * USD_TO_EUR;
      const marginEur = creditsRevenueEur - apiCostEur;
      const marginPct = creditsRevenueEur > 0 ? (marginEur / creditsRevenueEur) * 100 : 0;

      return {
        agent_type: agentType,
        credits_revenue_eur: creditsRevenueEur,
        api_cost_eur: apiCostEur,
        margin_eur: marginEur,
        margin_pct: marginPct,
      };
    });

    return {
      total_credits_revenue_eur: totalCreditsRevenueEur,
      total_api_cost_eur: totalApiCostEur,
      gross_margin_eur: grossMarginEur,
      margin_percentage: marginPercentage,
      details,
    };
  }
}

export const openRouterCostService = new OpenRouterCostService();
