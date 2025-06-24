// backend/src/controllers/paymentController.ts
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
      // Ajouter des en-têtes CORS spécifiques pour cette route
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      
      // Si c'est une requête OPTIONS, répondre immédiatement avec 200
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      // CORRECTION : Accepter les deux formats de paramètres (sessionId et session_id) pour plus de compatibilité
      const sessionIdParam = req.query.sessionId || req.query.session_id;
      
      // Log détaillé des paramètres reçus
      logger.info(`Paramètres de vérification reçus: ${JSON.stringify(req.query)}`);
      
      if (!sessionIdParam || typeof sessionIdParam !== 'string') {
        throw new ApiError(400, 'Session ID is required');
      }
      
      // Utiliser une variable constante pour le reste du code
      const sessionId = sessionIdParam;
      
      logger.info(`Vérification du paiement pour la session: ${sessionId}`);
      
      // Récupérer la session
      const session = sessionService.getSession(sessionId);
      
      if (!session) {
        logger.warn(`Session with ID ${sessionId} not found during payment verification`);
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }
      
      // Vérifier si c'est une session temporaire
      const isTemporarySession = sessionId.startsWith('temp_');
      
      // Si la session a un downloadUrl, c'est qu'elle a été marquée comme payée par le webhook
      const hasPaidDownloadUrl = session.downloadUrl && session.downloadUrl.includes('autoDownload=true');
      
      // Considérer la session comme payée si isPaid est true OU si c'est une session temporaire OU si elle a une URL de téléchargement
      const isPaid = session.isPaid || isTemporarySession || hasPaidDownloadUrl;
      
      // Si la session a un downloadUrl mais n'est pas marquée comme payée, la mettre à jour
      if (hasPaidDownloadUrl && !session.isPaid) {
        logger.info(`Session ${sessionId} a une URL de téléchargement mais n'est pas marquée comme payée. Mise à jour...`);
        sessionService.updateSession(sessionId, { isPaid: true });
      }
      
      // Renvoyer le statut de paiement et les informations de la session
      const response = {
        isPaid,
        packId: session.packId || 'pack-decouverte',
        datasetId: session.datasetId || null,
        createdAt: session.createdAt || new Date(),
        downloadUrl: session.downloadUrl || null,
        downloadToken: session.downloadToken || null
      };
      
      // Si la session est payée mais n'a pas de token de téléchargement, en générer un
      if (isPaid && !session.downloadToken) {
        const downloadToken = Buffer.from(`${sessionId}:${new Date().getTime()}:paid`).toString('base64');
        sessionService.updateSession(sessionId, { downloadToken });
        response.downloadToken = downloadToken;
        logger.info(`Génération d'un nouveau token de téléchargement pour la session ${sessionId}: ${downloadToken}`);
      }
      
      logger.info(`Réponse de vérification pour ${sessionId}: ${JSON.stringify(response)}`);
      res.status(200).json(response);
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

      // CORRECTION : URLs cohérentes avec sessionId et packId (pas session_id et pack_id)
      const stripeSession = await stripeService.createCheckoutSession({
        packId,
        packName: pack.name,
        amount: pack.price,
        successUrl: `${config.server.frontendUrl}/download?sessionId=${sessionId}&packId=${packId}&autoDownload=true&format=excel`,
        cancelUrl: `${config.server.frontendUrl}/payment?sessionId=${sessionId}&packId=${packId}&status=cancelled`,
        metadata: {
          sessionId: sessionId,
          packId: packId
        },
        clientReferenceId: sessionId // Ajouter le sessionId comme client_reference_id pour une meilleure traçabilité
      });

      // Return the session ID and URL
      res.status(200).json({
        sessionId: stripeSession.id,
        url: stripeSession.url
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
      
      // Pour les webhooks Stripe, le corps de la requête doit être brut (Buffer ou string)
      // Vérifions si req.body est déjà un Buffer ou une chaîne
      let payload = req.body;
      
      if (Buffer.isBuffer(payload)) {
        // Si c'est un Buffer, c'est parfait
        logger.info('Payload reçu comme Buffer, format correct');
      } else if (typeof payload === 'string') {
        // Si c'est une chaîne, c'est aussi bon
        logger.info('Payload reçu comme string, format correct');
      } else if (typeof payload === 'object') {
        // Si c'est un objet, il a déjà été parsé par express.json()
        logger.warn('Payload reçu comme objet JSON parsé, conversion en string');
        payload = JSON.stringify(payload);
      }
      
      // Verify the event with the signature and secret
      const event = stripeService.constructEvent(
        payload,
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
      } catch (metaError) {
        logger.warn('Erreur lors de la lecture des métadonnées:', metaError);
      }
      
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.succeeded':
          logger.info(`Charge succeeded: ${(event.data.object as Stripe.Charge).id}`);
          break;
        case 'charge.failed':
          logger.warn(`Charge failed: ${(event.data.object as Stripe.Charge).id}`);
          break;
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }
      
      // Respond to Stripe that we received the event
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook:', error);
      next(error);
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(checkoutSession: Stripe.Checkout.Session) {
    const sessionId = checkoutSession.metadata?.sessionId || checkoutSession.client_reference_id;
    const packId = checkoutSession.metadata?.packId;
    
    logger.info(`Traitement de checkout.session.completed pour la session: ${sessionId}, pack: ${packId}`);
    
    if (!sessionId) {
      logger.warn(`No session ID found in checkout session metadata: ${checkoutSession.id}`);
      return;
    }
    
    try {
      // Update session with payment success
      sessionService.updateSession(sessionId, {
        isPaid: true,
        paymentIntentId: checkoutSession.id,
        paymentCompletedAt: new Date().toISOString(),
        paymentStatus: 'succeeded'
      });
      
      // CORRECTION : Générer l'URL avec des paramètres cohérents (sessionId et packId)
      const downloadUrl = `${config.server.frontendUrl}/download?sessionId=${sessionId}&packId=${packId}&autoDownload=true`;
      
      // Mettre à jour la session avec l'URL de téléchargement
      sessionService.updateSession(sessionId, {
        downloadUrl,
        downloadToken: Buffer.from(`${sessionId}:${Date.now()}:paid`).toString('base64')
      });
      
      logger.info(`Génération de l'URL de téléchargement automatique: ${downloadUrl}`);
      logger.info(`Session ${sessionId} marked as paid for pack ${packId}`);
      logger.info(`Téléchargement automatique configuré pour la session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to update session ${sessionId} for completed checkout: ${error}`);
    }
  }

  /**
   * Handle payment_intent.succeeded event
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const metadata = paymentIntent.metadata || {};
    let sessionId = metadata.sessionId;
    
    // Si pas de sessionId dans les métadonnées, essayer de l'extraire de la description
    if (!sessionId && paymentIntent.description) {
      const match = paymentIntent.description.match(/session[_\s]*id[:\s]*([a-zA-Z0-9_\-]+)/i);
      if (match && match[1]) {
        sessionId = match[1];
        logger.info(`Session ID trouvé dans la description du payment intent: ${sessionId}`);
      }
    }
    
    if (!sessionId) {
      logger.warn(`Aucun session ID trouvé dans les métadonnées du payment intent: ${paymentIntent.id}`);
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
}

export const paymentController = new PaymentController();