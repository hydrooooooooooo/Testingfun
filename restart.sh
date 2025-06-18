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

echo -e "${BLUE}=== Script de démarrage/redémarrage du Marketplace Scraper Pro ===${NC}"

# Fonction pour arrêter les processus existants
stop_processes() {
  echo -e "${YELLOW}Arrêt des processus existants...${NC}"
  
  # Arrêter les processus Node.js liés au projet
  pkill -f "node.*marketplace-scraper-pro" 2>/dev/null
  
  # Attendre un peu pour s'assurer que les processus sont bien arrêtés
  sleep 2
  
  echo -e "${GREEN}Processus arrêtés avec succès.${NC}"
}

# Fonction pour démarrer le backend
start_backend() {
  echo -e "${YELLOW}Démarrage du serveur backend...${NC}"
  cd "$BACKEND_DIR" || { echo -e "${RED}Impossible d'accéder au répertoire backend${NC}"; exit 1; }
  
  # Démarrer le serveur backend en arrière-plan
  npm run dev &
  BACKEND_PID=$!
  
  # Attendre que le serveur soit prêt
  echo -e "${YELLOW}Attente du démarrage du serveur backend...${NC}"
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}Serveur backend démarré avec succès (PID: $BACKEND_PID)${NC}"
  else
    echo -e "${RED}Échec du démarrage du serveur backend${NC}"
    exit 1
  fi
}

# Fonction pour démarrer le frontend
start_frontend() {
  echo -e "${YELLOW}Démarrage du serveur frontend...${NC}"
  cd "$FRONTEND_DIR" || { echo -e "${RED}Impossible d'accéder au répertoire frontend${NC}"; exit 1; }
  
  # Démarrer le serveur frontend en arrière-plan
  npm run dev &
  FRONTEND_PID=$!
  
  # Attendre que le serveur soit prêt
  echo -e "${YELLOW}Attente du démarrage du serveur frontend...${NC}"
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}Serveur frontend démarré avec succès (PID: $FRONTEND_PID)${NC}"
  else
    echo -e "${RED}Échec du démarrage du serveur frontend${NC}"
    exit 1
  fi
}

# Fonction principale
main() {
  # Arrêter les processus existants
  stop_processes
  
  # Démarrer le backend
  start_backend
  
  # Démarrer le frontend
  start_frontend
  
  echo -e "${GREEN}=== Tous les services sont démarrés ! ===${NC}"
  echo -e "${BLUE}Backend: http://localhost:3001${NC}"
  echo -e "${BLUE}Frontend: http://localhost:8080${NC}"
  echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter tous les services${NC}"
  
  # Attendre que l'utilisateur appuie sur Ctrl+C
  wait
}

# Exécuter la fonction principale
main
