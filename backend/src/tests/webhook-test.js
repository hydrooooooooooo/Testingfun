/**
 * Script de test pour simuler un webhook Stripe
 * 
 * Ce script permet de tester le traitement des webhooks Stripe sans avoir à effectuer un paiement réel.
 * Il simule un événement checkout.session.completed et l'envoie au serveur local.
 * 
 * Usage:
 * 1. Démarrer le serveur backend
 * 2. Exécuter ce script avec Node.js: node webhook-test.js <sessionId>
 */

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Récupérer l'ID de session à partir des arguments de ligne de commande
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Erreur: Veuillez fournir un ID de session');
  console.error('Usage: node webhook-test.js <sessionId>');
  process.exit(1);
}

// Créer un événement Stripe simulé
const createStripeEvent = (sessionId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2020-08-27',
    created: timestamp,
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        client_reference_id: sessionId,
        metadata: {
          sessionId: sessionId,
          packId: 'pack-pro'
        },
        payment_intent: `pi_test_${Date.now()}`
      }
    },
    type: 'checkout.session.completed',
    livemode: false
  };
};

// Fonction pour simuler un webhook Stripe
const simulateWebhook = async () => {
  try {
    const event = createStripeEvent(sessionId);
    
    console.log(`Simulation d'un webhook Stripe pour la session ${sessionId}...`);
    console.log('Type d\'événement:', event.type);
    
    // Tester d'abord la nouvelle route
    try {
      const response = await axios.post('http://localhost:3001/api/payment/webhook', 
        event,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': 'test_signature'
          }
        }
      );
      
      console.log('Réponse du serveur (nouvelle route):', response.status, response.data);
      return;
    } catch (error) {
      console.warn('Erreur avec la nouvelle route:', error.message);
      console.log('Tentative avec l\'ancienne route...');
    }
    
    // Essayer l'ancienne route si la nouvelle échoue
    try {
      const response = await axios.post('http://localhost:3001/api/stripe/webhook', 
        event,
        {
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': 'test_signature'
          }
        }
      );
      
      console.log('Réponse du serveur (ancienne route):', response.status, response.data);
    } catch (error) {
      console.error('Erreur avec l\'ancienne route:', error.message);
      console.error('Détails:', error.response?.data || 'Pas de détails disponibles');
    }
  } catch (error) {
    console.error('Erreur lors de la simulation du webhook:', error);
  }
};

// Exécuter la simulation
simulateWebhook();
