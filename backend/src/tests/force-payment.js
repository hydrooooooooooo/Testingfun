/**
 * Script pour forcer le paiement d'une session
 * Ce script contourne les webhooks et marque directement une session comme payée
 * 
 * Usage: node force-payment.js <sessionId>
 */

const axios = require('axios');
require('dotenv').config();

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Erreur: Veuillez fournir un ID de session');
  console.error('Usage: node force-payment.js <sessionId>');
  process.exit(1);
}

const forcePayment = async () => {
  try {
    console.log(`🔧 Forçage du paiement pour la session: ${sessionId}`);
    
    // Créer l'événement webhook simplifié
    const webhookEvent = {
      id: `evt_force_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_force_${Date.now()}`,
          object: 'checkout.session',
          payment_status: 'paid',
          status: 'complete',
          client_reference_id: sessionId,
          metadata: {
            sessionId: sessionId,
            packId: 'pack-pro'
          },
          payment_intent: `pi_force_${Date.now()}`
        }
      }
    };
    
    // Première tentative : webhook normal
    try {
      console.log('📡 Tentative webhook normal...');
      const webhookResponse = await axios.post('http://localhost:3001/api/payment/webhook', 
        webhookEvent,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      console.log(`✅ Webhook response: ${webhookResponse.status}`);
    } catch (error) {
      console.log(`⚠️ Webhook échoué: ${error.message}`);
    }
    
    // Deuxième tentative : appel direct à l'API pour forcer la mise à jour
    try {
      console.log('🔨 Forçage direct via API...');
      
      // Simuler une mise à jour directe de session
      const forceUpdateResponse = await axios.post('http://localhost:3001/api/force-payment', {
        sessionId: sessionId,
        packId: 'pack-pro',
        forceUpdate: true
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`✅ Force update response: ${forceUpdateResponse.status}`);
    } catch (error) {
      console.log(`⚠️ Force update pas disponible: ${error.message}`);
    }
    
    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Vérifier le statut final
    console.log('\n🔍 Vérification du statut final...');
    const statusResponse = await axios.get(`http://localhost:3001/api/verify-payment`, {
      params: { sessionId },
      timeout: 5000
    });
    
    console.log('📊 Statut final:', statusResponse.data);
    
    if (statusResponse.data.isPaid) {
      console.log(`🎉 SUCCESS! Session ${sessionId} est maintenant payée!`);
      if (statusResponse.data.downloadUrl) {
        console.log(`📥 URL de téléchargement: ${statusResponse.data.downloadUrl}`);
      }
    } else {
      console.log(`❌ ÉCHEC! Session ${sessionId} n'est toujours pas payée`);
      
      // Dernière tentative : modification manuelle via curl-like request
      console.log('🛠️ Tentative de modification manuelle...');
      
      // Utiliser une approche de contournement
      const manualUpdate = {
        sessionId: sessionId,
        isPaid: true,
        packId: 'pack-pro',
        paymentIntentId: `manual_${Date.now()}`,
        paymentCompletedAt: new Date().toISOString(),
        paymentStatus: 'succeeded',
        downloadUrl: `http://localhost:5173/download?session_id=${sessionId}&pack_id=pack-pro&autoDownload=true&format=excel`,
        downloadToken: Buffer.from(`${sessionId}:${Date.now()}:paid`).toString('base64')
      };
      
      console.log('📝 Données de mise à jour manuelle:', manualUpdate);
      console.log('\n💡 Pour forcer manuellement, exécutez cette commande dans votre code:');
      console.log(`sessionService.updateSession('${sessionId}', ${JSON.stringify(manualUpdate, null, 2)});`);
    }
    
  } catch (error) {
    console.error('❌ Erreur during force payment:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

forcePayment();