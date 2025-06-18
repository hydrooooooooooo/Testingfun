import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validationMiddleware';
import express from 'express';

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
 * @route   POST /api/stripe/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post(
  '/stripe/webhook',
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
  [
    query('sessionId').isString().withMessage('Session ID is required'),
  ],
  validate,
  paymentController.verifyPayment.bind(paymentController)
);

export { router as paymentRoutes };
