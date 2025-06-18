import { Router } from 'express';
import { scrapeRoutes } from './scrapeRoutes';
import { paymentRoutes } from './paymentRoutes';
import { exportRoutes } from './exportRoutes';
import { adminRoutes } from './adminRoutes';
import { previewRoutes } from './previewRoutes';
import { logger } from '../utils/logger';

const router = Router();

// Register all routes
router.use('/scrape', scrapeRoutes);
router.use('/payment', paymentRoutes);

// Routes d'export avec log spécifique pour débogage
router.use('/export', (req, res, next) => {
  logger.info(`Export request received: ${req.method} ${req.url} from ${req.ip}`);
  logger.info(`Headers: ${JSON.stringify(req.headers)}`);
  next();
}, exportRoutes);

router.use('/admin', adminRoutes);

// Routes de prévisualisation avec log spécifique pour débogage
router.use('/preview', (req, res, next) => {
  logger.info(`Preview request received: ${req.method} ${req.url} from ${req.ip}`);
  next();
}, previewRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export { router as routes };
