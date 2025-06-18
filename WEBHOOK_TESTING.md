# Guide de test des webhooks Stripe et du téléchargement automatique

Ce document explique comment tester les webhooks Stripe et la fonctionnalité de téléchargement automatique après paiement.

## Résumé des modifications apportées

1. **Support des webhooks Stripe sur deux routes**
   - `/api/payment/webhook` (nouvelle route principale)
   - `/api/stripe/webhook` (route de compatibilité pour les configurations existantes)

2. **Téléchargement automatique après paiement**
   - Lorsqu'un webhook `checkout.session.completed` est reçu, l'application génère une URL de téléchargement automatique
   - L'URL contient le paramètre `autoDownload=true` qui déclenche le téléchargement du fichier Excel
   - Une notification visuelle informe l'utilisateur que le téléchargement a démarré automatiquement

3. **Logs améliorés pour le débogage**
   - Logs détaillés des webhooks Stripe reçus
   - Logs des métadonnées des événements
   - Logs de l'URL de téléchargement automatique générée

## Comment tester les webhooks Stripe

### Option 1: Utiliser Stripe CLI (recommandé pour le développement)

1. Installez [Stripe CLI](https://stripe.com/docs/stripe-cli#install)
2. Connectez-vous à votre compte Stripe :
   ```
   stripe login
   ```
3. Écoutez les événements et transmettez-les à votre serveur local :
   ```
   stripe listen --forward-to localhost:3001/api/payment/webhook
   ```
4. Dans un autre terminal, déclenchez un événement de test :
   ```
   stripe trigger checkout.session.completed
   ```

### Option 2: Utiliser le script de test fourni

Nous avons créé un script de test qui simule un webhook Stripe sans avoir besoin d'effectuer un paiement réel.

1. Démarrez le serveur backend :
   ```
   cd backend
   npm run dev
   ```

2. Exécutez le script de test avec un ID de session existant :
   ```
   node src/tests/webhook-test.js <sessionId>
   ```
   
   Remplacez `<sessionId>` par un ID de session valide de votre application.

3. Vérifiez les logs du serveur pour confirmer que :
   - Le webhook a été reçu
   - La session a été marquée comme payée
   - L'URL de téléchargement automatique a été générée

### Option 3: Effectuer un paiement réel

1. Configurez Stripe pour envoyer des webhooks à votre serveur (voir STRIPE_SETUP.md)
2. Effectuez un paiement complet dans l'application
3. Vérifiez que vous êtes redirigé vers la page de téléchargement et que le fichier Excel commence à se télécharger automatiquement

## Dépannage

### Le webhook n'est pas reçu

1. Vérifiez que les routes `/api/payment/webhook` et `/api/stripe/webhook` sont correctement configurées
2. Vérifiez que le middleware `express.raw()` est appliqué à ces routes dans `index.ts`
3. Vérifiez que la clé secrète du webhook Stripe est correctement configurée dans `.env`

### Le téléchargement automatique ne se déclenche pas

1. Vérifiez que la session est bien marquée comme payée dans les logs
2. Vérifiez que l'URL de téléchargement automatique est correctement générée
3. Vérifiez que le paramètre `autoDownload=true` est présent dans l'URL
4. Vérifiez que le composant `DownloadPage.tsx` détecte correctement ce paramètre

## Logs à surveiller

Voici les logs importants à surveiller pour confirmer que tout fonctionne correctement :

```
Webhook Stripe reçu sur: /api/payment/webhook
Processing Stripe webhook event: checkout.session.completed
Génération de l'URL de téléchargement automatique: http://localhost:3000/download?sessionId=<sessionId>&autoDownload=true
Session <sessionId> marked as paid for pack <packId>
Téléchargement automatique configuré pour la session <sessionId>
```

Si vous voyez ces logs, cela signifie que le webhook a été correctement traité et que le téléchargement automatique est configuré.
