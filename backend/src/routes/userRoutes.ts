import { Router, Request, Response } from 'express';
import { getDashboardData, getPaymentHistory, getDownloadHistory, changePassword, updateProfile } from '../controllers/userController';
import { protect, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { creditService } from '../services/creditService';
import { logger } from '../utils/logger';
import { getModelsForAPI, isValidModelId, getDefaultAIModel } from '../config/aiModels';
import { validate, preferredModelSchema } from '../middlewares/validation';
import db from '../database';

const router = Router();

// Toutes les routes ci-dessous sont protégées et nécessitent une authentification
router.use(protect);

// Route pour les données du tableau de bord
router.get('/dashboard', getDashboardData);

// Route pour l'historique des paiements
router.get('/payments', getPaymentHistory);

// Route pour l'historique des téléchargements
router.get('/downloads', getDownloadHistory);

// Route pour changer le mot de passe
router.post('/change-password', changePassword);

// Route pour mettre à jour le profil
router.put('/profile', updateProfile);

// Route pour le solde de crédits
router.get('/credits/balance', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const balance = await creditService.getUserCreditBalance(userId);
    res.status(200).json(balance);
  } catch (error) {
    logger.error('Error fetching credit balance:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du solde.' });
  }
});

// Route pour l'historique des crédits
router.get('/credits/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const history = await creditService.getCreditHistory(userId, limit, offset);
    res.status(200).json(history);
  } catch (error) {
    logger.error('Error fetching credit history:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique.' });
  }
});

// Route pour la liste des modèles IA disponibles
router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = getModelsForAPI();
    res.json({ models });
  } catch (error) {
    logger.error('Error fetching AI models:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer le modèle IA préféré
router.get('/preferred-model', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const user = await db('users').where({ id: userId }).select('preferred_ai_model').first();
    const modelId = user?.preferred_ai_model || getDefaultAIModel().id;

    res.json({ modelId });
  } catch (error) {
    logger.error('Error fetching preferred model:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour modifier le modèle IA préféré
router.put('/preferred-model', validate(preferredModelSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const { modelId } = req.body;

    if (!isValidModelId(modelId)) {
      return res.status(400).json({ message: 'Modèle IA invalide' });
    }

    await db('users').where({ id: userId }).update({ preferred_ai_model: modelId });

    res.json({ success: true, modelId });
  } catch (error) {
    logger.error('Error updating preferred model:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
