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
  async createCheckoutSession(
    priceId: string,
    clientReferenceId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${config.server.frontendUrl}/download?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.server.frontendUrl}/pricing`,
        client_reference_id: clientReferenceId,
        metadata: metadata,
        payment_intent_data: {
          metadata: metadata,
        },
      });
      
      logger.info(`Created Stripe checkout session ${session.id} for pack ${metadata.packId}, session ${clientReferenceId}`);
      
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
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      logger.info(`Successfully retrieved payment intent: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      logger.error(`Error retrieving payment intent ${paymentIntentId}:`, error);
      throw new Error(`Failed to retrieve payment intent: ${(error as Error).message}`);
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
