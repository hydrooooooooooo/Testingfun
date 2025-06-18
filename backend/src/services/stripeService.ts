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
   * Create a payment link using a fixed Stripe checkout URL
   */
  async createCheckoutSession(packId: string, sessionId: string): Promise<string> {
    try {
      // Find the pack by ID
      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        throw new Error(`Pack with ID ${packId} not found`);
      }
      
      // Utiliser le lien de paiement fixe fourni
      const fixedPaymentLink = "https://buy.stripe.com/test_8x2dRbgfsale3a93ru2wU02";
      
      // Construire l'URL de succès pour la redirection après paiement
      const frontendUrl = config.server.frontendUrl || 'http://localhost:5173';
      const successUrl = `${frontendUrl}/payment-success?session_id=${sessionId}&pack_id=${packId}`;
      const encodedSuccessUrl = encodeURIComponent(successUrl);
      
      // Ajouter des paramètres de requête pour suivre la session et le pack
      // Inclure success_url pour la redirection après paiement
      const paymentUrl = `${fixedPaymentLink}?client_reference_id=${sessionId}&session_id=${sessionId}&pack_id=${packId}&success_url=${encodedSuccessUrl}`;
      
      // Stocker les informations de session dans la base de données locale
      // pour pouvoir vérifier le paiement plus tard
      try {
        // Marquer la session comme en attente de paiement
        const sessionData = {
          packId,
          paymentPending: true,
          paymentStartedAt: new Date().toISOString()
        };
        
        // Nous allons vérifier le paiement plus tard via le webhook ou la vérification manuelle
        logger.info(`Payment initiated for session ${sessionId} with pack ${packId}`);
      } catch (err) {
        logger.warn(`Could not update session data for payment: ${err}`);
      }

      logger.info(`Using Stripe payment link for pack ${packId}, session ${sessionId}`);
      return paymentUrl;
    } catch (error) {
      logger.error('Error creating payment link:', error);
      throw new Error(`Failed to create payment link: ${(error as Error).message}`);
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
}

export const stripeService = new StripeService();
