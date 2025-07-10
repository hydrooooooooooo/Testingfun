import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { param } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();



/**
 * @route   GET /api/admin/sessions
 * @desc    Get all sessions (for admin purposes)
 * @access  Private (requires API key)
 */
router.get(
  '/sessions',

  adminController.getAllSessions.bind(adminController)
);

/**
 * @route   GET /api/admin/sessions/:sessionId
 * @desc    Get session details by ID (for admin purposes)
 * @access  Private (requires API key)
 */
router.get(
  '/sessions/:sessionId',

  [
    param('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  adminController.getSessionById.bind(adminController)
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics (for admin purposes)
 * @access  Private (requires API key)
 */
router.get(
  '/stats',

  adminController.getDashboardStats.bind(adminController)
);

export { router as adminRoutes };
