# Configuration du Webhook Stripe

## 📋 Étapes de configuration

### 1. Accéder au Dashboard Stripe
- Allez sur [dashboard.stripe.com](https://dashboard.stripe.com)
- Connectez-vous avec votre compte Stripe
- Assurez-vous d'être en mode **TEST** (bascule en haut à droite)

### 2. Créer le Webhook
1. Dans le menu de gauche, cliquez sur **"Developers"**
2. Cliquez sur **"Webhooks"**
3. Cliquez sur **"Add endpoint"**

### 3. Configurer l'Endpoint
```
Endpoint URL: http://localhost:3001/api/payment/stripe/webhook
```

### 4. Sélectionner les Événements
Cochez les événements suivants :
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded` (optionnel)
- ✅ `invoice.payment_succeeded` (optionnel)

### 5. Récupérer le Webhook Secret
Après avoir créé le webhook, Stripe vous donnera un **Signing secret** qui commence par `whsec_`.

### 6. Configurer les Variables d'Environnement
Créez un fichier `.env` dans le dossier `backend/` avec :

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Apify Configuration
APIFY_TOKEN=your_apify_token_here
APIFY_ACTOR_ID=your_apify_actor_id_here

# Admin API Key
ADMIN_API_KEY=your_admin_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8082

# Session Storage
SESSION_STORAGE=file

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## 🔧 Test du Webhook

### 1. Démarrer le serveur backend
```bash
cd backend
npm run dev
```

### 2. Tester avec Stripe CLI (optionnel)
```bash
# Installer Stripe CLI
# Puis exécuter :
stripe listen --forward-to localhost:3001/api/payment/stripe/webhook
```

### 3. Vérifier les logs
Le webhook devrait apparaître dans les logs du serveur quand un paiement est effectué.

## 🚨 Dépannage

### Problème : Webhook non reçu
- Vérifiez que l'URL est correcte
- Vérifiez que le serveur backend tourne
- Vérifiez les logs Stripe dans le dashboard

### Problème : Signature invalide
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- Vérifiez que vous utilisez le bon secret (test vs production)

### Problème : CORS
- Le webhook Stripe n'a pas besoin de CORS
- Vérifiez que le middleware CORS ne bloque pas les webhooks 