# Documentation de l'Application Marketplace Scraper

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
