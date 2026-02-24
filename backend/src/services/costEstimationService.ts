import { logger } from '../utils/logger';
import { creditService } from './creditService';
import { getModelCostMultiplier, getDefaultAIModel } from '../config/aiModels';

/**
 * =============================================================================
 * MATRICE CENTRALISÉE DES COÛTS - SOURCE UNIQUE DE VÉRITÉ
 * =============================================================================
 * IMPORTANT: Tous les coûts de l'application doivent être définis ici.
 * Ne jamais hardcoder de coûts ailleurs dans le code.
 * =============================================================================
 */
export const COST_MATRIX = {
  // --- Extraction de données ---
  marketplace: {
    perItem: 0.5,
    description: 'Extraction Marketplace',
  },
  facebook_pages: {
    perPage: 0.5,
    perPost: 0.1,
    description: 'Extraction Facebook Pages',
  },
  facebook_posts: {
    perPost: 0.5,
    description: 'Extraction Posts Facebook',
  },
  comments: {
    perComment: 0.02,
    perPost: 0.1,
    description: 'Extraction Commentaires',
  },
  
  // --- Analyses IA ---
  ai_analysis: {
    perPage: 2,
    perPost: 0.05,
    description: 'Analyse IA',
  },
  
  // --- Benchmark Concurrentiel ---
  benchmark: {
    perPage: 2,
    perPost: 0.1,
    aiAnalysis: 3,
    reportGeneration: 1,
    description: 'Benchmark Concurrentiel',
  },
  
  // --- Surveillance / Mentions ---
  mentions: {
    perMention: 0.05,
    perKeyword: 0.1,
    description: 'Détection Mentions',
  },
  
  // --- Automatisations (coûts additionnels) ---
  automation: {
    baseCost: 1,           // Coût de base par exécution
    aiAnalysisMultiplier: 1, // Multiplicateur si AI activé (utilise ai_analysis.perPage/perPost)
    benchmarkMultiplier: 1,  // Multiplicateur si benchmark activé
    mentionMultiplier: 1,    // Multiplicateur si mentions activé
    description: 'Automatisation Scraping',
  },
} as const;

/**
 * Calculer le coût simple pour un service (utilisé par creditService)
 */
export function calculateSimpleCost(
  serviceType: 'marketplace' | 'facebook_pages' | 'facebook_posts',
  itemCount: number
): number {
  switch (serviceType) {
    case 'marketplace':
      return itemCount * COST_MATRIX.marketplace.perItem;
    case 'facebook_pages':
      // Pour facebook_pages, on compte les pages (pas les posts individuels)
      return itemCount * COST_MATRIX.facebook_pages.perPage;
    case 'facebook_posts':
      return itemCount * COST_MATRIX.facebook_posts.perPost;
    default:
      return itemCount * 0.5; // Fallback
  }
}

/**
 * Calculer le coût d'une analyse IA
 * @param pageCount - Nombre de pages analysées
 * @param postsPerPage - Nombre de posts par page
 * @param modelId - ID du modèle IA (optionnel, défaut = modèle par défaut)
 */
export function calculateAiAnalysisCost(
  pageCount: number, 
  postsPerPage: number,
  modelId?: string
): number {
  const totalPosts = pageCount * postsPerPage;
  const baseCost = (pageCount * COST_MATRIX.ai_analysis.perPage) + 
                   (totalPosts * COST_MATRIX.ai_analysis.perPost);
  
  // Appliquer le multiplicateur du modèle IA
  const multiplier = modelId ? getModelCostMultiplier(modelId) : 1.0;
  return Math.ceil(baseCost * multiplier * 100) / 100;
}

/**
 * Calculer le coût d'un benchmark
 * @param totalPages - Nombre total de pages
 * @param postsLimit - Limite de posts par page
 * @param includeAiAnalysis - Inclure l'analyse IA
 * @param modelId - ID du modèle IA (optionnel, défaut = modèle par défaut)
 */
export function calculateBenchmarkCost(
  totalPages: number, 
  postsLimit: number, 
  includeAiAnalysis: boolean = true,
  modelId?: string
): number {
  const totalPosts = totalPages * postsLimit;
  
  // Coûts de base (extraction) - pas affectés par le modèle IA
  let baseCost = (totalPages * COST_MATRIX.benchmark.perPage) + 
                 (totalPosts * COST_MATRIX.benchmark.perPost) +
                 COST_MATRIX.benchmark.reportGeneration;
  
  // Coûts IA - affectés par le multiplicateur du modèle
  let aiCost = 0;
  if (includeAiAnalysis) {
    const multiplier = modelId ? getModelCostMultiplier(modelId) : 1.0;
    aiCost = COST_MATRIX.benchmark.aiAnalysis * multiplier;
  }
  
  return Math.ceil((baseCost + aiCost) * 10) / 10; // Arrondir à 0.1
}

