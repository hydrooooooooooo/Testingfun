import { Response } from 'express';
import { MVolaMerchantPay } from 'mvola-merchant-pay';
import db from '../database';
import { PLANS } from '../config/plans';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

import { nanoid } from 'nanoid';
import { config } from '../config/config';
import { SessionStatus } from '../services/sessionService';

export const initiateMvolaPayment = async (req: AuthenticatedRequest, res: Response) => {
    const { packId, sessionId } = req.body;
    const userId = req.user?.id;

    if (!packId || !userId || !sessionId) {
        return res.status(400).json({ message: 'ID du pack, ID de session et utilisateur requis.' });
    }

    // 1. Trouver les détails du pack dans la base de données
    const pack = await db('packs').where('id', packId).first();
    if (!pack) {
        return res.status(404).json({ message: 'Pack non trouvé.' });
    }

    // Déterminer le montant en Ariary
    const EUR_TO_MGA = Number(process.env.EUR_TO_MGA) || 5000; // défaut 1€ = 5000 Ar
    const price = Number(pack.price);
    let amount = Number((pack as any).price_ar);
    if (!Number.isFinite(amount) || amount <= 0) {
        if (pack.currency === 'ar') {
            amount = price;
        } else {
            amount = Math.round(price * EUR_TO_MGA);
        }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(500).json({ message: 'Impossible de déterminer le montant en Ariary.' });
    }

    // 2. Récupérer les informations de l'utilisateur
    const user = await db('users').where('id', userId).first();
    if (!user || !user.phone_number) {
        return res.status(400).json({ message: 'Numéro de téléphone non configuré pour cet utilisateur.' });
    }

    const mvola = new MVolaMerchantPay();
    const clientTransactionId = `MVOLA_${userId}_${Date.now()}`;
    let dbTransactionId: number | null = null;

    try {
        await mvola.authenticate();
    } catch (authError) {
        console.error('❌ Erreur d\'authentification MVola:', (authError as Error).message);
        return res.status(500).json({ message: "Erreur d'authentification auprès du service de paiement." });
    }

    try {
        console.log('🚀 Initiation de la transaction...');
        // MVola n'autorise que [A-Za-z0-9 - . _ ,] pour la description
        const rawDescription = `Paiement-pour-${pack.name}`;
        const sanitizedDescription = (rawDescription
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // enlever accents
            .replace(/[^A-Za-z0-9\-\._,]/g, '') // garder uniquement autorisés
            .slice(0, 60) || 'Paiement'); // limite raisonable

        const initResult = await mvola.initiateTransaction({
            amount: amount,
            currency: 'Ar',
            customerMSISDN: user.phone_number,
            descriptionText: sanitizedDescription,
            clientTransactionId: clientTransactionId,
        });

        if (!initResult.success || !initResult.data) {
            console.error('❌ Erreur initiation:', initResult.message);
            // Aucune insertion n'a eu lieu, ne pas tenter de mettre à jour une transaction inexistante
            return res.status(400).json({ message: 'Erreur lors de l\'initiation de la transaction.', error: initResult.message });
        }

        const serverCorrelationId = initResult.data.serverCorrelationId;

        // 3. Insérer la transaction en base avec le vrai server_correlation_id et statut 'pending'
        const inserted = await db('mvola_payments').insert({
            user_id: userId,
            pack_id: packId,
            amount: amount,
            currency: 'Ar',
            customer_msisdn: user.phone_number,
            client_transaction_id: clientTransactionId,
            server_correlation_id: serverCorrelationId,
            status: 'pending',
        });
        // SQLite retourne l'ID numérique dans le tableau, PostgreSQL peut retourner un objet
        dbTransactionId = Array.isArray(inserted)
          ? (typeof inserted[0] === 'object' ? (inserted[0] as any).id : (inserted[0] as number))
          : (inserted as unknown as number);

        console.log('✅ Transaction initiée:', initResult.data);
        console.log('⏳ Attente de la completion...');
        const completionResult = await mvola.waitForTransactionCompletion(serverCorrelationId, {
            maxAttempts: 20,
            interval: 5000
        });

        await db('mvola_payments').where('id', dbTransactionId).update({ 
            attempts: completionResult.attempts 
        });

        if (completionResult.success && completionResult.data) {
            console.log(`🏁 Transaction terminée après ${completionResult.attempts} tentatives`);
            const raw = String(completionResult.data.status || '').toLowerCase();
            const successAliases = ['completed', 'success', 'successful', 'succeeded'];
            const failureAliases = ['failed', 'refused', 'error', 'cancelled', 'canceled'];
            const finalStatus = successAliases.includes(raw) ? 'completed' : (failureAliases.includes(raw) ? 'failed' : raw || 'failed');
            
            await db('mvola_payments').where('id', dbTransactionId).update({ 
                status: finalStatus,
                status_reason: completionResult.data.message
            });

            if (finalStatus === 'completed') {
                // Si le paiement est réussi, mettre à jour la session de scraping
                const downloadToken = nanoid(40);
                const downloadUrl = `${config.server.frontendUrl}/download?session_id=${sessionId}&pack_id=${packId}&token=${downloadToken}`;

                await db('scraping_sessions')
                  .where('id', sessionId)
                  .update({
                    status: SessionStatus.FINISHED,
                    isPaid: true,
                    packId: packId,
                    user_id: userId,
                    payment_method: 'mvola',
                    payment_intent_id: `mvola_${dbTransactionId}`,
                    downloadUrl: downloadUrl,
                    downloadToken: downloadToken,
                    updated_at: new Date(),
                  });

                // Enregistrer un enregistrement de téléchargement pour le dashboard
                await db('downloads').insert({
                  user_id: userId,
                  session_id: sessionId,
                  format: 'excel',
                  download_token: downloadToken,
                  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
                });

                return res.status(200).json({ 
                  message: 'Paiement réussi et session débloquée.',
                  downloadUrl,
                  sessionId,
                  token: downloadToken
                });
            } else {
                console.log('❌ Paiement échoué');
                return res.status(400).json({ message: 'Paiement échoué', data: completionResult.data });
            }
        } else {
            console.error('❌ Erreur lors de l\'attente:', completionResult.message);
            if (dbTransactionId !== null) {
                await db('mvola_payments').where('id', dbTransactionId).update({ status: 'failed', status_reason: 'Timeout: ' + completionResult.message });
            }
            return res.status(500).json({ message: 'La transaction n\'a pas pu être complétée à temps.', error: completionResult.message });
        }

    } catch (error) {
        console.error('❌ Erreur générale:', (error as Error).message);
        if (dbTransactionId !== null) {
            await db('mvola_payments').where('id', dbTransactionId).update({ status: 'failed', status_reason: (error as Error).message });
        }
        return res.status(500).json({ message: 'Une erreur inattendue est survenue.', error: (error as Error).message });
    }
};
