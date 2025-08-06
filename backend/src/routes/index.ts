import { Router } from 'express';
import { scrapeRoutes } from './scrapeRoutes';
import { paymentRoutes } from './paymentRoutes';
import { exportRoutes } from './exportRoutes';

import { previewRoutes } from './previewRoutes';
import { sessionRoutes } from './sessionRoutes';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import { logger } from '../utils/logger';
import { paymentController } from '../controllers/paymentController';
import cors from 'cors';
import { errorHandler, securityHeaders, corsForStripeWebhook, requestLogger, protect, restrictTo } from '../middlewares';

const router = Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/scrape', scrapeRoutes);
router.use('/payment', paymentRoutes);
router.use('/user', userRoutes);
router.use('/sessions', sessionRoutes);

// Routes d'export avec CORS spécifique et log pour débogage
router.use('/export', 
  // Configuration CORS spécifique pour les routes d'export
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }),
  (req, res, next) => {
    // Ajouter des en-têtes CORS spécifiques pour cette route
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    
    // Si c'est une requête OPTIONS, répondre immédiatement avec 200
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    logger.info(`Export request received: ${req.method} ${req.url} from ${req.ip}`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    next();
  }, 
  exportRoutes
);



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
