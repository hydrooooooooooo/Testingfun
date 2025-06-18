import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripeService';
import { sessionService, Session } from '../services/sessionService';
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
      // Get the signature from the header
      const signature = req.headers['stripe-signature'];
      
      // Log l'URL de la requête pour le débogage
      logger.info(`Webhook Stripe reçu sur: ${req.originalUrl}`);
      logger.info(`Méthode: ${req.method}, IP: ${req.ip}`);
      
      if (!signature) {
        logger.warn('Aucune signature Stripe trouvée dans la requête');
        throw new ApiError(400, 'Stripe signature is missing');
      }
      
      // Verify the event with the signature and secret
      const event = stripeService.constructEvent(
        req.body,
        signature as string
      );
      
      logger.info(`Processing Stripe webhook event: ${event.type} (ID: ${event.id})`);
      logger.info(`Webhook créé le: ${new Date(event.created * 1000).toISOString()}`);
      
      // Log des métadonnées de l'événement pour le débogage
      try {
        const metadata = (event.data.object as any).metadata;
        if (metadata) {
          logger.info(`Métadonnées de l'événement: ${JSON.stringify(metadata)}`);
        }
      } catch (error) {
        logger.warn('Impossible de lire les métadonnées de l\'event');
      }

      // Handle the event based on its type
      switch (event.type) {
        case 'checkout.session.completed': {
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
        }
        case 'payment_intent.succeeded': {
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        }
        case 'payment_intent.payment_failed': {
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        }
        case 'charge.succeeded': {
          logger.info(`Charge succeeded: ${(event.data.object as Stripe.Charge).id}`);
          break;
        }
        case 'charge.failed': {
          logger.warn(`Charge failed: ${(event.data.object as Stripe.Charge).id}`);
          break;
        }
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      // Always respond with 200 to acknowledge receipt of the webhook
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error handling webhook:', error);
      // Return a 400 error on a bad signature
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    // Extract session ID and pack ID from metadata or client_reference_id
    const sessionId = session.metadata?.sessionId || session.client_reference_id;
    const packId = session.metadata?.packId || session.metadata?.pack_id || session.client_reference_id?.split('_').pop() || 'pack-decouverte';
    
    if (!sessionId) {
      logger.warn('No session ID found in webhook metadata or client_reference_id');
      return;
    }
    
    // Récupérer la session de scraping
    const scrapingSession = sessionService.getSession(sessionId);
    
    if (!scrapingSession) {
      logger.warn(`Session ${sessionId} not found when processing payment webhook`);
      return;
    }
    
    // Récupérer le datasetId de la session
    const datasetId = scrapingSession.datasetId;
    
    // Mark session as paid
    try {
      // Générer l'URL de téléchargement automatique
      const downloadUrl = `${config.server.frontendUrl}/download?sessionId=${sessionId}&autoDownload=true`;
      logger.info(`Génération de l'URL de téléchargement automatique: ${downloadUrl}`);
      
      // Mettre à jour la session avec les informations de paiement
      const updatedSession = sessionService.updateSession(sessionId, {
        isPaid: true,
        packId,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : 'checkout_session_payment',
        paymentCompletedAt: new Date().toISOString(),
        paymentStatus: 'succeeded',
        // Ajouter l'URL de redirection pour le téléchargement automatique
        downloadUrl
      });
      
      logger.info(`Session ${sessionId} marked as paid for pack ${packId}`);
      logger.info(`Download URL set to: ${updatedSession?.downloadUrl || 'undefined'}`);
      logger.info(`Téléchargement automatique configuré pour la session ${sessionId}`);
      
      // Envoyer une notification au frontend pour déclencher le téléchargement automatique
      // Cette partie serait idéalement gérée par un système de websockets ou de notifications push
      
    } catch (error) {
      logger.warn(`Failed to update session ${sessionId} when processing payment: ${error}`);
    }
  }

  /**
   * Handle payment_intent.succeeded event
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const metadata = paymentIntent.metadata || {};
    const sessionId = metadata.sessionId;
    
    if (!sessionId) {
      logger.warn(`No session ID found in payment intent metadata: ${paymentIntent.id}`);
      return;
    }
    
    try {
      // Update session with payment success information
      sessionService.updateSession(sessionId, {
        isPaid: true,
        paymentIntentId: paymentIntent.id,
        paymentCompletedAt: new Date().toISOString(),
        paymentStatus: 'succeeded'
      });
      logger.info(`Payment succeeded for session ${sessionId}, payment intent: ${paymentIntent.id}`);
    } catch (error) {
      logger.warn(`Failed to update session ${sessionId} for successful payment: ${error}`);
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const metadata = paymentIntent.metadata || {};
    const sessionId = metadata.sessionId;
    
    if (!sessionId) {
      logger.warn(`No session ID found in failed payment intent metadata: ${paymentIntent.id}`);
      return;
    }
    
    try {
      // Update session with payment failure information
      sessionService.updateSession(sessionId, {
        isPaid: false,
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'failed',
        paymentError: paymentIntent.last_payment_error?.message || 'Payment failed'
      });
      logger.warn(`Payment failed for session ${sessionId}, payment intent: ${paymentIntent.id}`);
    } catch (error) {
      logger.warn(`Failed to update session ${sessionId} for failed payment: ${error}`);
    }
  }

  // La méthode verifyPayment a été déplacée en haut de la classe
}

export const paymentController = new PaymentController();
