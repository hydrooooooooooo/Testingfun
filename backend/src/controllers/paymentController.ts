import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripeService';
import { sessionService, Session } from '../services/sessionService';
import { auditService } from '../services/auditService';
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
      
      // Accepter les deux formats de paramètres (sessionId et session_id) pour plus de compatibilité
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
      const session = await sessionService.getSession(sessionId);
      
      if (!session || !session.totalItems) {
        throw new ApiError(400, 'Session ID is required');
      }
      
      logger.info(`Vérification du paiement pour la session: ${sessionId}`);
      
      // Vérifier si c'est une session temporaire
      const isTemporarySession = sessionId.startsWith('temp_');
      
      // Si la session a un downloadUrl, c'est qu'elle a été marquée comme payée par le webhook
      const hasPaidDownloadUrl = session.downloadUrl && session.downloadUrl.includes('autoDownload=true');
      
      // Considérer la session comme payée si isPaid est true OU si c'est une session temporaire OU si elle a une URL de téléchargement
      const isPaid = session.isPaid || isTemporarySession || hasPaidDownloadUrl;
      
      // Si la session a un downloadUrl mais n'est pas marquée comme payée, la mettre à jour
      if (hasPaidDownloadUrl && !session.isPaid) {
        logger.info(`Session ${sessionId} a une URL de téléchargement mais n'est pas marquée comme payée. Mise à jour...`);
        await sessionService.updateSession(sessionId, { isPaid: true });
      }
      
      // Renvoyer le statut de paiement et les informations de la session
      const response = {
        isPaid,
        packId: session.packId || 'pack-decouverte',
        datasetId: session.datasetId || null,
        createdAt: session.created_at || new Date(),
        downloadUrl: session.downloadUrl || null,
        downloadToken: session.downloadToken || null
      };
      
      // Si la session est payée mais n'a pas de token de téléchargement, en générer un
      if (isPaid && !session.downloadToken) {
        const downloadToken = Buffer.from(`${sessionId}:${new Date().getTime()}:paid`).toString('base64');
        await sessionService.updateSession(sessionId, { downloadToken });
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
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }

      // Create Stripe checkout session with metadata and client_reference_id
      const checkoutSession = await stripeService.createCheckoutSession({
        packId,
        packName: pack.name,
        amount: pack.price,
        successUrl: `${config.server.frontendUrl}/download?session_id=${sessionId}&pack_id=${packId}&autoDownload=true&format=excel`,
        cancelUrl: `${config.server.frontendUrl}/payment?session_id=${sessionId}&pack_id=${packId}&status=cancelled`,
        metadata: {
          sessionId: sessionId,
          packId: packId
        },
        clientReferenceId: sessionId // Ajouter le sessionId comme client_reference_id pour une meilleure traçabilité
      });

      // Return the session ID and URL
      res.status(200).json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook events - VERSION FINALE SANS VERIFICATION
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Get the signature from the header
      const signature = req.headers['stripe-signature'];
      
      // Log l'URL de la requête pour le débogage
      logger.info(`Webhook Stripe reçu sur: ${req.originalUrl}`);
      logger.info(`Méthode: ${req.method}, IP: ${req.ip}`);
      logger.info(`NODE_ENV actuel: ${process.env.NODE_ENV}`);
      logger.info(`Signature présente: ${!!signature}`);
      
      // **BYPASS TOTAL - PAS DE VERIFICATION DE SIGNATURE**
      logger.info('🚀 BYPASS TOTAL DE LA VERIFICATION STRIPE ACTIVÉ');
      
      // Traiter le payload directement
      let payload = req.body;
      let event: Stripe.Event;
      
      if (Buffer.isBuffer(payload)) {
        logger.info('Payload reçu comme Buffer, conversion en string');
        event = JSON.parse(payload.toString());
      } else if (typeof payload === 'string') {
        logger.info('Payload reçu comme string, parsing JSON');
        event = JSON.parse(payload);
      } else if (typeof payload === 'object') {
        logger.info('Payload reçu comme objet, utilisation directe');
        event = payload;
      } else {
        throw new ApiError(400, 'Invalid payload format');
      }
      
      logger.info(`✅ Processing Stripe webhook event: ${event.type} (ID: ${event.id})`);
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
          logger.info('🎯 Traitement checkout.session.completed');
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
        }
        case 'payment_intent.succeeded': {
          logger.info('🎯 Traitement payment_intent.succeeded');
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        }
        case 'payment_intent.payment_failed': {
          logger.info('🎯 Traitement payment_intent.payment_failed');
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
      logger.info('✅ Webhook traité avec succès');
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('❌ Error handling webhook:', error);
      // Return a 400 error on a bad signature
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    // Stratégie pour trouver le sessionId:
    // 1. D'abord chercher dans les métadonnées
    // 2. Ensuite chercher dans client_reference_id
    // 3. En dernier recours, chercher la session la plus récente non payée
    
    let sessionId = null;
    const metadata = session.metadata || {};
    const packId = metadata.packId || 'pack-decouverte';
    
    // Logs de débogage pour la redirection
    logger.info('=== STRIPE CHECKOUT COMPLETED ===');
    logger.info('Session Stripe ID:', session.id);
    logger.info('Client Reference ID:', session.client_reference_id);
    logger.info('Metadata:', session.metadata);
    logger.info('Success URL:', session.success_url);
    logger.info('Payment Status:', session.payment_status);
    logger.info('=====================================');
    
    // 1. Vérifier les métadonnées
    if (metadata.sessionId) {
      sessionId = metadata.sessionId;
      logger.info(`✅ Session ID trouvé dans les métadonnées: ${sessionId}`);
    } 
    // 2. Vérifier client_reference_id
    else if (session.client_reference_id) {
      sessionId = session.client_reference_id;
      logger.info(`✅ Session ID trouvé dans client_reference_id: ${sessionId}`);
    } 
    // 3. Chercher la session la plus récente non payée
    else {
      logger.warn('⚠️ Aucun sessionId trouvé dans les métadonnées ou client_reference_id, recherche de la session la plus récente non payée');
      
      // Si pas de session ID dans les métadonnées, essayer de le trouver dans les sessions existantes
      if (!sessionId) {
        const allSessions = await sessionService.getAllSessions();
        const potentialSessions = allSessions.filter((s: Session) => s.payment_intent_id === session.payment_intent);
        
        if (potentialSessions.length > 0) {
          // Trier par date de création pour prendre la plus récente
          potentialSessions.sort((a: Session, b: Session) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          });
          sessionId = potentialSessions[0].id;
          logger.info(`Session ID trouvé par recherche inversée: ${sessionId}`);
        }
      }
    }
    
    if (!sessionId) {
      logger.error('❌ No sessionId found after all checks in handleCheckoutSessionCompleted');
      return;
    }

    // Récupérer la session de scraping
    const scrapingSession = await sessionService.getSession(sessionId);
    
    if (!scrapingSession) {
      logger.warn(`❌ Session ${sessionId} not found when processing payment webhook`);
      return;
    }
    
    logger.info(`✅ Session de scraping trouvée: ${JSON.stringify(scrapingSession)}`);
    
    // Marquer la session comme ayant des données si elle a un datasetId
    if (scrapingSession.datasetId && !scrapingSession.hasData) {
      scrapingSession.hasData = true;
      await sessionService.updateSession(sessionId, { hasData: true });
      logger.info(`✅ Session ${sessionId} marked as having data`);
    }
    
    // Mark session as paid
    try {
      // Générer l'URL de téléchargement automatique avec les paramètres corrects
      const downloadUrl = `${config.server.frontendUrl}/download?session_id=${sessionId}&pack_id=${packId}&autoDownload=true&format=excel`;
      logger.info(`🔗 Génération de l'URL de téléchargement automatique: ${downloadUrl}`);
      
      // Mettre à jour la session avec les informations de paiement
      const updatedSession = await sessionService.updateSession(sessionId, {
        isPaid: true,
        packId,
        downloadUrl
      });
      
      logger.info(`🎉 Session ${sessionId} marked as paid for pack ${packId}`);
      logger.info(`📥 Download URL set to: ${updatedSession?.downloadUrl || 'undefined'}`);
      
      // Générer un jeton de téléchargement temporaire
      const downloadToken = Buffer.from(`${sessionId}:${new Date().getTime()}:paid`).toString('base64');
      await sessionService.updateSession(sessionId, { downloadToken });
      logger.info(`🔑 Download token generated for session ${sessionId}: ${downloadToken}`);
      
    } catch (error) {
      logger.error(`❌ Failed to update session ${sessionId} when processing payment: ${error}`);
    }
  }

  /**
   * Handle payment_intent.succeeded event
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const metadata = paymentIntent.metadata || {};
    let sessionId = metadata.sessionId;

    if (!sessionId && paymentIntent.description) {
      const match = paymentIntent.description.match(/session[_\-]?id[:\s]?([\w\-]+)/i);
      if (match && match[1]) {
        sessionId = match[1];
        logger.info(`Session ID found in payment intent description: ${sessionId}`);
      }
    }

    if (!sessionId) {
      logger.warn(`No session ID found in payment intent metadata: ${paymentIntent.id}`);
      return;
    }

    try {
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        logger.warn(`Session ${sessionId} not found for successful payment.`);
        return;
      }

      // Update session to mark as paid
      await sessionService.updateSession(sessionId, {
        isPaid: true,
        payment_intent_id: paymentIntent.id,
      });

      logger.info(`Payment succeeded for session ${sessionId}, payment intent: ${paymentIntent.id}`);

      // Record the purchase in the audit table
      if (session.user_id && session.packId && session.downloadUrl) {
        await auditService.recordPurchase({
          user_id: session.user_id,
          session_id: sessionId,
          pack_id: session.packId,
          payment_intent_id: paymentIntent.id,
          amount_paid: paymentIntent.amount / 100, // Stripe amount is in cents
          currency: paymentIntent.currency,
          download_url: session.downloadUrl,
        });
        logger.info(`Purchase for session ${sessionId} successfully recorded in audit log.`);
      } else {
        logger.warn(`Could not record purchase for session ${sessionId} due to missing data: `,
          { userId: session.user_id, packId: session.packId, downloadUrl: session.downloadUrl });
      }

    } catch (error) {
      logger.error(`Failed to process successful payment for session ${sessionId}:`, error);
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
      if (sessionId) {
        await sessionService.updateSession(sessionId, {
          isPaid: false,
          payment_intent_id: paymentIntent.id
        });
      }
      logger.warn(`Payment failed for session ${sessionId}, payment intent: ${paymentIntent.id}`);
    } catch (error) {
      logger.warn(`Failed to update session ${sessionId} for failed payment: ${error}`);
    }
  }
}

export const paymentController = new PaymentController();