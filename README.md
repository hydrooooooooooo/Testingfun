# Marketplace Scraper Pro

## 1. Description

Marketplace Scraper Pro est une application web full-stack conçue pour automatiser la collecte de données depuis diverses marketplaces. Elle offre une interface utilisateur pour gérer les tâches de scraping, visualiser les données collectées et configurer les paramètres. Le backend gère la logique de scraping, l'authentification et la communication avec la base de données, tandis que le frontend offre une expérience utilisateur réactive pour interagir avec le système.

L'application est conçue pour être déployée dans un environnement de production et utilise Stripe pour la gestion des paiements.

## 2. Architecture et Technologies

L'application est divisée en deux composants principaux : un backend en Node.js/TypeScript et un frontend en React/Vite.

### Backend

*   **Framework** : Node.js avec Express.js
*   **Langage** : TypeScript
*   **Gestion de la base de données** : Knex.js (ORM)
*   **Base de données** :
    *   **Développement** : SQLite3
    *   **Production** : PostgreSQL
*   **Authentification** : Gestion de session basée sur les fichiers
*   **Paiements** : Intégration Stripe (via webhooks)
*   **Dépendances clés** : `express`, `knex`, `sqlite3`, `pg`, `stripe`, `cors`, `dotenv`, `ts-node-dev`

### Frontend

*   **Framework** : React
*   **Outil de build** : Vite
*   **Langage** : TypeScript
*   **Styling** : Tailwind CSS
*   **Dépendances clés** : `react`, `react-dom`, `axios`, `@stripe/react-stripe-js`

## 3. Prérequis

Avant de commencer, assurez-vous d'avoir installé les logiciels suivants sur votre machine :

