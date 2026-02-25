#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Répertoires
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"
DEPLOY_DIR="$PROJECT_ROOT/DEPLOY-O2SWITCH"
BACKEND_DEPLOY="$DEPLOY_DIR/BACKEND-backend_scrapy"
FRONTEND_DEPLOY="$DEPLOY_DIR/FRONTEND-public_html"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Build automatique pour O2Switch${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Fonction pour afficher les erreurs et quitter
error_exit() {
    echo -e "${RED}❌ Erreur: $1${NC}" >&2
    exit 1
}

# Fonction pour afficher les succès
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les infos
info_msg() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Nettoyer le dossier de déploiement précédent
info_msg "Nettoyage du dossier de déploiement..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$BACKEND_DEPLOY"
mkdir -p "$FRONTEND_DEPLOY"
# Préserver le dossier data/backups lors du rsync --delete
mkdir -p "$BACKEND_DEPLOY/data/backups"
touch "$BACKEND_DEPLOY/data/backups/.gitkeep"
success_msg "Dossiers de déploiement créés"

# ========================================
# BUILD BACKEND
# ========================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  1. Build du Backend${NC}"
echo -e "${BLUE}========================================${NC}\n"

cd "$BACKEND_DIR" || error_exit "Impossible d'accéder au dossier backend"

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    info_msg "Installation des dépendances backend..."
    npm install || error_exit "Échec de l'installation des dépendances backend"
    success_msg "Dépendances backend installées"
else
    info_msg "Dépendances backend déjà installées"
fi

# Build du SDK Mvola si présent
if [ -d "mvola-sdk" ]; then
    info_msg "Compilation du SDK Mvola..."
    cd mvola-sdk || error_exit "Impossible d'accéder au dossier mvola-sdk"
    
    # Installer les dépendances de mvola-sdk si nécessaire
    if [ ! -d "node_modules" ]; then
        npm install || error_exit "Échec de l'installation des dépendances mvola-sdk"
    fi
    
    # Compiler mvola-sdk
    npm run build || error_exit "Échec de la compilation de mvola-sdk"
    success_msg "SDK Mvola compilé avec succès"
    
    cd "$BACKEND_DIR" || error_exit "Impossible de revenir au dossier backend"
else
    info_msg "SDK Mvola non trouvé, passage ignoré"
fi

# Build du backend
info_msg "Compilation du backend TypeScript..."
# Utilisation du fichier tsconfig.production.json permissif
npx tsc --project tsconfig.production.json || error_exit "Échec de la compilation du backend"
success_msg "Backend compilé avec succès"

# Copier les fichiers backend
info_msg "Copie des fichiers backend..."
cp -r dist "$BACKEND_DEPLOY/"
cp package.json "$BACKEND_DEPLOY/"
cp package-lock.json "$BACKEND_DEPLOY/" 2>/dev/null || true

# Copier les fichiers de configuration nécessaires
if [ -f ".env.production" ]; then
    cp .env.production "$BACKEND_DEPLOY/.env"
    success_msg "Fichier .env.production copié"
elif [ -f ".env" ]; then
    info_msg "Attention: Copie du fichier .env (pensez à vérifier les variables pour la production)"
    cp .env "$BACKEND_DEPLOY/.env"
else
    info_msg "Attention: Aucun fichier .env trouvé. Vous devrez le créer manuellement."
fi

# Copier le SDK mvola si présent
if [ -d "mvola-sdk" ]; then
    cp -r mvola-sdk "$BACKEND_DEPLOY/"
    success_msg "SDK Mvola copié"
fi

# Copier les migrations de base de données
if [ -d "migrations" ]; then
    cp -r migrations "$BACKEND_DEPLOY/"
    success_msg "Migrations de base de données copiées"
fi

success_msg "Fichiers backend copiés"

# ========================================
# BUILD FRONTEND
# ========================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  2. Build du Frontend${NC}"
echo -e "${BLUE}========================================${NC}\n"

cd "$FRONTEND_DIR" || error_exit "Impossible d'accéder au dossier frontend"

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    info_msg "Installation des dépendances frontend..."
    npm install || error_exit "Échec de l'installation des dépendances frontend"
    success_msg "Dépendances frontend installées"
else
    info_msg "Dépendances frontend déjà installées"
fi

# Build du frontend en mode production
info_msg "Compilation du frontend React..."
npm run build || error_exit "Échec de la compilation du frontend"
success_msg "Frontend compilé avec succès"

# Copier les fichiers frontend
info_msg "Copie des fichiers frontend..."
cp -r dist/* "$FRONTEND_DEPLOY/"
success_msg "Fichiers frontend copiés"

# ========================================
# INSTALLATION DES DÉPENDANCES DE PRODUCTION
# ========================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  3. Installation des dépendances de production${NC}"
echo -e "${BLUE}========================================${NC}\n"

cd "$BACKEND_DEPLOY" || error_exit "Impossible d'accéder au dossier backend de déploiement"

info_msg "Installation des dépendances de production uniquement..."
npm install --omit=dev || error_exit "Échec de l'installation des dépendances de production"
success_msg "Dépendances de production installées"

# ========================================
# CRÉATION DES FICHIERS DE CONFIGURATION
# ========================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  4. Création des fichiers de configuration${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Créer .htaccess pour le frontend
cat > "$FRONTEND_DEPLOY/.htaccess" << 'EOF'
# Configuration Apache pour React Router et proxy API

RewriteEngine On

# Rediriger les requêtes /api vers le backend Node.js sur le port 3001
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# Pour React Router - rediriger toutes les autres routes vers index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule . /index.html [L]

# Compression Gzip
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache des fichiers statiques
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Sécurité
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
EOF

success_msg "Fichier .htaccess créé pour le frontend"

# Créer script de démarrage pour le backend
cat > "$BACKEND_DEPLOY/start.sh" << 'EOF'
#!/bin/bash

# Script de démarrage pour O2Switch
cd "$(dirname "$0")"

# Charger les variables d'environnement (méthode robuste pour éviter les erreurs de commentaires)
if [ -f .env ]; then
    set -a
    while IFS='=' read -r key value; do
        # Ignorer les lignes vides et les commentaires
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        # Supprimer les espaces autour
        key=$(echo "$key" | xargs)
        # Exporter seulement si la clé est valide
        if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
            export "$key=$value"
        fi
    done < .env
    set +a
fi

# ============================================================================
# CONFIGURATION PERFORMANCE - Optimisé pour O2Switch (192GB RAM, 72 CPU)
# ============================================================================

# Détecter la RAM disponible (en MB)
TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo "4096")

# Calculer automatiquement les limites (75% de la RAM pour Node.js, max 4GB)
if [ -z "$NODE_MAX_HEAP_MB" ]; then
    NODE_MAX_HEAP_MB=$((TOTAL_RAM_MB * 75 / 100))
    # Minimum 256MB, Maximum 4096MB
    [ $NODE_MAX_HEAP_MB -lt 256 ] && NODE_MAX_HEAP_MB=256
    [ $NODE_MAX_HEAP_MB -gt 4096 ] && NODE_MAX_HEAP_MB=4096
fi

# Calculer le seuil d'alerte mémoire (60% du heap max)
if [ -z "$MEMORY_THRESHOLD_MB" ]; then
    export MEMORY_THRESHOLD_MB=$((NODE_MAX_HEAP_MB * 60 / 100))
fi

# UV_THREADPOOL_SIZE pour les opérations I/O asynchrones
# Recommandé: nombre de CPU * 2, min 4, max 128
if [ -z "$UV_THREADPOOL_SIZE" ]; then
    CPU_COUNT=$(nproc 2>/dev/null || echo "4")
    export UV_THREADPOOL_SIZE=$((CPU_COUNT * 2))
    [ $UV_THREADPOOL_SIZE -lt 4 ] && UV_THREADPOOL_SIZE=4
    [ $UV_THREADPOOL_SIZE -gt 128 ] && UV_THREADPOOL_SIZE=128
fi

# Pool de connexions DB (si non défini dans .env)
if [ -z "$DB_POOL_MAX" ]; then
    export DB_POOL_MAX=20
fi

# Options Node.js pour la production
export NODE_OPTIONS="--max-old-space-size=${NODE_MAX_HEAP_MB}"

# Afficher la configuration
echo "============================================"
echo "Configuration Performance:"
echo "  RAM Totale: ${TOTAL_RAM_MB}MB"
echo "  Heap Max Node.js: ${NODE_MAX_HEAP_MB}MB"
echo "  Seuil Alerte Mémoire: ${MEMORY_THRESHOLD_MB}MB"
echo "  UV_THREADPOOL_SIZE: ${UV_THREADPOOL_SIZE}"
echo "  DB_POOL_MAX: ${DB_POOL_MAX}"
echo "  NODE_ENV: ${NODE_ENV:-production}"
echo "============================================"

# Démarrer le serveur Node.js
node dist/index.js
EOF

chmod +x "$BACKEND_DEPLOY/start.sh"
success_msg "Script start.sh créé pour le backend (avec config performance optimisée)"

# ========================================
# CRÉATION DU GUIDE DE DÉPLOIEMENT
# ========================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  5. Création du guide de déploiement${NC}"
echo -e "${BLUE}========================================${NC}\n"

cat > "$DEPLOY_DIR/GUIDE-DEPLOIEMENT.txt" << 'GUIDE_EOF'
================================================================================
                    GUIDE DE DEPLOIEMENT O2SWITCH
================================================================================

CONTENU DU PACKAGE
------------------
DEPLOY-O2SWITCH/
├── BACKEND-backend_scrapy/     <- A copier vers /home/wogo4385/backend_scrapy
├── FRONTEND-public_html/       <- A copier vers /home/wogo4385/public_html
└── GUIDE-DEPLOIEMENT.txt       <- Ce fichier

================================================================================
ETAPE 1 : UPLOAD DES FICHIERS
================================================================================

Via FTP/SFTP (FileZilla, Cyberduck, etc.) :
-------------------------------------------
1. Backend :
   - Connectez-vous en SFTP à votre serveur O2Switch
   - Uploadez TOUT le contenu de BACKEND-backend_scrapy/
     vers /home/wogo4385/backend_scrapy/

2. Frontend :
   - Uploadez TOUT le contenu de FRONTEND-public_html/
     vers /home/wogo4385/public_html/
   - ATTENTION : Ne supprimez pas le dossier api/ s'il existe déjà

Via ligne de commande (rsync) :
-------------------------------
# Backend (--exclude='data/' preserve les backups existants)
rsync -avz --delete --exclude='data/' BACKEND-backend_scrapy/ \
  wogo4385@votre-serveur.o2switch.net:/home/wogo4385/backend_scrapy/

# Frontend (sans supprimer le dossier api existant)
rsync -avz --exclude='api' FRONTEND-public_html/ \
  wogo4385@votre-serveur.o2switch.net:/home/wogo4385/public_html/

================================================================================
ETAPE 2 : CONFIGURATION DU BACKEND
================================================================================

1. Connexion SSH :
   ssh wogo4385@votre-serveur.o2switch.net

2. Aller dans le dossier backend :
   cd /home/wogo4385/backend_scrapy

3. Vérifier/éditer le fichier .env :
   nano .env

   Variables importantes :
   -----------------------
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://user:password@localhost:5432/marketplace_scraper
   JWT_SECRET=votre_secret_jwt_super_securise
   APIFY_API_TOKEN=votre_token_apify
   APIFY_ACTOR_ID=votre_actor_id
   STRIPE_SECRET_KEY=sk_live_...
   FRONTEND_URL=https://votredomaine.com
   BACKEND_URL=https://votredomaine.com/api

4. Exécuter les migrations de base de données :
   npm run db:migrate

================================================================================
ETAPE 3 : DEMARRAGE DU BACKEND
================================================================================

Option 1 : Démarrage simple (pour tester)
-----------------------------------------
cd /home/wogo4385/backend_scrapy
node dist/index.js

Option 2 : Avec PM2 (RECOMMANDE pour production)
------------------------------------------------
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
pm2 start dist/index.js --name "marketplace-backend"

# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique
pm2 startup

================================================================================
ETAPE 4 : VERIFICATION
================================================================================

Backend :
--------
# Vérifier que le backend tourne
ps aux | grep node

# Vérifier que le port 3001 écoute
netstat -tlnp | grep 3001

# Tester l'API
curl http://localhost:3001/api/health

Frontend :
---------
# Accéder à votre domaine
https://votredomaine.com

# Vérifier que l'application se charge correctement
# Tester une requête API pour vérifier le proxy

================================================================================
COMMANDES UTILES
================================================================================

PM2 :
----
pm2 logs marketplace-backend    # Voir les logs
pm2 restart marketplace-backend # Redémarrer
pm2 stop marketplace-backend    # Arrêter
pm2 status                      # Voir le statut

Base de données :
----------------
cd /home/wogo4385/backend_scrapy
npm run db:migrate              # Exécuter les migrations

================================================================================
CHECKLIST DE DEPLOIEMENT
================================================================================

[ ] Backend uploadé vers /home/wogo4385/backend_scrapy/
[ ] Frontend uploadé vers /home/wogo4385/public_html/
[ ] Fichier .env configuré avec les bonnes variables
[ ] Base de données PostgreSQL créée et accessible
[ ] Migrations de base de données exécutées
[ ] Backend démarré (via PM2 ou node)
[ ] Fichier .htaccess présent dans public_html/
[ ] Application accessible via le navigateur
[ ] API backend accessible via /api/*

================================================================================
DEPANNAGE
================================================================================

Le backend ne démarre pas :
--------------------------
- Vérifiez les logs : pm2 logs marketplace-backend
- Vérifiez le fichier .env
- Vérifiez que PostgreSQL est accessible

Le frontend affiche une page blanche :
--------------------------------------
- Vérifiez que le fichier .htaccess est présent
- Vérifiez les permissions (644 pour fichiers, 755 pour dossiers)
- Vérifiez la console du navigateur pour les erreurs

Les requêtes API échouent :
--------------------------
- Vérifiez que le backend tourne sur le port 3001
- Vérifiez la configuration du proxy dans .htaccess
- Vérifiez les CORS dans le backend

================================================================================
GUIDE_EOF

success_msg "Guide de déploiement créé"

# ========================================
# RÉSUMÉ FINAL
# ========================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  BUILD TERMINE AVEC SUCCES !${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${CYAN}Fichiers prets pour O2Switch :${NC}\n"
echo -e "${MAGENTA}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${MAGENTA}│${NC} ${YELLOW}BACKEND${NC}  -> ${BLUE}BACKEND-backend_scrapy/${NC}                  ${MAGENTA}│${NC}"
echo -e "${MAGENTA}│${NC}   A copier vers: ${GREEN}/home/wogo4385/backend_scrapy/${NC}    ${MAGENTA}│${NC}"
echo -e "${MAGENTA}├─────────────────────────────────────────────────────────┤${NC}"
echo -e "${MAGENTA}│${NC} ${YELLOW}FRONTEND${NC} -> ${BLUE}FRONTEND-public_html/${NC}                   ${MAGENTA}│${NC}"
echo -e "${MAGENTA}│${NC}   A copier vers: ${GREEN}/home/wogo4385/public_html/${NC}       ${MAGENTA}│${NC}"
echo -e "${MAGENTA}└─────────────────────────────────────────────────────────┘${NC}\n"

echo -e "${CYAN}Documentation :${NC}"
echo -e "   • ${BLUE}GUIDE-DEPLOIEMENT.txt${NC} - Guide complet de déploiement\n"

echo -e "${YELLOW}Prochaines etapes :${NC}"
echo -e "   ${GREEN}1.${NC} Ouvrir le dossier ${BLUE}DEPLOY-O2SWITCH/${NC}"
echo -e "   ${GREEN}2.${NC} Lire ${BLUE}GUIDE-DEPLOIEMENT.txt${NC}"
echo -e "   ${GREEN}3.${NC} Copier ${BLUE}BACKEND-backend_scrapy/${NC} vers le serveur"
echo -e "   ${GREEN}4.${NC} Copier ${BLUE}FRONTEND-public_html/${NC} vers le serveur"
echo -e "   ${GREEN}5.${NC} Configurer le fichier ${BLUE}.env${NC} sur le serveur"
echo -e "   ${GREEN}6.${NC} Demarrer le backend avec PM2\n"

echo -e "${GREEN}Votre application est prete pour le deploiement !${NC}\n"

# Ouvrir le dossier de déploiement
if command -v open &> /dev/null; then
    open "$DEPLOY_DIR"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$DEPLOY_DIR"
fi
