# Guide de Mise en Production

Ce document détaille les étapes nécessaires pour déployer l'application en environnement de production. Suivez attentivement cette checklist pour garantir un déploiement réussi et sécurisé.

---

## Étape 1: Configuration des Variables d'Environnement

La configuration de l'application dépend de variables d'environnement. Créez un fichier `.env` à la racine du **backend** et un autre à la racine du **frontend** avec les valeurs de production.

### 1.1. Backend (`backend/.env`)

```env
# Environnement de l'application (TRÈS IMPORTANT)
NODE_ENV=production

# Port du serveur
PORT=3001 # Ou le port fourni par votre hébergeur

# URLs de l'application
FRONTEND_URL=https://votre-domaine-frontend.com

# Configuration CORS (doit inclure l'URL du frontend et de Stripe)
CORS_ALLOWED_ORIGINS=https://votre-domaine-frontend.com,https://checkout.stripe.com

# Clés Stripe (Mode LIVE)
STRIPE_SECRET_KEY=sk_live_************************
STRIPE_PUBLISHABLE_KEY=pk_live_************************ # (Cette clé est pour le frontend)
STRIPE_WEBHOOK_SECRET=whsec_************************

# Clé d'API pour l'administration (doit être longue et sécurisée)
ADMIN_API_KEY=CHANGER_CETTE_CLE_POUR_UNE_CLE_FORTE

# Configuration des logs et des sessions
LOG_LEVEL=info
SESSION_STORAGE=file # 'file' ou 'memory'. 'file' persiste après redémarrage.
```

### 1.2. Frontend (fichier `.env` à la racine)

```env
# URL de l'API backend de production
VITE_API_URL=https://votre-domaine-backend.com

# Clé publique Stripe (Mode LIVE)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_************************

# Lien de paiement Stripe (Mode LIVE)
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/VOTRE_LIEN_LIVE
```

---

## Étape 2: Configuration de Stripe

1.  **Passez en Mode "Live"** sur votre [Dashboard Stripe](https://dashboard.stripe.com/).
2.  **Récupérez vos clés d'API "Live"** et mettez-les à jour dans les fichiers `.env` comme indiqué ci-dessus.
3.  **Configurez le Webhook de Production** :
    *   Allez dans la section `Développeurs > Webhooks`.
    *   Créez un nouvel endpoint.
    *   URL de l'endpoint : `https://<votre-domaine-backend.com>/api/stripe/webhook`.
    *   Événements à écouter : `checkout.session.completed`.
    *   Récupérez le **secret du webhook** (`whsec_...`) et ajoutez-le à la variable `STRIPE_WEBHOOK_SECRET` dans le `.env` du backend.

---

## Étape 3: Build des Applications

Avant de déployer, vous devez compiler les applications TypeScript (backend) et React (frontend) en JavaScript pur.

### 3.1. Backend

```bash
# 1. Allez dans le dossier du backend
cd backend

# 2. Installez les dépendances
npm install

# 3. Compilez le code TypeScript
npm run build
```
Ceci créera un dossier `dist` contenant le code JavaScript prêt à être exécuté.

### 3.2. Frontend

```bash
# 1. Allez à la racine du projet
cd ..

# 2. Installez les dépendances
npm install

# 3. Buildez l'application React
npm run build
```
Ceci créera un dossier `dist` (ou `build`) contenant les fichiers statiques (HTML, CSS, JS) de votre site.

---

## Étape 4: Déploiement

### 4.1. Backend

1.  **Transférez le contenu du backend** sur votre serveur de production, en incluant `dist`, `node_modules`, `package.json`, et le dossier `logs` et `sessions` si vous utilisez le stockage fichier.
2.  **N'oubliez pas votre fichier `.env`** avec les variables de production.
3.  **Démarrez le serveur** avec la commande de production :
    ```bash
    npm run start
    ```
4.  **Utilisez un gestionnaire de processus** comme `pm2` pour que votre application tourne en continu et redémarre automatiquement en cas de crash.
    ```bash
    # Installer pm2 globalement
    npm install pm2 -g

    # Démarrer l'application avec pm2
    pm2 start dist/index.js --name "marketplace-backend"
    ```

### 4.2. Frontend

1.  **Déployez le contenu du dossier `dist`** (créé à l'étape 3.2) sur un service d'hébergement statique comme Vercel, Netlify, ou un serveur web comme Nginx.
2.  Assurez-vous que votre hébergeur est configuré pour rediriger toutes les requêtes vers `index.html` pour que le routing côté client fonctionne.

---

## Étape 5: Vérifications Post-Déploiement

-   [ ] Accédez à l'URL de votre frontend et vérifiez que le site se charge.
-   [ ] Testez la communication avec le backend en vérifiant l'endpoint de santé : `https://<votre-domaine-backend.com>/health`.
-   [ ] Effectuez un test de paiement de bout en bout avec une vraie carte de crédit (vous pouvez le rembourser ensuite depuis le dashboard Stripe).
-   [ ] Vérifiez les logs du backend dans le dossier `logs/` pour vous assurer qu'il n'y a pas d'erreurs au démarrage ou lors des transactions.
-   [ ] Assurez-vous que les mesures de sécurité (limitation de débit, CORS) fonctionnent comme prévu.
