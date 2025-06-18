#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Démarrage de l'application Marketplace Scraper Pro ===${NC}"

# Vérifier si les dépendances sont installées
check_dependencies() {
  local dir=$1
  local name=$2
  
  echo -e "${YELLOW}Vérification des dépendances pour $name...${NC}"
  
  if [ ! -d "$dir/node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances pour $name...${NC}"
    cd "$dir" && npm install
    if [ $? -ne 0 ]; then
      echo -e "${RED}Erreur lors de l'installation des dépendances pour $name${NC}"
      return 1
    fi
    echo -e "${GREEN}Dépendances installées avec succès pour $name${NC}"
  else
    echo -e "${GREEN}Dépendances déjà installées pour $name${NC}"
  fi
  
  return 0
}

# Vérifier si le fichier .env existe pour le backend
check_env_file() {
  if [ ! -f "./backend/.env" ]; then
    echo -e "${YELLOW}Le fichier .env n'existe pas dans le backend. Création à partir de .env.example...${NC}"
    cp "./backend/.env.example" "./backend/.env"
    echo -e "${GREEN}Fichier .env créé. Veuillez vérifier et mettre à jour les variables d'environnement si nécessaire.${NC}"
  fi
}

# Construire le backend
build_backend() {
  echo -e "${YELLOW}Construction du backend...${NC}"
  cd backend && npm run build
  if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur lors de la construction du backend${NC}"
    return 1
  fi
  echo -e "${GREEN}Backend construit avec succès${NC}"
  return 0
}

# Fonction pour démarrer le backend
start_backend() {
  echo -e "${YELLOW}Démarrage du backend...${NC}"
  # Utiliser le chemin absolu pour le backend
  PROJECT_ROOT="$(dirname "$(realpath "$0")")"
  cd "$PROJECT_ROOT/backend" && npm run dev &
  BACKEND_PID=$!
  echo -e "${GREEN}Backend démarré avec PID: $BACKEND_PID${NC}"
  cd "$PROJECT_ROOT"
}

# Fonction pour démarrer le frontend
start_frontend() {
  echo -e "${YELLOW}Démarrage du frontend...${NC}"
  # Utiliser le chemin absolu pour le frontend
  PROJECT_ROOT="$(dirname "$(realpath "$0")")"
  cd "$PROJECT_ROOT" || return 1
  npm run dev &
  FRONTEND_PID=$!
  echo -e "${GREEN}Frontend démarré avec PID: $FRONTEND_PID${NC}"
}

# Fonction pour arrêter proprement les processus lors de la sortie
cleanup() {
  echo -e "${YELLOW}Arrêt des services...${NC}"
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}Backend arrêté${NC}"
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Frontend arrêté${NC}"
  fi
  echo -e "${BLUE}=== Application arrêtée ===${NC}"
  exit 0
}

# Capturer les signaux pour arrêter proprement
trap cleanup SIGINT SIGTERM

# Vérifier et installer les dépendances
check_dependencies "." "Frontend" || exit 1
check_dependencies "./backend" "Backend" || exit 1

# Vérifier le fichier .env
check_env_file

# Construire le backend
build_backend || exit 1

# Démarrer les services
start_backend
start_frontend

echo -e "${GREEN}=== Services démarrés avec succès ===${NC}"
echo -e "${BLUE}Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "${BLUE}Backend: ${GREEN}http://localhost:3001${NC}"
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter tous les services${NC}"

# Attendre que l'utilisateur arrête le script avec Ctrl+C
wait
