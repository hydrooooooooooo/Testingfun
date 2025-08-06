# MVola Merchant Pay SDK TypeScript

SDK TypeScript professionnel pour l'API MVola Merchant Pay de Madagascar avec architecture modulaire et gestion complète des variables d'environnement.

## 🚀 Installation

```bash
npm install mvola-merchant-pay-sdk
# ou
yarn add mvola-merchant-pay-sdk
```

## ⚙️ Configuration

### Variables d'environnement (Recommandé)

Créez un fichier `.env` à la racine de votre projet :

```env
MVOLA_SANDBOX=true
MVOLA_CONSUMER_KEY=your_consumer_key_here
MVOLA_CONSUMER_SECRET=your_consumer_secret_here
MVOLA_PARTNER_NAME=Your Company Name
MVOLA_PARTNER_MSISDN=0340123456
MVOLA_LANGUAGE=FR
MVOLA_CALLBACK_URL=https://yourapp.com/webhook/mvola
```

### Configuration programmatique

```typescript
import MVolaMerchantPay from 'mvola-merchant-pay-sdk';

const mvola = new MVolaMerchantPay({
    sandbox: true,
    consumerKey: 'YOUR_CONSUMER_KEY',
    consumerSecret: 'YOUR_CONSUMER_SECRET',
    partnerName: 'YOUR_PARTNER_NAME',
    partnerMSISDN: 'YOUR_PARTNER_MSISDN',
    language: 'FR',
    callbackURL: 'https://yourapp.com/webhook/mvola'
});
```

## 📖 Utilisation

### Initiation d'un paiement

```typescript
import MVolaMerchantPay from 'mvola-merchant-pay-sdk';

const mvola = new MVolaMerchantPay(); // Utilise les variables d'environnement
await mvola.authenticate(); // Authentification nécessaire avant toute opération

const result = await mvola.initiateTransaction({
    amount: 1000,
    customerMSISDN: '0340123456',
    currency: 'Ar',
    descriptionText: 'Paiement commande 12345',
    clientTransactionId: 'ORDER_12345',
});

if (result.success) {
    console.log('Transaction initiée:', result.data?.serverCorrelationId);
} else {
    console.error('Erreur:', result.message);
}
```

### Vérification du statut

```typescript
const status = await mvola.getTransactionStatus(serverCorrelationId);

if (status.success) {
    console.log('Statut:', status.data?.status);
}
```

### Attente de completion avec polling

```typescript
const completion = await mvola.waitForTransactionCompletion(serverCorrelationId, {
    maxAttempts: 10,
    interval: 3000 // 3 secondes
});

if (completion.success && completion.data?.status === 'completed') {
    console.log('✅ Paiement réussi !');
}
```

### Traitement des callbacks webhook

```typescript
import express from 'express';
import { CallbackParser } from 'mvola-merchant-pay-sdk';

const app = express();
app.use(express.json());

app.put('/webhook/mvola', (req, res) => {
    try {
        const callbackData = CallbackParser.parseCallback(req.body);
        
        if (callbackData.isCompleted) {
            console.log('✅ Paiement confirmé:', callbackData.serverCorrelationId);
            // Mettre à jour votre base de données
        } else if (callbackData.isFailed) {
            console.log('❌ Paiement échoué:', callbackData.serverCorrelationId);
            // Gérer l'échec
        }
        
        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('Erreur callback:', error.message);
        res.status(400).json({ error: 'Invalid callback format' });
    }
});