import { Router } from 'express';

// Importations par défaut
import authRoutes from './authRoutes';
import mvolaRoutes from './mvolaRoutes';
import userRoutes from './userRoutes';

// Importations nommées
import { exportRoutes } from './exportRoutes';
import { packRoutes } from './packRoutes';
import { paymentRoutes } from './paymentRoutes';
import { previewRoutes } from './previewRoutes';
import { scrapeRoutes } from './scrapeRoutes';
import { sessionRoutes } from './sessionRoutes';

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

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

export { router as routes };
