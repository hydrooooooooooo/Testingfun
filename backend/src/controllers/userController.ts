import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import db from '../database';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import bcrypt from 'bcryptjs';

// Taux de conversion EUR -> MGA pour l'affichage unifié
const EUR_TO_MGA = Number(process.env.EUR_TO_MGA) || 5000;

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

    // Récupérer paiements Stripe + MVola et harmoniser le format
    const stripeRows = await db('payments')
      .where({ user_id: userId })
      .select('*');

    const mvolaRows = await db('mvola_payments')
      .where({ user_id: userId })
      .select(
        'id',
        'user_id',
        'amount',
        db.raw("'MGA' as currency"),
        'status',
        db.raw('client_transaction_id as stripe_payment_id'),
        db.raw("COALESCE(created_at, datetime('now')) as created_at"),
        db.raw("'Paiement MVola' as description"),
        db.raw('0 as credits_purchased')
      );

    const purchases = [...stripeRows.map((p: any) => {
        const amountEur = Number(p.amount);
        const amountMGA = isFinite(amountEur) ? Math.round(amountEur * EUR_TO_MGA) : 0;
        return {
          id: p.id,
          user_id: p.user_id,
          amount: amountMGA,
          currency: 'MGA',
          status: p.status,
          stripe_payment_id: p.stripePaymentIntentId || p.stripe_payment_intent_id || p.stripe_payment_id || p.stripeCheckoutId || null,
          created_at: p.created_at || new Date().toISOString(),
          description: 'Paiement Stripe',
          credits_purchased: p.creditsPurchased || 0,
        };
      }), ...mvolaRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      .select(
        'id',
        'packId',
        'status',
        'created_at',
        'totalItems',
        'isPaid',
        'downloadToken',
        'url'
      )
      .orderBy('created_at', 'desc');

    // Paiements (Stripe + MVola)
    const stripeRows = await db('payments')
      .where({ user_id: userId })
      .select('*');

    const mvolaRows = await db('mvola_payments')
      .where({ user_id: userId })
      .select(
        'id',
        'user_id',
        'amount',
        'currency',
        'status',
        db.raw('client_transaction_id as stripe_payment_id'),
        db.raw("COALESCE(created_at, datetime('now')) as created_at"),
        db.raw("'Paiement MVola' as description"),
        db.raw('0 as credits_purchased')
      );

    const purchases: any[] = [...stripeRows.map((p: any) => {
        const amountEur = Number(p.amount);
        const amountMGA = isFinite(amountEur) ? Math.round(amountEur * EUR_TO_MGA) : 0;
        return {
          id: p.id,
          user_id: p.user_id,
          amount: amountMGA,
          currency: 'MGA',
          status: p.status,
          stripe_payment_id: p.stripePaymentIntentId || p.stripe_payment_intent_id || p.stripe_payment_id || p.stripeCheckoutId || null,
          created_at: p.created_at || new Date().toISOString(),
          description: 'Paiement Stripe',
          credits_purchased: p.creditsPurchased || 0,
        };
      }), ...mvolaRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const [totalDownloadsResult, downloads] = await Promise.all([
      db('downloads').where({ user_id: userId }).count('id as count').first(),
      // 
      db('scraping_sessions')
        .where({ user_id: userId, isPaid: true, status: 'completed' })
        .select('*')
        .orderBy('created_at', 'desc')
    ]);

    const totalScrapes = scrapingSessions.reduce((acc, session) => acc + (session.totalItems || 0), 0);

    res.status(200).json({
      user,
      stats: {
        totalScrapes,
        totalDownloads: Number(totalDownloadsResult?.count || 0),
      },
      sessions: scrapingSessions, // Envoyer les sessions complètes au frontend
      payments: purchases,
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
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone_number } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  try {
    // Si l'e-mail est fourni, vérifiez s'il est déjà utilisé par un autre utilisateur
    if (email) {
      const existingUser = await db('users')
        .where('email', email)
        .whereNot('id', userId)
        .first();
      if (existingUser) {
        return res.status(400).json({ message: 'Cet e-mail est déjà utilisé.' });
      }
    }

    const updateData: { [key: string]: any } = {
      updated_at: new Date(),
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone_number) updateData.phone_number = phone_number;

    await db('users')
      .where({ id: userId })
      .update(updateData);

    const updatedUser = await db('users').where({ id: userId }).first();
    if (!updatedUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé après la mise à jour.' });
    }

    if (!config.api.jwtSecret) {
        throw new Error('JWT_SECRET is not defined in the environment variables.');
    }
    const token = jwt.sign(
        { userId: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, phone_number: updatedUser.phone_number },
        config.api.jwtSecret,
        { expiresIn: '7d' }
    );

    res.status(200).json({ 
        message: 'Profil mis à jour avec succès.',
        token: token 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    logger.error(`Error in updateProfile for user ${userId}: ${errorMessage}`);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil.', error: errorMessage });
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

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db('users').where({ id: userId }).update({ password_hash: hashedPassword });

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    logger.error(`Error in changePassword for user ${userId}: ${errorMessage}`);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.', error: errorMessage });
  }
};
