#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Répertoires du projet
PROJECT_DIR="$(pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"
LOG_DIR="$PROJECT_DIR/logs"

# Créer le répertoire de logs s'il n'existe pas
mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# Fichiers pour stocker les PIDs
BACKEND_PID_FILE="/tmp/marketplace-scraper-backend.pid"
FRONTEND_PID_FILE="/tmp/marketplace-scraper-frontend.pid"

# Afficher l'aide
show_help() {
  echo -e "${BLUE}=== Gestionnaire de services Marketplace Scraper Pro ===${NC}"
  echo -e "Usage: $0 [option]"
  echo -e ""
  echo -e "Options:"
  echo -e "  ${GREEN}start${NC}       Démarrer tous les services"
  echo -e "  ${GREEN}stop${NC}        Arrêter tous les services"
  echo -e "  ${GREEN}restart${NC}     Redémarrer tous les services"
  echo -e "  ${GREEN}status${NC}      Afficher l'état des services"
  echo -e "  ${GREEN}logs${NC}        Afficher les logs en temps réel"
  echo -e "  ${GREEN}backend${NC}     Démarrer uniquement le backend"
  echo -e "  ${GREEN}frontend${NC}    Démarrer uniquement le frontend"
  echo -e "  ${GREEN}help${NC}        Afficher cette aide"
  echo -e ""
  echo -e "Exemples:"
  echo -e "  $0 start     # Démarrer tous les services"
  echo -e "  $0 logs      # Afficher les logs en temps réel"
}

# Vérifier si un service est en cours d'exécution
is_running() {
  local pid_file=$1
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if ps -p "$pid" > /dev/null; then
      return 0 # En cours d'exécution
    fi
  fi
  return 1 # Pas en cours d'exécution
}

# Arrêter les processus existants
stop_processes() {
  echo -e "${YELLOW}Arrêt des services...${NC}"
  
  # Arrêter le backend
  if is_running "$BACKEND_PID_FILE"; then
    local pid=$(cat "$BACKEND_PID_FILE")
    echo -e "${YELLOW}Arrêt du backend (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null
    rm -f "$BACKEND_PID_FILE"
  else
    echo -e "${CYAN}Le backend n'est pas en cours d'exécution.${NC}"
  fi
  
  # Arrêter le frontend
  if is_running "$FRONTEND_PID_FILE"; then
    local pid=$(cat "$FRONTEND_PID_FILE")
    echo -e "${YELLOW}Arrêt du frontend (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null
    rm -f "$FRONTEND_PID_FILE"
  else
    echo -e "${CYAN}Le frontend n'est pas en cours d'exécution.${NC}"
  fi
  
  # S'assurer que tous les processus liés sont arrêtés
  pkill -f "node.*marketplace-scraper-pro" 2>/dev/null
  
  # Attendre un peu pour s'assurer que les processus sont bien arrêtés
  sleep 2
  
  echo -e "${GREEN}Services arrêtés avec succès.${NC}"
}

# Démarrer le backend
start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    echo -e "${YELLOW}Le backend est déjà en cours d'exécution (PID: $(cat "$BACKEND_PID_FILE"))${NC}"
    return
  fi

  echo -e "${YELLOW}Démarrage du serveur backend...${NC}"
  cd "$BACKEND_DIR" || { echo -e "${RED}Impossible d'accéder au répertoire backend${NC}"; exit 1; }
  
  # Démarrer le serveur backend en arrière-plan et rediriger la sortie vers un fichier de log
  npm run dev > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
  
  # Enregistrer le PID
  echo $BACKEND_PID > "$BACKEND_PID_FILE"
  
  # Attendre que le serveur soit prêt
  echo -e "${YELLOW}Attente du démarrage du serveur backend...${NC}"
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}Serveur backend démarré avec succès (PID: $BACKEND_PID)${NC}"
    echo -e "${CYAN}Logs disponibles dans: $BACKEND_LOG${NC}"
  else
    echo -e "${RED}Échec du démarrage du serveur backend${NC}"
    echo -e "${RED}Vérifiez les logs pour plus d'informations: $BACKEND_LOG${NC}"
    rm -f "$BACKEND_PID_FILE"
    exit 1
  fi
}

# Démarrer le frontend
start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    echo -e "${YELLOW}Le frontend est déjà en cours d'exécution (PID: $(cat "$FRONTEND_PID_FILE"))${NC}"
    return
  fi

  echo -e "${YELLOW}Démarrage du serveur frontend...${NC}"
  cd "$FRONTEND_DIR" || { echo -e "${RED}Impossible d'accéder au répertoire frontend${NC}"; exit 1; }
  
  # Démarrer le serveur frontend en arrière-plan et rediriger la sortie vers un fichier de log
  npm run dev > "$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!
  
  # Enregistrer le PID
  echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
  
  # Attendre que le serveur soit prêt
  echo -e "${YELLOW}Attente du démarrage du serveur frontend...${NC}"
  sleep 5
  
  # Vérifier si le serveur est en cours d'exécution
  if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}Serveur frontend démarré avec succès (PID: $FRONTEND_PID)${NC}"
    echo -e "${CYAN}Logs disponibles dans: $FRONTEND_LOG${NC}"
  else
    echo -e "${RED}Échec du démarrage du serveur frontend${NC}"
    echo -e "${RED}Vérifiez les logs pour plus d'informations: $FRONTEND_LOG${NC}"
    rm -f "$FRONTEND_PID_FILE"
    exit 1
  fi
}

# Afficher l'état des services
show_status() {
  echo -e "${BLUE}=== État des services Marketplace Scraper Pro ===${NC}"
  
  # Vérifier le backend
  if is_running "$BACKEND_PID_FILE"; then
    local pid=$(cat "$BACKEND_PID_FILE")
    echo -e "${GREEN}Backend: En cours d'exécution (PID: $pid)${NC}"
  else
    echo -e "${RED}Backend: Arrêté${NC}"
  fi
  
  # Vérifier le frontend
  if is_running "$FRONTEND_PID_FILE"; then
    local pid=$(cat "$FRONTEND_PID_FILE")
    echo -e "${GREEN}Frontend: En cours d'exécution (PID: $pid)${NC}"
  else
    echo -e "${RED}Frontend: Arrêté${NC}"
  fi
  
  echo -e "${BLUE}URLs:${NC}"
  echo -e "  Backend: http://localhost:3001"
  echo -e "  Frontend: http://localhost:8080"
}

# Afficher les logs en temps réel
show_logs() {
  echo -e "${YELLOW}Affichage des logs en temps réel (Ctrl+C pour quitter)...${NC}"
  tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
}

# Fonction principale
main() {
  case "$1" in
    start)
      stop_processes
      start_backend
      start_frontend
      show_status
      ;;
    stop)
      stop_processes
      ;;
    restart)
      stop_processes
      start_backend
      start_frontend
      show_status
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs
      ;;
    backend)
      stop_processes
      start_backend
      ;;
    frontend)
      stop_processes
      start_frontend
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      show_help
      ;;
  esac
}

# Exécuter la fonction principale avec les arguments
main "$@"
