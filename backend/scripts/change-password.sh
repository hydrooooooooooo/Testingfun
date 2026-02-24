#!/bin/bash
# ============================================================================
# SCRIPT DE CHANGEMENT DE MOT DE PASSE - Marketplace Scraper Pro (PostgreSQL)
# ============================================================================
# Usage: ./change-password.sh [email]
#
# Ce script change le mot de passe d'un utilisateur en production.
# Le hash bcrypt est généré via Node.js (bcryptjs).
#
# Exemples:
#   ./change-password.sh admin@example.com
#   ./change-password.sh                     # demande l'email interactivement
# ============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================================
# CONFIGURATION POSTGRESQL - O2SWITCH PRODUCTION
# ============================================================================
DATABASE_URL="postgresql://wogo4385_easyscrapy:3asYScrapYP0stGress!2025@localhost:5432/wogo4385_easyscrapy_db"

# ============================================================================
# MAIN
# ============================================================================

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  CHANGEMENT DE MOT DE PASSE${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# 1. Identifier l'utilisateur
EMAIL="${1:-}"
if [ -z "$EMAIL" ]; then
    echo -e "${YELLOW}Utilisateurs disponibles:${NC}"
    psql "$DATABASE_URL" -c "
    SELECT id, email, name, role
    FROM users
    ORDER BY role DESC, id ASC;
    "
    echo ""
    read -p "Email de l'utilisateur: " EMAIL
fi

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Aucun email fourni. Abandon.${NC}"
    exit 1
fi

# 2. Vérifier que l'utilisateur existe
USER_INFO=$(psql "$DATABASE_URL" -t -A -c "SELECT id, name, role FROM users WHERE email = '$EMAIL';")

if [ -z "$USER_INFO" ]; then
    echo -e "${RED}Utilisateur non trouvé: $EMAIL${NC}"
    exit 1
fi

USER_ID=$(echo "$USER_INFO" | cut -d'|' -f1)
USER_NAME=$(echo "$USER_INFO" | cut -d'|' -f2)
USER_ROLE=$(echo "$USER_INFO" | cut -d'|' -f3)

echo -e "${GREEN}Utilisateur trouvé:${NC}"
echo -e "  ID:    ${BOLD}$USER_ID${NC}"
echo -e "  Nom:   ${BOLD}$USER_NAME${NC}"
echo -e "  Email: ${BOLD}$EMAIL${NC}"
echo -e "  Role:  ${BOLD}$USER_ROLE${NC}"
echo ""

# 3. Demander le nouveau mot de passe
read -s -p "Nouveau mot de passe: " NEW_PASSWORD
echo ""
read -s -p "Confirmer le mot de passe: " CONFIRM_PASSWORD
echo ""
echo ""

if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
    echo -e "${RED}Les mots de passe ne correspondent pas. Abandon.${NC}"
    exit 1
fi

if [ ${#NEW_PASSWORD} -lt 8 ]; then
    echo -e "${RED}Le mot de passe doit faire au moins 8 caracteres. Abandon.${NC}"
    exit 1
fi

# 4. Hasher le mot de passe avec bcryptjs via Node.js
echo -e "${YELLOW}Hashage du mot de passe...${NC}"

HASHED_PASSWORD=$(node -e "
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(process.argv[1], salt);
process.stdout.write(hash);
" "$NEW_PASSWORD")

if [ -z "$HASHED_PASSWORD" ]; then
    echo -e "${RED}Erreur lors du hashage. Verifiez que bcryptjs est installe (npm install bcryptjs).${NC}"
    exit 1
fi

# 5. Mettre a jour en base
echo -e "${YELLOW}Mise a jour en base de donnees...${NC}"

psql "$DATABASE_URL" -c "
UPDATE users
SET
    password_hash = '$HASHED_PASSWORD',
    password_changed_at = NOW(),
    reset_token = NULL,
    reset_token_expires_at = NULL,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE email = '$EMAIL';
"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Mot de passe modifie avec succes !${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Utilisateur: ${BOLD}$EMAIL${NC}"
echo -e "  Role:        ${BOLD}$USER_ROLE${NC}"
echo ""
echo -e "${YELLOW}Note: L'utilisateur devra se reconnecter.${NC}"
echo -e "${YELLOW}Les sessions JWT existantes resteront valides jusqu'a expiration (7j).${NC}"
