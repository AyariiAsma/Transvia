#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# LogisticApp — Script d'initialisation rapide
# Usage: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()    { echo -e "${CYAN}[LogisticApp]${NC} $1"; }
success(){ echo -e "${GREEN}✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ─── Prérequis ────────────────────────────────────────────────────
log "Vérification des prérequis..."

command -v node  >/dev/null 2>&1 || error "Node.js est requis (v20+)"
command -v npm   >/dev/null 2>&1 || error "npm est requis"
command -v docker>/dev/null 2>&1 || error "Docker est requis"

NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js v20+ est requis (version actuelle: $(node -v))"
fi

success "Prérequis OK (Node.js $(node -v))"

# ─── Variables d'environnement ────────────────────────────────────
log "Configuration des variables d'environnement..."

if [ ! -f "apps/api/.env" ]; then
  cp .env.example apps/api/.env
  warn "Fichier apps/api/.env créé depuis .env.example"
  warn "⚠️  IMPORTANT: Editez apps/api/.env avec vos vraies valeurs avant de continuer"
  echo ""
  echo "Variables minimales à configurer:"
  echo "  - JWT_ACCESS_SECRET (min 32 chars)"
  echo "  - JWT_REFRESH_SECRET (min 32 chars)"
  echo "  - FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL"
  echo "  - GOOGLE_MAPS_API_KEY"
  echo ""
  read -p "Appuyez sur Entrée pour continuer avec les valeurs par défaut (dev uniquement)..."
fi

# ─── Installation des dépendances ────────────────────────────────
log "Installation des dépendances npm..."
npm install
success "Dépendances installées"

# ─── Docker ───────────────────────────────────────────────────────
log "Démarrage des services Docker (PostgreSQL + Redis + OSRM)..."

if ! docker info >/dev/null 2>&1; then
  error "Docker n'est pas démarré. Lancez Docker Desktop et réessayez."
fi

docker-compose up -d postgres redis
success "PostgreSQL et Redis démarrés"

# Attendre PostgreSQL
log "Attente de PostgreSQL..."
MAX_WAIT=60
WAITED=0
until docker-compose exec -T postgres pg_isready -U logistic >/dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    error "PostgreSQL n'a pas démarré dans les ${MAX_WAIT}s"
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo -n "."
done
echo ""
success "PostgreSQL prêt"

# ─── Prisma ───────────────────────────────────────────────────────
log "Génération du client Prisma..."
cd apps/api
npx prisma generate
success "Client Prisma généré"

log "Migration de la base de données..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
success "Migration effectuée"

log "Seed des données de démo..."
npx ts-node prisma/seed.ts 2>/dev/null || warn "Seed ignoré (déjà effectué ou erreur)"
cd ../..

success "Initialisation terminée !"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🚀 LogisticApp est prêt à démarrer !"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Pour lancer les services:"
echo ""
echo "  Terminal 1 — API Backend:"
echo "    cd apps/api && npm run start:dev"
echo ""
echo "  Terminal 2 — Admin Web:"
echo "    cd apps/admin-web && npm run dev"
echo ""
echo "  Terminal 3 — App Mobile:"
echo "    cd apps/mobile && expo start"
echo ""
echo "  URLs:"
echo "    API:      http://localhost:3000"
echo "    Swagger:  http://localhost:3000/api/v1/docs"
echo "    Admin:    http://localhost:3001"
echo ""
echo "  Comptes démo:"
echo "    admin@demo.com     / Demo@1234"
echo "    client@demo.com    / Demo@1234"
echo "    chauffeur@demo.com / Demo@1234"
echo ""
echo "═══════════════════════════════════════════════════════════"
