import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { PLANS } from '../config/plans';
import { config } from '../config/config';

// Initialize Stripe with the secret key
const stripe = new Stripe(config.api.stripeSecretKey || '', {
  apiVersion: '2023-10-16',
});

export class StripeService {
  /**
   * Create a dynamic Stripe checkout session
   */
  async createCheckoutSession(options: {
    packId: string;
    packName: string;
    amount: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    clientReferenceId?: string;
  }): Promise<Stripe.Checkout.Session> {
    try {
      // Extraire les options
      const { packId, packName, amount, successUrl, cancelUrl, metadata = {}, clientReferenceId } = options;
      
      // Vérifier que le pack existe (pour la journalisation)
      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        logger.warn(`Pack with ID ${packId} not found, but proceeding with custom amount`);
      }
      
      // Créer une session Stripe dynamique
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: packName,
                description: pack?.description || `Pack ${packName}`,
              },
              unit_amount: Math.round(amount * 100), // Stripe utilise les centimes
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          ...metadata,
          packId: packId
        },
        client_reference_id: clientReferenceId || metadata.sessionId,
      });
      
      // Récupérer le sessionId pour la journalisation
      const sessionId = metadata.sessionId || clientReferenceId;
      
      // Journaliser la création de la session
      if (sessionId) {
        logger.info(`Created Stripe checkout session for pack ${packId}, session ${sessionId}`);
      } else {
        logger.info(`Created Stripe checkout session for pack ${packId} without sessionId`);
      }
      
      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL');
      }
      
      return session;
    } catch (error) {
      logger.error('Error creating Stripe checkout session:', error);
      throw new Error(`Failed to create checkout session: ${(error as Error).message}`);
    }
  }

  /**
   * Verify a Stripe webhook event
   */
  constructEvent(payload: string, signature: string): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        config.api.stripeWebhookSecret || ''
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      throw new Error(`Webhook signature verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve a Stripe Checkout session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      logger.error(`Error retrieving Stripe checkout session ${sessionId}:`, error);
      throw new Error(`Failed to retrieve checkout session: ${(error as Error).message}`);
    }
  }
  
  /**
   * Retrieve a payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error(`Error retrieving payment intent ${paymentIntentId}:`, error);
      throw new Error(`Failed to retrieve payment intent: ${(error as Error).message}`);
    }
  }
}

export const stripeService = new StripeService();
