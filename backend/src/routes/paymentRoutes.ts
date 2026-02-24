import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';
import express from 'express';
import cors from 'cors';
import { config } from '../config/config';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @route   POST /api/create-payment
 * @desc    Create a Stripe checkout session
 * @access  Protected
 */
router.post(
  '/create-payment',
  protect,
  [
    body('packId').isString().withMessage('Pack ID is required'),
    body('sessionId').isString().withMessage('Session ID is required'),
    body('currency').optional().isIn(['eur', 'mga']).withMessage('Currency must be eur or mga'),
  ],
  validate,
  paymentController.createPayment.bind(paymentController)
);

/**
 * @route   POST /api/payment/buy-pack
 * @desc    Buy a credit pack (creates session + Stripe checkout)
 * @access  Protected
 */
router.post(
  '/buy-pack',
  protect,
  [
    body('packId').isString().withMessage('Pack ID is required'),
    body('currency').optional().isIn(['eur', 'mga']).withMessage('Currency must be eur or mga'),
  ],
  validate,
  paymentController.buyPack.bind(paymentController)
);

/**
 * @route   POST /api/payment/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

/**
 * @route   GET /api/verify-payment
 * @desc    Verify payment status
 * @access  Protected
 */
router.get(
  '/verify-payment',
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'X-CSRF-Token'],
    optionsSuccessStatus: 204
  }),
  protect,
  [
    query('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  paymentController.verifyPayment.bind(paymentController)
);

export { router as paymentRoutes };