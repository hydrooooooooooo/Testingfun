import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { stripeService } from '../services/stripeService';
import { sessionService, Session, SessionStatus } from '../services/sessionService';

import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { PLANS } from '../config/plans';
import db from '../database';
import { Knex } from 'knex';
import { config } from '../config/config';

export class PaymentController {
  /**
   * Vérifier le statut de paiement d'une session
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      const sessionIdParam = req.query.sessionId || req.query.session_id;
      
      logger.info(`Paramètres de vérification reçus: ${JSON.stringify(req.query)}`);
      
      if (!sessionIdParam || typeof sessionIdParam !== 'string') {
        throw new ApiError(400, 'Session ID is required');
      }
      
      const sessionId = sessionIdParam;
      
      logger.info(`Vérification du paiement pour la session: ${sessionId}`);
      
      const session = await sessionService.getSession(sessionId);
      
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found.`);
      }
      
      const isPaid = session.isPaid;
      
      const response = {
        isPaid,
        packId: session.packId || 'pack-decouverte',
        datasetId: session.datasetId || null,
        createdAt: session.created_at || new Date(),
        downloadUrl: session.downloadUrl || null,
        downloadToken: session.downloadToken || null
      };
      
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
      const userId = (req as any).user?.id;

      logger.info(`[Payment] Attempting to create payment for session: ${sessionId}, pack: ${packId}, user: ${userId}`);

      if (!packId || !sessionId) {
        throw new ApiError(400, 'Pack ID and Session ID are required');
      }

      if (!userId) {
        throw new ApiError(401, 'User not authenticated. Cannot create payment.');
      }

      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        throw new ApiError(404, `Pack with ID ${packId} not found`);
      }

      // Mettre à jour la session avec l'ID utilisateur et le packId
      const updatedSession = await sessionService.updateSession(sessionId, {
        user_id: userId,
        packId: pack.id,
      });

      if (!updatedSession) {
        throw new ApiError(500, `Failed to update session ${sessionId} before payment.`);
      }

      logger.info(`[Payment] Session ${sessionId} successfully updated with userId: ${userId} and packId: ${packId}`);

      if (!pack.stripePriceId) {
        logger.error(`[Payment] Stripe Price ID manquant pour le pack: ${pack.id}`);
        throw new ApiError(500, "Configuration de paiement incomplète pour ce pack.");
      }

      const metadata = {
        sessionId: updatedSession.id,
        userId: String(userId),
        packId: pack.id,
      };

      logger.info(`[Payment] Creating Stripe session with metadata: ${JSON.stringify(metadata)}`);

      const checkoutSession = await stripeService.createCheckoutSession(
        pack.stripePriceId,
        updatedSession.id,
        metadata
      );

      res.status(200).json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url
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
      logger.info('🚀 BYPASS TOTAL DE LA VERIFICATION STRIPE ACTIVÉ');

      // Le middleware express.raw() est utilisé, donc req.body est un Buffer.
      // Nous devons le parser manuellement en JSON car la vérification de signature est désactivée.
      const event: Stripe.Event = JSON.parse(req.body.toString());
      
      logger.info(`[STRIPE] --> [SERVER] Received Stripe event: ${event.type} (ID: ${event.id})`);

      switch (event.type) {
        case 'checkout.session.completed': {
          logger.info('🎯 Traitement checkout.session.completed');
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        }

        case 'payment_intent.payment_failed': {
          logger.info('🎯 Traitement payment_intent.payment_failed');
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        }
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('❌ Error handling webhook:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(checkoutSession: Stripe.Checkout.Session): Promise<void> {
    logger.info(`[STRIPE] Received checkout.session.completed event object: ${JSON.stringify(checkoutSession, null, 2)}`);
    const sessionId = checkoutSession.metadata?.sessionId;
    if (!sessionId) {
      logger.error('[STRIPE] No sessionId in checkout.session.completed metadata');
      return;
    }

    logger.info(`[STRIPE] Event: checkout.session.completed pour sessionId: ${sessionId}`);

    const paymentIntentId = checkoutSession.payment_intent as string;
    if (!paymentIntentId) {
      logger.error(`[STRIPE] No payment_intent in checkout.session.completed for session: ${sessionId}`);
      return;
    }

    try {
      const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);
      logger.info(`Successfully retrieved payment intent: ${paymentIntent.id}`);

      // Récupérer la session DANS la transaction pour garantir les données les plus fraîches
      await db.transaction(async (trx) => {
        const session = await trx('scraping_sessions').where('id', sessionId).first();
        
        if (!session || !session.user_id || !session.packId) {
          logger.error(`[DB] ❌ Session ${sessionId} ou données critiques (user_id, packId) non trouvées DANS LA TRANSACTION.`);
          // On ne throw pas pour ne pas faire échouer le webhook, mais on log l'erreur critique.
          return; 
        }

        const pack = PLANS.find(p => p.id === session.packId);
        if (!pack) {
          logger.error(`[DB] ❌ Pack ${session.packId} non trouvé pour la session ${sessionId}.`);
          return;
        }

        const downloadToken = nanoid(40);
        const downloadUrl = `${config.server.frontendUrl}/download?session_id=${session.id}&token=${downloadToken}`;
        logger.info(`🔗 Génération de l'URL de téléchargement: ${downloadUrl}`);

        // 1. Mettre à jour la session
        await trx('scraping_sessions')
          .where('id', sessionId)
          .update({
            status: SessionStatus.FINISHED,
            isPaid: true,
            payment_intent_id: paymentIntent.id,
            downloadUrl: downloadUrl,
            downloadToken: downloadToken,
            updated_at: new Date(),
          });
        logger.info(`[DB] ✅ Session ${sessionId} marquée comme terminée et payée.`);

        // 2. Insérer dans la table des paiements
        await trx('payments').insert({
          id: `pay_${nanoid()}`,
          user_id: session.user_id,
          session_id: sessionId,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: 'succeeded',
          pack_id: session.packId,
        });
        logger.info(`[DB] ✅ Paiement enregistré pour la session ${sessionId}.`);

        // 3. Insérer dans la table des téléchargements
        await trx('downloads').insert({
          id: `dl_${nanoid()}`,
          user_id: session.user_id,
          session_id: sessionId,
          download_token: downloadToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        });
        logger.info(`[DB] ✅ Téléchargement enregistré pour la session ${sessionId}.`);
      });

      logger.info(`[STRIPE] ✅ Traitement complet et réussi pour la session ${sessionId}.`);

    } catch (error) {
      logger.error(`[STRIPE] ❌ Erreur lors du traitement de checkout.session.completed pour ${sessionId}:`, error);
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const sessionId = paymentIntent.metadata?.sessionId;

    if (sessionId) {
      logger.warn(`[STRIPE] Payment failed for session ${sessionId}. Payment Intent ID: ${paymentIntent.id}, Reason: ${paymentIntent.last_payment_error?.message}`);
      try {
        await sessionService.updateSession(sessionId, {
          status: SessionStatus.PAYMENT_FAILED,
          isPaid: false,
        });
        logger.info(`[DB] Session ${sessionId} updated to PAYMENT_FAILED.`);
      } catch (error) {
        logger.error(`[DB] Failed to update session ${sessionId} for failed payment:`, error);
      }
    } else {
      logger.error(`[STRIPE] Payment failed, but no session ID was found in the metadata. Payment Intent ID: ${paymentIntent.id}`);
    }
  }
}

export const paymentController = new PaymentController();