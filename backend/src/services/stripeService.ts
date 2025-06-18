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
  async createCheckoutSession(packId: string, sessionId: string): Promise<string> {
    try {
      // Find the pack by ID
      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        throw new Error(`Pack with ID ${packId} not found`);
      }
      
      // Construire les URLs pour la redirection après paiement
      const frontendUrl = config.server.frontendUrl || 'http://localhost:5173';
      const successUrl = `${frontendUrl}/payment-success?session_id=${sessionId}&pack_id=${packId}`;
      const cancelUrl = `${frontendUrl}/payment-cancel`;
      
      // Créer une session Stripe dynamique
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: pack.name,
                description: pack.description,
              },
              unit_amount: Math.round(pack.price * 100), // Stripe utilise les centimes
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          sessionId: sessionId,
          packId: packId,
        },
        client_reference_id: sessionId,
      });
      
      // Stocker les informations de session dans la base de données locale
      try {
        // Marquer la session comme en attente de paiement
        const sessionData = {
          packId,
          paymentPending: true,
          paymentStartedAt: new Date().toISOString()
        };
        
        // Nous allons vérifier le paiement plus tard via le webhook
        logger.info(`Payment initiated for session ${sessionId} with pack ${packId}`);
      } catch (err) {
        logger.warn(`Could not update session data for payment: ${err}`);
      }

      logger.info(`Created Stripe checkout session for pack ${packId}, session ${sessionId}`);
      
      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL');
      }
      
      return session.url;
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
