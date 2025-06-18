import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripeService';
import { sessionService } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { PLANS } from '../config/plans';
import { config } from '../config/config';

export class PaymentController {
  /**
   * Vérifier le statut de paiement d'une session
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId || typeof sessionId !== 'string') {
        throw new ApiError(400, 'Session ID is required');
      }
      
      // Récupérer la session
      const session = sessionService.getSession(sessionId);
      
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }
      
      // Vérifier si c'est une session temporaire
      const isTemporarySession = sessionId.startsWith('temp_');
      
      // Renvoyer le statut de paiement et les informations de la session
      res.status(200).json({
        isPaid: session.isPaid || isTemporarySession,
        packId: session.packId || 'pack-decouverte',
        datasetId: session.datasetId || null,
        createdAt: session.createdAt || new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a Stripe checkout session
   */
  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { packId, sessionId } = req.body;

      // Validate inputs
      if (!packId || !sessionId) {
        throw new ApiError(400, 'Pack ID and Session ID are required');
      }

      // Check if pack exists
      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        throw new ApiError(404, `Pack with ID ${packId} not found`);
      }

      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }

      // Create Stripe checkout session
      const checkoutUrl = await stripeService.createCheckoutSession(packId, sessionId);

      res.status(200).json({
        status: 'success',
        data: {
          checkoutUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        throw new ApiError(400, 'Stripe signature is missing');
      }

      // Verify webhook signature
      const event = stripeService.constructEvent(
        req.body,
        signature
      );

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          
          // Extract session ID and pack ID from metadata or client_reference_id
          const sessionId = session.metadata?.sessionId || session.client_reference_id;
          const packId = session.metadata?.packId || session.metadata?.pack_id || session.client_reference_id?.split('_').pop() || 'pack-decouverte';
          
          if (sessionId) {
            // Récupérer la session de scraping
            const scrapingSession = sessionService.getSession(sessionId);
            
            if (scrapingSession) {
              // Récupérer le datasetId de la session
              const datasetId = scrapingSession.datasetId;
              
              // Mark session as paid
              try {
                sessionService.updateSession(sessionId, {
                  isPaid: true,
                  packId,
                  paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : 'fixed_payment_link'
                });
                logger.info(`Session ${sessionId} marked as paid for pack ${packId}`);
              } catch (error) {
                logger.warn(`Session ${sessionId} not found when processing payment: ${error}`);
              }
            } else {
              logger.warn(`Session ${sessionId} not found when processing payment webhook`);
            }
          } else {
            logger.warn('No session ID found in webhook metadata or client_reference_id');
          }
          break;
        }
        // Add more event types as needed
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error handling webhook:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // La méthode verifyPayment a été déplacée en haut de la classe
}

export const paymentController = new PaymentController();
