import { Router } from 'express';
import { previewController } from '../controllers/previewController';
import { query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();

// Pas besoin de définir un schéma séparé, nous utilisons express-validator

/**
 * @route GET /api/preview
 * @desc Récupère les éléments de prévisualisation pour une session
 * @access Public (avec vérification de paiement)
 */
router.get(
  '/',
  [
    query('sessionId').isString().withMessage('Session ID is required')
  ],
  validate,
  previewController.getPreviewItems.bind(previewController)
);

export { router as previewRoutes };