/**
 * Calculer le coût d'une détection de mentions
 */
export function calculateMentionsCost(mentionCount: number): number {
  return mentionCount * COST_MATRIX.mentions.perMention;
}

/**
 * Calculer le coût d'extraction Facebook Pages (pages + posts séparément)
 * IMPORTANT: Utiliser cette fonction au lieu de calculateSimpleCost pour FB Pages
 */
export function calculateFacebookPagesCost(
  pageCount: number, 
  postCount: number,
  includeComments: boolean = false,
  commentCount: number = 0
): number {
  let cost = (pageCount * COST_MATRIX.facebook_pages.perPage) + 
             (postCount * COST_MATRIX.facebook_pages.perPost);
  
  if (includeComments && commentCount > 0) {
    cost += (postCount * COST_MATRIX.comments.perPost) + 
            (commentCount * COST_MATRIX.comments.perComment);
  }
  
  return Math.ceil(cost * 100) / 100; // Arrondir à 0.01
}

export interface CostBreakdownItem {
  label: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface CostEstimation {
  serviceType: string;
  totalCost: number;
  breakdown: CostBreakdownItem[];
  userBalance: number;
  hasEnough: boolean;
  shortfall: number;
  balanceAfter: number;
}

export interface MarketplaceEstimateParams {
  itemCount: number;
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

class CostEstimationService {
  /**
   * Estimer le coût d'une extraction Marketplace
   */
  async estimateMarketplace(
    userId: number,
    params: MarketplaceEstimateParams
  ): Promise<CostEstimation> {
    const { itemCount } = params;
    
    const breakdown: CostBreakdownItem[] = [
      {
        label: 'Items Marketplace',
        quantity: itemCount,
        unitCost: COST_MATRIX.marketplace.perItem,
        subtotal: itemCount * COST_MATRIX.marketplace.perItem,
      },
    ];

    const totalCost = breakdown.reduce((sum, item) => sum + item.subtotal, 0);
    
    return this.buildEstimation(userId, 'marketplace', totalCost, breakdown);
  }

  /**
   * Estimer le coût d'une extraction Facebook Pages
   */
  async estimateFacebookPages(
    userId: number,
    params: FacebookPagesEstimateParams
  ): Promise<CostEstimation> {
    const { pageCount, postsPerPage, includeComments = false, commentsPerPost = 0 } = params;
    
    const breakdown: CostBreakdownItem[] = [
      {
        label: 'Pages Facebook',
        quantity: pageCount,
        unitCost: COST_MATRIX.facebook_pages.perPage,
        subtotal: pageCount * COST_MATRIX.facebook_pages.perPage,
      },
      {
        label: 'Posts par page',
        quantity: pageCount * postsPerPage,
        unitCost: COST_MATRIX.facebook_pages.perPost,
        subtotal: pageCount * postsPerPage * COST_MATRIX.facebook_pages.perPost,
      },
    ];

    if (includeComments && commentsPerPost > 0) {
      const totalComments = pageCount * postsPerPage * commentsPerPost;
      breakdown.push({
        label: 'Commentaires',
        quantity: totalComments,
        unitCost: COST_MATRIX.comments.perComment,
        subtotal: totalComments * COST_MATRIX.comments.perComment,
      });
    }

    const totalCost = breakdown.reduce((sum, item) => sum + item.subtotal, 0);
    
    return this.buildEstimation(userId, 'facebook_pages', totalCost, breakdown);
  }

  /**
   * Estimer le coût d'un Benchmark
   */
  async estimateBenchmark(
    userId: number,
    params: BenchmarkEstimateParams
  ): Promise<CostEstimation> {
    const { myPageUrl, competitorCount, postsLimit, includeAiAnalysis = true } = params;
    
    const totalPages = (myPageUrl ? 1 : 0) + competitorCount;
    const totalPosts = totalPages * postsLimit;
    
    const breakdown: CostBreakdownItem[] = [
      {
        label: 'Pages à scraper',
        quantity: totalPages,
        unitCost: COST_MATRIX.benchmark.perPage,
        subtotal: totalPages * COST_MATRIX.benchmark.perPage,
      },
      {
        label: 'Posts à analyser',
        quantity: totalPosts,
        unitCost: COST_MATRIX.benchmark.perPost,
        subtotal: totalPosts * COST_MATRIX.benchmark.perPost,
      },
    ];

    if (includeAiAnalysis) {
      breakdown.push({
        label: 'Analyse IA comparative',
        quantity: 1,
        unitCost: COST_MATRIX.benchmark.aiAnalysis,
        subtotal: COST_MATRIX.benchmark.aiAnalysis,
      });
    }

    breakdown.push({
      label: 'Génération du rapport',
      quantity: 1,
      unitCost: COST_MATRIX.benchmark.reportGeneration,
      subtotal: COST_MATRIX.benchmark.reportGeneration,
    });

    // Apply AI model cost multiplier to the AI analysis breakdown item
    if (includeAiAnalysis && params.modelId) {
      const multiplier = getModelCostMultiplier(params.modelId);
      const aiItem = breakdown.find(b => b.label === 'Analyse IA comparative');
      if (aiItem && multiplier !== 1.0) {
        aiItem.unitCost = COST_MATRIX.benchmark.aiAnalysis * multiplier;
        aiItem.subtotal = aiItem.unitCost * aiItem.quantity;
        aiItem.label = `Analyse IA comparative (×${multiplier})`;
      }
    }

    const totalCost = breakdown.reduce((sum, item) => sum + item.subtotal, 0);
    
    return this.buildEstimation(userId, 'benchmark', totalCost, breakdown);
  }

