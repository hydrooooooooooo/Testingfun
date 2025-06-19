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

      // Create Stripe checkout session with metadata and client_reference_id
      const stripeSession = await stripeService.createCheckoutSession({
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
    // Stratégie pour trouver le sessionId:
    // 1. D'abord chercher dans les métadonnées
    // 2. Ensuite chercher dans client_reference_id
    // 3. En dernier recours, chercher la session la plus récente non payée
    
    let sessionId = null;
    const metadata = session.metadata || {};
    const packId = metadata.packId || 'pack-decouverte';
    
    // Logs de débogage pour la redirection
    console.log('=== STRIPE CHECKOUT COMPLETED ===');
    console.log('Session Stripe ID:', session.id);
    console.log('Client Reference ID:', session.client_reference_id);
    console.log('Metadata:', session.metadata);
    console.log('Success URL:', session.success_url);
    console.log('Payment Status:', session.payment_status);
    console.log('=====================================');
    
    // 1. Vérifier les métadonnées
    if (metadata.sessionId) {
      sessionId = metadata.sessionId;
      logger.info(`Session ID trouvé dans les métadonnées: ${sessionId}`);
    } 
    // 2. Vérifier client_reference_id
    else if (session.client_reference_id) {
      sessionId = session.client_reference_id;
      logger.info(`Session ID trouvé dans client_reference_id: ${sessionId}`);
    } 
    // 3. Chercher la session la plus récente non payée
    else {
      logger.warn('Aucun sessionId trouvé dans les métadonnées ou client_reference_id, recherche de la session la plus récente non payée');
      
      // Trouver la session la plus récente non payée
      const sessions = sessionService.getAllSessions();
      const unpaidSessions = sessions.filter(s => !s.isPaid);
      
      if (unpaidSessions.length === 0) {
        logger.warn('Aucune session non payée trouvée lors du traitement du webhook de paiement');
        return;
      }
      
      // Trier par date de création (la plus récente d'abord)
      unpaidSessions.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Utiliser la session non payée la plus récente
      const mostRecentSession = unpaidSessions[0];
      sessionId = mostRecentSession.id;
      logger.info(`Utilisation de la session non payée la plus récente: ${sessionId}`);
    }
    
    // Récupérer la session de scraping
    const scrapingSession = sessionService.getSession(sessionId);
    
    if (!scrapingSession) {
      logger.warn(`Session ${sessionId} not found when processing payment webhook`);
      return;
    }
    
    logger.info(`Session de scraping trouvée: ${JSON.stringify(scrapingSession)}`);
    
    // Marquer la session comme ayant des données si elle a un datasetId
    if (scrapingSession.datasetId && !scrapingSession.hasData) {
      scrapingSession.hasData = true;
      sessionService.updateSession(sessionId, { hasData: true });
      logger.info(`Session ${sessionId} marked as having data`);
    }
    
    // Récupérer le datasetId de la session
    const datasetId = scrapingSession.datasetId;
    
    // Mark session as paid
    try {
      // Générer l'URL de téléchargement automatique avec les paramètres corrects
      // Inclure le pack_id et le format pour faciliter le téléchargement automatique
      const downloadUrl = `${config.server.frontendUrl}/download?session_id=${sessionId}&pack_id=${packId}&autoDownload=true&format=excel`;
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
      
      // Générer un jeton de téléchargement temporaire pour cette session
      // Ce jeton pourrait être utilisé pour autoriser un téléchargement unique sans nouvelle vérification
      const downloadToken = Buffer.from(`${sessionId}:${new Date().getTime()}:paid`).toString('base64');
      sessionService.updateSession(sessionId, { downloadToken });
      logger.info(`Download token generated for session ${sessionId}: ${downloadToken}`);
      
    } catch (error) {
      logger.warn(`Failed to update session ${sessionId} when processing payment: ${error}`);
    }
  }

  /**
   * Handle payment_intent.succeeded event
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const metadata = paymentIntent.metadata || {};
    let sessionId = metadata.sessionId;
    
    // Si pas de sessionId dans les métadonnées, essayer de le récupérer depuis d'autres sources
    if (!sessionId && paymentIntent.description) {
      // Essayer d'extraire le sessionId depuis la description (parfois Stripe y stocke des infos)
      const match = paymentIntent.description.match(/session[_\-]?id[:\s]?([\w\-]+)/i);
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

  // La méthode verifyPayment a été déplacée en haut de la classe
}

export const paymentController = new PaymentController();
