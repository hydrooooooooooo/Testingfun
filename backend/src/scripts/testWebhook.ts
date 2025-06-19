import Stripe from 'stripe';
import axios from 'axios';

// Configuration de test
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_...';
const WEBHOOK_URL = 'http://localhost:3001/api/payment/stripe/webhook';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Test du webhook Stripe
 */
async function testWebhook() {
  console.log('🧪 Test du webhook Stripe...');
  
  try {
    // 1. Créer un événement de test
    const testEvent = {
      id: 'evt_test_' + Date.now(),
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_test_' + Date.now(),
          object: 'checkout.session',
          amount_total: 999,
          currency: 'eur',
          customer: null,
          metadata: {
            sessionId: 'sess_test_' + Date.now(),
            packId: 'pack-decouverte'
          },
          client_reference_id: 'sess_test_' + Date.now(),
          payment_intent: 'pi_test_' + Date.now(),
          payment_status: 'paid',
          status: 'complete'
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: 'req_test_' + Date.now(),
        idempotency_key: null
      },
      type: 'checkout.session.completed'
    };

    // 2. Créer la signature du webhook
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_...';
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(testEvent);
    
    // Note: En production, Stripe génère automatiquement cette signature
    // Ici on simule juste pour le test
    const signature = `t=${timestamp},v1=test_signature`;

    // 3. Envoyer le webhook
    console.log('📤 Envoi du webhook de test...');
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature,
        'User-Agent': 'Stripe/v1 WebhooksSimulator'
      },
      timeout: 10000
    });

    console.log('✅ Webhook envoyé avec succès!');
    console.log('📊 Réponse:', response.status, response.data);
    
  } catch (error) {
    console.error('❌ Erreur lors du test du webhook:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('📊 Détails de l\'erreur:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Headers:', error.response?.headers);
    }
  }
}

/**
 * Test de la vérification de paiement
 */
async function testPaymentVerification() {
  console.log('\n🧪 Test de la vérification de paiement...');
  
  try {
    const sessionId = 'sess_test_' + Date.now();
    
    // 1. Créer une session de test
    console.log('📝 Création d\'une session de test...');
    
    // 2. Vérifier le statut de paiement
    const response = await axios.get(`http://localhost:3001/api/payment/verify-payment`, {
      params: { sessionId },
      timeout: 5000
    });

    console.log('✅ Vérification réussie!');
    console.log('📊 Réponse:', response.data);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('📊 Détails de l\'erreur:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
    }
  }
}

// Exécuter les tests
async function runTests() {
  console.log('🚀 Démarrage des tests de paiement...\n');
  
  await testWebhook();
  await testPaymentVerification();
  
  console.log('\n✨ Tests terminés!');
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  runTests().catch(console.error);
}

export { testWebhook, testPaymentVerification }; 