  /**
   * Estimer le coût d'une Analyse IA
   */
  async estimateAiAnalysis(
    userId: number,
    params: AiAnalysisEstimateParams
  ): Promise<CostEstimation> {
    const { pageCount, postsPerPage } = params;
    
    const totalPosts = pageCount * postsPerPage;
    
    const breakdown: CostBreakdownItem[] = [
      {
        label: 'Pages à analyser',
        quantity: pageCount,
        unitCost: COST_MATRIX.ai_analysis.perPage,
        subtotal: pageCount * COST_MATRIX.ai_analysis.perPage,
      },
      {
        label: 'Posts à analyser',
        quantity: totalPosts,
        unitCost: COST_MATRIX.ai_analysis.perPost,
        subtotal: totalPosts * COST_MATRIX.ai_analysis.perPost,
      },
    ];

    // Apply AI model cost multiplier to all breakdown items
    if (params.modelId) {
      const multiplier = getModelCostMultiplier(params.modelId);
      if (multiplier !== 1.0) {
        breakdown.forEach(item => {
          item.unitCost = item.unitCost * multiplier;
          item.subtotal = item.quantity * item.unitCost;
        });
        breakdown.push({
          label: `Multiplicateur modèle IA (×${multiplier})`,
          quantity: 1,
          unitCost: 0,
          subtotal: 0,
        });
      }
    }

    const totalCost = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

    return this.buildEstimation(userId, 'ai_analysis', totalCost, breakdown);
  }

  /**
   * Estimation générique simple (pour compatibilité)
   */
  async estimateSimple(
    userId: number,
    serviceType: 'marketplace' | 'facebook_pages' | 'facebook_posts',
    itemCount: number
  ): Promise<CostEstimation> {
    let unitCost: number;
    let label: string;

    switch (serviceType) {
      case 'marketplace':
        unitCost = COST_MATRIX.marketplace.perItem;
        label = 'Items Marketplace';
        break;
      case 'facebook_pages':
        unitCost = COST_MATRIX.facebook_pages.perPage;
        label = 'Pages Facebook';
        break;
      case 'facebook_posts':
        unitCost = COST_MATRIX.facebook_posts.perPost;
        label = 'Posts Facebook';
        break;
      default:
        unitCost = 0.5;
        label = 'Items';
    }

    const breakdown: CostBreakdownItem[] = [
      {
        label,
        quantity: itemCount,
        unitCost,
        subtotal: itemCount * unitCost,
      },
    ];

    const totalCost = breakdown.reduce((sum, item) => sum + item.subtotal, 0);
    
    return this.buildEstimation(userId, serviceType, totalCost, breakdown);
  }

  /**
   * Construire l'objet d'estimation final
   */
  private async buildEstimation(
    userId: number,
    serviceType: string,
    totalCost: number,
    breakdown: CostBreakdownItem[]
  ): Promise<CostEstimation> {
    const userBalance = await creditService.getUserCredits(userId);
    const roundedCost = Math.ceil(totalCost * 10) / 10; // Arrondir à 0.1 près
    const hasEnough = userBalance >= roundedCost;
    const shortfall = hasEnough ? 0 : Math.ceil((roundedCost - userBalance) * 10) / 10;
    const balanceAfter = hasEnough ? Math.round((userBalance - roundedCost) * 10) / 10 : 0;

    logger.info(`[COST_ESTIMATION] ${serviceType}: cost=${roundedCost}, balance=${userBalance}, hasEnough=${hasEnough}`);

    return {
      serviceType,
      totalCost: roundedCost,
      breakdown,
      userBalance,
      hasEnough,
      shortfall,
      balanceAfter,
    };
  }

  /**
   * Obtenir la description d'un service
   */
  getServiceDescription(serviceType: keyof typeof COST_MATRIX): string {
    return COST_MATRIX[serviceType]?.description || 'Service';
  }
}

export const costEstimationService = new CostEstimationService();
