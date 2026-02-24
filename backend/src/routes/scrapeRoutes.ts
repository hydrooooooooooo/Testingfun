import { Router } from 'express';
import { scrapeController } from '../controllers/scrapeController';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';
import { protect } from '../middlewares/authMiddleware';
import { facebookPagesRoutes } from './facebookPagesRoutes';

const router = Router();



/**
 * @route   POST /api/scrape
 * @desc    Start a new scraping job
 * @access  Protected
 */
router.post(
  '/',
  protect,
  [
    body('url').isURL().withMessage('URL invalide'),
    body('sessionId').optional().isString().withMessage('Session ID must be a string'),
  ],
  validate,
  scrapeController.startScrape.bind(scrapeController)
);

/**
 * @route   GET /api/scrape-result
 * @desc    Get scraping job results
 * @access  Protected
 */
router.get(
  '/result',
  protect,
  [
    query('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  scrapeController.getScrapeResult.bind(scrapeController)
);

/**
 * @route   POST /api/scrape/webhook
 * @desc    Handle Apify webhook events
 * @access  Public (called by Apify)
 */
router.post(
  '/webhook',
  scrapeController.handleApifyWebhook.bind(scrapeController)
);

// Mount Facebook Pages sub-routes
router.use('/facebook-pages', facebookPagesRoutes);

export { router as scrapeRoutes };
