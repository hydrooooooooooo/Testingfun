# Configuration de Stripe pour l'application

Ce document explique comment configurer Stripe pour l'application, notamment les webhooks pour le traitement des paiements.

## Prérequis

1. Un compte Stripe (vous pouvez utiliser un compte de test)
2. [Stripe CLI](https://stripe.com/docs/stripe-cli) installé pour tester les webhooks en local

## Configuration des variables d'environnement

Assurez-vous que les variables d'environnement suivantes sont définies dans votre fichier `.env` :

```
STRIPE_SECRET_KEY=sk_test_votre_clé_secrète_de_test
STRIPE_WEBHOOK_SECRET=whsec_votre_clé_secrète_de_webhook
```

## Configuration du webhook Stripe

### En production

1. Connectez-vous à votre [tableau de bord Stripe](https://dashboard.stripe.com/)
2. Allez dans **Développeurs > Webhooks**
3. Cliquez sur **Ajouter un endpoint**
4. Entrez l'URL de votre endpoint webhook : `https://votre-domaine.com/api/payment/webhook`
   - Note: L'application prend également en charge l'ancienne URL `https://votre-domaine.com/api/stripe/webhook` pour la compatibilité avec les configurations existantes
5. Sélectionnez les événements à écouter :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
6. Cliquez sur **Ajouter un endpoint**
7. Copiez la clé de signature du webhook (Signing Secret) et ajoutez-la à votre variable d'environnement `STRIPE_WEBHOOK_SECRET`

## Téléchargement automatique après paiement

L'application est configurée pour déclencher automatiquement le téléchargement du fichier Excel après un paiement réussi. Voici comment cela fonctionne :

1. Lorsqu'un webhook `checkout.session.completed` est reçu, l'application met à jour la session avec `isPaid: true`
2. L'application génère également une URL de téléchargement automatique : `{FRONTEND_URL}/download?sessionId={sessionId}&autoDownload=true`
3. Lorsque l'utilisateur est redirigé vers cette URL, le téléchargement du fichier Excel démarre automatiquement

Pour vérifier que cette fonctionnalité fonctionne correctement :

1. Assurez-vous que les webhooks Stripe sont correctement configurés
2. Vérifiez les logs du serveur pour confirmer la réception des webhooks
3. Testez un paiement complet et vérifiez que le téléchargement démarre automatiquement

### En local avec Stripe CLI

Pour tester les webhooks en local :

1. Installez [Stripe CLI](https://stripe.com/docs/stripe-cli#install)
2. Connectez-vous à votre compte Stripe :
   ```
   stripe login
   ```
3. Écoutez les événements et transmettez-les à votre serveur local :
   ```
   stripe listen --forward-to localhost:3001/api/payment/webhook
   ```
4. Stripe CLI vous fournira une clé de signature webhook temporaire. Utilisez-la comme valeur pour `STRIPE_WEBHOOK_SECRET` dans votre fichier `.env`.

## Test des paiements

1. Démarrez votre serveur backend :
   ```
   cd backend
   npm run dev
   ```
2. Démarrez votre application frontend :
   ```
   npm run dev
   ```
3. Effectuez un paiement de test en utilisant les [cartes de test Stripe](https://stripe.com/docs/testing#cards) :
   - Carte réussie : `4242 4242 4242 4242`
   - Carte échouée : `4000 0000 0000 0002`

## Événements webhook gérés

L'application gère les événements webhook suivants :

- `checkout.session.completed` : Déclenché lorsqu'un client complète le processus de paiement
- `payment_intent.succeeded` : Déclenché lorsqu'un paiement est réussi
- `payment_intent.payment_failed` : Déclenché lorsqu'un paiement échoue
- `charge.succeeded` : Déclenché lorsqu'une charge est réussie
- `charge.failed` : Déclenché lorsqu'une charge échoue

## Structure de l'intégration Stripe

- `stripeService.ts` : Service pour interagir avec l'API Stripe
- `paymentController.ts` : Contrôleur pour gérer les requêtes de paiement et les webhooks
- `paymentRoutes.ts` : Routes pour les endpoints de paiement

## Flux de paiement

1. Le client sélectionne un pack et initie un paiement
2. L'application crée une session de paiement Stripe avec `createCheckoutSession`
3. Le client est redirigé vers la page de paiement Stripe
4. Après le paiement, Stripe envoie un événement webhook à notre serveur
5. Le serveur traite l'événement et met à jour le statut de la session
6. Le client est redirigé vers la page de succès ou d'échec