*   [Node.js](https://nodejs.org/) (version 18.x ou supérieure recommandée)
*   [npm](https://www.npmjs.com/) (généralement inclus avec Node.js)
*   Un client de base de données compatible PostgreSQL (pour la production), comme [DBeaver](https://dbeaver.io/) ou [pgAdmin](https://www.pgadmin.org/).

## 4. Installation et Lancement en Développement

Suivez ces étapes pour configurer et lancer l'application sur votre machine locale.

### 4.1. Configuration du Projet

1.  **Clonez le dépôt :**
    ```bash
    git clone <URL_DU_DEPOT>
    cd git-marketplace-scraper-pro
    ```

2.  **Installez les dépendances du Frontend :**
    ```bash
    npm install
    ```

3.  **Installez les dépendances du Backend :**
    ```bash
    cd backend
    npm install
    cd ..
    ```

### 4.2. Configuration des Variables d'Environnement

Créez deux fichiers `.env` pour le développement :

1.  **Pour le Backend (`backend/.env`) :**
    ```env
    NODE_ENV=development
    PORT=3001
    FRONTEND_URL=http://localhost:5173
    CORS_ALLOWED_ORIGINS=http://localhost:5173,https://checkout.stripe.com

    # Clés Stripe (Mode TEST)
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_PUBLISHABLE_KEY=pk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...

    ADMIN_API_KEY=votre_cle_api_securisee
    LOG_LEVEL=debug
    SESSION_STORAGE=file
    ```

2.  **Pour le Frontend (`.env`) :**
    ```env
    VITE_API_BASE_URL=http://localhost:3001
    VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
    VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/test_...
    ```

### 4.3. Base de Données de Développement (SQLite)

La base de données de développement est un simple fichier SQLite qui sera créé automatiquement.

1.  **Exécutez les migrations** pour créer les tables :
    ```bash
    cd backend
    npm run knex:migrate:latest
    ```

2.  **(Optionnel) Remplissez la base de données** avec des données de test :
    ```bash
    npm run knex:seed:run
    ```

### 4.4. Lancement de l'Application

Ouvrez deux terminaux distincts.

1.  **Lancez le serveur Backend :**
    ```bash
    cd backend
    npm run dev
    ```
    Le serveur sera accessible sur `http://localhost:3001`.

2.  **Lancez l'application Frontend :**
    ```bash
    # Depuis la racine du projet
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:5173`.

## 5. Déploiement en Production sur O2Switch

Ce guide explique comment déployer l'application sur un hébergement O2Switch via un accès SSH et cPanel.

### Étape 1 : Préparation de l'Environnement O2Switch

1.  **Base de Données PostgreSQL** :
    *   Connectez-vous à votre cPanel.
    *   Allez dans `Bases de données > PostgreSQL Databases`.
    *   Créez une nouvelle base de données (ex: `user_proddb`).
    *   Créez un nouvel utilisateur et assignez-lui un mot de passe sécurisé.
    *   Ajoutez l'utilisateur à la base de données avec **tous les privilèges**.
    *   Notez le nom de la base, le nom d'utilisateur et le mot de passe.

2.  **Configuration de Node.js** :
    *   Dans cPanel, allez à `Logiciel > Setup Node.js App`.
    *   Créez une nouvelle application :
        *   **Node.js version** : Choisissez la version LTS la plus récente (ex: 18.x.x).
        *   **Application mode** : `Production`.
        *   **Application root** : `~/projets/marketplace-scraper` (ou le chemin de votre choix).
        *   **Application URL** : Choisissez le domaine/sous-domaine pour votre **backend** (ex: `api.votredomaine.com`).
        *   **Application startup file** : Laissez vide pour le moment, nous le mettrons à jour plus tard.
    *   Cliquez sur **Create**.

### Étape 2 : Déploiement du Code Source

1.  **Connectez-vous en SSH** à votre compte O2Switch.

2.  **Clonez votre projet** dans le dossier que vous avez défini comme *Application root* :
    ```bash
    # Assurez-vous d'être dans le bon répertoire
    cd ~/projets
    git clone <URL_DE_VOTRE_DEPOT_GIT> marketplace-scraper
    cd marketplace-scraper
    ```

3.  **Installez les dépendances** pour le backend et le frontend :
    ```bash
    # Frontend
    npm install

    # Backend
    cd backend
    npm install
    cd ..
    ```

### Étape 3 : Configuration de la Production

1.  **Créez le fichier d'environnement du Backend** :
    *   Utilisez un éditeur de texte comme `nano` pour créer le fichier de configuration du backend :
        ```bash
        nano backend/.env.production
        ```
    *   Ajoutez le contenu suivant, en remplaçant les valeurs par les vôtres :
        ```env
        NODE_ENV=production
        PORT= # Ce champ sera rempli par O2Switch
        FRONTEND_URL=https://votredomaine.com
        CORS_ALLOWED_ORIGINS=https://votredomaine.com,https://checkout.stripe.com

        # Base de données PostgreSQL (infos de l'Étape 1)
        DATABASE_URL="postgres://USER:PASSWORD@localhost:5432/DATABASE"

        # Clés Stripe LIVE
        STRIPE_SECRET_KEY=sk_live_...
        STRIPE_PUBLISHABLE_KEY=pk_live_...
        STRIPE_WEBHOOK_SECRET=whsec_...

        ADMIN_API_KEY=une_cle_api_tres_longue_et_securisee
        LOG_LEVEL=info
        SESSION_STORAGE=file
        ```
    *   Sauvegardez (`Ctrl+O`) et quittez (`Ctrl+X`).

2.  **Créez le fichier d'environnement du Frontend** :
    ```bash
    nano .env.production
    ```
    *   Contenu :
        ```env
        VITE_API_BASE_URL=https://api.votredomaine.com
        VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
        VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/live_...
        ```

### Étape 4 : Build des Applications

1.  **Compilez le Backend (TypeScript -> JavaScript) :**
    ```bash
    cd backend
    npm run build
    cd ..
    ```
    Cela crée un dossier `backend/dist`.

2.  **Compilez le Frontend (React -> Fichiers statiques) :**
    ```bash
    npm run build
    ```
    Cela crée un dossier `dist` à la racine.

### Étape 5 : Déploiement Final

1.  **Déployez le Frontend** :
    *   Le contenu du dossier `dist` (à la racine) doit être copié dans le dossier racine de votre site principal (généralement `~/public_html` ou un sous-dossier si vous utilisez un sous-domaine).
    *   Vous pouvez le faire via le `Gestionnaire de fichiers` de cPanel ou en ligne de commande.

2.  **Configurez et Lancez le Backend** :
    *   Retournez à `Setup Node.js App` dans cPanel.
    *   Modifiez votre application :
        *   **Application startup file** : `backend/dist/server.js`
    *   Cliquez sur **Save**.
    *   Dans la même interface, vous pouvez **Stop** et **Start** l'application pour appliquer les changements.

3.  **Exécutez les migrations de la base de données de production** :
    *   Dans votre terminal SSH, exécutez :
        ```bash
        cd ~/projets/marketplace-scraper/backend
        npm run knex:migrate:latest -- --env production
        ```

Votre application est maintenant déployée ! Le frontend est servi comme un site statique et le backend tourne comme une application Node.js.

*Document généré le 2025-07-10 à 13:15:20*

## 1. Vue d'ensemble

Cette application est un scraper de marketplace qui permet aux utilisateurs de lancer des tâches de scraping, de payer pour accéder aux résultats et de les télécharger. Elle est construite avec une architecture moderne comprenant un front-end en React et un back-end en Node.js.

## 2. Technologies Utilisées

### Front-end
- **Framework**: Vite + React
- **Langage**: TypeScript
- **UI**: shadcn-ui
- **Style**: Tailwind CSS
- **Routing**: React Router DOM
- **Gestion de données asynchrones**: TanStack React Query
- **Client HTTP**: Axios

### Back-end
- **Framework**: Express.js
- **Langage**: TypeScript
- **ORM / Query Builder**: Knex.js
- **Base de données**: SQLite (développement), PostgreSQL (production)
- **Authentification**: JWT (JSON Web Tokens)
- **Paiements**: Stripe
- **Scraping**: Apify

## 3. Structure de la Base de Données

La base de données est gérée avec Knex.js. Voici le schéma des tables principales :

### Table `users`
Stocke les informations des utilisateurs.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER` | Clé primaire auto-incrémentée. |
| `email` | `VARCHAR` | Adresse e-mail unique de l'utilisateur. |
| `password_hash` | `VARCHAR` | Hash du mot de passe. |
| `name` | `VARCHAR` | Nom de l'utilisateur. |
| `role` | `VARCHAR` | Rôle de l'utilisateur (ex: `user`, `admin`). Défaut: `user`. |
| `credits` | `INTEGER` | Nombre de crédits de l'utilisateur. Défaut: `0`. |
| `last_login` | `TIMESTAMP` | Date de la dernière connexion. |
| `email_verified_at` | `TIMESTAMP` | Date de vérification de l'e-mail. |
| `subscription_status` | `VARCHAR` | Statut de l'abonnement (ex: `free`, `premium`). Défaut: `free`. |
| `created_at`, `updated_at` | `TIMESTAMP` | Timestamps de création et de mise à jour. |

### Table `scraping_sessions`
Représente une session de scraping initiée par un utilisateur.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `VARCHAR` | Clé primaire (UUID). |
| `user_id` | `INTEGER` | Clé étrangère vers `users.id`. |
| `status` | `VARCHAR` | Statut de la session (ex: `pending`, `completed`, `failed`). |
| `actorRunId` | `VARCHAR` | ID de l'exécution de l'acteur Apify. |
| `datasetId` | `VARCHAR` | ID du dataset Apify contenant les résultats. |
| `isPaid` | `BOOLEAN` | Indique si la session a été payée. Défaut: `false`. |
| `totalItems` | `INTEGER` | Nombre total d'items scrapés. |
| `previewItems` | `JSON` | Un aperçu des premiers résultats. |
| `created_at`, `updated_at` | `TIMESTAMP` | Timestamps. |

### Table `user_purchases`
Historique des achats effectués par les utilisateurs.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER` | Clé primaire. |
| `user_id` | `INTEGER` | Clé étrangère vers `users.id`. |
| `session_id` | `VARCHAR` | Clé étrangère vers `scraping_sessions.id`. |
| `payment_intent_id` | `VARCHAR` | ID de l'intention de paiement Stripe. |
| `amount_paid` | `DECIMAL` | Montant payé. |
| `currency` | `VARCHAR` | Devise (ex: `eur`). |
| `download_url` | `VARCHAR` | URL de téléchargement des résultats. |
| `purchased_at` | `TIMESTAMP` | Date de l'achat. |

### Table `payments`
Journalise les transactions de paiement.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER` | Clé primaire. |
| `user_id` | `INTEGER` | Clé étrangère vers `users.id`. |
| `stripe_payment_id` | `VARCHAR` | ID unique du paiement Stripe. |
| `amount` | `DECIMAL` | Montant de la transaction. |
| `currency` | `VARCHAR` | Devise. |
| `status` | `VARCHAR` | Statut du paiement (ex: `succeeded`, `failed`). |
| `created_at` | `TIMESTAMP` | Date de création. |

### Table `scraping_jobs`
Représente une tâche de scraping spécifique.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER` | Clé primaire. |
| `user_id` | `INTEGER` | Clé étrangère vers `users.id`. |
| `apify_run_id` | `VARCHAR` | ID de l'exécution sur Apify. |
| `status` | `VARCHAR` | Statut du job. |
| `input_parameters` | `JSONB` | Paramètres d'entrée du job. |
| `created_at`, `finished_at` | `TIMESTAMP` | Timestamps de début et de fin. |

### Table `downloads`
Journalise les téléchargements de résultats.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER` | Clé primaire. |
| `user_id` | `INTEGER` | Clé étrangère vers `users.id`. |
| `scraping_job_id` | `INTEGER` | Clé étrangère vers `scraping_jobs.id`. |
| `format` | `VARCHAR` | Format du fichier téléchargé (ex: `csv`, `json`). |
| `file_path` | `VARCHAR` | Chemin du fichier sur le serveur. |
| `downloaded_at` | `TIMESTAMP` | Date du téléchargement. |
| `scraped_url` | `VARCHAR` | URL qui a été scrapée. |

## 4. Configuration de l'Environnement

Créez les fichiers `.env` suivants et remplissez les variables.

### Fichier `.env` (à la racine du projet pour le front-end)

```
VITE_API_BASE_URL=http://localhost:3001/api
VITE_STRIPE_PAYMENT_LINK=<VOTRE_LIEN_DE_PAIEMENT_STRIPE>
```

### Fichier `backend/.env` (pour le back-end)

```
# Configuration du serveur
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Base de données
# En développement, le projet utilise une base de données SQLite locale (`backend/data/dev.sqlite3`) qui ne nécessite pas d'identifiants.
# En production, vous devez fournir la chaîne de connexion à votre base de données PostgreSQL ci-dessous.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Clés d'API et secrets
APIFY_TOKEN=<VOTRE_TOKEN_APIFY>
APIFY_ACTOR_ID=<VOTRE_ID_ACTEUR_APIFY>
STRIPE_SECRET_KEY=<VOTRE_CLE_SECRETE_STRIPE>
STRIPE_WEBHOOK_SECRET=<VOTRE_SECRET_WEBHOOK_STRIPE>
ADMIN_API_KEY=<VOTRE_CLE_API_ADMIN>
JWT_SECRET=<VOTRE_SECRET_JWT_TRES_LONG_ET_COMPLEXE>

# Configuration de la session
SESSION_STORAGE=memory # ou 'database'

# Configuration du logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## 5. Installation et Lancement

Suivez ces étapes pour lancer l'application en local.

1.  **Clonez le dépôt** :
    ```sh
    git clone <URL_DU_DEPOT>
    cd <NOM_DU_PROJET>
    ```

2.  **Installez les dépendances du Front-end** :
    ```sh
    npm install
    ```

3.  **Installez les dépendances du Back-end** :
    ```sh
    cd backend
    npm install
    ```

4.  **Configurez les variables d'environnement** :
    - Créez et remplissez le fichier `.env` à la racine.
    - Créez et remplissez le fichier `backend/.env`.

5.  **Lancez les migrations de la base de données** (depuis le dossier `backend`) :
    ```sh
    npx knex migrate:latest
    ```
    *Note : Ceci créera et utilisera une base de données SQLite `data/dev.sqlite3` en environnement de développement.*

6.  **Lancez le serveur Back-end** (depuis le dossier `backend`) :
    ```sh
    npm run dev
    ```
    Le serveur sera accessible sur `http://localhost:3001`.

7.  **Lancez l'application Front-end** (depuis la racine du projet) :
    ```sh
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:5173`.
