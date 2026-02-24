import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { stripeService } from '../services/stripeService';
import { sessionService, Session, SessionStatus } from '../services/sessionService';

import { ApiError } from '../middlewares/errorHandler';
import { logger, audit } from '../utils/logger';
import { alertService } from '../services/alertService';
// Packs are now read from DB 'packs' table instead of in-code PLANS
import db from '../database';
import { Knex } from 'knex';
import { config } from '../config/config';
import jwt from 'jsonwebtoken';

export class PaymentController {
  /**
   * Vérifier le statut de paiement d'une session
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const origin = req.headers.origin;
      if (origin && config.cors.allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-CSRF-Token');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Credentials', 'true');

      if (req.method === 'OPTIONS') {
        return res.status(204).end();
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

      // Ownership check: only the session owner can verify payment
      const userId = (req as any).user?.id;
      if (session.user_id && userId && Number(session.user_id) !== Number(userId)) {
        throw new ApiError(403, 'Not authorized to verify this session');
      }

      const isPaid = session.isPaid;

      const response = {
        isPaid,
        packId: session.packId || 'pack-starter',
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
      const { packId, sessionId, currency = 'eur' } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`[Payment] Attempting to create payment for session: ${sessionId}, pack: ${packId}, currency: ${currency}, user: ${userId}`);

      if (!packId || !sessionId) {
        throw new ApiError(400, 'Pack ID and Session ID are required');
      }

      if (!userId) {
        throw new ApiError(401, 'User not authenticated. Cannot create payment.');
      }

      // Récupérer le pack depuis la base
      const pack = await db('packs').where({ id: packId }).first();
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

      // Select the correct Stripe Price ID based on currency
      const priceId = currency === 'mga' ? pack.stripe_price_id_mga : pack.stripe_price_id;
      if (!priceId) {
        logger.error(`[Payment] Stripe Price ID manquant pour le pack: ${pack.id}, currency: ${currency}`);
        throw new ApiError(500, "Configuration de paiement incomplète pour ce pack et cette devise.");
      }

      const metadata = {
        sessionId: updatedSession.id,
        userId: String(userId),
        packId: pack.id,
        currency,
      };

      logger.info(`[Payment] Creating Stripe session with metadata: ${JSON.stringify(metadata)}`);

      const checkoutSession = await stripeService.createCheckoutSession(
        priceId,
        updatedSession.id,
        metadata,
        currency
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
      // Verify Stripe signature
      const sig = req.headers['stripe-signature'] as string | undefined;
      if (!sig) {
        audit('stripe.webhook_missing_signature');
        return res.status(400).json({ error: 'Missing Stripe signature' });
      }
      const payload = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body);
      const event: Stripe.Event = stripeService.constructEvent(payload, sig);
      audit('stripe.webhook_verified', { eventType: event.type, eventId: event.id });
      
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
      audit('stripe.webhook_verification_failed', { error: (error as Error).message });
      await alertService.notify('stripe.webhook_verification_failed', { error: (error as Error).message });
      res.status(400).json({ error: 'Webhook verification failed' });
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

      // Idempotency check: skip if this payment was already processed
      const existingPayment = await db('payments').where({ stripePaymentIntentId: paymentIntent.id }).first();
      if (existingPayment) {
        logger.info(`[STRIPE] Idempotency: payment ${paymentIntent.id} already processed for session ${sessionId}. Skipping.`);
        return;
      }

      // Récupérer la session DANS la transaction pour garantir les données les plus fraîches
      await db.transaction(async (trx) => {
        const session = await trx('scraping_sessions').where('id', sessionId).first();

        if (!session || !session.user_id || !session.packId) {
          logger.error(`[DB] ❌ Session ${sessionId} ou données critiques (user_id, packId) non trouvées DANS LA TRANSACTION.`);
          return;
        }

        const pack = await trx('packs').where({ id: session.packId }).first();
        if (!pack) {
          logger.error(`[DB] ❌ Pack ${session.packId} non trouvé pour la session ${sessionId}.`);
          return;
        }

        // Issue a JWT-signed download token bound to session and user
        const jwtToken = jwt.sign({ sessionId, userId: session.user_id }, config.api.jwtSecret as string, { expiresIn: '2h' });
        const downloadUrl = `${config.server.frontendUrl}/download?session_id=${session.id}&token=${jwtToken}`;
        logger.info(`🔗 Génération de l'URL de téléchargement: ${downloadUrl}`);
        audit('export.token_issued', { sessionId, userId: session.user_id });

        // 1. Mettre à jour la session
        await trx('scraping_sessions')
          .where('id', sessionId)
          .update({
            status: SessionStatus.FINISHED,
            isPaid: true,
            payment_method: 'stripe',
            payment_intent_id: paymentIntent.id,
            downloadUrl: downloadUrl,
            downloadToken: jwtToken,
            updated_at: new Date(),
          });
        logger.info(`[DB] ✅ Session ${sessionId} marquée comme terminée et payée.`);

        // 2. Insérer dans la table des paiements (aligné avec le schéma existant)
        // Stocker directement le montant MGA renvoyé par Stripe (aucune conversion)
        const amountMGA = (checkoutSession.amount_total ?? paymentIntent.amount ?? 0);

        await trx('payments').insert({
          user_id: session.user_id,
          stripePaymentIntentId: paymentIntent.id,
          stripeCheckoutId: checkoutSession.id,
          amount: amountMGA,
          currency: 'MGA',
          status: 'succeeded',
          packId: session.packId,
        });
        logger.info(`[DB] ✅ Paiement enregistré pour la session ${sessionId}.`);

        // 3. Insérer dans la table des téléchargements
        await trx('downloads').insert({
          user_id: session.user_id,
          session_id: sessionId,
          format: 'excel',
          download_token: jwtToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        });
        logger.info(`[DB] ✅ Téléchargement enregistré pour la session ${sessionId}.`);

        // 4. Ajouter les crédits au compte utilisateur
        const creditsToAdd = pack.nb_downloads || pack.nbDownloads || 0;
        if (creditsToAdd > 0) {
          const currentUser = await trx('users').where({ id: session.user_id }).forUpdate().first();
          const currentBalance = parseFloat(currentUser?.credits_balance || currentUser?.credits || 0);
          const newBalance = currentBalance + creditsToAdd;

          await trx('users')
            .where({ id: session.user_id })
            .update({
              credits_balance: newBalance,
              updated_at: trx.fn.now()
            });

          await trx('credit_transactions').insert({
            user_id: session.user_id,
            amount: creditsToAdd,
            balance_after: newBalance,
            transaction_type: 'purchase',
            reference_id: paymentIntent.id,
            status: 'completed',
            description: `Achat ${pack.name} (${creditsToAdd} crédits)`,
            metadata: JSON.stringify({ packId: pack.id, stripePaymentIntentId: paymentIntent.id }),
          });
          logger.info(`[DB] ✅ ${creditsToAdd} crédits ajoutés au compte de l'utilisateur ${session.user_id}. Nouveau solde: ${newBalance}`);
        } else {
          logger.warn(`[DB] ⚠️ Pack ${pack.id} a 0 crédits (nb_downloads), aucun crédit ajouté.`);
        }
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