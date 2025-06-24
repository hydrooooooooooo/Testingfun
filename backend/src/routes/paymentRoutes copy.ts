import { Router, Request, Response, NextFunction } from 'express';
import { paymentController } from '../controllers/paymentController';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';
import express from 'express';
import cors from 'cors';

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

export { router as paymentRoutes };
