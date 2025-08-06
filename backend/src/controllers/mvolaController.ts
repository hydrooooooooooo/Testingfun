import { Request, Response } from 'express';
import { MVolaMerchantPay } from '../../mvola-sdk';

export const initiateMvolaPayment = async (req: Request, res: Response) => {
    // Note: La configuration de MVola (identifiants, etc.) devrait se faire 
    // via des variables d'environnement et non en dur dans le code.
    const mvola = new MVolaMerchantPay();
    
    try {
        await mvola.authenticate();
    } catch (authError) {
        console.error('❌ Erreur d\'authentification MVola:', (authError as Error).message);
        return res.status(500).json({ message: "Erreur d'authentification auprès du service de paiement." });
    }

    try {
        console.log('🚀 Initiation de la transaction...');
        
        const initResult = await mvola.initiateTransaction({
            amount: 1000, // Le montant devrait provenir de la requête (req.body)
            currency: 'Ar',
            customerMSISDN: '0343500003', // Le numéro de téléphone devrait provenir de la requête
            descriptionText: 'Paiement test', // La description devrait être dynamique
            clientTransactionId: `ORDER_${Date.now()}`, // L'ID de transaction doit être unique
            foreignCurrency: 'USD',
            foreignAmount: 1
        });

        if (!initResult.success || !initResult.data) {
            console.error('❌ Erreur initiation:', initResult.message);
            return res.status(400).json({ message: 'Erreur lors de l\'initiation de la transaction.', error: initResult.message });
        }

        console.log('✅ Transaction initiée:', initResult.data);
        const serverCorrelationId = initResult.data.serverCorrelationId;

        console.log('⏳ Attente de la completion...');
        const completionResult = await mvola.waitForTransactionCompletion(serverCorrelationId, {
            maxAttempts: 20,
            interval: 5000
        });

        if (completionResult.success && completionResult.data) {
            console.log(`🏁 Transaction terminée après ${completionResult.attempts} tentatives`);
            
            if (completionResult.data.status === 'completed') {
                console.log('✅ Paiement réussi !');
                return res.status(200).json({ message: 'Paiement réussi !', data: completionResult.data });
            } else {
                console.log('❌ Paiement échoué');
                return res.status(400).json({ message: 'Paiement échoué', data: completionResult.data });
            }
        } else {
            console.error('❌ Erreur lors de l\'attente:', completionResult.message);
            return res.status(500).json({ message: 'La transaction n\'a pas pu être complétée à temps.', error: completionResult.message });
        }

    } catch (error) {
        console.error('❌ Erreur générale:', (error as Error).message);
        return res.status(500).json({ message: 'Une erreur inattendue est survenue.', error: (error as Error).message });
    }
};
