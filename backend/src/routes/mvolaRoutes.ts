import { Router } from 'express';
import { initiateMvolaPayment } from '../controllers/mvolaController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/mvola/initiate-payment:
 *   post:
 *     tags:
 *       - MVola
 *     summary: Initiate a new MVola payment
 *     description: Authenticates with MVola, initiates a transaction, and waits for its completion.
 *     responses:
 *       200:
 *         description: Payment successful.
 *       400:
 *         description: Payment failed or error during initiation.
 *       500:
 *         description: Internal server error or authentication failure.
 */
router.post('/initiate-payment', protect, initiateMvolaPayment);

export default router;
