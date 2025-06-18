import { Router } from 'express';
import { exportController } from '../controllers/exportController';
import { query, param } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';

const router = Router();



/**
 * @route   GET /api/export
 * @desc    Export data as Excel/CSV file
 * @access  Public (but requires paid session)
 */
router.get(
  '/',
  [
    query('sessionId').isString().withMessage('Session ID is required'),
    query('format').optional().isIn(['excel', 'csv']).withMessage('Format must be excel or csv'),
  ],
  validate,
  exportController.exportData.bind(exportController)
);

/**
 * @route   GET /api/export/backup/:sessionId
 * @desc    Get backup data for a session
 * @access  Public
 */
router.get(
  '/backup/:sessionId',
  [
    param('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  exportController.getBackupData.bind(exportController)
);

export { router as exportRoutes };
