#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Répertoires du projet
PROJECT_DIR="$(pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"

echo -e "${BLUE}=== Script de démarrage de l'environnement de PRODUCTION ===${NC}"

# Fonction pour arrêter les processus existants
stop_processes() {
  echo -e "${YELLOW}Arrêt des processus Node.js existants...${NC}"
  pkill -f "node" 2>/dev/null
  sleep 2
  echo -e "${GREEN}Processus arrêtés avec succès.${NC}"
}

# Fonction pour démarrer le backend en mode production
start_backend_prod() {
  echo -e "${YELLOW}Démarrage du serveur backend en mode PRODUCTION...${NC}"
  cd "$BACKEND_DIR" || { echo -e "${RED}Impossible d'accéder au répertoire backend${NC}"; exit 1; }
  
  npm run dev:prod & 
  BACKEND_PID=$!
  
  echo -e "${YELLOW}Attente du démarrage du serveur backend...${NC}"
  sleep 8 # Donner un peu plus de temps pour le mode prod
  
  if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}Serveur backend (production) démarré avec succès (PID: $BACKEND_PID)${NC}"
  else
    echo -e "${RED}Échec du démarrage du serveur backend de production${NC}"
    exit 1
  fi
}

# Fonction pour compiler et servir le frontend en mode production
start_frontend_prod() {
  echo -e "${YELLOW}Compilation et démarrage du frontend en mode PRODUCTION...${NC}"
  cd "$FRONTEND_DIR" || { echo -e "${RED}Impossible d'accéder au répertoire frontend${NC}"; exit 1; }
  
  echo -e "${YELLOW}Compilation des fichiers frontend (build)...${NC}"
  npm run build
  
  echo -e "${YELLOW}Démarrage du serveur de prévisualisation (preview)...${NC}"
  npm run preview &
  FRONTEND_PID=$!
  
  sleep 5
  
  if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}Serveur frontend (production) démarré avec succès (PID: $FRONTEND_PID)${NC}"
  else
    echo -e "${RED}Échec du démarrage du serveur frontend de production${NC}"
    exit 1
  fi
}

# Exécution du script
stop_processes
start_backend_prod
start_frontend_prod

echo -e "${BLUE}=== Tous les services de PRODUCTION sont démarrés ! ===${NC}"
echo -e "Backend:  http://localhost:3001"
echo -e "Frontend: http://localhost:4173"
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter tous les services (via le terminal où le script a été lancé).${NC}"

# Garder le script en vie pour pouvoir arrêter les processus avec Ctrl+C
wait
