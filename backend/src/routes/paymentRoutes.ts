import { Router, Request, Response, NextFunction } from 'express';
import { paymentController } from '../controllers/paymentController';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';
import express from 'express';
import cors from 'cors';
import { sessionService } from '../services/sessionService';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { protect } from '../middlewares/authMiddleware';
import db from '../database';
// import { PLANS } from '../config/plans'; // No longer used; packs come from DB

const router = Router();

/**
 * @route   POST /api/create-payment
 * @desc    Create a Stripe checkout session
 * @access  Public
 */
router.post(
  '/create-payment',
  protect, // Require auth so req.user.id is set in controller
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
  protect, // Protéger la route
  [
    body('sessionId').isString().withMessage('Session ID is required'),
    body('packId').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'This endpoint is for development only.' });
      }

      const { sessionId, packId = 'pack-pro' } = req.body;
      // @ts-ignore
      const userId = req.user.id as number;

      logger.info(`🔧 FORCE PAYMENT: User ${userId} is forcing payment for session ${sessionId}`);

      const downloadToken = nanoid(32);
      const downloadUrl = `${config.server.frontendUrl}/download?session_id=${sessionId}&pack_id=${packId}&autoDownload=true&format=excel&token=${downloadToken}`;

      const updatedSession = await sessionService.updateSession(sessionId, {
        user_id: userId,
        isPaid: true,
        packId,
        downloadToken,
        downloadUrl,
        payment_intent_id: `force_${Date.now()}`,
      });

      if (!updatedSession) {
        return res.status(404).json({ error: `Session ${sessionId} not found.` });
      }

      logger.info(`✅ Session ${sessionId} marked as paid.`);
      logger.info(`🔑 Download Token: ${downloadToken}`);

      res.status(200).json({
        message: 'Payment forced successfully',
        session: updatedSession,
      });

    } catch (error) {
      logger.error('Error in force-payment route:', error);
      next(error);
    }
  }
);

export { router as paymentRoutes };