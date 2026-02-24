import { Request, Response, NextFunction } from 'express';
import { sessionService, Session } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';

export class PreviewController {
  /**
   * Récupère les éléments de prévisualisation pour une session donnée
   * Cette route est utilisée après le paiement pour afficher les données de prévisualisation
   */
  async getPreviewItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId || typeof sessionId !== 'string') {
        throw new ApiError(400, 'Session ID is required');
      }
      
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }
      
      // Vérifier si la session est payée ou temporaire (pour les tests)
      const isTemporarySession = sessionId.startsWith('temp_');
      const isPaid = session.isPaid || isTemporarySession;
      
      if (!isPaid) {
        throw new ApiError(403, 'Payment required to access preview items');
      }
      
      // Récupérer les éléments de prévisualisation
      const previewItems = session.previewItems || [];
      const totalItems = session.totalItems || 0;
      
      logger.info(`Envoi de ${previewItems.length} éléments de prévisualisation pour la session ${sessionId}`);
      
      res.status(200).json({
        success: true,
        previewItems,
        stats: {
          nbItems: previewItems.length,
          totalItems: session.totalItems,
        },
        packId: session.packId || 'pack-starter'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const previewController = new PreviewController();
