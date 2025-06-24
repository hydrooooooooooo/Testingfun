import { Router, Request, Response, NextFunction } from 'express';
import { paymentController } from '../controllers/paymentController';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';
import express from 'express';
import cors from 'cors';
import { sessionService } from '../services/sessionService';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const router = Router();

/**
 * @route   POST /api/create-payment
 * @desc    Create a Stripe checkout session
 * @access  Public
 */
router.post(
  '/create-payment',
  [
    body('packId').isString().withMessage('Pack ID is required'),
    body('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  paymentController.createPayment.bind(paymentController)
);

/**
 * @route   POST /api/payment/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Raw body for webhook signature verification
  paymentController.handleWebhook.bind(paymentController)
);

/**
 * @route   GET /api/verify-payment
 * @desc    Verify payment status
 * @access  Public
 */
router.get(
  '/verify-payment',
  // Utiliser cors() directement comme middleware pour cette route spécifique
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }),
  [
    query('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  paymentController.verifyPayment.bind(paymentController)
);

/**
 * @route   POST /api/force-payment
 * @desc    Force payment status for development/testing
 * @access  Public (development only)
 */
router.post(
  '/force-payment',
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }),
  [
    body('sessionId').isString().withMessage('Session ID is required'),
    body('packId').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Seulement en développement
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Force payment only available in development' });
      }
      
      const { sessionId, packId = 'pack-pro' } = req.body;
      
      logger.info(`🔧 FORCE PAYMENT demandé pour session: ${sessionId}`);
      
      // Vérifier que la session existe
      const existingSession = sessionService.getSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: `Session ${sessionId} not found` });
      }
      
      // Forcer la mise à jour de la session
      const downloadUrl = `${config.server.frontendUrl}/download?session_id=${sessionId}&pack_id=${packId}&autoDownload=true&format=excel`;
      const downloadToken = Buffer.from(`${sessionId}:${Date.now()}:paid`).toString('base64');
      
      const updatedSession = sessionService.updateSession(sessionId, {
        isPaid: true,
        packId,
        paymentIntentId: `force_${Date.now()}`,
        paymentCompletedAt: new Date().toISOString(),
        paymentStatus: 'succeeded',
        downloadUrl,
        downloadToken
      });
      
      logger.info(`✅ Session ${sessionId} forcée comme payée`);
      logger.info(`📥 Download URL: ${downloadUrl}`);
      logger.info(`🔑 Download Token: ${downloadToken}`);
      
      res.status(200).json({
        success: true,
        message: `Session ${sessionId} marked as paid`,
        session: updatedSession
      });
      
    } catch (error) {
      logger.error('Error in force payment:', error);
      next(error);
    }
  }
);

export { router as paymentRoutes };