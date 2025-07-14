import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import db from '../database';
import { auditService } from '../services/auditService';
import bcrypt from 'bcryptjs';

// Étendre l'interface Request pour inclure la propriété user complète
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Récupère l'historique des paiements pour l'utilisateur authentifié.
 */
export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié.' });
    }

    const purchases = await auditService.getUserPurchases(userId);
    res.status(200).json(purchases);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    logger.error(`Error in getPaymentHistory for user ${req.user?.id}: ${errorMessage}`, { 
      userId: req.user?.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique des paiements.", error: errorMessage });
  }
};

/**
 * Récupère l'historique des téléchargements pour l'utilisateur authentifié.
 */
export const getDownloadHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié.' });
    }

        const downloads = await db('downloads').where({ user_id: userId }).orderBy('downloaded_at', 'desc');
    res.status(200).json(downloads);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    logger.error(`Error in getDownloadHistory for user ${req.user?.id}: ${errorMessage}`, { 
      userId: req.user?.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
    res.status(500).json({ message: `Erreur lors de la récupération de l'historique des téléchargements.` });
  }
};

/**
 * Récupère les données du tableau de bord pour l'utilisateur authentifié.
 */
export const getDashboardData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié.' });
    }

    const user = await db('users').where({ id: userId }).select('id', 'name', 'email', 'created_at').first();
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Récupérer les sessions de scraping de l'utilisateur
    const scrapingSessions = await db('scraping_sessions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    const [totalDownloadsResult, purchases, downloads] = await Promise.all([
      db('downloads').where({ user_id: userId }).count('id as count').first(),
      auditService.getUserPurchases(userId),
      db('downloads').where({ user_id: userId }).select('*').orderBy('downloaded_at', 'desc')
    ]);

    res.status(200).json({
      user,
      stats: {
        totalScrapes: scrapingSessions.length,
        totalDownloads: Number(totalDownloadsResult?.count || 0),
      },
      sessions: scrapingSessions, // Envoyer les sessions complètes au frontend
      payments: purchases, // Renamed to 'payments' for frontend compatibility
      downloads
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    logger.error(`Error in getDashboardData for user ${req.user?.id}: ${errorMessage}`, { 
      userId: req.user?.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
    res.status(500).json({ message: `Erreur lors de la récupération des données du tableau de bord.` });
  }
};

/**
 * Change le mot de passe de l'utilisateur authentifié.
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Veuillez fournir le mot de passe actuel et le nouveau mot de passe.' });
  }

  try {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db('users').where({ id: userId }).update({ password: hashedPassword });

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    logger.error(`Error in changePassword for user ${userId}: ${errorMessage}`);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.', error: errorMessage });
  }
};
