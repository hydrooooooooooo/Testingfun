import { Router, Response } from 'express';
import { AuthenticatedRequest, protect } from '../middlewares/authMiddleware';
import { costEstimationService } from '../services/costEstimationService';
import { logger } from '../utils/logger';
import db from '../database';
import { getDefaultAIModel } from '../config/aiModels';

const router = Router();

/** Fetch user's preferred AI model ID from DB */
async function getUserModelId(userId: number): Promise<string> {
  const user = await db('users').where({ id: userId }).select('preferred_ai_model').first();
  return user?.preferred_ai_model || getDefaultAIModel().id;
}

/**
 * POST /api/estimate/marketplace
 * Estimer le coût d'une extraction Marketplace
 */
router.post('/marketplace', protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { itemCount } = req.body;

    if (!itemCount || itemCount < 1) {
      return res.status(400).json({ message: 'itemCount requis et doit être >= 1' });
    }

    const estimation = await costEstimationService.estimateMarketplace(userId, { itemCount });
    res.json(estimation);
  } catch (error: any) {
    logger.error('[ESTIMATE] Error estimating marketplace cost:', error);
    res.status(500).json({ message: 'Erreur lors de l\'estimation', error: error.message });
  }
});

/**
 * POST /api/estimate/facebook-pages
 * Estimer le coût d'une extraction Facebook Pages
 */
router.post('/facebook-pages', protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { pageCount, postsPerPage, includeComments, commentsPerPost } = req.body;

    if (!pageCount || pageCount < 1) {
      return res.status(400).json({ message: 'pageCount requis et doit être >= 1' });
    }

    const estimation = await costEstimationService.estimateFacebookPages(userId, {
      pageCount,
      postsPerPage: postsPerPage || 50,
      includeComments: includeComments || false,
      commentsPerPost: commentsPerPost || 0,
    });
    res.json(estimation);
  } catch (error: any) {
    logger.error('[ESTIMATE] Error estimating facebook pages cost:', error);
    res.status(500).json({ message: 'Erreur lors de l\'estimation', error: error.message });
  }
});

/**
 * POST /api/estimate/benchmark
 * Estimer le coût d'un Benchmark
 */
router.post('/benchmark', protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { myPageUrl, competitorCount, postsLimit, includeAiAnalysis } = req.body;

    if (!competitorCount || competitorCount < 1) {
      return res.status(400).json({ message: 'competitorCount requis et doit être >= 1' });
    }

    const modelId = req.body.modelId || await getUserModelId(userId);

    const estimation = await costEstimationService.estimateBenchmark(userId, {
      myPageUrl: myPageUrl || undefined,
      competitorCount,
      postsLimit: postsLimit || 20,
      includeAiAnalysis: includeAiAnalysis !== false,
      modelId,
    });
    res.json(estimation);
  } catch (error: any) {
    logger.error('[ESTIMATE] Error estimating benchmark cost:', error);
    res.status(500).json({ message: 'Erreur lors de l\'estimation', error: error.message });
  }
});

/**
 * POST /api/estimate/ai-analysis
 * Estimer le coût d'une Analyse IA
 */
router.post('/ai-analysis', protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { pageCount, postsPerPage } = req.body;

    if (!pageCount || pageCount < 1) {
      return res.status(400).json({ message: 'pageCount requis et doit être >= 1' });
    }

    const modelId = req.body.modelId || await getUserModelId(userId);

    const estimation = await costEstimationService.estimateAiAnalysis(userId, {
      pageCount,
      postsPerPage: postsPerPage || 20,
      modelId,
    });
    res.json(estimation);
  } catch (error: any) {
    logger.error('[ESTIMATE] Error estimating AI analysis cost:', error);
    res.status(500).json({ message: 'Erreur lors de l\'estimation', error: error.message });
  }
});

/**
 * POST /api/estimate/simple
 * Estimation simple pour compatibilité avec l'ancien système
 */
router.post('/simple', protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { serviceType, itemCount } = req.body;

    if (!serviceType || !itemCount) {
      return res.status(400).json({ message: 'serviceType et itemCount requis' });
    }

    const validTypes = ['marketplace', 'facebook_pages', 'facebook_posts'];
    if (!validTypes.includes(serviceType)) {
      return res.status(400).json({ message: `serviceType invalide. Types valides: ${validTypes.join(', ')}` });
    }

    const estimation = await costEstimationService.estimateSimple(userId, serviceType, itemCount);
    res.json(estimation);
  } catch (error: any) {
    logger.error('[ESTIMATE] Error estimating simple cost:', error);
    res.status(500).json({ message: 'Erreur lors de l\'estimation', error: error.message });
  }
});

export default router;
