#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOG_DIR="$PROJECT_ROOT/logs"

mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   EasyScrapy - Démarrage environnement dev   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

# ─── 1. Tout couper proprement ───
echo -e "\n${YELLOW}[1/5] Arrêt des processus existants...${NC}"
pkill -f "ts-node-dev" 2>/dev/null
pkill -f "vite.*marketplace-scraper" 2>/dev/null
# Aussi tuer par ports
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 2
echo -e "${GREEN}  ✓ Processus arrêtés${NC}"

# ─── 2. Vérifier PostgreSQL ───
echo -e "\n${YELLOW}[2/5] Vérification PostgreSQL...${NC}"
if pg_isready -q 2>/dev/null; then
  echo -e "${GREEN}  ✓ PostgreSQL est en marche${NC}"
else
  echo -e "${RED}  ✗ PostgreSQL n'est pas démarré !${NC}"
  echo -e "${YELLOW}  Tentative de démarrage...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  sleep 3
  if pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}  ✓ PostgreSQL démarré avec succès${NC}"
  else
    echo -e "${RED}  ✗ Impossible de démarrer PostgreSQL. Vérifiez votre installation.${NC}"
    exit 1
  fi
fi

# ─── 3. Vérifier les dépendances ───
echo -e "\n${YELLOW}[3/5] Vérification des dépendances...${NC}"
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}  Installation des dépendances backend...${NC}"
  cd "$BACKEND_DIR" && npm install
  cd "$PROJECT_ROOT"
fi
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo -e "${YELLOW}  Installation des dépendances frontend...${NC}"
  cd "$PROJECT_ROOT" && npm install
fi
echo -e "${GREEN}  ✓ Dépendances OK${NC}"

# ─── 4. Démarrer le backend ───
echo -e "\n${YELLOW}[4/5] Démarrage du backend...${NC}"
cd "$BACKEND_DIR"
npm run dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd "$PROJECT_ROOT"

# Attendre que le backend soit prêt
for i in $(seq 1 15); do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Backend démarré (PID: $BACKEND_PID) - http://localhost:3001${NC}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "${RED}  ✗ Le backend n'a pas démarré. Vérifiez les logs :${NC}"
    echo -e "${CYAN}    tail -50 $BACKEND_LOG${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# ─── 5. Démarrer le frontend ───
echo -e "\n${YELLOW}[5/5] Démarrage du frontend...${NC}"
cd "$PROJECT_ROOT"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
sleep 3

# Détecter le port utilisé par Vite
FRONTEND_PORT=$(grep -oP 'localhost:\K\d+' "$FRONTEND_LOG" | head -1)
if [ -z "$FRONTEND_PORT" ]; then
  FRONTEND_PORT="8080"
fi

if ps -p $FRONTEND_PID > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Frontend démarré (PID: $FRONTEND_PID) - http://localhost:${FRONTEND_PORT}${NC}"
else
  echo -e "${RED}  ✗ Le frontend n'a pas démarré. Vérifiez les logs :${NC}"
  echo -e "${CYAN}    tail -50 $FRONTEND_LOG${NC}"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

# ─── Résumé ───
echo -e "\n${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ${GREEN}Tout est prêt !${BLUE}                      ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Backend  : ${GREEN}http://localhost:3001${NC}             ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Frontend : ${GREEN}http://localhost:${FRONTEND_PORT}${NC}             ${BLUE}║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Logs backend  : ${CYAN}logs/backend.log${NC}            ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Logs frontend : ${CYAN}logs/frontend.log${NC}           ${BLUE}║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}Ctrl+C pour tout arrêter${NC}                    ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

# ─── Cleanup on exit ───
cleanup() {
  echo -e "\n${YELLOW}Arrêt des services...${NC}"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  # S'assurer que tout est bien mort
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  lsof -ti:${FRONTEND_PORT} | xargs kill -9 2>/dev/null
  echo -e "${GREEN}Services arrêtés proprement.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Tail des logs en live ───
echo -e "\n${CYAN}─── Logs en temps réel (backend + frontend) ───${NC}\n"
tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
