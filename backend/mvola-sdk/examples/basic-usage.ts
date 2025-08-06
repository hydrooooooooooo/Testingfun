import MVolaMerchantPay, { CallbackParser } from '../src';

async function example() {
    // Configuration via variables d'environnement (recommandé)
    const mvola = new MVolaMerchantPay();
    await mvola.authenticate() // Authentification nécessaire avant toute transaction
    
    // Ou configuration manuelle
    // const mvola = new MVolaMerchantPay({
    //     sandbox: true,
    //     consumerKey: 'YOUR_CONSUMER_KEY',
    //     consumerSecret: 'YOUR_CONSUMER_SECRET',
    //     partnerName: 'YOUR_PARTNER_NAME',
    //     partnerMSISDN: 'YOUR_PARTNER_MSISDN',
    //     language: 'FR',
    //     callbackURL: 'https://localhost:3000/webhook/mvola'
    // });

    try {
        console.log('🚀 Initiation de la transaction...');
        
        const initResult = await mvola.initiateTransaction({
            amount: 1000,
            currency: 'Ar',
            customerMSISDN: '0343500003',
            descriptionText: 'Paiement commande 123',
            clientTransactionId: 'ORDER_12345',
            foreignCurrency: 'USD',
            foreignAmount: 1
        });

        if (!initResult.success) {
            console.error('❌ Erreur initiation:', initResult.message);
            return;
        }

        console.log('✅ Transaction initiée:', initResult.data);
        const serverCorrelationId = initResult.data!.serverCorrelationId;

        console.log('⏳ Attente de la completion...');
        const completionResult = await mvola.waitForTransactionCompletion(serverCorrelationId, {
            maxAttempts: 20,
            interval: 5000
        });

        if (completionResult.success && completionResult.data) {
            console.log(`🏁 Transaction terminée après ${completionResult.attempts} tentatives`);
            
            if (completionResult.data.status === 'completed') {
                console.log('✅ Paiement réussi !');
            } else {
                console.log('❌ Paiement échoué');
            }
        } else {
            console.error('❌ Erreur lors de l\'attente:', completionResult.message);
        }

    } catch (error) {
        console.error('❌ Erreur générale:', (error as Error).message);
    }
}

// Exemple de traitement de callback webhook avec Express et TypeScript
function handleWebhook(req: any, res: any) {
    try {
        const callbackData = CallbackParser.parseCallback(req.body);
        
        console.log(`📢 Callback reçu pour transaction: ${callbackData.serverCorrelationId}`);
        
        if (callbackData.isCompleted) {
            console.log('✅ Paiement confirmé via callback');
            // Mettre à jour votre base de données
            // updateOrderStatus(callbackData.serverCorrelationId, 'completed');
        } else if (callbackData.isFailed) {
            console.log('❌ Paiement échoué via callback');
            // Gérer l'échec
            // updateOrderStatus(callbackData.serverCorrelationId, 'failed');
        }
        
        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('❌ Erreur callback:', (error as Error).message);
        res.status(400).json({ error: 'Invalid callback format' });
    }
}

example().catch(console.error);