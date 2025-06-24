/**
 * Script de test corrigé pour simuler un webhook Stripe
 * 
 * Ce script permet de tester le traitement des webhooks Stripe sans avoir à effectuer un paiement réel.
 * Il simule un événement checkout.session.completed et l'envoie au serveur local.
 * 
 * Usage:
 * 1. Démarrer le serveur backend
 * 2. Exécuter ce script avec Node.js: node webhook-test-fixed.js <sessionId>
 */

const axios = require('axios');
require('dotenv').config();

// Récupérer l'ID de session à partir des arguments de ligne de commande
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Erreur: Veuillez fournir un ID de session');
  console.error('Usage: node webhook-test-fixed.js <sessionId>');
  process.exit(1);
}

// Créer un événement Stripe simulé
const createStripeEvent = (sessionId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
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
        payment_intent: `pi_test_${Date.now()}`,
        success_url: `http://localhost:5173/download?session_id=${sessionId}&pack_id=pack-pro&autoDownload=true&format=excel`,
        cancel_url: `http://localhost:5173/payment?session_id=${sessionId}&pack_id=pack-pro&status=cancelled`
      }
    },
    type: 'checkout.session.completed',
    livemode: false
  };
};

// Fonction pour vérifier le statut de la session après webhook
const checkSessionStatus = async () => {
  try {
    console.log(`\n=== Vérification du statut de la session ===`);
    
    const response = await axios.get(`http://localhost:3001/api/verify-payment`, {
      params: { sessionId },
      timeout: 5000
    });
    
    console.log(`✅ Session vérifiée:`, response.data);
    
    if (response.data.isPaid) {
      console.log(`🎉 Session ${sessionId} marquée comme payée !`);
      if (response.data.downloadUrl) {
        console.log(`📥 URL de téléchargement: ${response.data.downloadUrl}`);
      }
      if (response.data.downloadToken) {
        console.log(`🔑 Token de téléchargement: ${response.data.downloadToken}`);
      }
    } else {
      console.log(`⚠️  Session ${sessionId} pas encore marquée comme payée`);
    }
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification:`, error.message);
    return null;
  }
};

// Fonction pour simuler un webhook Stripe
const simulateWebhook = async () => {
  try {
    const event = createStripeEvent(sessionId);
    
    console.log(`🚀 Simulation d'un webhook Stripe pour la session ${sessionId}...`);
    console.log('Type d\'événement:', event.type);
    console.log('Session ID dans l\'événement:', event.data.object.metadata.sessionId);
    console.log('Client Reference ID:', event.data.object.client_reference_id);
    
    // Tester la route des webhooks payment
    const response = await axios.post('http://localhost:3001/api/payment/webhook', 
      event,
      {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'dev_bypass_signature'
        },
        timeout: 10000
      }
    );
    
    console.log(`✅ Webhook envoyé avec succès !`);
    console.log(`Response: ${response.status} - ${JSON.stringify(response.data)}`);
    
    // Attendre un peu pour que le webhook soit traité
    console.log(`⏳ Attente de 2 secondes pour le traitement...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Vérifier le statut
    await checkSessionStatus();
    
    console.log(`\n✨ Test terminé !`);
    console.log(`🔗 URL de test: http://localhost:5173/download?session_id=${sessionId}&pack_id=pack-pro&autoDownload=true&format=excel`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la simulation du webhook:', error.message);
    if (error.response) {
      console.error(`Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    // Essayer de vérifier le statut même en cas d'erreur
    console.log(`\n🔍 Vérification du statut malgré l'erreur...`);
    await checkSessionStatus();
  }
};

// Exécuter la simulation
simulateWebhook();