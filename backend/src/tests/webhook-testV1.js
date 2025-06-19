// backend/src/tests/webhook-test-advanced.js

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const sessionId = process.argv[2];
const packId = process.argv[3] || 'pack-pro';

if (!sessionId) {
  console.error('Usage: node webhook-test-advanced.js <sessionId> [packId]');
  process.exit(1);
}

// Créer un événement checkout.session.completed plus réaliste
const createCheckoutCompletedEvent = (sessionId, packId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const sessionIdStripe = `cs_test_${Date.now()}`;
  const paymentIntentId = `pi_test_${Date.now()}`;
  
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: timestamp,
    data: {
      object: {
        id: sessionIdStripe,
        object: 'checkout.session',
        amount_subtotal: 999,
        amount_total: 999,
        currency: 'eur',
        customer: null,
        customer_email: 'test@example.com',
        mode: 'payment',
        payment_status: 'paid',
        status: 'complete',
        success_url: `http://localhost:5173/download?session_id=${sessionId}&pack_id=${packId}&autoDownload=true`,
        url: null,
        client_reference_id: sessionId,
        metadata: {
          sessionId: sessionId,
          packId: packId
        },
        payment_intent: paymentIntentId,
        line_items: {
          object: 'list',
          data: [
            {
              id: `li_test_${Date.now()}`,
              object: 'item',
              amount_subtotal: 999,
              amount_total: 999,
              currency: 'eur',
              description: 'Pack Pro - Scraping avancé',
              price: {
                id: `price_test_${Date.now()}`,
                object: 'price',
                currency: 'eur',
                unit_amount: 999
              },
              quantity: 1
            }
          ]
        }
      }
    },
    type: 'checkout.session.completed',
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null
    }
  };
};

// Créer un événement payment_intent.succeeded
const createPaymentIntentSucceededEvent = (sessionId, packId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paymentIntentId = `pi_test_${Date.now()}`;
  
  return {
    id: `evt_test_${Date.now()}_payment_intent`,
    object: 'event',
    api_version: '2023-10-16',
    created: timestamp,
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 999,
        currency: 'eur',
        status: 'succeeded',
        metadata: {
          sessionId: sessionId,
          packId: packId
        },
        charges: {
          object: 'list',
          data: [
            {
              id: `ch_test_${Date.now()}`,
              object: 'charge',
              amount: 999,
              currency: 'eur',
              status: 'succeeded',
              paid: true
            }
          ]
        }
      }
    },
    type: 'payment_intent.succeeded',
    livemode: false
  };
};

// Fonction pour envoyer un webhook
const sendWebhook = async (event, eventType) => {
  try {
    console.log(`\n=== Envoi du webhook ${eventType} ===`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Pack ID: ${packId}`);
    console.log(`Event ID: ${event.id}`);
    
    const payload = JSON.stringify(event);
    
    // Calculer une signature basique (pour le test)
    const signature = crypto
      .createHmac('sha256', 'test_webhook_secret')
      .update(payload)
      .digest('hex');
    
    const response = await axios.post('http://localhost:3001/api/payment/webhook', 
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': `t=${Math.floor(Date.now() / 1000)},v1=${signature}`
        },
        timeout: 10000
      }
    );
    
    console.log(`✅ Webhook ${eventType} envoyé avec succès`);
    console.log(`Response: ${response.status} - ${JSON.stringify(response.data)}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur webhook ${eventType}:`, error.message);
    if (error.response) {
      console.error(`Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
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
    } else {
      console.log(`⚠️  Session ${sessionId} pas encore marquée comme payée`);
    }
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification:`, error.message);
    return null;
  }
};

// Fonction principale
const runWebhookTest = async () => {
  console.log(`🚀 Test complet des webhooks Stripe`);
  console.log(`Session ID: ${sessionId}`);
  console.log(`Pack ID: ${packId}`);
  
  // 1. Envoyer checkout.session.completed
  const checkoutEvent = createCheckoutCompletedEvent(sessionId, packId);
  const checkoutSuccess = await sendWebhook(checkoutEvent, 'checkout.session.completed');
  
  if (!checkoutSuccess) {
    console.log(`❌ Échec du webhook checkout.session.completed, arrêt du test`);
    return;
  }
  
  // Attendre un peu pour que le webhook soit traité
  console.log(`⏳ Attente de 2 secondes...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. Vérifier le statut
  const sessionStatus = await checkSessionStatus();
  
  // 3. Envoyer payment_intent.succeeded si nécessaire
  if (!sessionStatus?.isPaid) {
    console.log(`\n⚡ Envoi du webhook payment_intent.succeeded`);
    const paymentEvent = createPaymentIntentSucceededEvent(sessionId, packId);
    await sendWebhook(paymentEvent, 'payment_intent.succeeded');
    
    // Attendre et vérifier à nouveau
    console.log(`⏳ Attente de 2 secondes...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await checkSessionStatus();
  }
  
  console.log(`\n✨ Test terminé !`);
  console.log(`🔗 URL de test: http://localhost:5173/download?session_id=${sessionId}&pack_id=${packId}&payment_success=true`);
};

// Exécuter le test
runWebhookTest().catch(console.error);