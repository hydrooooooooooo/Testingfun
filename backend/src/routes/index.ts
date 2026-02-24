import { Router } from 'express';

// Importations par défaut
import authRoutes from './authRoutes';
import mvolaRoutes from './mvolaRoutes';
import userRoutes from './userRoutes';
import adminRoutes from './adminRoutes';
import trialRoutes from './trialRoutes';
import commentRoutes from './commentRoutes';
import mentionRoutes from './mentionRoutes';
import estimateRoutes from './estimateRoutes';
import benchmarkRoutes from './benchmarkRoutes';
import automationRoutes from './automationRoutes';
import favoriteRoutes from './favoriteRoutes';
import newsletterRoutes from './newsletterRoutes';
import logsRoutes from './logsRoutes';

// Importations nommées
import { exportRoutes } from './exportRoutes';
import { packRoutes } from './packRoutes';
import { paymentRoutes } from './paymentRoutes';
import { previewRoutes } from './previewRoutes';
import { scrapeRoutes } from './scrapeRoutes';
import { sessionRoutes } from './sessionRoutes';
import { scrapedItemsRoutes } from './scrapedItemsRoutes';

const router = Router();

// Enregistrement de toutes les routes de l'application
router.use('/auth', authRoutes);
router.use('/export', exportRoutes);
router.use('/mvola', mvolaRoutes);
router.use('/packs', packRoutes);
router.use('/payment', paymentRoutes);
router.use('/preview', previewRoutes);
router.use('/scrape', scrapeRoutes);
router.use('/sessions', sessionRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);
router.use('/trial', trialRoutes);
router.use('/comments', commentRoutes);
router.use('/mentions', mentionRoutes);
router.use('/estimate', estimateRoutes);
router.use('/benchmark', benchmarkRoutes);
router.use('/automations', automationRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/scraped-items', scrapedItemsRoutes);
router.use('/logs', logsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

export { router as routes };
